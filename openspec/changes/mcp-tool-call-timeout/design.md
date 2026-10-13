# Design

## 背景事实（已核实）

- `@deepseek-ai/dsh-mcp-client` 的超时字段唯一名为 `toolCallTimeoutMs`（毫秒），stdio 与 streamable-http 两条 union 分支都声明为 `z.number().default(60000)`（`lib/index.js:765` 的 `DEFAULT_TOOL_CALL_TIMEOUT_MS = 6e4`、`:787`/`:796`）；唯一消费点是 `callTool`（`:145` 的 `timeout: opts.toolCallTimeoutMs`），因此它只作用于每一次 `tools/call`。
- 连接与初始化超时（`initialize` / `tools/list`）不可通过 config 调整：`await generation.connect(createTransport(config))`（`lib/index.js:642`）未传 options，走 `@modelcontextprotocol/sdk` 1.30.0 的 `DEFAULT_REQUEST_TIMEOUT_MSEC = 60000`。
- 插件侧现状：`buildInsertBlock`（src/index.ts:679）**已经**支持 `toolCallTimeoutMs`，并在 src/index.ts:711 以真值判断写出 `toolCallTimeoutMs: <number>`；`normalizeRow`（src/index.ts:985）不返回该字段；`mcpmEdit`（src/index.ts:1231）用新建的 row 覆盖写整块，因此手工写入的字段会被抹掉（缺陷）；`mcpmAdd`（src/index.ts:1190）构造的 row 不含该字段。
- `mcpmExport`（src/index.ts:1394）逐字段挑选导出内容；`mcpmImport`（src/index.ts:1419）经 `normalizeImportItem`（src/index.ts:1009）重建 row 后调用 `buildInsertBlock`。两者都必须显式加入该字段才可能往返。
- `mcpmList`（src/index.ts:1128）归一化补丁行之后，还会追加 loader 来源的行（src/index.ts:1175 手工构造的对象），后者不属于任何配置文档。
- 客户端 `lib/client.js` 是手写 bundle、无构建步骤（docs/developer-guide.md:39）：空表单在 lib/client.js:198，列表与表单渲染在 `MCPPage`（lib/client.js:201 起）。改动用 `node --check` 验证语法，运行时需硬刷新页面。

## Goals / Non-Goals

**Goals**

- 对外（界面、HTTP API、模型工具、导出 JSON）统一以**秒**为单位的 `timeoutSeconds`；毫秒只存在于补丁文件与内部换算。
- 落盘可预测且幂等：等于默认 60（或空）不写字段；编辑时未提供该参数则不触碰既有值。
- 修复 `mcpm-edit` 抹除既有 `toolCallTimeoutMs` 的缺陷。

**Non-Goals**

- 不暴露连接/初始化超时（DSH 未提供配置项，插件无从设置）。
- 不暴露 `failOnStartupError`、`maxInstructionBytes`、`reconnect`（另立 change）。
- 不做存量批量补齐、不做列表筛选排序、不新增 `mcp_manager_edit`。

## 决策

### D1：对外统一秒（`timeoutSeconds`），毫秒只留在补丁与内部

列表每行返回 `timeoutSeconds`（整数秒或 `null`）；导出 JSON 用 `timeoutSeconds`；写接口与模型工具接受 `timeoutSeconds`；补丁文件里仍写 DSH 要求的 `toolCallTimeoutMs`（毫秒）。

理由：需求方已定「界面与所有 API 用秒」。若列表回传原始毫秒，前端、导出、模型工具就形成两套单位心智，且导出/导入会跟着带上毫秒。

备选（拒绝）：列表返回毫秒让调用方自己除 1000 —— 与上述决定相悖。

### D2：落盘判定区分「新增」与「编辑」

- 新增：`timeoutSeconds` 缺省、空串或等于 60 → 不设置 `row.toolCallTimeoutMs`；否则 = 秒数 × 1000。
- 编辑：`timeoutSeconds` **缺省** → 沿用该条目原有的 `toolCallTimeoutMs`（原本没有就继续没有）；空串或 60 → 删除该字段；其他合法值 → 写入秒数 × 1000。

理由：编辑表单可能只改 command/args，而 HTTP 调用方与脚本并不保证每次都回传该字段。把「缺省」解释成「删除」就是把「只改一个参数」变成静默重置——这正是现有缺陷的形态。默认行为取保守值。

备选（拒绝）：编辑缺省即删除（会静默清配置）；总是回写当前值（无法表达「回到默认」）。

### D3：校验集中在 host 侧一个解析函数

新增 `parseTimeoutSeconds(value)`（含供编辑使用的「保留」分支）与 `timeoutMsToSeconds(ms)`：接受整数秒或十进制整数字符串（去空白后匹配 `^\\d+$`），取值 1–3600（含）；否则返回可诊断错误。校验在 `withWriteLock` 之前完成并直接返回 `{ ok: false, error }`，因此越界请求不会读取或改写任何补丁文件。

理由：三个写入口与 `mcpm-import` 共用同一规则，避免各处实现走偏；前端不被信任。

### D4：`normalizeRow` 作为「补丁 → 对外」的唯一换算出口

`normalizeRow` 新增 `timeoutSeconds`：`cfg.toolCallTimeoutMs` 为有限且 > 0 的数字时返回 `Math.round(ms / 1000)`，否则 `null`。loader 来源的行（src/index.ts:1175）同样带 `timeoutSeconds: null`，因为插件不猜测不属于配置文档的条目的运行态超时。

理由：列表、导出、前端展示全部读这一处结果，换算只做一次即可保证三者一致。

### D5：导出/导入用同一字段、同一校验

- `mcpmExport` 挑选字段时加入 `timeoutSeconds`（保留 `null`，让「未设置」在文件里显式可辨）。
- `normalizeImportItem` 读取 `timeoutSeconds`：缺省或 `null` → 不设置 `toolCallTimeoutMs`；非法值 → 复用现有 skip 机制（该条目进 `skipped` 并带原因），不影响同文件的其他条目。

理由：导入的既有语义是「逐条校验、失败只跳过该条」，超时值非法时保持同样粒度，避免一个坏值毁掉整批导入。

### D6：界面（`lib/client.js`）

- `emptyForm()` 增加 `timeoutSeconds: '60'`；编辑时回显该条目现有值（未设置则显示 60）。
- 表单新增一个 `number` 输入（标签「工具调用超时（秒）」），并附一行说明：留空或 60 = 跟随默认（60s）；仅作用于工具调用，不含启动与连接。
- 列表新增超时展示：`typeof row.timeoutSeconds === 'number' ? row.timeoutSeconds + 's' : '默认 60s'`。
- 提交前归一化：空串 → `'60'`，避免用户误以为「空 = 不限」。
- 不做筛选、排序与批量补齐。

### D7：测试策略

沿用 `tests/mcpm.test.mjs` 的 fake-ctx 风格，新增用例覆盖：

- 新增：`300` → 补丁出现 `toolCallTimeoutMs: 300000`；`60`/缺省/空 → 不含该字段；`0`、`3601`、`1.5`、`'abc'` → `ok: false` 且文件字节不变。
- 编辑：省略该参数保留既有 `120000`；传 `60` 删除字段；传 `300` 覆盖；同时验证同补丁的其他条目字节不变。
- 列表：`300000` → `timeoutSeconds: 300`；未设置 → `null`；loader 行 → `null`。
- 导出/导入：导出含 `timeoutSeconds`；导入写回；旧文件（无该字段）仍成功且不写字段；非法值只跳过该条目。
- 客户端源码契约：`lib/client.js` 中存在该表单字段与列表渲染分支（沿用既有「源码契约」式断言）。
- 模型工具：`mcp_manager_add` 的 `timeoutSeconds` 生效（写入补丁）。

## 风险 / 权衡

- [秒/毫秒双向换算写反] → 单测同时断言 `300 → 300000`（写盘）与 `300000 → 300`（列表），并固定 1 / 60 / 3600 边界。
- [编辑语义分叉被实现成「一律覆盖」] → 专门用例覆盖「省略参数保留原值」与「传 60 删除字段」两条相反路径。
- [前端改了但未硬刷新，看不到新字段] → README 与验收清单写明：客户端改动需硬刷新，host 改动需重启实例。
- [用户误以为能改启动/连接超时] → 表单说明与 README 的已知限制均写明「仅 tools/call」。
- [loader 行超时为 null 被误读成「配置缺失」] → 沿用既有 loader 语义（不属于配置文档），列表对这类行不提供超时可操作值。

## 迁移计划
- **实现期发现（已验证）**：`mcpmEdit` 的「缺省 → 保留原值」分支最初读 `cur.config.toolCallTimeoutMs`，但 `locateRow`（[src/index.ts:1152](src/index.ts#L1152)）返回的是 `normalizeRow` 之后的**扁平行，不含 `config`**，于是「保留」退化成「删除」。修复：改读已换算的秒值 `cur.timeoutSeconds`（[src/index.ts:1314-1316](src/index.ts#L1314-L1316)）。该缺陷由 `tests/timeout.test.mjs` 的「keeps the stored timeout when the field is absent」用例锁死（首轮红 → 修复 → 绿）。

- 无数据迁移：未设置该字段的条目保持字节不变；插件不主动改写任何既有补丁。
- 回滚：还原 `src/index.ts`、`lib/index.js`、`lib/client.js` 即可；补丁文件仅在用户显式保存条目时才变化。
- 发布：本次不发 npm（需求方决定），仅仓库内实现 + 测试 + 双语文档 + 本 OpenSpec change。

## 开放问题

无。列表返回单位、编辑缺省语义、值域与导出导入往返均已在 specs 与上述决策中定死。

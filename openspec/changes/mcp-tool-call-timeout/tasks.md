# Tasks

## 1. OpenSpec 建档

- [x] 1.1 完成 proposal / specs / design / tasks 四个 artifact，验证：`openspec status --change mcp-tool-call-timeout` 显示 4/4 complete
- [x] 1.2 `openspec validate mcp-tool-call-timeout` 通过

## 2. host：单位换算、入参校验与落盘

- [x] 2.1 在 `src/index.ts` 增加 `parseTimeoutSeconds(value)`（1–3600 整数秒，接受十进制整数字符串；返回等价毫秒或可诊断错误）与 `timeoutMsToSeconds(ms)`（有限正数 → 四舍五入为秒，否则 `null`），验证：`npm run build` 通过，5.1 用例绿
- [x] 2.2 `mcpm-add` 在 `withWriteLock` 之前完成校验并把 `row.toolCallTimeoutMs` 交给 `buildInsertBlock`（缺省/空/60 不设置），验证：5.1 的 add 用例
- [x] 2.3 `mcpm-edit` 实现「`timeoutSeconds` 缺省 → 保留该条目原有值；空或 60 → 删除字段；其他合法值 → 覆盖」三种路径，验证：5.1 的 edit 用例（含两条相反路径）
- [x] 2.4 非法取值（`0` / `3601` / `1.5` / `'abc'`）返回 `ok: false` 与含合法范围的错误，且不读取或改写补丁文件，验证：5.1 越界用例比对操作前后的文件字节

## 3. host：查询、导出与导入、模型工具

- [x] 3.1 `normalizeRow`（src/index.ts:985）增加 `timeoutSeconds`：补丁毫秒 → 秒，未设置或非正数 → `null`，验证：5.2 列表用例
- [x] 3.2 `mcpmList` 的 loader 来源行（src/index.ts:1175）带 `timeoutSeconds: null`，验证：5.2 loader 用例
- [x] 3.3 `mcpm-export`（src/index.ts:1394）输出 `timeoutSeconds`；`normalizeImportItem`（src/index.ts:1009）读回并按同一落盘判定写入，非法值只进 `skipped` 不影响同文件其他条目，验证：5.3 往返用例
- [x] 3.4 `mcp_manager_add` 增加 `timeoutSeconds` 参数并透传；`mcp_manager_list` 的文本摘要带上超时（`300s` / `默认 60s`），验证：5.4 模型工具用例

## 4. client：设置页表单与列表

- [x] 4.1 `emptyForm()`（lib/client.js:198）增加 `timeoutSeconds: '60'`，编辑时回显该条目现有值（未设置显示 60），验证：`node --check lib/client.js` 通过 + 5.5 源码契约用例
- [x] 4.2 表单增加「工具调用超时（秒）」数字输入与说明文案（留空或 60 = 跟随默认；仅作用于工具调用），提交前把空串归一化为 `'60'`，验证：5.5 源码契约用例
- [ ] 4.3 列表逐行显示超时（`300s` / `默认 60s`），验证：5.5 源码契约用例，并在硬刷新后目视确认

## 5. 测试

- [x] 5.1 host 单测（`tests/mcpm.test.mjs`）：新增写入 `300000`、缺省/60/空不写、越界被拒且文件不变、编辑省略参数保留原值、传 60 删除字段、传 300 覆盖
- [x] 5.2 host 单测：列表回报 `timeoutSeconds`（显式 300 / 未设置 `null` / loader 行 `null`）
- [x] 5.3 host 单测：导出含 `timeoutSeconds`、导入写回、旧导出文件仍成功、非法值只跳过该条
- [x] 5.4 host 单测：`mcp_manager_add` 的 `timeoutSeconds` 生效（补丁出现对应毫秒值）
- [x] 5.5 client 源码契约断言：表单字段、列表渲染分支、空串归一化
- [x] 5.6 `npm run build`、`npm test`、`npm run lint` 全绿

## 6. 文档、实机验证与收尾

- [x] 6.1 `README.md` 与 `README_EN.md` 的 MCP 管理章节补充：字段含义、秒输入、60 = 跟随默认不落盘、仅作用于 `tools/call`（连接/初始化超时不可配）
- [ ] 6.2 实机验证（需重启 DSH 实例以加载新 host 代码；经用户同意后执行或交由用户执行）：给某台服务设 300s → 补丁出现 `toolCallTimeoutMs: 300000`，列表与表单回显正确，未设置条目字节不变
- [x] 6.3 `openspec validate mcp-tool-call-timeout` 通过，证据（列表/补丁片段/测试输出）落盘到 `evidence/`
- [ ] 6.4 停下等待用户验收：不 archive、不发 npm

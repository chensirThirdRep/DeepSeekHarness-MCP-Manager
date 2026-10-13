# 验证证据 — mcp-tool-call-timeout

日期：2026-10-13
环境：Windows 10.0.26300 · Node v24.14.1 · npm 11.11.0 · TypeScript 6.0.3（本地 devDependencies，首次 `npm install` 装入 28 个包）

## 1. 构建与静态检查

| 命令 | 结果 |
|---|---|
| `npm run build`（`tsc -p tsconfig.json`） | exit 0，无诊断 |
| `npm run lint`（`node --check lib/client.js && node --check lib/index.js`） | exit 0 |

## 2. 测试（验收命令）

`npm test`（= `npm run build && node --test`）：**exit 0，54 passed / 0 failed**。

其中本次新增的 `tests/timeout.test.mjs` 10 个用例：

```text
✔ mcpm-add stores a non-default timeoutSeconds as millisecond toolCallTimeoutMs; mcpm-list reports seconds
✔ 60, an empty value and an omitted value all mean "follow the default" and write nothing
✔ out-of-range or malformed timeoutSeconds is rejected before any write
✔ mcpm-edit keeps the stored timeout when the field is absent, overwrites on change
✔ mcpm-edit removes the field for 60 or an empty value, and is idempotent
✔ mcpm-export carries timeoutSeconds (null when unset) and mcpm-import restores it
✔ mcpm-import skips only the entry with a bad timeout and still accepts legacy rows
✔ mcp_manager_add accepts timeoutSeconds and mcp_manager_list reports it
✔ the client bundle exposes the timeout input, the echo and the list label
```

沙箱说明：限制模式下 `node --test` 会为每个测试文件派生子进程并捕获其 stdio，被当前 Windows 文件沙箱拒绝（`Error: spawn EPERM`，`errno: -4048`）。因此本次以一次 danger-full-access 运行 `npm test` 取到上表结果；等价替代命令 `node --test --test-isolation=none`（同进程内执行）在受限模式下同样全绿，可用于日常自查。

## 3. 首轮红 → 修复 → 绿（实现期发现的真实缺陷）

首轮运行 `tests/timeout.test.mjs`：23 passed / **2 failed**。

**缺陷 1（真实数据丢失 bug，已修）**——`mcpm-edit` 省略 `timeoutSeconds` 时没有保留原值，实际写出的块缺少该字段：

```yaml
# dsh-mcp-manager:server:mcp-slow
- insert:
    - id: mcp-slow
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: "slow"
        transport: "stdio"
        command: "slow-server-v2"      # toolCallTimeoutMs 被静默抹掉
```

根因：`locateRow`（[src/index.ts:1152](src/index.ts#L1152)、[:1166](src/index.ts#L1166)）返回的是 `normalizeRow(...)` 的结果——扁平行对象，**不含 `config`**；保留分支里读 `cur.config.toolCallTimeoutMs` 恒为 `undefined`，于是"保留"变成"删除"。修复：改读已换算好的秒值 `cur.timeoutSeconds`（[src/index.ts:1314-1316](src/index.ts#L1314-L1316)）：
```ts
if (args.timeoutSeconds === undefined) {
  // locateRow hands back a normalized row (whole seconds), not the raw
  // patch entry, so read the already-converted value.
  nextTimeoutMs = timeoutMsForStorage(cur.timeoutSeconds == null ? null : cur.timeoutSeconds)
} else {
```

**缺陷 2（测试期望写错，非实现问题）**——`mcp_manager_add` 在 `!r.ok` 时 `throw new Error(r.error)`（[src/index.ts:1620](src/index.ts#L1620)，与 serverName/url/command 校验失败的行为一致），测试最初断言返回 `{ok:false}`。已改为 `assert.rejects(..., /1-3600/)`。

修复后重跑：`tests/timeout.test.mjs` 25 passed / 0 failed（含同文件其它既有用例）→ 全量 54 passed / 0 failed。

## 4. 落点清单（静态证据）

host（`src/index.ts` → `lib/index.js` 为编译产物，均已同步）：

| 位置 | 内容 |
|---|---|
| [src/index.ts:1008-1040](src/index.ts#L1008-L1040) | `DEFAULT_TIMEOUT_SECONDS=60` / `MIN=1` / `MAX=3600` + `parseTimeoutSeconds` / `timeoutMsToSeconds` / `timeoutMsForStorage` |
| [src/index.ts:999](src/index.ts#L999) | `normalizeRow` 返回 `timeoutSeconds: timeoutMsToSeconds(cfg.toolCallTimeoutMs)` |
| [src/index.ts:1218](src/index.ts#L1218) | loader 来源行带 `timeoutSeconds: null` |
| [src/index.ts:1259-1262](src/index.ts#L1259-L1262) | `mcpmAdd`：校验先于 `withWriteLock`，仅非默认值写 `toolCallTimeoutMs` |
| [src/index.ts:1311-1321](src/index.ts#L1311-L1321) | `mcpmEdit`：缺省→保留 / 空或 60→删字段 / 其他→覆盖 |
| [src/index.ts:1060-1067](src/index.ts#L1060-L1067) | `normalizeImportItem`：非法值整条进 `skipped` |
| [src/index.ts:1467](src/index.ts#L1467) | `mcpmExport`：导出 `timeoutSeconds`（未设置 `null`） |
| [src/index.ts:1567](src/index.ts#L1567) | `mcp_manager_list` 摘要 `| timeout:300s` / `default(60s)` |
| [src/index.ts:1615](src/index.ts#L1615) | `mcp_manager_add` 新增 `timeoutSeconds` 参数 |

client（`lib/client.js`，手写模块，`node --check` 通过）：`emptyForm()` 预填 `'60'`、`openEdit` 回显、`submitForm` 空串归一化为 `'60'`、表单 `type:'number' min:1 max:3600` 输入框 + 说明文案、列表行「工具调用超时: 300s / 默认 60s（未写入配置）」。

## 5. 补丁片段样例（由断言验证的格式）

```yaml
# dsh-mcp-manager:server:mcp-slow
- insert:
    - id: mcp-slow
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: "slow"
        transport: "stdio"
        command: "slow-server"
        toolCallTimeoutMs: 300000
```

对应用例断言：`assert.match(patch, /toolCallTimeoutMs: 300000/)`（300 秒 → 300000 毫秒）；默认态断言：`assert.doesNotMatch(patch, /toolCallTimeoutMs/)`。

## 6. 待执行的实机验证（tasks 6.2，需用户操作）

1. 重启 DSH 实例（加载新 host 代码）；硬刷新浏览器（加载新 client bundle）。
2. **设置 → MCP 管理** → 编辑任一台（如 CodeMap），「工具调用超时（秒）」填 `300` → 保存。
3. 检查补丁文件对应条目出现 `toolCallTimeoutMs: 300000`（活动 profile：`~/.dsh/profiles/<name>/cordis.patch.yml`，或全局层 `~/.dsh/cordis.patch.yml`）。
4. 列表该行显示「工具调用超时: 300s」；未设置条目显示「默认 60s（未写入配置）」，且这些条目字节未变。
5. 再编辑同一条目、只改 `args`（超时框留空）→ 字段应保留 `300000`（本次修复的缺陷）。
6. 把超时改成 `60` → 字段被删除。
7. 顺带确认 `mcp_manager_add` 的 `timeoutSeconds` 参数（`type: 'number'`）能被 DSH 参数 schema 接受（让模型调用一次即可）。

## 7. 未验证 / 已知边界

- 连接 / 初始化 / 列工具阶段（`initialize`、`tools/list`）的超时**不可通过配置调整**（`dsh-mcp-client` 未向 `generation.connect` 传 options，走 MCP SDK 1.30.0 的 `DEFAULT_REQUEST_TIMEOUT_MSEC = 60000`）。本功能只覆盖 `tools/call`。
- `mcp_manager_add` 的 `timeoutSeconds: { type: 'number' }` 为项目内首个 number 型参数：TypeScript 编译通过，运行时参数 schema 是否接受该类型待第 6 步实机确认（若被拒，退化为 `type: 'string'` 即可，host 端本已同时接受数字与十进制字符串）。
- 本次未发布 npm 包，未 archive change（按用户要求）。

# mcp-tool-call-timeout

## Why

每条 MCP 服务的「单次工具调用超时」由 `@deepseek-ai/dsh-mcp-client` 的 `toolCallTimeoutMs` 决定（默认 60000ms），但插件从未暴露这个字段：用户既看不到每条服务实际生效的超时，也没有任何入口去改它，只能手工编辑 profile 补丁里的 YAML（缩进敏感、容易写坏）。结果是需要长时间运行的工具在固定 60s 后被判定超时失败，用户甚至不知道这个值本来可以调。

同时存在一个静默数据丢失缺陷：`mcpm-edit` 重建条目时不会读取原有的 `toolCallTimeoutMs`，手工写入该字段的服务只要在设置页被保存一次，字段就被抹掉。

## What Changes

- **设置页表单新增「工具调用超时（秒）」**：默认预填 60；留空或等于 60 视为「跟随 DSH 默认」而不写入字段；取值范围为整数 1–3600 秒，越界在写盘前报错。
- **列表逐行呈现超时**：显式设置的服务显示其秒数（如 `300s`），未设置的显示「默认 60s」；不做筛选与排序。
- **编辑回显与缺陷修复**：编辑表单回显当前值；保存时按新值重写或保留 `toolCallTimeoutMs`，不再抹掉手工字段。
- **host 接口接受 `timeoutSeconds`**：`mcpm-add` 与 `mcpm-edit` 新增该参数（秒），插件负责换算为落盘的毫秒；`mcpm-list` 的每行返回 `toolCallTimeoutMs`（毫秒，未设置为 `null`）。
- **模型工具同步**：`mcp_manager_add` 增加 `timeoutSeconds` 参数；本次不新增 `mcp_manager_edit`。
- **导出/导入往返保真**：`mcpm-export` 输出 `timeoutSeconds`，`mcpm-import` 读回并写入；缺失该字段的旧导出文件仍可导入，等价于「未设置」。
- **存量配置不动**：不批量补齐、不重写既有条目；线上未设置该字段的服务保持字节不变。

### 非目标

- 不改 `@deepseek-ai/dsh-mcp-client` 本身，也不改 DSH 的默认值。
- 不暴露同 config 下的其他字段（`failOnStartupError`、`maxInstructionBytes`、`reconnect`）。
- **连接与初始化超时不可配**：`initialize` / `tools/list` 走 MCP SDK 默认 60000ms，dsh-mcp-client 调用 `connect()` 时未传 options，插件无法通过 config 调整。

## Capabilities

### New Capabilities

无。本次不引入新能力，只在既有的 MCP 管理能力上扩展一条要求。

### Modified Capabilities

- `mcp-server-management`：新增一条要求——每条 MCP 的工具调用超时 MUST 可查询、可设置，并 MUST 如实反映「显式值」与「未设置（跟随默认）」的区别；未设置时 MUST NOT 向补丁写入该字段。

## Impact

- **代码**：`src/index.ts`（`mcpm-add` / `mcpm-edit` / `mcpm-list` / `normalizeRow` / `mcpm-export` / `mcpm-import` / 模型工具定义；`buildInsertBlock` 已支持该字段）、`lib/client.js`（设置页表单与列表渲染）、`lib/index.js`（构建产物）。
- **测试**：`tests/mcpm.test.mjs`、`tests/tools.test.mjs` 增加校验、换算、落盘判定、编辑保留、导出导入往返的用例。
- **文档**：`README.md` 与 `README_EN.md` 的 MCP 管理章节补充该字段的说明与已知限制。
- **兼容性**：未设置该字段的条目行为与旧版完全一致；旧前端忽略新字段即可；旧导出文件可继续导入。
- **风险**：秒/毫秒换算与「等于 60 即不写字段」的判定是本次最容易出错的两处，用单测覆盖 1 / 60 / 3600 边界与「显式值改回 60 时删除字段」；界面与文档需明确「仅 tools/call，不含启动与连接」。

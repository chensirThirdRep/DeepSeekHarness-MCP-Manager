# mcp-server-management Specification (delta)

## ADDED Requirements

### Requirement: 工具调用超时的查询与如实呈现

插件 MUST 让每条 MCP 条目的「单次工具调用超时」可查询：列表接口的每一行 MUST 返回 `timeoutSeconds`（整数秒，补丁文件中的毫秒值由插件换算），未设置时为 `null`。插件 MUST 区分「显式值」与「未设置（跟随 dsh-mcp-client 默认 60000ms）」，MUST NOT 把未设置的条目报告为某个显式取值。设置页列表 MUST 逐行呈现该状态：显式设置的服务显示其秒数，未设置的显示「默认 60s」。不属于配置文档的 loader 来源条目 MUST 报告为 `null`。

#### Scenario: 未设置的条目如实报告为 null

- **WHEN** 某服务的补丁条目中不含 `toolCallTimeoutMs`，调用方请求列表
- **THEN** 该行的 `timeoutSeconds` 为 `null`
- **AND** 设置页该行显示「默认 60s」，而不是把 60 当作该服务的显式配置

#### Scenario: 显式设置的条目报告其秒数

- **WHEN** 某服务的补丁条目中含 `toolCallTimeoutMs: 300000`，调用方请求列表
- **THEN** 该行的 `timeoutSeconds` 为 `300`
- **AND** 设置页该行显示 `300s`

#### Scenario: loader 来源条目

- **WHEN** 当前实例的 loader 中存在一条不属于任何补丁文档的 MCP 条目
- **THEN** 该行的 `timeoutSeconds` 为 `null`
- **AND** 该行不因缺少超时配置而被报告为「已配置默认值」

### Requirement: 工具调用超时的设置与落盘判定

写接口（`mcpm-add`、`mcpm-edit` 与模型工具 `mcp_manager_add`）MUST 接受以**秒**为单位的 `timeoutSeconds`。取值 MUST 为 1–3600 之间的整数（含两端）；十进制整数字符串 MUST 被接受，其余取值（非整数、非数字或越界）MUST 返回失败结果与可诊断错误，并 MUST NOT 修改任何补丁文件。

落盘 MUST 遵循「等于默认值即不写」与「未提供即不动」两条规则：

- **新增**时：`timeoutSeconds` 缺省、为空或等于 60 时 MUST NOT 写入 `toolCallTimeoutMs`；不等于 60 时 MUST 写入与该秒数等价的毫秒整数（秒数 × 1000）。
- **编辑**时：`timeoutSeconds` 缺省时 MUST 保留该条目原有的 `toolCallTimeoutMs`（原本没有则继续不写）；为空或等于 60 时 MUST 删除该字段；其他合法取值 MUST 写入等价毫秒整数。

因此保存 MUST 是幂等的：同一目标以同一取值重复保存，补丁内容 MUST 一致。插件 MUST NOT 为既有条目批量补齐或改写该字段。

#### Scenario: 设置非默认超时

- **WHEN** 调用方以 `timeoutSeconds: 300` 新增一台 MCP 服务
- **THEN** 目标补丁中该条目写入 `toolCallTimeoutMs: 300000`
- **AND** 随后请求列表时该行的 `timeoutSeconds` 为 `300`

#### Scenario: 等于 60 或留空时不写字段

- **WHEN** 调用方以 `timeoutSeconds: 60`（或省略该参数）新增一台 MCP 服务
- **THEN** 目标补丁中该条目不含 `toolCallTimeoutMs`
- **AND** 该条目在列表中的 `timeoutSeconds` 为 `null`

#### Scenario: 越界或非整数取值被拒绝

- **WHEN** 调用方以 `timeoutSeconds: 0`、`3601` 或 `1.5` 执行写操作
- **THEN** 返回 `ok: false` 与包含合法范围的可诊断错误
- **AND** 目标补丁文件的字节内容与操作前完全一致

#### Scenario: 编辑省略该参数时保留既有值

- **WHEN** 某条目原本为 `toolCallTimeoutMs: 120000`，调用方编辑该服务时只提供 command 或 args、不提供 `timeoutSeconds`
- **THEN** 保存后该条目的 `toolCallTimeoutMs` 仍为 `120000`
- **AND** 同一补丁中其他条目的字节内容不变

#### Scenario: 显式值改回 60 时删除字段

- **WHEN** 某条目原本为 `toolCallTimeoutMs: 300000`，调用方以 `timeoutSeconds: 60` 编辑保存
- **THEN** 保存后该条目不再包含 `toolCallTimeoutMs`
- **AND** 该行在列表中的 `timeoutSeconds` 为 `null`

#### Scenario: 编辑不牵连同补丁的其他条目

- **WHEN** 同一补丁中服务 A 显式设置 `toolCallTimeoutMs: 120000`、服务 B 未设置，用户编辑服务 B 并省略 `timeoutSeconds`
- **THEN** 服务 A 的 `toolCallTimeoutMs` 仍为 `120000`
- **AND** 服务 B 保存后仍不含 `toolCallTimeoutMs`

### Requirement: 工具调用超时在导出与导入中的保真

导出（`mcpm-export`）MUST 为每行携带以秒为单位的 `timeoutSeconds`：显式设置的服务为其秒数，未设置的为 `null`。导入（`mcpm-import`）MUST 读取该字段并按同一落盘判定写入；取值非法时 MUST 只跳过该条目并给出原因，MUST NOT 影响同一文件中的其他条目；不含该字段的旧导出文件 MUST 仍可导入，其条目等价于「未设置」。

#### Scenario: 导出携带超时

- **WHEN** 导出含「显式 300s」与「未设置」两类条目的配置
- **THEN** 导出 JSON 中前者的 `timeoutSeconds` 为 `300`，后者的 `timeoutSeconds` 为 `null`

#### Scenario: 导入回写超时

- **WHEN** 导入含 `timeoutSeconds: 300` 条目的 JSON
- **THEN** 目标补丁中该条目写入 `toolCallTimeoutMs: 300000`

#### Scenario: 旧导出文件仍可导入

- **WHEN** 导入不含 `timeoutSeconds` 字段的旧版导出 JSON
- **THEN** 导入成功，且写入的条目不含 `toolCallTimeoutMs`（等价于未设置）

#### Scenario: 非法超时值只跳过该条目

- **WHEN** 导入的 JSON 中一条为 `timeoutSeconds: 99999`，另一条同事合法
- **THEN** 前者出现在 `skipped` 中并带有原因
- **AND** 后者被正常写入

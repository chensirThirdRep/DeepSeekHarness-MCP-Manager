# mcp-server-management Specification

## Purpose
MCP 服务器管理页与 HTTP API 必须读写"当前实际生效"的 DSH 配置文件，并在页面上如实呈现每个服务器所在的层级与运行状态。在 DSH 0.2.0-rc.2 上，配置文档的语义从"DSH 主目录下的 settings.yaml"变为"当前活动 profile 的 cordis.patch.yml"，本能力规定插件必须跟随该语义。

## Requirements

### Requirement: 活动 profile 的补丁定位

插件在解析 MCP 配置路径时，MUST 以运行时提供的"当前活动 profile 的补丁文件路径"作为 project 层级的配置文档；当该信息可用时，MUST NOT 通过目录猜测来决定 project 层级文档。

#### Scenario: 运行时给出活动 profile 的补丁路径

- **WHEN** 在 profile 名为 \`mcpman-dev\` 的实例中请求 MCP 服务器列表
- **THEN** 返回的 \`paths.project\` 等于该实例活动 profile 的 \`cordis.patch.yml\` 绝对路径
- **AND** \`paths.profile\` 等于 \`mcpman-dev\`

#### Scenario: 不再固定优先 web profile

- **WHEN** 活动 profile 不是 \`web\`，且 DSH 主目录下同时存在 \`profiles/web/cordis.patch.yml\`
- **THEN** 解析结果仍指向活动 profile 的补丁文件，而不是 \`profiles/web/cordis.patch.yml\`

### Requirement: DSH 主目录补丁定位

插件 MUST 以 DSH 主目录作为 global 层级的配置文档所在目录，并使页面展示的 \`paths.home\` 与 \`paths.global\` 与实际文件一致。

#### Scenario: global 层级路径正确

- **WHEN** 活动 profile 为 \`mcpman-dev\`，DSH 主目录为 \`<DSH_HOME>\`
- **THEN** \`paths.home\` 等于 \`<DSH_HOME>\`
- **AND** \`paths.global\` 等于 \`<DSH_HOME>\\cordis.patch.yml\`
- **AND** \`paths.home\` 不等于活动 profile 目录

### Requirement: 无活动 profile 信息时的回退

当运行时未提供活动 profile 信息时，插件 MUST 回退到目录探测，且探测顺序 MUST 优先当前活动 profile（可用的 profile 线索），而不是固定优先 \`web\` 或 \`headless\`；探测彻底失败时 MUST 返回可诊断的错误，而不是静默写入其他 profile 的文件。

#### Scenario: 回退时优先活动 profile

- **WHEN** 运行时未提供活动 profile 信息，而环境或目录线索表明活动 profile 为 \`desktop\`，且 \`profiles/web\` 与 \`profiles/desktop\` 都存在
- **THEN** project 层级文档解析为 \`profiles/desktop/cordis.patch.yml\`

#### Scenario: 无法确定主目录

- **WHEN** 运行时未提供活动 profile 信息，也无法从任何线索得到 DSH 主目录
- **THEN** 依赖路径的操作返回失败结果并给出明确错误信息，且不对任何文件执行写入

### Requirement: 清单如实反映配置与运行状态

MCP 服务器列表 MUST 包含 project 与 global 两个层级配置文档中的真实服务器条目，逐条给出层级、传输方式（\`stdio\` / \`streamable-http\`）、连接参数与启用状态；对运行在 loader 中但未出现在所读配置文档里的 MCP 客户端条目，MUST 单列为 loader 来源而不是丢弃。

#### Scenario: 列出两个层级的真实条目

- **WHEN** global 配置文档中存在 3 条 MCP 客户端条目，project 配置文档中不存在任何 MCP 条目
- **THEN** 列表返回这 3 条，\`level\` 为 \`global\`，传输方式与连接参数来自配置文件本身
- **AND** 返回的 \`errors\` 为空

#### Scenario: 运行中存在但配置文档中不存在的条目

- **WHEN** 某个 MCP 客户端条目处于 loader 运行态，但不在所读的两个配置文档中
- **THEN** 该条目以 loader 来源出现在列表中，并携带其运行阶段信息

### Requirement: 写操作作用域

新增、编辑、删除、启用、停用与重启 MUST 只修改目标层级的那一个配置文档，MUST NOT 改动另一个层级、其他插件或取消相关的内容。

#### Scenario: 停用后启用可回到原始内容

- **WHEN** 对 project 层级的一台服务器执行停用，随后再执行启用
- **THEN** project 配置文档的字节内容与操作前完全一致
- **AND** global 配置文档在整个过程中未被修改

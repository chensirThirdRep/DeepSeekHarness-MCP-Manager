# mcp-server-management Specification

## Purpose
MCP 服务器管理页与 HTTP API 必须读写"当前实际生效"的 DSH 配置文件，并在页面上如实呈现每个服务器所在的层级与运行状态。在 DSH 0.2.0-rc.2 上，配置文档的语义从"DSH 主目录下的 settings.yaml"变为"当前活动 profile 的 cordis.patch.yml"，本能力规定插件必须跟随该语义。

## Requirements

### Requirement: 活动 profile 的补丁定位

插件在解析 MCP 配置路径时，MUST 以运行时提供的"当前活动 profile 的补丁文件路径"作为默认（profile 层级）的配置文档；当该信息可用时，MUST NOT 通过目录猜测来决定默认 profile 层级文档。
插件的层级目标 MUST 支持三种取值：`global`（DSH 主目录的补丁）、`profile:<name>`（指定名称 profile 的补丁）、以及缺省值或旧值 `project`（当前活动 profile 的补丁）。`profile:<name>` MUST 被解析为 `<home>/profiles/<name>/cordis.patch.yml`。指定的 profile 不存在时，操作 MUST 返回失败结果与可诊断的错误信息，并 MUST NOT 写入任何文件。

#### Scenario: 运行时给出活动 profile 的补丁路径

- **WHEN** 在 profile 名为 `mcpman-dev` 的实例中请求 MCP 服务器列表
- **THEN** 返回的 `paths.project` 等于该实例活动 profile 的 `cordis.patch.yml` 绝对路径
- **AND** `paths.profile` 等于 `mcpman-dev`

#### Scenario: 不再固定优先 web profile

- **WHEN** 活动 profile 不是 `web`，且 DSH 主目录下同时存在 `profiles/web/cordis.patch.yml`
- **THEN** 缺省层级的解析结果仍指向活动 profile 的补丁文件，而不是 `profiles/web/cordis.patch.yml`

#### Scenario: 显式指定其他 profile 作为写入目标

- **WHEN** 活动 profile 为 `desktop`，调用方以 `level` 为 `profile:web` 新增一台 MCP 服务
- **THEN** 新增条目写入 `<home>/profiles/web/cordis.patch.yml`
- **AND** `<home>/profiles/desktop/cordis.patch.yml` 的字节内容与操作前完全一致

#### Scenario: 指定不存在的 profile

- **WHEN** 调用方以 `level` 为 `profile:not-exist` 执行写操作
- **THEN** 返回 `ok: false` 与包含该 profile 名的错误信息
- **AND** 不创建该 profile 目录，也不修改任何补丁文件

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

### Requirement: profile 动态发现

插件 MUST 在 DSH 主目录的 `profiles` 子目录下动态枚举 profile，并为每个 profile 给出名称、补丁文件路径与"是否为当前活动 profile"；枚举 MUST 跳过 `node_modules`，且 MUST 只纳入存在 `package.json` 或 `cordis.patch.yml` 的目录。插件 MUST NOT 在界面文案、接口返回值或路径解析中硬编码任何 profile 名。

#### Scenario: 返回实际存在的 profile

- **WHEN** `<home>/profiles` 下同时存在 `desktop`（活动）与 `web` 两个 profile 目录
- **THEN** 列表接口返回的 `profiles` 同时包含这两项
- **AND** `desktop` 被标记为当前活动 profile，`web` 不被标记
- **AND** 每一项的补丁路径指向该 profile 目录下的 `cordis.patch.yml`

#### Scenario: 界面不再出现硬编码的 profile 名

- **WHEN** 活动 profile 为 `desktop`
- **THEN** 设置页级别选项中的 profile 文案由接口返回的 profile 名生成，不出现与实际活动 profile 无关的固定名称

### Requirement: 列表查看范围

`mcpm-list` MUST 支持查看范围参数：缺省（或 `active`）时返回当前活动 profile 与全局两个层级的条目；`all` 时 MUST 额外包含其他 profile 的条目；亦可指定单个 `profile:<name>`。返回值 MUST 为每行标注其所属 profile，且 MUST NOT 把非活动 profile 的条目报告为当前实例的 loader 运行态。

#### Scenario: 缺省范围保持兼容

- **WHEN** 不传范围参数请求列表
- **THEN** 返回的条目只来自当前活动 profile 与全局补丁
- **AND** 返回结构中的 `paths` 与 `profile` 字段与既有版本一致

#### Scenario: 全部范围

- **WHEN** 以 `all` 范围请求列表，且 `web` profile 中另有一台 MCP 服务
- **THEN** 该服务出现在返回结果中，`level` 为 `profile:web`
- **AND** 该条目不带当前实例的 loader 运行态信息

### Requirement: 非活动 profile 写入的生效提示

对非活动 profile 的写操作 MUST 只修改目标 profile 的补丁文件，并 MUST 在结果中返回提示，说明该配置文件需由对应 profile 的实例在重启后生效。

#### Scenario: 跨 profile 新增返回提示

- **WHEN** 以 `level` 为 `profile:web` 新增一台 MCP 服务
- **THEN** 结果包含提示信息且其中出现 `web`
- **AND** 结果不包含该条目的 loader 运行态信息

#### Scenario: 全局层级不产生该提示

- **WHEN** 以 `level` 为 `global` 新增一台 MCP 服务
- **THEN** 结果不包含"需重启其他 profile"的提示

### Requirement: serverName 与 id 的唯一性范围

插件 MUST 只在目标命名空间（目标 profile 的补丁文件与全局补丁文件）内校验 serverName 与条目 id 的唯一性；不同 profile 之间 MUST 允许存在同名服务。

#### Scenario: 跨 profile 复制允许同名

- **WHEN** 全局层已存在 serverName 为 `github` 的服务，调用方以 `level` 为 `profile:web` 新增同名服务
- **THEN** 返回失败并说明该名称已被占用
- **AND** 若全局层不存在同名服务，则相同调用成功

#### Scenario: 同一命名空间内仍然去重

- **WHEN** 目标 profile 的补丁中已存在 serverName 为 `github` 的服务，调用方向同一 profile 再次新增同名服务
- **THEN** 返回失败并说明名称已存在

### Requirement: 设置页表单控件的主题适配

设置页的表单控件（输入框、文本域、搜索框与原生 `select`，含其展开的选项弹层）MUST 与 DSH 当前主题配色一致。在深色主题下 MUST NOT 呈现浅色弹层；主题切换后 MUST 跟随更新。主题判定 MUST 依据 DSH 投影到文档上的线索（根节点 `color-scheme`、body 的 `data-ds-dark-theme` 属性），线索不可用时 MUST 回退到 `prefers-color-scheme`。

#### Scenario: 深色主题下的下拉弹层

- **WHEN** DSH 处于深色主题（根节点 `color-scheme` 为 `dark` 或 body 带 `data-ds-dark-theme`）
- **THEN** 插件为表单控件声明的 `color-scheme` 为 `dark`
- **AND** 原生 `select` 的选项弹层使用深色底与浅色文字

#### Scenario: 主题切换后跟随

- **WHEN** 用户在 DSH 中把主题从深色切换为浅色
- **THEN** 插件写入的主题变量随之更新为浅色取值
- **AND** 表单控件与下拉弹层改用浅色配色，文字保持可读

# mcp-server-management Specification (delta)

## MODIFIED Requirements

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

## ADDED Requirements

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

# mcp-profile-targets-and-dark-ui

## Why

用户在使用设置→MCP 管理页时报告两个问题：

1. **级别下拉把 profile 写死了**：选项文案硬编码为「项目级（本 profile：profiles/web/cordis.patch.yml）」，既与当前活动 profile 无关（在 desktop profile 下仍然显示 web），也不允许把配置写到别的 profile。用户无法为其他 profile（如 web、mcpman-dev）配置 MCP 服务，只能改写当前实例所在的 profile。
2. **深色主题下下拉控件太亮**：原生 `<select>` 展开后的选项弹层是浅色（Windows/Chromium 原生渲染，不继承插件里设置的颜色），在 DSH 深色主题下刺眼。

两者的共同根因是插件把"当前 profile"当作唯一配置目标，且表单控件没有接入 DSH 的主题机制。

## What Changes

- **host 动态发现 profile**：在 DSH 主目录下枚举 `profiles/*` 目录，得到 profile 名称、目录、补丁路径与"是否当前活动 profile"，随 `mcpm-list` 一起返回；不再在任何文案或逻辑中硬编码 profile 名。
- **层级目标语义扩展**：写操作（新增/编辑/删除/启停/重启/导入）的 `level` 参数支持 `global`、`profile:<name>`，并继续接受旧值 `project`（等价于当前活动 profile）。
- **查看范围**：`mcpm-list` 新增 `scope` 参数（`active` / `all` / `profile:<name>`），页面可切换"当前 profile / 指定 profile / 全部 profile + 全局"的查看范围，每行携带所属 profile。
- **生效提示**：写入非活动 profile 时返回提示，明确该配置需在对应 profile 的实例重启后生效；非活动 profile 的行不提供"重启"与"工具预览"（本实例的 loader 不承载它们）。
- **唯一性范围收敛**：serverName / id 的唯一性检查以目标命名空间（目标 profile 的补丁 + 全局补丁）为界，允许不同 profile 存在同名服务，从而支持"把同一服务配置复制到另一个 profile"。
- **深色主题适配**：表单控件（select/input/textarea/搜索框）显式跟随 DSH 主题配色，原生下拉弹层的 `color-scheme` 与选项底色随主题（`data-ds-dark-theme` / 根节点 `color-scheme`）动态更新。

## Capabilities

### Modified Capabilities

- `mcp-server-management`：层级定位从"活动 profile + global"扩展为"global + 任意 profile"；新增 profile 发现、查看范围、写入生效提示、主题适配与唯一性范围五条要求。

## Impact

- **代码**：`src/index.ts`（profile 枚举、层级解析、mcpm-* 处理器）、`lib/index.js`（构建产物）、`lib/client.js`（设置页 UI 与样式）。
- **测试**：`tests/paths.test.mjs`、`tests/mcpm.test.mjs`、`tests/tools.test.mjs` 增加新层级语义与主题逻辑的用例。
- **文档**：README 中英双份补充"选择配置目标 profile"的说明。
- **兼容性**：旧的 `level: 'project'` 请求仍被接受；`mcpm-list` 的默认返回仍是"当前活动 profile + global"，老前端不会因此失效。
- **非目标**：不改 Skills 管理页的 profile 语义；不实现"一次写入多个 profile"的批量目标。
- **风险**：向其他 profile 的补丁文件写入会改变那个 profile 的启动配置，因此所有非活动 profile 的写入都必须带提示，且仅在用户显式选择该 profile 时发生。

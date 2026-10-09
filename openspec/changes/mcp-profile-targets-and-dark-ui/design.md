# Design

## 背景事实（已核实）

- DSH 0.2.0-rc.2 的 profile 目录布局为 `<DSH_HOME>/profiles/<name>/`，补丁文件名固定为 `cordis.patch.yml`（`dsh-app-boot/lib/index.js:485-487`：`PROFILES_DIR = "profiles"`、`PROFILE_PATCH_FILENAME = "cordis.patch.yml"`；`resolveProfileDir(name, home)` 在 :524）。
- 主目录层补丁 `$DSH_HOME/cordis.patch.yml` **应用到每一个 profile，且优先级高于 profile 自己的层**（`dsh/lib/profile-boot-BZ2ZjNWi.js:110-117` 的 `homePatchPath()` 与 :196-197 的说明），因此"全局"层级对所有 profile 生效。
- 官方没有提供"列出所有 profile"的 API（`dsh-app-boot` 只导出 `resolveProfileDir` 等按名字定位的工具），所以 profile 列表必须由插件枚举目录得到。
- 活动 profile 的信息可由 `ctx.get('profileContext')` 得到（`name` / `dir` / `patchPath` / `home`）。
- DSH 前端把主题状态投影到 DOM：根节点 inline `color-scheme`（`document.documentElement.style.colorScheme`）、根节点 `data-ds-theme-source` 与 body 的 `data-ds-dark-theme` 属性（`dsh-client-ui-layout/lib/client.js:498-548` 的 `ThemePresenter.apply`）。插件据此判断当前是深色还是浅色，无需依赖未注入的主题服务。

## 决策

### D1：层级用字符串 `profile:<name>`，而不是新增独立参数

保持 `level` 单参数，扩展取值：`global`、`profile:<name>`，并兼容旧值 `project`。理由：所有现有调用点（前端、模型工具、测试）都以 `level` 作为唯一的目标标识，行数据回传的也是 `level`；扩展取值不会破坏协议形态，也不需要新增字段同步。行返回的 `level` 采用新格式 `profile:<name>`，前端标签由 profile 名生成。

### D2：唯一性以"目标命名空间"为界

既有实现用"活动 profile + 全局"两个文件做 serverName / id 唯一性检查。若延续这个范围，"把 desktop 上已有的服务复制到 web profile"会被拒绝。由于 DSH 的 profile 彼此独立（各自的补丁只被自己的实例加载），唯一性仅需在"目标 profile 补丁 + 全局补丁"内成立。这也避免同名服务在两个 profile 里产生语义冲突（各自实例各自加载）。跨 profile 复制时，页面会给出调用方指定或默认生成的新 id。

### D3：非活动 profile 只做文件操作，不承诺运行态

当前实例的 loader 只承载活动 profile 的条目，因此对非活动 profile：
- 不返回 `live`（启用/运行阶段）信息，前端不显示"重启"和"工具预览"按钮；
- 写操作照常修改目标补丁文件，但返回 `warning` 说明需在对应 profile 的实例重启后生效；
- 删除/启停同样只改目标文件。

### D4：主题适配不改用自定义下拉组件

用户选择保留原生 `<select>`。做法是给控件声明跟随主题的 `color-scheme` 与显式底色：
- 用一个插件自有的 `<style>` 节点写入 `:root{--mcpm-scheme:…;--mcpm-option-bg:…;--mcpm-option-fg:…;--mcpm-field-bg:…}`，CSS 规则引用这些变量；
- 通过 `MutationObserver` 监听根节点 `style` 与 body 的 `data-ds-dark-theme`，主题切换时重写变量，使下拉弹层与控件底色即时更新；
- 变量写在插件自有的 style 标签内，不污染 DSH 根节点的 inline style。

### D5：查看范围的默认值与兼容

`scope` 缺省为 `active`（= 当前活动 profile + 全局），与旧版返回一致，老前端与模型工具不受影响。`all` 时按 profile 分组返回，每行带 `profileName`。

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 误写其他 profile 的补丁 | 只有用户显式选择该 profile 才会写入；返回 warning；证据里验证"活动 profile 文件未动" |
| profile 枚举把 `node_modules` 或非 profile 目录当成 profile | 显式跳过 `node_modules`，要求目录内存在 `package.json` 或 `cordis.patch.yml` 才纳入列表 |
| 主题判断在某些壳里拿不到 DOM 线索 | 回退到 `prefers-color-scheme`，并保持浅色可读 |
| 旧前端仍传 `level: 'project'` | 解析层保留该等价映射 |

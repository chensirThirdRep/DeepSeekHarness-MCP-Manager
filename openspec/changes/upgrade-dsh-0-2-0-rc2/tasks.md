## 1. 元数据与版本

- [x] 1.1 `package.json`：`peerDependencies.@deepseek-ai/dsh-tools` 改为 `0.2.0-rc.2`（保持 `react` 为 `^18.2.0`）
- [x] 1.2 `package.json`：`devDependencies` 中 `@deepseek-ai/dsh-tools` 改为 `0.2.0-rc.2`、`@deepseek-ai/cordis` 改为 `~4.0.4`（另补齐 dsh-tools 的 peer 全集以支持测试加载）
- [x] 1.3 `package.json` 版本号升到 `2.3.0`

## 2. 路径解析适配

- [x] 2.1 `src/index.ts`：`ensurePaths()` 优先取活动 profile 上下文（name/dir/patchPath/home）产出路径结果
- [x] 2.2 `src/index.ts`：回退链改为 `profileContext` → `settings.prepareDocument()`（0.2.0 返回活动 profile 的 patch 文件）→ `$DSH_HOME`/`$DSH_PROFILE`/`$DSH_PROFILE_DIR` 线索 → 目录探测；失败时返回可诊断错误
- [x] 2.3 保持 `mcpm-list` 返回结构不变（`rows` / `paths` / `errors`），使页面无需改动

## 3. 测试

- [x] 3.1 fake ctx 支持活动 profile 上下文；新增用例：上下文可用时 `paths` 三项正确（另断言 `mcpm-add` 只改活动 profile）
- [x] 3.2 新增用例：上下文不可用时按回退链解析，且不固定优先 `web`
- [x] 3.3 新增用例：既无上下文也无线索时返回错误且不写入
- [x] 3.4 `npm test` 全绿（`tests 36 / pass 36 / fail 0`，含既有 guard/mcpm/skills 测试与新增 `paths.test.mjs`、`tools.test.mjs`）

## 4. 文档

- [x] 4.1 `README.md`：新增版本分流说明（0.1.x → 2.2.x；0.2.x → 2.3.0+）并更新安装命令示例
- [x] 4.2 `README.md` FAQ：新增"安装被兼容性校验拒绝"与"0.2.x 下路径/列表不对"条目，并纠正用户级技能可停用的旧描述
- [x] 4.3 `README_EN.md`：同步版本分流与 FAQ

## 5. 实机验证（DSH 0.2.0-rc.2，隔离 profile）

- [x] 5.1 干净安装：新 profile 中安装本插件不需要 `allow-version` 豁免（先移除 2.2.7 与 `compatibility.json`，再装 2.3.0 tgz → 成功）
- [x] 5.2 MCP：列表 / 新增 / 编辑 / 删除 / 启停 / 重启 / 导出 / 导入（全部 `ok:true`，导入参数名为 `json`）
- [x] 5.3 MCP：4 个模型工具（list / set_enabled / restart / add）注册与调用（`tests/tools.test.mjs` 断言注册名与可执行性；实机加载无错。实机未触发模型侧调用，见收尾说明）
- [x] 5.4 技能：列表（3 条：1 内置 + 2 用户级）/ 启停 / 持久化（重启后仍停用，状态文件 `<profileDir>/dsh-skill-manager.json`）/ 用户级只读拒绝；搜索为前端行为，见 5.7
- [x] 5.5 路径：`paths.project` 指向活动 profile（`mcpman-dev`）、`paths.home` 为 `~/.dsh`、`paths.profile` 为 `mcpman-dev`
- [x] 5.6 写入安全：每次写操作后核对目标文件与其他层级文件（停用→启用后 SHA256 一致；web profile 文件未被改动）
- [x] 5.7 页面：设置页「MCP 管理」「Skills 管理」渲染与操作人工确认（用户确认：页面正常渲染、可操作、无双页签）
- [x] 5.8 证据归档：`openspec/changes/upgrade-dsh-0-2-0-rc2/evidence/`（2.2.7 失败证据 + 2.3.0 通过证据 + 4 个采集脚本 + 说明）

## 6. 收尾

- [x] 6.1 清理临时目录（`.tmp-probe/`、`.npm-cache/` 已删除；验证实例已停止；`.gitignore` 已覆盖）
- [x] 6.2 提交到分支 `feat/dsh-0.2.0-rc2`（不发布 npm、不 archive change）

# 实机验收证据（DSH 0.2.0-rc.2 适配）

本目录保存 2.3.0 适配的实机证据与可复现脚本。**原始采集目录是运行期的 `.tmp-probe/`（已清理），这里是从中归档的关键文件。**

## 环境

- 运行时：DSH **0.2.0-rc.2**（桌面端 asar 内 `@deepseek-ai/dsh-desktop-runtime` 与升级后的全局 CLI 均为该版本，`dsh --version` = `0.2.0-rc.2`）
- 验证 profile：`~/.dsh/profiles/mcpman-dev`（隔离，不触碰 desktop / web）
- 被测插件：本地打包的 `@xxxyz/dsh-mcp-manager@2.3.0`（`npm pack` 产物，安装时不带 `allow-version` 豁免）
- 启动：`dsh --profile mcpman-dev --no-open --port 19399`（打印带 token 的 URL 后由脚本以 HTTP 调用 `POST /dsh-mcp-manager/api`）

## 文件

| 文件 | 内容 |
|---|---|
| `02rc2-mcpm-list.json` / `02rc2-skill-list.json` | **升级前的失败证据**：2.2.7 在 0.2.0-rc.2 上跑出来的 `paths` 全错（`home` = profile 目录、`profile` = `web`、`project` 指向不存在的嵌套路径），列表只剩 loader 来源条目、技能只剩 1 条 |
| `03-plugin-version.json` | 2.3.0 的 `plugin-version` 响应 |
| `03-mcpm-list.json` | 修好后首次 `mcpm-list`：`paths.project` = 活动 profile 的 patch、`home` = `~/.dsh`、`profile` = `mcpman-dev`，3 条真实配置条目（含 transport / url / command 等） |
| `03-add.json`、`03-list-after-add.json`、`03-edit.json`、`03-restart.json`、`03-remove.json` | 增 / 查 / 改 / 重启 / 删的往返结果（写操作只落活动 profile 的 `cordis.patch.yml`） |
| `03-export.json`、`03b-export.json` | `mcpm-export` 的 `{ok, json, savedTo}` 结构（`savedTo` 落在 `~/.dsh/mcp-manager-export.json`） |
| `03-skill-list.json`、`03b-skill-list.json` | 技能列表：3 条（1 内置 + 2 用户级），`complete: true` |
| `03-summary.txt` | 全量验收脚本的一次完整运行纪要 |
| `verify-3.mjs`、`verify-3b.mjs`、`verify-3c.mjs`、`verify-3d.mjs` | 采集脚本（Node 原生 fetch 调用插件 HTTP API），可直接重跑复现上述结果 |

## 复现

```powershell
dsh --profile mcpman-dev --no-open --port 19399   # 记下打印出的 token URL
node openspec/changes/upgrade-dsh-0-2-0-rc2/evidence/verify-3.mjs
```

## 未覆盖项（如实记录）

- **4 个 `mcp_manager_*` 模型工具**：注册由 `tests/tools.test.mjs` 断言、实机插件加载无错，但**未在实机触发模型侧调用**（需要真实会话与模型额度）。
- **设置页渲染**：属于浏览器行为，由人工确认（MCP 管理与 Skills 管理页面均正常渲染、可操作、无双页签）。
- **技能搜索**：前端过滤行为，随设置页一并通过人工确认。

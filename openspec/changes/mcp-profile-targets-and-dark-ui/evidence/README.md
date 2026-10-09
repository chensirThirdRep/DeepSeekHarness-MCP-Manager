# 证据：mcp-profile-targets-and-dark-ui

本目录保存 change `mcp-profile-targets-and-dark-ui` 的验证证据（中文说明，结构标题保留英文）。

## Environment

- DSH `0.2.0-rc.2`（全局 CLI：`C:\nvm4w\nodejs\dsh`）。
- 验证实例以隔离 profile `mcpman-dev` 启动，命令行：
  `node C:\Nt\nvm\v22.22.2\node_modules\@deepseek-ai\dsh\lib\bin.js --profile mcpman-dev --no-open --port 19399`
  （实际路径为 `C:\Nt\nvm\v22.22.2\...`，见脚本中的 baseUrl 参数；实例 PID 与端口每次启动会变）。
- 被写入的"其他 profile"选 `tui`（补丁初始内容为空数组 `[]`），避免污染用户日常环境。
- 部署到验证 profile 的产物：
  - `lib/index.js` sha256 `C8CC7F4F6E0721C67C985E52D10840091457FA35D6B8111D4C0006665F59D71B`
  - `lib/client.js` sha256 `14D624C7F4DF0C5E5B7C0372698CE6B7711B7482D57DB2CAE3DBFFAF95284336`

## Files

- `verify-4-scope-and-hints.mjs`：证据采集脚本。通过插件 HTTP API（`POST /dsh-mcp-manager/api`，header `x-dsh-plugin: dsh-mcp-manager`）驱动**真实运行中的 DSH 实例**，覆盖 profile 发现、查看范围、跨 profile 写入、唯一性、启停/编辑/删除文案、重启拒绝、非法输入与文件还原；结束时把三个补丁还原为初始字节。
- `verify-4-scope-and-hints.json`：脚本产出的机器可读结果（含 baseUrl、被探测的 profile、每条检查的 pass 与 detail）。

## How to run

```powershell
node openspec/changes/mcp-profile-targets-and-dark-ui/evidence/verify-4-scope-and-hints.mjs http://127.0.0.1:19399
```

## Result

`23 checks, 0 failed`（第二次运行；见下）。

第一次运行有 1 条断言失败：脚本原先断言 `scope=all` 必然包含"活动 profile 的条目"，而活动 profile 的补丁当时只含一条 `ui-settings-general` 配置、并没有 MCP 条目——这是断言写得太强，不是产品缺陷。脚本已改为在写入外部 profile 之后断言"外部 profile 的行在 scope=all 中可见"，代码内以 `NOTE (v2)` 标注。

关键检查与结论：

1. profile 动态发现：`<home>/profiles` 下 5 个 profile（`mcpman-dev*`、`desktop`、`dsh-tui`、`tui`、`web`）全部列出，活动 profile 带 `active` 标记并排首位，`node_modules` 未被当作 profile。
2. 查看范围：`scope=active`（3 行，当前 profile + 全局）看不到外部 profile 的条目；`scope=profile:tui` 能看到该条目且 `liveEligible=false`、`toolCount=0`；`scope=all` 覆盖所有 profile 且始终附加全局层。
3. 跨 profile 写入：`mcpm-add level=profile:tui` 真的写入 `profiles\tui\cordis.patch.yml`（217 → 490 字节），活动 profile 补丁 sha256 与全局补丁 sha256 均未变化；后续 set-enabled / edit / remove 同样只改目标文件。
4. 生效提示：写入/更新/删除分别返回 `已写入 profile "tui"…`、`已更新 profile "tui"…`、`已从 profile "tui" 中删除该条目…`，末尾统一说明"该 profile 需重启其 DSH 实例后生效"。
5. 运行态边界：外部 profile 的行不给 live/toolCount；`mcpm-restart` 被拒："重启只适用于当前实例加载的层级；profile \"tui\" 的 MCP 服务请在其自身的 DSH 实例中重启"。
6. 唯一性按目标命名空间：同一 profile 内重名 → "serverName \"mcpmverify4\" 已在 profile \"tui\" 中存在"；全局层内重名 → "已在 全局层 中存在"，且被拒的写入没有改到全局补丁。
7. 非法输入可诊断：`未知的层级: bogus`、`未知的查看范围: bogus`、`未找到 profile "does-not-exist"`。
8. 收尾还原：三个补丁的 sha256 均回到脚本开始时的值。

## UI / theme evidence（task 6.2 与 6.4）

- 可自动化的部分：`tests/profiles.test.mjs` 对 `lib/client.js` 做源码契约断言——存在 `--mcpm-option-bg` / `--mcpm-option-fg` / `color-scheme:var(--mcpm-scheme` / `select option` / `data-ds-dark-theme` / `colorScheme` / `prefers-color-scheme: dark` / `new MutationObserver` / `ensureTheme()`，且不再出现写死的 `profiles/web/cordis.patch.yml`，并包含 `profile:` 与 `查看范围`。
- 无法自动化的部分：原生 `<option>` 弹层的真实配色只能在浏览器里观察，因此 task 6.2 / 6.4 保持未勾选，等待人工确认。
- 人工确认用的环境：桌面 profile 的插件产物已同步为本次改动的产物（同步前副本保存在 `C:\Users\chenjunhao04\.dsh\attachments\mcpm-desktop-backup\`），重启桌面 app 后即可在 设置 → MCP 管理 看到新版界面。

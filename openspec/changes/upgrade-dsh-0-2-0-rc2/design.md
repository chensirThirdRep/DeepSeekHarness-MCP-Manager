# Design — 适配 DSH 0.2.0-rc.2

## 背景（实机复现的事实）

- 本机桌面端 DSH 运行时与全局 CLI 均为 0.2.0-rc.2（\`dsh --version\` = 0.2.0-rc.2）。
- 0.2.0-rc.2 的安装门禁在 \`dsh-app-boot\` 中实现：只检查 \`peerDependencies\` 里 \`@deepseek-ai/dsh\` / \`@deepseek-ai/dsh-*\` 的条目，用 \`semver.satisfies(runtimeVersion, requirement, { includePrerelease: true })\` 判定；不满足则安装与 profile 启动都被拒。豁免文件是 profile 本地的 \`compatibility.json\`。
- 0.2.0 起 \`settings.prepareDocument()\` 返回"当前活动 profile 的 \`cordis.patch.yml\`"（实现为 \`configEditor.documentPath\` ← \`profileContext.patchPath\`），不再是 \`$DSH_HOME/settings.yaml\`。
- 实测退化：\`paths.home\` 被推成 profile 目录、\`paths.profile\` 错报 \`web\`、\`paths.project\` 指向不存在的嵌套路径；MCP 列表因此读不到真实配置（只剩 loader 来源条目）；用户级技能扫描因此扫到不存在的目录。

## 决策 1：以运行时提供的活动 profile 信息作为路径权威来源

0.2.0 的 profile boot 会向插件上下文提供当前 profile 的上下文对象，字段含 \`name\`、\`dir\`、\`patchPath\`、\`home\`（\`home\` 由官方 \`resolveDshHome()\` 得出：显式配置 > \`$DSH_HOME\` > \`~/.dsh\`）。

因此 \`ensurePaths()\` 改为：

1. 先取活动 profile 上下文；可用时直接得到 \`{ home, profileDir, profileName, projectPatch, globalPatch }\`，其中 \`projectPatch = patchPath\`、\`globalPatch = home + cordis.patch.yml\`。
2. 取不到时回退到旧探测逻辑，但探测顺序改为：\`$DSH_PROFILE\` → \`$DSH_PROFILE_DIR\` → 旧文档路径（\`settings.prepareDocument()\` 的目录作为 DSH 主目录，仅当它不是补丁文件时）→ 仅探测活动 profile 的目录。
3. 仍然失败则返回可诊断错误（保留既有错误文案风格），不做任何写入。

**为什么不把新服务声明为必需注入**：注入失败会让整个插件加载失败，而回退链足以处理 0.2.0 的其它启动形态（同一 boot 路径都会提供该上下文）。插件仍以 0.2.0-rc.2 为唯一支持目标；回退是防御性设计，不是双版本支持。

## 决策 2：依赖声明对齐官方 0.2.0-rc.2

- \`peerDependencies\`：\`@deepseek-ai/dsh-tools\` 由 \`^0.1.2-rc.1\` 改为 \`0.2.0-rc.2\`（与官方 0.2.0-rc.2 包一致的精确版本）；\`react\` 保持 \`^18.2.0\`（运行时为 18.3.1）。
- \`devDependencies\`：\`@deepseek-ai/dsh-tools\` 改为 \`0.2.0-rc.2\`，\`@deepseek-ai/cordis\` 由 \`^4.0.1\` 改为 \`~4.0.4\`（官方 peer 范围）。
- 版本号升到 \`2.3.0\`。

## 决策 3：不动的部分

- \`cordis.patch.yml\`（bundle patch 与防双挂载 guard）：0.2.0 仍支持字符串形式的 \`dsh.bundle.patch\`，guard 表达式的失败模式与版本无关。
- \`lib/client.js\`：设置页槽位 \`settings.section\` 与客户端注入包在 0.2.0-rc.2 中仍然存在（已按包级类型面核对）。
- HTTP API 协议、4 个模型工具的名称与参数：0.2.0 下 \`webServer.register\`、\`tools.register\`、\`skills\`、\`fs\`、\`sandboxPolicy\` 的签名均未变化。

## 验证策略

1. **构建**：\`npm run build\`（tsc，strict）。
2. **单元测试**：\`npm test\`（node:test + fake ctx）。为路径解析新增用例：给出 profile 上下文时使用之；未给出时按回退链解析；无法确定时返回错误。
3. **实机验证**：在隔离 profile \`mcpman-dev\` 上以 0.2.0-rc.2 启动实例（不干扰用户正在使用的 desktop/web profile），通过 HTTP API 逐条执行验收清单，并与探测端口上的页面渲染做人工确认。
4. **证据留存**：所有请求/响应与配置文件哈希存入 \`.tmp-probe/evidence/\`（该目录已在 \`.gitignore\` 中）。

## 已知限制（保留，不在本次修改）

- 用户级技能只读（受 fs 沙箱与技能覆盖机制限制），停用需手改 \`SKILL.md\`。
- 插件写 profile 的 patch 文件与 0.2.0 自带的 plugin manager 写同一文件，两者都用原子写；本次不改变写入方式。

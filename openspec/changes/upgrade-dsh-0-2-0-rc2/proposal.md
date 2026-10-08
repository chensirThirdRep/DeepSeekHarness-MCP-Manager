## Why

\`@xxxyz/dsh-mcp-manager\` 2.2.7 面向 DSH 0.1.x 发布。在 DSH 0.2.0-rc.2 上，本插件有两个已经实机复现的失败：

1. **装不上**。0.2.0-rc.2 的 dsh CLI 新增了安装门禁：安装与 profile 启动都会用插件声明的 DSH peer 范围去校验当前 dsh 版本。本插件声明 \`@deepseek-ai/dsh-tools: ^0.1.2-rc.1\`，无法满足 0.2.0-rc.2，安装被直接拒绝（\`installation rejected: Plugin @xxxyz/dsh-mcp-manager@2.2.7 is incompatible with dsh 0.2.0-rc.2\`）。
2. **装上后功能退化**。用 \`dsh plugin allow-version\` 显式豁免后插件可以安装、可以加载，但 \`settings.prepareDocument()\` 的语义已从「$DSH_HOME/settings.yaml」变为「当前活动 profile 的 cordis.patch.yml」。插件据此推导出的路径整体错位（实测把 \`~/.dsh/profiles/mcpman-dev\` 当成 DSH 主目录、把 profile 名错报为 \`web\`），导致 MCP 服务器列表读不到真实配置、用户级技能扫描扫到不存在的目录。

目标是在 0.2.0-rc.2 上恢复 2.2.7 的全部既有能力：不新增功能、不顺手重构、不改变页面交互。

## What Changes

- **BREAKING**：插件只支持 DSH 0.2.0-rc.2 及以后的运行时。旧 DSH（0.1.x）用户继续使用已发布的 2.2.7，不提供双版本兼容分支。
- 安装元数据对齐 0.2.0-rc.2：\`peerDependencies\` 与 \`devDependencies\` 中的 \`@deepseek-ai/dsh-tools\`、\`@deepseek-ai/cordis\` 改为与官方 0.2.0-rc.2 包一致的版本声明，使 dsh CLI 的安装门禁可以通过，不再需要 \`allow-version\` 豁免。
- 补丁路径解析改为以运行时的权威来源为准：优先使用当前活动 profile 的 patch 路径与 DSH 主目录，只有在拿不到该信息时才回退到旧的文件探测逻辑；回退探测时也优先当前活动 profile，而不是固定优先 \`web\`。
- 版本号升到 2.3.0，README（中/英）增加版本分流说明（DSH 0.1.x 用 2.2.x，0.2.x 用 2.3.0+）并更新 FAQ 表。
- 验收留痕：既有单元测试全绿、构建通过，并在真实 0.2.0-rc.2 实例上逐条验证 MCP 管理与技能管理的全部操作。

## Capabilities

### New Capabilities

- \`mcp-server-management\`: MCP 服务器清单与增删改启停必须作用于当前活动 profile 与 DSH 主目录下的真实配置文件，并在页面上如实呈现每台服务器的层级、传输方式与运行状态。
- \`skill-management\`: 技能清单与启停必须来自运行时可见的技能集合，并包含 DSH 主目录下的用户级技能；用户级技能保持只读语义。
- \`dsh-runtime-compatibility\`: 插件必须以与目标 DSH 运行时匹配的兼容性声明发布，使安装与 profile 启动的兼容性校验可以通过。

### Modified Capabilities

（无：本项目此前没有 \`openspec/specs/\` 基线规格，本次按新能力建立行为契约。）

## Impact

- 代码：\`src/index.ts\`（路径解析）、\`package.json\`（版本与依赖声明）、\`README.md\` / \`README_EN.md\`（版本分流与 FAQ）、\`tests/\`（路径解析的回归覆盖）、构建产物 \`lib/index.js\`。
- 不变部分：\`cordis.patch.yml\`（bundle patch 与防双挂载 guard）、\`lib/client.js\`（客户端设置页）、HTTP API 协议与 4 个模型工具的名字与参数。
- 依赖：\`@deepseek-ai/dsh-tools\`、\`@deepseek-ai/cordis\`（仅版本声明）、运行时服务 \`profileContext\`（0.2.0 新增，作为路径权威来源；缺失时回退）。
- 风险：本机已验证桌面端 DSH 运行时即 0.2.0-rc.2；旧 DSH 用户不被支持是显式且已确认的取舍。

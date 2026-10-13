# dsh-mcp-manager

<!-- Hero -->
<div align="center">
  <b style="font-size: 1.15em;">DeepSeek Harness 的 MCP 服务与技能管理器：装没装、连没连、一页管完。</b><br /><br />
  <code>服务器列表</code> <code>新增 / 编辑 / 删除</code> <code>启用 / 停用</code> <code>重启</code> <code>工具数健康</code> <code>JSON 导出 / 导入</code> <code>任意 profile 写入</code><br />
  <code>Skills 浏览 / 搜索 / 停用</code> <code>4 个模型工具</code> <code>HTTP API</code> <code>dsh plugin 一条命令</code><br /><br />
  <b>设置 → MCP 管理</b> 管理当前 profile、本机任意 profile 与全局层 <code>cordis.patch.yml</code> 中的 <code>@deepseek-ai/dsh-mcp-client</code> 行，<br />
  <b>设置 → Skills 管理</b> 浏览并停用各来源的技能——无需再手改配置文件，所有修改即改即生效（HMR 热应用），重启、升级后依然存在。
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@xxxyz/dsh-mcp-manager?logo=npm&color=cb3837)](https://www.npmjs.com/package/@xxxyz/dsh-mcp-manager)
[![License](https://img.shields.io/github/license/xxxyz/DeepSeekHarness-MCP-Manager?color=blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js)](package.json)
[![GitHub](https://img.shields.io/badge/GitHub-xxxyz%2FDeepSeekHarness--MCP--Manager-181717?logo=github)](https://github.com/xxxyz/DeepSeekHarness-MCP-Manager)
[![dsh.market](https://img.shields.io/badge/dsh.market-%E2%9C%93-3fb950)](https://dsh.market)
[![awesome-dsh-plugin](https://img.shields.io/badge/awesome--dsh--plugin-%E5%B7%B2%E6%94%B6%E5%BD%95-3fb950)](https://awesome-dsh-plugin.com)
[![dsh-suite](https://img.shields.io/badge/featured%20on-dsh--suite-4d6bfe)](https://whyihaveyou.github.io/dsh-suite/)

</div>

<div align="center">
  🛒 已收录于 <a href="https://dsh.market"><b>dsh.market</b></a> · <a href="https://awesome-dsh-plugin.com"><b>awesome-dsh-plugin.com</b></a> · <a href="https://whyihaveyou.github.io/dsh-suite/"><b>dsh-suite</b></a>
</div>

<div align="center">
  🌏 <a href="./README.md"><b>中文</b></a> · <a href="./README_EN.md">English</a>
</div>

<br />

<p align="center"><img src="show.png" alt="dsh-mcp-manager 设置 → MCP 管理 页面图例" /></p>

## ✨ 功能一览

- **📋 服务器列表**：可用“查看范围”切换列表范围（当前 profile / 指定 profile / 全部 profile，全局层条目始终附带）；列出已配置的 MCP 服务器（`@deepseek-ai/dsh-mcp-client` 实例）——`serverName`、传输方式（`stdio` / `streamable-http`）、URL / 命令、启用状态、工具调用超时、loader 实时加载阶段、已注册工具数
- **➕ 新增 / ➖ 删除**：表单添加 MCP 服务器（支持 env / headers / args / 工具调用超时），带格式与重名校验；一键删除
- **✏️ 就地编辑**：点某一行的“编辑”，表单在该行卡片**下方就地展开**（自动滚入视口、该行高亮），不用划回列表顶部；保存后自动收起并显示新值，取消不写入
- **🔌 启用 / 停用**：随时切换，工具随之热连接 / 热断开
- **🔄 重启**：disable + re-enable，自动重连并重新同步工具
- **⏱️ 工具调用超时**：为每台服务器单独设置 `toolCallTimeoutMs`（秒，1–3600），慢工具不再被固定 60s 超时打断；填 60 或留空 = 跟随客户端默认（不写入配置文件）
- **💾 持久化**：写入**任意 profile**（`~/.dsh/profiles/<name>/cordis.patch.yml`，默认当前活动 profile）或**全局层**（`~/.dsh/cordis.patch.yml`，对所有 profile 生效且优先级最高），重启后保留；页面底部显示文件路径
- **🎯 动态 profile**：级别下拉自动枚举 `~/.dsh/profiles` 下的全部 profile（标注当前活动 profile）；写入非活动 profile 会提示“该 profile 需重启其 DSH 实例后生效”
- **🎨 主题适配**：表单控件与原生下拉弹层跟随 DSH 深浅主题，切换主题后即时更新
- **🩺 健康检查**：每台服务器实时工具数与 loader 阶段，异常一目了然
- **📦 备份 / 恢复**：JSON 导出 / 导入（含每台服务器的工具调用超时），合并新增、已存在自动跳过
- **🤖 模型工具**：宿主注册 4 个 `mcp_manager_*` 工具，模型可直接查询与操作 MCP 服务（`mcp_manager_add` 支持 `timeoutSeconds`）
- **🧠 技能管理**：**设置 → Skills 管理** 页列出 DSH 全部技能，按来源分组（项目级 / 运行时 / 自定义 / 用户级 / 内置 / 插件自带）并支持搜索与按 provider 折叠；一键停用 / 启用任意技能（rank-0 override provider，任何来源层级都可禁），状态持久化到 `dsh-skill-manager.json`，HMR 即时生效
- **🌐 HTTP API**：`POST /dsh-mcp-manager/api`（JSON `{op, args}` → `{ok, ...}`），供客户端与脚本调用。带跨站（CSRF）防护：仅接受 POST、必须携带 `x-dsh-plugin: dsh-mcp-manager` 请求头、校验同源 Origin（curl 等本地脚本无需 Origin）
- **📦 一键安装**：`dsh plugin --profile web add` 一条命令装包 + 自动挂载（Windows / macOS / Linux）

## 🚀 安装

**前置**：已装好 DSH（`dsh web` 能正常运行），Node.js ≥ 18、pnpm ≥ 9。

**版本对应（重要）**：用 `dsh --version` 确认 DSH 版本，再装对应插件版本。

| DSH 版本 | 应装插件版本 |
|---|---|
| 0.1.x | `@xxxyz/dsh-mcp-manager@2.2.x` |
| 0.2.x（`0.2.0-rc.2` 起） | `@xxxyz/dsh-mcp-manager@2.3.0` 及以上 |

DSH 自 0.2.0-rc.2 起新增**插件兼容性校验**：安装与启动时按插件 `peerDependencies` 声明的 DSH 版本范围比对 `dsh --version`，不匹配直接拒绝安装。2.3.0 声明的是 0.2.0-rc.2，可直接安装；2.2.7 及更早版本在 0.2.0-rc.2 上会被拒（见下方常见问题）。

### 方式一 · dsh 命令安装（推荐）

一条命令装包 + **自动挂载**（`dsh.bundle.patch` 机制，无需手动改任何配置文件）：

```sh
dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest
```

装完**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可看到 **设置 → MCP 管理**（DSH 对 client 改动热加载，无需重启；仅 host 半更新时需要重启）。

### 方式二 · 让 DSH 自己装

把下面这段提示词发给任意一个 DSH 会话：

```text
帮我安装 dsh-mcp-manager 插件（DSH MCP 服务管理器），步骤：
1. 执行 dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest
2. 完成后提醒我硬刷新浏览器（Cmd/Ctrl+Shift+R）
遇到报错先查 https://github.com/xxxyz/DeepSeekHarness-MCP-Manager README 的常见问题表。
```

**更新**

```sh
dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest
```

也可把 `~/.dsh/profiles/web/package.json` 里的版本号改高后 `pnpm install`。改完**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可（client 改动无需重启 DSH）。

<details>
<summary><b>常见问题</b></summary>

| 现象 | 原因与解决 |
|---|---|
| 装完设置里没有「MCP 管理」 | 硬刷新（Cmd/Ctrl+Shift+R）；仍没有就重启 DSH 一次。 |
| 页面出现**两个 MCP 页签 / 工具重复** | 双挂载：同时存在旧的 loader 行与新的 bundle 条目。删掉 `cordis.patch.yml` 里的旧 loader 行，或 `dsh.profile.bundles` 里的条目，重启 DSH。 |
| 之前用旧方式装过，现在想升级 | 新版 bundle 自带防双挂载 guard，直接 `dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest` 不会重复挂载。要切到新代码：删掉 `~/.dsh/profiles/web/cordis.patch.yml` 里的 `- id: mcp-manager` 行，再删 `local-packages/dsh-mcp-manager` 与 `profiles/node_modules/dsh-mcp-manager` 两个副本，重启 DSH。 |
| 提示 `dsh: command not found` | 先安装 DSH；或直接用 `npx -y --package @deepseek-ai/dsh dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest`。 |
| `npm view` 报 404 | 国内镜像（npmmirror）同步有延迟：加 `--registry=https://registry.npmjs.org` 或稍等再试。 |
| 修改配置后未生效 | 所有修改走 HMR 热应用，等 1–2 秒自动刷新；页面会自动轮询。 |
| 安装报 `dsh: installation rejected: Plugin @xxxyz/dsh-mcp-manager@2.2.7 is incompatible with dsh 0.2.0-rc.2` | 插件版本与 DSH 版本不匹配：DSH 0.1.x 用 `@2.2.x`，DSH 0.2.x 用 `@2.3.0` 及以上。**不要**用 `allow-version` 豁免旧版：2.2.7 在 0.2.x 下会把 MCP 配置写到错误的 profile 文件、技能列表也不完整。 |
| DSH 升到 0.2.x 后「MCP 管理」里路径/列表不对（写进了 web profile、只列出 `include:` 行） | 2.2.7 依赖 `settings.prepareDocument()` 猜 DSH 主目录，0.2.0 改了该接口语义。2.3.0 改为读取运行时 `profileContext`，路径始终对准当前活动 profile；升级到 `@2.3.0` 即可。 |
| 技能列表里少了自己的技能 | 用户级技能来自 `~/.dsh/skills`；列表按来源分组显示（用户级标记为 `user-dsh`）。用户级技能**只读**，要停用请直接改 `SKILL.md` 的 `user-invocable`。 |

</details>

<details>
<summary><b>卸载</b></summary>

```sh
dsh plugin --profile web remove @xxxyz/dsh-mcp-manager
```

然后重启 DSH。

</details>

## 📖 使用说明

打开 **设置 → MCP 管理**：

- **添加服务器**：填写 `serverName`（唯一，1–32 位 `[A-Za-z0-9_-]`）、传输方式及对应字段（`streamable-http` 填 URL / headers；`stdio` 填 command / args / env），选择级别（默认当前 profile，可切换为本机任意 profile 或全局层）。面板做格式与重名校验。
- **工具调用超时**：表单里的「工具调用超时（秒，1–3600）」写入 DSH 客户端的 `toolCallTimeoutMs`（毫秒，秒 × 1000）；**填 60 或留空 = 不写该字段**，跟随客户端默认 60 s。只作用于**工具调用（`tools/call`）**：连接 / 初始化 / 列工具阶段用的是 MCP SDK 默认 60 s，插件配置改不了。列表每行显示当前值，未设置时显示「默认 60s（未写入配置）」。详细判定见 [配置 → 工具调用超时](#工具调用超时toolcalltimeoutms)。
- **级别下拉**：自动列出 `~/.dsh/profiles` 下的全部 profile，当前活动 profile 置顶标注；写入非活动 profile 的条目不影响当前实例，页面提示“需重启该 profile 的 DSH 实例后生效”，且不提供重启 / 工具预览动作。
- **查看范围**：切换列表显示当前 profile、某个指定 profile 或全部 profile（全局层条目始终附带）。
- 每张卡片显示实时状态、连接目标与工具数；可 **启用 / 停用**、**重启**、**编辑**、**删除**。
- **就地编辑**：点某一行的“编辑”，表单在该行卡片下方展开（自动滚入视口、该行高亮），不必回到列表顶部；保存后自动收起并显示新值，取消不写入。
- **备份 / 恢复**：一键导出 JSON，或粘贴 JSON 导入（合并新增，已存在自动跳过）。
- 页面底部显示正在编辑的补丁文件路径。

打开 **设置 → Skills 管理**：

- **浏览 / 搜索**：列出 DSH 全部技能，按来源分组（项目级 / 运行时 / 自定义 / 用户级 / 内置 / 插件自带），组内按 provider 折叠；搜索框实时过滤。`~/.dsh/skills/` 下的用户级技能（2.2.0+）同样可见——即使官方 scoped 层不向无 scope 查询暴露它们。
- **启用 / 停用**：一键切换技能启用状态——通过 rank-0 override provider（`dsh-mcp-manager-override`）实现。用户级（`user-dsh`）技能由 DSH 文件系统管理，**仅支持查看**：如需停用请直接编辑其 `SKILL.md` 的 `user-invocable` 字段。
- **持久化**：停用状态写入 `<profileDir>/dsh-skill-manager.json`，重启后保留；改动经 HMR 即时生效。

## ⚙️ 配置

插件自身在 loader 行中的配置：

| 字段 | 说明 |
|---|---|
| `version` | loader 行 `config.version`，仅用于触发 HMR 重应用；官方通道安装下由 bundle 自动管理，无需手动修改。 |
| `token` | **可选**访问令牌（写操作鉴权，纵深防御）。设置后写操作（增删改/启停/重启/导入导出/技能停用）须带 `x-dsh-token: <token>` 头；设置页提供令牌输入框（保存在浏览器 localStorage）。也可用环境变量 `DSH_MCP_MANAGER_TOKEN` 配置。默认关闭。 |

> **为什么需要 token？** 插件的 CSRF 防护只拦"跨站浏览器请求"——它假设 DSH web 只监听本机（`127.0.0.1`）。一旦你通过端口转发、`dsh-web-lan-access` 类插件或反向代理把 3080 端口暴露到局域网/公网，**任何能访问该端口的人都直接获得完整写权限**：可以新增/修改 MCP 服务器，而 `stdio` 服务的 `command` 字段可填任意可执行文件——等同于**远程任意代码执行**。token 就是为这种暴露场景加的最后一道闸：没有密钥就无法做任何写操作，即使端口被暴露也不能注入命令。本地单机使用不需要配置。

loader 行必须为 **`insert` 块**形式（DSH patch 方言中普通 `- id:` 行只是对已存在条目的覆盖，无法新增插件）：

```yaml
- insert:
    - id: dsh-mcp-manager
      name: '@xxxyz/dsh-mcp-manager'
      config:
        token: 你的访问令牌   # 可选：开启写操作鉴权
```

> 无需手动写这行——`dsh plugin add` 的 bundle patch 会自动插入（见 `cordis.patch.yml`）。

### 工具调用超时（`toolCallTimeoutMs`）

每台 MCP 服务器可单独设置工具调用超时。插件**对外统一用秒**（字段名 `timeoutSeconds`），只在写补丁文件时换算成 DSH 客户端要的**毫秒**（`toolCallTimeoutMs`）。表单、HTTP API（`mcpm-add` / `mcpm-edit`）、模型工具（`mcp_manager_add`）、导出 JSON 全都用秒。

| 场景 | 行为 |
|---|---|
| 填 1–3600 的整数秒 | 写入 `toolCallTimeoutMs: <秒 × 1000>` |
| 填 60、留空，或新增时不填 | 不写该字段，跟随 DSH 客户端默认 **60000 ms** |
| 编辑时不填（例如只改了 args） | 保留原有值，不会被静默重置 |
| 编辑时填 60 或清空 | 删除该字段（等价于跟随默认） |
| 越界 / 非整数（0、3601、1.5、abc） | 拒绝写入并报错，补丁文件不变 |

```yaml
- insert:
    - id: mcp-slow-tool
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: "slow-tool"
        transport: "streamable-http"
        url: "https://host/mcp"
        toolCallTimeoutMs: 300000   # 300 秒
```

> **边界（重要）**：该字段只作用于**每一次 `tools/call` 调用**。服务器**连接 / 初始化 / 列工具**（`initialize`、`tools/list`）阶段用的是 MCP SDK 的默认 60000 ms，DSH 客户端与插件都没有对应配置项——如果失败发生在启动阶段，调大这个值没有用。
> 导出 / 导入（备份）会一并带上该值：未设置的条目导出为 `null`，导入后仍不写字段；旧导出文件（无该字段）照常导入。

## 🏗️ 架构

- **宿主端**（`src/index.ts` → `lib/index.js`，对象形态 Cordis 插件 `{name, inject, apply}`）：`inject` 声明 `timer/fs/settings/sandboxPolicy/webServer/tools`，框架保证就绪并在依赖消失时自动重载——这是插件跨 DSH 升级存活的机制。注册 4 个模型工具（`ctx.tools.register(defineTool(...))`）与精确路由 `POST /dsh-mcp-manager/api`（`ctx.effect` 作用域化清理）；对 `cordis.patch.yml` 做行级 CRUD（迷你 YAML 解析 + 按文件写锁）。
- **浏览器端**（`lib/client.js`，ModuleLoader CJS bundle）：注册 设置 → MCP 管理 页（`settings.section` 槽位，order 16），经同源 `fetch('/dsh-mcp-manager/api')` 与宿主通信，不直接访问文件系统。
- **loader 行**：由 `dsh plugin add` 的 bundle patch 自动插入，client-modules 服务扫描启用的条目并下发客户端 bundle。

## 🛠️ 开发

```bash
npm install
npm run build        # tsc -p tsconfig.json → lib/index.js（宿主端）
```

- 宿主插件源码：`src/index.ts`；浏览器 bundle：`lib/client.js`（手写，无需构建）
- 包本身纯 JS、零依赖、跨平台；构建只需 devDependencies（typescript、`@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@types/node`）
- 发布：`npm version patch && npm publish`（`prepublishOnly` 自动构建；scoped 包已配置 `publishConfig.access: public`）

## 许可证

MIT

# dsh-mcp-manager

<!-- Hero -->
<div align="center">
  <b style="font-size: 1.15em;">Manage every MCP server and skill in DeepSeek Harness from one settings page — install, configure, monitor.</b><br /><br />
  <code>server list</code> <code>add / edit / delete</code> <code>enable / disable</code> <code>restart</code> <code>tool-count health</code> <code>JSON export / import</code><br />
  <code>Skills browse / search / disable</code> <code>4 model tools</code> <code>HTTP API</code> <code>dsh plugin one-command</code><br /><br />
  <b>Settings → MCP 管理</b> manages <code>@deepseek-ai/dsh-mcp-client</code> rows in your project-level and
  global <code>cordis.patch.yml</code>; <b>Settings → Skills 管理</b> browses and disables skills from every
  source — no hand-editing, every change applies live via HMR, survives restarts and upgrades.
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@xxxyz/dsh-mcp-manager?logo=npm&color=cb3837)](https://www.npmjs.com/package/@xxxyz/dsh-mcp-manager)
[![License](https://img.shields.io/github/license/xxxyz/DeepSeekHarness-MCP-Manager?color=blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js)](package.json)
[![GitHub](https://img.shields.io/badge/GitHub-xxxyz%2FDeepSeekHarness--MCP--Manager-181717?logo=github)](https://github.com/xxxyz/DeepSeekHarness-MCP-Manager)
[![dsh.market](https://img.shields.io/badge/dsh.market-%E2%9C%93-3fb950)](https://dsh.market)
[![awesome-dsh-plugin](https://img.shields.io/badge/awesome--dsh--plugin-listed-3fb950)](https://awesome-dsh-plugin.com)
[![dsh-suite](https://img.shields.io/badge/featured%20on-dsh--suite-4d6bfe)](https://whyihaveyou.github.io/dsh-suite/)

</div>

<div align="center">
  🛒 Listed on <a href="https://dsh.market"><b>dsh.market</b></a> · <a href="https://awesome-dsh-plugin.com"><b>awesome-dsh-plugin.com</b></a> · <a href="https://whyihaveyou.github.io/dsh-suite/"><b>dsh-suite</b></a>
</div>

<div align="center">
  🌏 <a href="./README.md">中文</a> · <a href="./README_EN.md"><b>English</b></a>
</div>

<br />

<p align="center"><img src="show.png" alt="dsh-mcp-manager Settings → MCP 管理 page" /></p>

## ✨ Features

- **📋 Server list** — every configured MCP server (`@deepseek-ai/dsh-mcp-client` instance): `serverName`, transport (`stdio` / `streamable-http`), URL / command, enabled state, live loader phase, registered tool count
- **➕ Add / ➖ Delete** — form-based (env / headers / args supported) with format and duplicate-name validation; one-click delete
- **🔌 Enable / Disable** — flip at any time, tools hot-connect / hot-disconnect
- **🔄 Restart** — disable + re-enable, reconnect and re-sync tools automatically
- **💾 Persistence** — written to the **project-level** (`profiles/<profile>/cordis.patch.yml`) or **global** (`~/.dsh/cordis.patch.yml`) patch file; survives restarts; the file path is shown at the bottom of the page
- **🩺 Health check** — live tool counts and loader phase per server, problems visible at a glance
- **📦 Backup / Restore** — JSON export / import; merges new entries, skips existing ones
- **🤖 Model tools** — four `mcp_manager_*` tools registered on the host, so the model can query and manage MCP servers directly
- **🧠 Skill management** — the **Settings → Skills 管理** page lists every DSH skill grouped by source (project / runtime / custom / user / built-in / plugin-bundled) with search and per-provider collapse; enable / disable any skill in one click (rank-0 override provider, so every source level including project-level is disable-able), persisted to `dsh-skill-manager.json`, applied live via HMR
- **🌐 HTTP API** — `POST /dsh-mcp-manager/api` (JSON `{op, args}` → `{ok, ...}`) for the client and scripts. Cross-site (CSRF) protected: POST-only, requires the `x-dsh-plugin: dsh-mcp-manager` request header, and checks the Origin is same-origin (local scripts without an Origin are fine)
- **📦 One-command install** — `dsh plugin --profile web add` installs and mounts automatically (Windows / macOS / Linux)

## 🚀 Install

**Prerequisite**: DSH installed and running (`dsh web` works), Node.js ≥ 18, pnpm ≥ 9.

**Version pairing (important)**: check `dsh --version` and install the matching plugin version.

| DSH version | Plugin version |
|---|---|
| 0.1.x | `@xxxyz/dsh-mcp-manager@2.2.x` |
| 0.2.x (since `0.2.0-rc.2`) | `@xxxyz/dsh-mcp-manager@2.3.0` or later |

Since 0.2.0-rc.2 DSH **validates plugin compatibility**: install and boot compare the DSH ranges declared in the plugin's `peerDependencies` against `dsh --version` and refuse a mismatch. 2.3.0 declares 0.2.0-rc.2 and installs cleanly; 2.2.7 and earlier are rejected on 0.2.0-rc.2 (see the FAQ below).

### Method 1 · dsh command (recommended)

One command installs the package and **auto-mounts** it (the `dsh.bundle.patch` mechanism — no manual config file edits needed):

```sh
dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest
```

After installing, **hard-refresh the browser** (Cmd/Ctrl+Shift+R) and open **Settings → MCP 管理** (DSH hot-reloads client changes; a full restart is only needed for host-half changes).

### Method 2 · Let DSH install it

Paste this prompt into any DSH conversation:

```text
Install the dsh-mcp-manager plugin (DSH MCP server manager):
1. Run dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest
2. When done, remind me to hard-refresh the browser (Cmd/Ctrl+Shift+R)
If you hit an error, check https://github.com/xxxyz/DeepSeekHarness-MCP-Manager README's FAQ table.
```

**Update**

```sh
dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest
```

Or bump the version in `~/.dsh/profiles/web/package.json` and run `pnpm install`. Hard-refresh the browser afterwards (Cmd/Ctrl+Shift+R) — client changes are hot-reloaded; only host-half changes need a restart.

<details>
<summary><b>FAQ</b></summary>

| Symptom | Cause & fix |
|---|---|
| No "MCP 管理" in Settings after install | Hard-refresh (Cmd/Ctrl+Shift+R); if still missing, restart DSH once. |
| **Two MCP tabs / duplicated tools** | Double mount: both a legacy loader row and the new bundle entry exist. Delete the old loader row from `cordis.patch.yml`, or the `dsh.profile.bundles` entry, then restart DSH. |
| Upgrading from a legacy script install | The new bundle has a built-in double-mount guard — `dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest` won't crash. To actually switch to the new code: remove the old `- id: mcp-manager` row from `~/.dsh/profiles/web/cordis.patch.yml`, delete `local-packages/dsh-mcp-manager` and `profiles/node_modules/dsh-mcp-manager`, then restart DSH. |
| `dsh: command not found` | Install DSH first, or use `npx -y --package @deepseek-ai/dsh dsh plugin --profile web add @xxxyz/dsh-mcp-manager@latest`. |
| `npm view` reports 404 | Local mirror (npmmirror) sync lag: add `--registry=https://registry.npmjs.org` or wait a moment. |
| Config changes don't take effect | All changes apply via HMR within 1–2 s; the page auto-polls. |
| `dsh: installation rejected: Plugin @xxxyz/dsh-mcp-manager@2.2.7 is incompatible with dsh 0.2.0-rc.2` | The plugin and DSH versions do not match: use `@2.2.x` on DSH 0.1.x and `@2.3.0`+ on DSH 0.2.x. Do **not** grant an `allow-version` exemption to the old release: 2.2.7 writes MCP config into the wrong profile file on 0.2.x and shows an incomplete skill list. |
| After upgrading DSH to 0.2.x the paths/list in "MCP 管理" look wrong (writes go to the web profile, only `include:` rows are listed) | 2.2.7 guessed the DSH home from `settings.prepareDocument()`, whose semantics changed in 0.2.0. 2.3.0 reads the runtime `profileContext` instead, so paths always follow the active profile. Upgrade to `@2.3.0`. |
| My own skills are missing from the list | User-level skills come from `~/.dsh/skills` and are grouped under the `user-dsh` source. They are **view-only**; to disable one, edit `user-invocable` in its `SKILL.md`. |

</details>

<details>
<summary><b>Uninstall</b></summary>

```sh
dsh plugin --profile web remove @xxxyz/dsh-mcp-manager
```

Then restart DSH.

</details>

## 📖 Usage

Open **Settings → MCP 管理**:

- **Add a server**: enter `serverName` (unique, 1–32 chars of `[A-Za-z0-9_-]`), the transport and its fields (`streamable-http` → URL / headers; `stdio` → command / args / env), and the level (project / global). The form validates format and duplicate names.
- Each card shows live status, the connection target and the tool count; you can **enable / disable**, **restart**, **edit** and **delete**.
- **Backup / Restore**: export the configuration as JSON with one click, or paste JSON to import (merges new entries, skips existing ones).
- The file path being edited is shown at the bottom of the page.

Open **Settings → Skills 管理**:

- **Browse / Search**: lists every DSH skill grouped by source (project / runtime / custom / user / built-in / plugin-bundled), collapsed per provider; the search box filters live. User-level skills under `~/.dsh/skills/` (2.2.0+) are listed too — even though the official scoped layer never exposes them to scope-less queries.
- **Enable / Disable**: toggle a skill in one click — implemented with a rank-0 override provider (`dsh-mcp-manager-override`). User-level (`user-dsh`) skills are owned by the DSH filesystem and are **view-only**: to disable one, edit `user-invocable` in its `SKILL.md`.
- **Persistence**: disabled state is written to `<profileDir>/dsh-skill-manager.json`, survives restarts, and applies live via HMR.

## ⚙️ Configuration

Configuration of the plugin itself on its loader row:

| Field | Description |
|---|---|
| `version` | The loader row's `config.version`, only used to trigger an HMR re-apply; auto-managed by the bundle channel — no manual edits needed. |
| `token` | **Optional** access token (write-op auth, defense in depth). When set, state-changing ops (add/edit/remove/enable/restart/import/export/skill-toggle) require the `x-dsh-token: <token>` header; the settings pages provide a token input (stored in browser localStorage). Can also be set via the `DSH_MCP_MANAGER_TOKEN` env var. Off by default. |

> **Why is the token needed?** The plugin's CSRF protection only blocks *cross-site browser* requests — it assumes DSH web listens on localhost (`127.0.0.1`) only. Once you expose port 3080 to a LAN or the public internet (port forwarding, a `dsh-web-lan-access`-style plugin, or a reverse proxy), **anyone who can reach the port gets full write access**: they can add/modify MCP servers, and a `stdio` server's `command` field accepts any executable — i.e. **remote arbitrary code execution**. The token is the last gate for exactly this exposure scenario: without the secret, no write op succeeds even when the port is exposed, so commands cannot be injected. Local single-machine use does not need it.

The loader row must be an **`insert` block** (in DSH's patch dialect a plain `- id:` row only overrides existing entries and can never add a new plugin):

```yaml
- insert:
    - id: dsh-mcp-manager
      name: '@xxxyz/dsh-mcp-manager'
      config:
        token: your-access-token   # optional: enable write-op auth
```

> You don't need to write this row manually — `dsh plugin add` inserts it automatically via the bundle patch (see `cordis.patch.yml`).

## 🏗️ Architecture

- **Host half** (`src/index.ts` → `lib/index.js`, an object-form Cordis plugin `{name, inject, apply}`): `inject` declares `timer/fs/settings/sandboxPolicy/webServer/tools` — the framework guarantees they are ready and reloads the plugin if one disappears, which is how the plugin survives DSH upgrades. Registers four model tools (`ctx.tools.register(defineTool(...))`) and the exact route `POST /dsh-mcp-manager/api` (scoped cleanup via `ctx.effect`); line-level CRUD on `cordis.patch.yml` (mini YAML parser + per-file write lock).
- **Browser half** (`lib/client.js`, ModuleLoader CJS bundle): registers the Settings → MCP 管理 page (`settings.section` slot, order 16) and talks to the host through same-origin `fetch('/dsh-mcp-manager/api')` — it never touches the filesystem directly.
- **Loader row**: inserted automatically by `dsh plugin add`'s bundle patch; the client-modules service scans enabled entries and serves the client bundle.

## 🛠️ Development

```bash
npm install
npm run build        # tsc -p tsconfig.json → lib/index.js (host half)
```

- Host source: `src/index.ts`; browser bundle: `lib/client.js` (hand-written, no build step)
- The package is pure JS, zero-dependency and cross-platform; building only needs the devDependencies (typescript, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-tools`, `@types/node`)
- Publishing: `npm version patch && npm publish` (`prepublishOnly` builds automatically; the scoped package has `publishConfig.access: public`)

## License

MIT

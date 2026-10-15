// tests/profiles.test.mjs — dynamic profile discovery, per-profile write
// targets, list scopes and the "restart that profile's instance" hint
// (change mcp-profile-targets-and-dark-ui).
//
// dsh ships no "list profiles" API, so the host enumerates <home>/profiles.
// Writes may target any discovered profile; entries that the current instance
// does not load get an explicit warning instead of a live status.
import test from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import plugin from '../lib/index.js'

const ROOT = dirname(fileURLToPath(import.meta.url))

// Fake ctx with a directory-aware fs: 'dirs' models real directories so
// listProfiles/stat behave like the runtime, 'names' is what listDir returns.
function makeCtx(home, opts) {
  const files = new Map()
  const dirs = new Set([home, join(home, 'profiles')])
  const names = ['node_modules']
  for (const name of opts.profiles) {
    const dir = join(home, 'profiles', name)
    dirs.add(dir)
    names.push(name)
    const seeded = (opts.seed || {})[name]
    files.set(join(dir, 'cordis.patch.yml'), seeded === undefined ? '[]\n' : seeded)
    files.set(join(dir, 'package.json'), JSON.stringify({ name: 'dsh-profile-' + name }))
  }
  files.set(join(home, 'cordis.patch.yml'), opts.global === undefined ? '[]\n' : opts.global)
  files.set(join(home, 'settings.yaml'), '')
  const activeDir = join(home, 'profiles', opts.active)
  let route = null
  const ctx = {
    timer: {},
    timeout: () => Promise.resolve(),
    settings: { prepareDocument: async () => join(home, 'settings.yaml') },
    sandboxPolicy: { resolve: async () => ({}) },
    tools: { register() {}, schemas: () => [] },
    webServer: { register(r) { route = r; return () => {} } },
    fs: {
      async resolve(p) { return p },
      async stat(p) {
        if (dirs.has(p)) return { isFile: () => false, isDirectory: () => true }
        return files.has(p) ? { isFile: () => true, isDirectory: () => false } : undefined
      },
      async readText(p) {
        if (!files.has(p)) { const e = new Error('not found'); e.code = 'FS_NOT_FOUND'; throw e }
        return files.get(p)
      },
      async writeText(p, c) { files.set(p, String(c)) },
      async listDir(p) {
        if (p !== join(home, 'profiles')) return []
        return names.map((n) => ({ name: n }))
      },
    },
    effect(fn) { const d = fn(); if (typeof d === 'function') d() },
    on() {},
    events: { dispatch: () => [] },
    get(name) {
      if (name !== 'profileContext') return undefined
      const patchPath = join(activeDir, 'cordis.patch.yml')
      return { name: opts.active, dir: activeDir, patchPath, home }
    },
    _files: files,
    _route: () => route,
  }
  return ctx
}

function call(route, payload, headers = {}) {
  const body = JSON.stringify(payload)
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager', ...headers },
    on(ev, cb) { if (ev === 'data') cb(body); if (ev === 'end') cb() },
  }
  const res = { status: 200, bodyText: '', writeHead(c) { this.status = c }, end(b) { this.bodyText = b || '' } }
  const p = route.handler(req, res)
  return (p ? Promise.resolve(p) : Promise.resolve()).then(() => ({ status: res.status, json: res.bodyText ? JSON.parse(res.bodyText) : null }))
}

const home = (opts) => {
  const h = mkdtempSync(join(tmpdir(), 'dsh-profiles-'))
  const ctx = makeCtx(h, opts)
  plugin.apply(ctx)
  return { home: h, ctx }
}

test('mcpm-list (scope=all) discovers every profile and flags the active one', async () => {
  const h = mkdtempSync(join(tmpdir(), 'dsh-profiles-'))
  const ctx = makeCtx(h, { active: 'mcpman-dev', profiles: ['mcpman-dev', 'web', 'tui'] })
  plugin.apply(ctx)
  const r = await call(ctx._route(), { op: 'mcpm-list', args: { scope: 'all' } })
  assert.equal(r.json.ok, true)
  assert.equal(r.json.scope, 'all')
  const names = r.json.profiles.map((p) => p.name)
  assert.ok(names.includes('mcpman-dev') && names.includes('web') && names.includes('tui'), 'all profiles listed: ' + names)
  assert.ok(!names.includes('node_modules'), 'the shared link farm is not a profile')
  assert.equal(r.json.profiles[0].name, 'mcpman-dev', 'active profile sorts first')
  assert.equal(r.json.profiles[0].active, true)
  assert.equal(r.json.profiles.find((p) => p.name === 'web').active, false)
})

test('mcpm-add into another profile writes only that patch and warns about the restart', async () => {
  const { home: h, ctx } = home({ active: 'mcpman-dev', profiles: ['mcpman-dev', 'web'] })
  const activePatch = join(h, 'profiles', 'mcpman-dev', 'cordis.patch.yml')
  const webPatch = join(h, 'profiles', 'web', 'cordis.patch.yml')
  const r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'webonly', transport: 'stdio', command: 'echo hi', level: 'profile:web' } })
  assert.equal(r.json.ok, true)
  assert.equal(r.json.row.level, 'profile:web')
  assert.match(String(r.json.warning), /需重启/)
  assert.match(ctx._files.get(webPatch), /# dsh-mcp-manager:server:mcp-webonly/)
  assert.equal(ctx._files.get(activePatch), '[]\n', 'active profile untouched')
  const list = await call(ctx._route(), { op: 'mcpm-list', args: { scope: 'active' } })
  const row = list.json.rows.find((x) => x.id === 'mcp-webonly')
  assert.equal(row, undefined, 'a foreign profile row is not part of the active scope')
})

test('mcpm-list (scope=profile:<name>) shows that profile plus the global layer', async () => {
  const { home: h, ctx } = home({
    active: 'mcpman-dev',
    profiles: ['mcpman-dev', 'tui'],
    global: '# dsh-mcp-manager:server:mcp-glob\n[]\n',
  })
  await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'tuionly', transport: 'stdio', command: 'echo hi', level: 'profile:tui' } })
  const r = await call(ctx._route(), { op: 'mcpm-list', args: { scope: 'profile:tui' } })
  assert.equal(r.json.ok, true)
  assert.equal(r.json.scope, 'profile:tui')
  const ids = r.json.rows.map((x) => x.id)
  assert.ok(ids.includes('mcp-tuionly'), 'target profile rows are listed: ' + ids)
  assert.equal(r.json.rows.find((x) => x.id === 'mcp-tuionly').liveEligible, false)
  const bad = await call(ctx._route(), { op: 'mcpm-list', args: { scope: 'profile:nope' } })
  assert.equal(bad.json.ok, false)
  assert.match(String(bad.json.error), /未找到 profile/)
})

test('level validation: unknown level, missing profile and illegal names are rejected', async () => {
  const { ctx } = home({ active: 'mcpman-dev', profiles: ['mcpman-dev'] })
  let r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'a1', transport: 'stdio', command: 'x', level: 'bogus' } })
  assert.equal(r.json.ok, false)
  assert.match(String(r.json.error), /未知的层级/)
  r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'a2', transport: 'stdio', command: 'x', level: 'profile:missing' } })
  assert.equal(r.json.ok, false)
  assert.match(String(r.json.error), /未找到 profile/)
  r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'a3', transport: 'stdio', command: 'x', level: 'profile:node_modules' } })
  assert.equal(r.json.ok, false)
  assert.match(String(r.json.error), /非法的 profile 名/)
})

test('uniqueness is per target namespace: the same name may exist in two profiles', async () => {
  const { ctx } = home({ active: 'mcpman-dev', profiles: ['mcpman-dev', 'tui'] })
  let r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'shared', transport: 'stdio', command: 'x' } })
  assert.equal(r.json.ok, true)
  r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'shared', transport: 'stdio', command: 'x', level: 'profile:tui' } })
  assert.equal(r.json.ok, true, 'a copy into another profile is allowed')
  r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'shared', transport: 'stdio', command: 'x' } })
  assert.equal(r.json.ok, false)
  assert.match(String(r.json.error), /中存在/)
})

test('mcpm-edit moves an entry between profiles via fromLevel', async () => {
  const { home: h, ctx } = home({ active: 'mcpman-dev', profiles: ['mcpman-dev', 'tui'] })
  const activePatch = join(h, 'profiles', 'mcpman-dev', 'cordis.patch.yml')
  const tuiPatch = join(h, 'profiles', 'tui', 'cordis.patch.yml')
  const added = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'mover', transport: 'stdio', command: 'x' } })
  assert.equal(added.json.ok, true)
  const moved = await call(ctx._route(), {
    op: 'mcpm-edit',
    args: { id: added.json.row.id, fromLevel: 'project', level: 'profile:tui', serverName: 'mover', transport: 'stdio', command: 'x' },
  })
  assert.equal(moved.json.ok, true)
  // Source is the active profile (its instance hot-reloads), so only the target
  // profile needs a restart.
  assert.match(String(moved.json.warning), /需重启/)
  assert.doesNotMatch(ctx._files.get(activePatch), /dsh-mcp-manager:server:mcp-mover/)
  assert.match(ctx._files.get(tuiPatch), /dsh-mcp-manager:server:mcp-mover/)
  // Moving back out of the foreign profile must mention the source profile too.
  const back = await call(ctx._route(), {
    op: 'mcpm-edit',
    args: { id: 'mcp-mover', fromLevel: 'profile:tui', level: 'project', serverName: 'mover', transport: 'stdio', command: 'x' },
  })
  assert.equal(back.json.ok, true)
  assert.match(String(back.json.warning), /已从 profile "tui"/)
  assert.match(ctx._files.get(activePatch), /dsh-mcp-manager:server:mcp-mover/)
  assert.doesNotMatch(ctx._files.get(tuiPatch), /dsh-mcp-manager:server:mcp-mover/)
})

test('writes into a foreign profile name the action they performed', async () => {
  const { ctx } = home({ active: 'mcpman-dev', profiles: ['mcpman-dev', 'tui'] })
  const added = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'verby', transport: 'stdio', command: 'x', level: 'profile:tui' } })
  assert.match(String(added.json.warning), /^已写入 profile "tui"/)
  const toggled = await call(ctx._route(), { op: 'mcpm-set-enabled', args: { id: 'mcp-verby', level: 'profile:tui', enabled: false } })
  assert.equal(toggled.json.ok, true)
  assert.match(String(toggled.json.warning), /^已更新 profile "tui"/)
  const removed = await call(ctx._route(), { op: 'mcpm-remove', args: { id: 'mcp-verby', level: 'profile:tui' } })
  assert.equal(removed.json.ok, true)
  assert.match(String(removed.json.warning), /^已从 profile "tui" 中删除该条目/)
})

test('mcpm-restart refuses a profile this instance does not load', async () => {
  const { ctx } = home({ active: 'mcpman-dev', profiles: ['mcpman-dev', 'tui'] })
  const r = await call(ctx._route(), { op: 'mcpm-restart', args: { id: 'mcp-x', level: 'profile:tui' } })
  assert.equal(r.json.ok, false)
  assert.match(String(r.json.error), /重启只适用于当前实例加载的层级/)
})

test('client half carries the theme bridge and the dynamic level UI', async () => {
  const src = readFileSync(join(ROOT, '..', 'lib', 'client.js'), 'utf8')
  // Dark native <select> popups need explicit option colors + color-scheme.
  assert.match(src, /--mcpm-option-bg/)
  assert.match(src, /--mcpm-option-fg/)
  assert.match(src, /color-scheme:var\(--mcpm-scheme/)
  assert.match(src, /select option/)
  // Theme source: DSH projects it onto the document; we mirror it.
  assert.match(src, /data-ds-dark-theme/)
  assert.match(src, /colorScheme/)
  assert.match(src, /prefers-color-scheme: dark/)
  assert.match(src, /new MutationObserver/)
  assert.match(src, /ensureTheme\(\)/)
  // Dynamic profiles: no hard-coded web profile label anymore.
  assert.doesNotMatch(src, /profiles\/web\/cordis\.patch\.yml/)
  assert.match(src, /profile:/)
  assert.match(src, /查看范围/)
  assert.match(src, /levelLabelOf/)
})

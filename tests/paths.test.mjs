// tests/paths.test.mjs — regression tests for the 0.2.0 profile/home path
// resolution introduced with the dsh 0.2.0-rc.2 upgrade:
//   1. the runtime 'profileContext' service is authoritative,
//   2. otherwise the settings document decides (0.2.0 returns the active
//      profile's cordis.patch.yml, 0.1.x returned $DSH_HOME/settings.yaml),
//   3. a total miss fails loudly and never writes a file.
import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import plugin from '../lib/index.js'

// Same fake Cordis ctx shape as mcpm.test.mjs, plus injectable services so a
// test can provide 'profileContext'.
function makeCtx(home, opts = {}) {
  const files = opts.files || new Map()
  if (!files.has(join(home, 'settings.yaml'))) files.set(join(home, 'settings.yaml'), '')
  if (!files.has(join(home, 'cordis.patch.yml'))) files.set(join(home, 'cordis.patch.yml'), '[]\n')
  let route = null
  const ctx = {
    timer: {},
    timeout: () => Promise.resolve(),
    settings: {
      prepareDocument: async () => (opts.document !== undefined ? opts.document : join(home, 'settings.yaml')),
    },
    sandboxPolicy: { resolve: async () => ({}) },
    tools: { register() {}, schemas: () => [] },
    webServer: { register(r) { route = r; return () => {} } },
    fs: {
      async resolve(p) { return p },
      async stat(p) { return files.has(p) ? { isFile: () => true, isDirectory: () => false } : undefined },
      async readText(p) {
        if (!files.has(p)) { const e = new Error('not found'); e.code = 'FS_NOT_FOUND'; throw e }
        return files.get(p)
      },
      async writeText(p, c) { files.set(p, String(c)) },
      async listDir() { return [] },
    },
    effect(fn) { const d = fn(); if (typeof d === 'function') d() },
    on() {},
    events: { dispatch: () => [] },
    get(name) { return opts.services ? opts.services[name] : undefined },
    skills: {
      registerProvider() {},
      async snapshot() { return { skills: [], complete: true } },
      async get() { return undefined },
    },
    _files: files,
    _route: () => route,
  }
  return ctx
}

function call(route, payload, headers = {}, body = null) {
  const b = body === null ? JSON.stringify(payload) : body
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager', ...headers },
    on(ev, cb) { if (ev === 'data') cb(b); if (ev === 'end') cb() },
  }
  const res = { status: 200, bodyText: '', writeHead(c) { this.status = c }, end(b2) { this.bodyText = b2 || '' } }
  const p = route.handler(req, res)
  return (p ? Promise.resolve(p) : Promise.resolve()).then(() => ({ status: res.status, json: res.bodyText ? JSON.parse(res.bodyText) : null }))
}

// dsh injects DSH_HOME/DSH_PROFILE/DSH_PROFILE_DIR into every shell it spawns,
// so the test process inherits them. The env is only a fallback clue for the
// plugin, and the miss-path test needs a fully clue-free process.
async function withoutProfileEnv(fn) {
  const saved = new Map()
  for (const k of ['DSH_HOME', 'DSH_PROFILE', 'DSH_PROFILE_DIR']) { saved.set(k, process.env[k]); delete process.env[k] }
  try { return await fn() } finally {
    for (const [k, v] of saved) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
  }
}

test('mcpm-list resolves paths from the runtime profileContext service', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-paths-'))
  const profileDir = join(home, 'profiles', 'mcpman-dev')
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const files = new Map([[patchPath, '[]\n']])
  const ctx = makeCtx(home, {
    files,
    document: join(home, 'settings.yaml'),
    services: { profileContext: { name: 'mcpman-dev', dir: profileDir, patchPath, home } },
  })
  plugin.apply(ctx)
  const r = await call(ctx._route(), { op: 'mcpm-list', args: {} })
  assert.equal(r.json.ok, true)
  assert.equal(r.json.paths.project, patchPath)
  assert.equal(r.json.paths.global, join(home, 'cordis.patch.yml'))
  assert.equal(r.json.paths.home, home)
  assert.equal(r.json.paths.profile, 'mcpman-dev')
})

test('mcpm-add writes into the active profile from profileContext (never web)', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-paths-'))
  const profileDir = join(home, 'profiles', 'mcpman-dev')
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const files = new Map([[patchPath, '[]\n'], [join(home, 'profiles', 'web', 'cordis.patch.yml'), '[]\n']])
  const ctx = makeCtx(home, {
    files,
    services: { profileContext: { name: 'mcpman-dev', dir: profileDir, patchPath, home } },
  })
  plugin.apply(ctx)
  const r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'ctxadd', transport: 'stdio', command: 'echo hi' } })
  assert.equal(r.json.ok, true)
  assert.match(files.get(patchPath), /# dsh-mcp-manager:server:mcp-ctxadd/)
  assert.equal(files.get(join(home, 'profiles', 'web', 'cordis.patch.yml')), '[]\n', 'web profile untouched')
})

test('fallback: the settings document points at the active profile patch file', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-paths-'))
  const profileDir = join(home, 'profiles', 'mcpman-dev')
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const files = new Map([[patchPath, '[]\n']])
  // 0.2.0 semantics: prepareDocument() returns the profile's cordis.patch.yml.
  const ctx = makeCtx(home, { files, document: patchPath })
  plugin.apply(ctx)
  const r = await call(ctx._route(), { op: 'mcpm-list', args: {} })
  assert.equal(r.json.ok, true)
  assert.equal(r.json.paths.project, patchPath)
  assert.equal(r.json.paths.profile, 'mcpman-dev')
  // The DSH home is the parent of profiles/, never the profile directory.
  assert.equal(r.json.paths.home, home)
  assert.equal(r.json.paths.global, join(home, 'cordis.patch.yml'))
})

test('fallback: a 0.1.x settings document yields the DSH home and a detected profile', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-paths-'))
  const webPatch = join(home, 'profiles', 'web', 'cordis.patch.yml')
  const files = new Map([[webPatch, '[]\n']])
  const ctx = makeCtx(home, { files, document: join(home, 'settings.yaml') })
  plugin.apply(ctx)
  const r = await call(ctx._route(), { op: 'mcpm-list', args: {} })
  assert.equal(r.json.ok, true)
  assert.equal(r.json.paths.home, home)
  assert.equal(r.json.paths.project, webPatch)
  assert.equal(r.json.paths.profile, 'web')
})

test('no clue at all: queries fail loudly and writes touch nothing', async () => {
  await withoutProfileEnv(async () => {
    const home = mkdtempSync(join(tmpdir(), 'dsh-paths-'))
    const ctx = makeCtx(home, { document: '' })
    plugin.apply(ctx)
    let r = await call(ctx._route(), { op: 'mcpm-list', args: {} })
    assert.equal(r.json.ok, false)
    assert.match(String(r.json.error), /无法确定/)
    r = await call(ctx._route(), { op: 'mcpm-add', args: { serverName: 'nowhere', transport: 'stdio', command: 'echo hi' } })
    assert.equal(r.json.ok, false)
    assert.match(String(r.json.error), /无法确定/)
    assert.equal(ctx._files.size, 2, 'only the two seeded files exist')
    assert.equal(ctx._files.get(join(home, 'cordis.patch.yml')), '[]\n')
  })
})

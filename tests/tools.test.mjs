// tests/tools.test.mjs — the four model-facing tools must reach the tool
// registry on dsh 0.2.0-rc.2 (defineTool/register signatures are unchanged,
// but the registration path is what the HTTP API tests never exercise).
import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import plugin from '../lib/index.js'

function makeCtx(home) {
  const files = new Map([
    [join(home, 'settings.yaml'), ''],
    [join(home, 'cordis.patch.yml'), '[]\n'],
    [join(home, 'profiles', 'web', 'cordis.patch.yml'), '[]\n'],
  ])
  const registered = []
  let route = null
  const ctx = {
    timer: {},
    timeout: () => Promise.resolve(),
    settings: { prepareDocument: async () => join(home, 'settings.yaml') },
    sandboxPolicy: { resolve: async () => ({}) },
    tools: {
      register(def) { registered.push(def); return () => {} },
      schemas: () => [],
    },
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
    get() { return undefined },
    skills: {
      registerProvider() {},
      async snapshot() { return { skills: [], complete: true } },
      async get() { return undefined },
    },
    _registered: registered,
    _route: () => route,
  }
  return ctx
}

test('apply registers the four mcp_manager_* model tools', () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-tools-'))
  const ctx = makeCtx(home)
  plugin.apply(ctx)
  const names = ctx._registered.map((d) => d.name || (d.definition && d.definition.name))
  assert.deepEqual(
    names.filter((n) => String(n).startsWith('mcp_manager_')).sort(),
    ['mcp_manager_add', 'mcp_manager_list', 'mcp_manager_restart', 'mcp_manager_set_enabled'],
  )
  for (const def of ctx._registered) {
    assert.ok(def.name, 'registered definition carries a name')
    assert.ok(def.execute || (def.definition && def.definition.execute), 'registered definition is executable')
  }
})

test('apply also serves the settings-page HTTP route', () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-tools-'))
  const ctx = makeCtx(home)
  plugin.apply(ctx)
  const route = ctx._route()
  assert.ok(route, 'route registered')
  assert.equal(route.kind, 'exact')
  assert.equal(route.path, '/dsh-mcp-manager/api')
})

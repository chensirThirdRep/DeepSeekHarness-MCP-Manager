// tests/timeout.test.mjs — the per-server toolCallTimeoutMs exposure: HTTP API
// (add/list/edit/export/import), the mcp_manager_add model tool, and the client
// bundle contract. Outward unit is whole seconds; only the patch file stores ms.
import test from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import plugin from '../lib/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))

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
    _registered: registered,
    _files: files,
    _route: () => route,
  }
  return ctx
}

function call(route, payload) {
  const b = JSON.stringify(payload)
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager' },
    on(ev, cb) { if (ev === 'data') cb(b); if (ev === 'end') cb() },
  }
  const res = { status: 200, bodyText: '', writeHead(c) { this.status = c }, end(b2) { this.bodyText = b2 || '' } }
  const p = route.handler(req, res)
  return (p ? Promise.resolve(p) : Promise.resolve()).then(() => ({ status: res.status, json: res.bodyText ? JSON.parse(res.bodyText) : null }))
}

const PROJECT_PATCH = (home) => join(home, 'profiles', 'web', 'cordis.patch.yml')
const defs = (ctx) => ctx._registered.map((d) => ({ name: d.name || (d.definition && d.definition.name), exec: d.execute || (d.definition && d.definition.execute), raw: d }))

async function setup() {
  const home = mkdtempSync(join(tmpdir(), 'dsh-timeout-'))
  const ctx = makeCtx(home)
  plugin.apply(ctx)
  return { home, ctx, route: ctx._route() }
}

test('mcpm-add stores a non-default timeoutSeconds as millisecond toolCallTimeoutMs; mcpm-list reports seconds', async () => {
  const { home, ctx, route } = await setup()
  const r = await call(route, { op: 'mcpm-add', args: { serverName: 'slow', transport: 'stdio', command: 'slow-server', timeoutSeconds: 300, level: 'project' } })
  assert.equal(r.json.ok, true)
  assert.match(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs: 300000/)
  const l = await call(route, { op: 'mcpm-list', args: {} })
  assert.equal(l.json.rows.find((x) => x.id === 'mcp-slow').timeoutSeconds, 300)
})

test('60, an empty value and an omitted value all mean "follow the default" and write nothing', async () => {
  const { home, ctx, route } = await setup()
  for (const [name, args] of [
    ['sixty', { timeoutSeconds: 60 }],
    ['empty', { timeoutSeconds: '' }],
    ['omitted', {}],
  ]) {
    const r = await call(route, { op: 'mcpm-add', args: Object.assign({ serverName: name, transport: 'stdio', command: name + '-server', level: 'project' }, args) })
    assert.equal(r.json.ok, true, name + ' accepted')
  }
  assert.doesNotMatch(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs/)
  const l = await call(route, { op: 'mcpm-list', args: {} })
  for (const id of ['mcp-sixty', 'mcp-empty', 'mcp-omitted']) {
    assert.equal(l.json.rows.find((x) => x.id === id).timeoutSeconds, null, id + ' reports null')
  }
})

test('out-of-range or malformed timeoutSeconds is rejected before any write', async () => {
  const { home, ctx, route } = await setup()
  const bads = [0, 3601, 1.5, -5, 'abc', '1e3']
  for (let i = 0; i < bads.length; i++) {
    const r = await call(route, { op: 'mcpm-add', args: { serverName: 'bad' + i, transport: 'stdio', command: 'x', timeoutSeconds: bads[i], level: 'project' } })
    assert.equal(r.json.ok, false, JSON.stringify(bads[i]) + ' rejected')
    assert.match(String(r.json.error), /1-3600/, JSON.stringify(bads[i]) + ' explains the range')
  }
  assert.equal(ctx._files.get(PROJECT_PATCH(home)), '[]\n', 'patch file untouched')
})

test('mcpm-edit keeps the stored timeout when the field is absent, overwrites on change', async () => {
  const { home, ctx, route } = await setup()
  await call(route, { op: 'mcpm-add', args: { serverName: 'slow', transport: 'stdio', command: 'slow-server', timeoutSeconds: 300, level: 'project' } })
  // absent field => keep the original value (editing args must not silently reset it)
  let r = await call(route, { op: 'mcpm-edit', args: { id: 'mcp-slow', level: 'project', serverName: 'slow', transport: 'stdio', command: 'slow-server-v2' } })
  assert.equal(r.json.ok, true)
  let patch = ctx._files.get(PROJECT_PATCH(home))
  assert.match(patch, /command: "slow-server-v2"/)
  assert.match(patch, /toolCallTimeoutMs: 300000/, 'kept on edit')
  // explicit change => overwrite
  r = await call(route, { op: 'mcpm-edit', args: { id: 'mcp-slow', level: 'project', serverName: 'slow', transport: 'stdio', command: 'slow-server-v2', timeoutSeconds: 600 } })
  assert.equal(r.json.ok, true)
  patch = ctx._files.get(PROJECT_PATCH(home))
  assert.match(patch, /toolCallTimeoutMs: 600000/)
  assert.equal((patch.match(/toolCallTimeoutMs/g) || []).length, 1, 'single field')
  const l = await call(route, { op: 'mcpm-list', args: {} })
  assert.equal(l.json.rows.find((x) => x.id === 'mcp-slow').timeoutSeconds, 600)
})

test('mcpm-edit removes the field for 60 or an empty value, and is idempotent', async () => {
  const { home, ctx, route } = await setup()
  const edit = (extra) => call(route, { op: 'mcpm-edit', args: Object.assign({ id: 'mcp-slow', level: 'project', serverName: 'slow', transport: 'stdio', command: 'slow-server' }, extra) })
  await call(route, { op: 'mcpm-add', args: { serverName: 'slow', transport: 'stdio', command: 'slow-server', timeoutSeconds: 900, level: 'project' } })
  assert.match(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs: 900000/)
  let r = await edit({ timeoutSeconds: 60 })
  assert.equal(r.json.ok, true)
  assert.doesNotMatch(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs/)
  r = await edit({})
  assert.equal(r.json.ok, true)
  assert.doesNotMatch(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs/, 'stays removed')
  r = await edit({ timeoutSeconds: 900 })
  assert.match(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs: 900000/)
  r = await edit({ timeoutSeconds: '' })
  assert.equal(r.json.ok, true)
  assert.doesNotMatch(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs/, 'empty clears')
  r = await edit({ timeoutSeconds: 3601 })
  assert.equal(r.json.ok, false)
  assert.match(String(r.json.error), /1-3600/)
  assert.doesNotMatch(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs/, 'rejected edit left the file alone')
})

test('mcpm-export carries timeoutSeconds (null when unset) and mcpm-import restores it', async () => {
  const a = await setup()
  await call(a.route, { op: 'mcpm-add', args: { serverName: 'slow', transport: 'stdio', command: 'slow-server', timeoutSeconds: 300, level: 'project' } })
  await call(a.route, { op: 'mcpm-add', args: { serverName: 'plain', transport: 'stdio', command: 'plain-server', level: 'project' } })
  const ex = await call(a.route, { op: 'mcpm-export', args: {} })
  assert.equal(ex.json.ok, true)
  const rows = JSON.parse(ex.json.json).rows
  assert.equal(rows.find((x) => x.id === 'mcp-slow').timeoutSeconds, 300)
  assert.equal(rows.find((x) => x.id === 'mcp-plain').timeoutSeconds, null)

  const b = await setup()
  const im = await call(b.route, { op: 'mcpm-import', args: { json: ex.json.json } })
  assert.equal(im.json.ok, true)
  assert.deepEqual([...im.json.added].sort(), ['mcp-plain', 'mcp-slow'])
  const patch = b.ctx._files.get(PROJECT_PATCH(b.home))
  assert.match(patch, /toolCallTimeoutMs: 300000/)
  assert.equal((patch.match(/toolCallTimeoutMs/g) || []).length, 1, 'only the non-default server')
})

test('mcpm-import skips only the entry with a bad timeout and still accepts legacy rows', async () => {
  const { home, ctx, route } = await setup()
  const json = JSON.stringify({
    rows: [
      { id: 'mcp-good', serverName: 'good', transport: 'stdio', command: 'good-server', level: 'project', timeoutSeconds: 600 },
      { id: 'mcp-bad', serverName: 'bad', transport: 'stdio', command: 'bad-server', level: 'project', timeoutSeconds: 99999 },
      { id: 'mcp-legacy', serverName: 'legacy', transport: 'stdio', command: 'legacy-server', level: 'project' },
    ],
  })
  const r = await call(route, { op: 'mcpm-import', args: { json } })
  assert.equal(r.json.ok, true)
  assert.deepEqual([...r.json.added].sort(), ['mcp-good', 'mcp-legacy'])
  assert.equal(r.json.skipped.length, 1)
  assert.ok(JSON.stringify(r.json.skipped).includes('1-3600'), 'skip reason names the range: ' + JSON.stringify(r.json.skipped))
  const patch = ctx._files.get(PROJECT_PATCH(home))
  assert.match(patch, /toolCallTimeoutMs: 600000/)
  assert.ok(!patch.includes('bad-server'), 'the rejected entry was not written')
})

test('mcp_manager_add accepts timeoutSeconds and mcp_manager_list reports it', async () => {
  const { home, ctx } = await setup()
  const add = defs(ctx).find((d) => d.name === 'mcp_manager_add')
  assert.ok(add && add.exec, 'mcp_manager_add is registered and executable')
  await add.exec({ serverName: 'slow', transport: 'stdio', command: 'slow-server', level: 'project', timeoutSeconds: 300 })
  assert.match(ctx._files.get(PROJECT_PATCH(home)), /toolCallTimeoutMs: 300000/)
  const list = defs(ctx).find((d) => d.name === 'mcp_manager_list')
  const text = await list.exec({})
  assert.ok(String(text).includes('timeout:300s'), 'list summary shows the value: ' + String(text).slice(0, 200))
  // an invalid value must not reach the file (the tool surfaces the range error)
  await assert.rejects(
    () => add.exec({ serverName: 'bad', transport: 'stdio', command: 'bad-server', level: 'project', timeoutSeconds: 0 }),
    /1-3600/,
  )
  assert.ok(!ctx._files.get(PROJECT_PATCH(home)).includes('bad-server'), 'rejected value wrote nothing')
})

test('the client bundle exposes the timeout input, the echo and the list label', () => {
  const src = readFileSync(join(HERE, '..', 'lib', 'client.js'), 'utf8')
  assert.match(src, /timeoutSeconds: '60'/, 'empty form prefills 60')
  assert.match(src, /timeoutSeconds: row\.timeoutSeconds === null/)
  assert.match(src, /type: 'number', min: '1', max: '3600'/)
  assert.match(src, /payload\.timeoutSeconds = '60'/, 'a cleared box means the default')
  assert.match(src, /工具调用超时（秒，1-3600）/)
  assert.match(src, /工具调用超时: /)
  assert.match(src, /tools\/call/)
})

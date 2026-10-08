
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
const BASE = 'http://127.0.0.1:19399/dsh-mcp-manager/api'
const HEAD = { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager' }
const EV = '.tmp-probe\\evidence'
mkdirSync(EV, { recursive: true })
async function api(op, args) {
  const r = await fetch(BASE, { method: 'POST', headers: HEAD, body: JSON.stringify({ op, args: args || {} }) })
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt) } catch {}
  return { status: r.status, j, raw: txt }
}
const log = (s) => console.log(s)
const STATE = 'C:\\Users\\chenjunhao04\\.dsh\\profiles\\mcpman-dev\\dsh-skill-manager.json'
const PATCH = 'C:\\Users\\chenjunhao04\\.dsh\\profiles\\mcpman-dev\\cordis.patch.yml'

log('--- 1. mcpm-tools with serverName')
let r = await api('mcpm-list')
const map = (r.j.rows || []).map(x => ({ id: x.id, serverName: x.serverName, level: x.level, transport: x.transport }))
log('   rows=' + JSON.stringify(map))
for (const row of map) {
  const rr = await api('mcpm-tools', { serverName: row.serverName, level: row.level })
  log('   ' + row.id + ' -> ok=' + (rr.j && rr.j.ok) + ' n=' + ((rr.j && rr.j.tools) ? rr.j.tools.length : '-') + ' err=' + (rr.j && rr.j.error) + ' keys=' + JSON.stringify(rr.j && Object.keys(rr.j)))
  if (rr.j && rr.j.tools && rr.j.tools.length) log('      sample=' + JSON.stringify(rr.j.tools.slice(0, 3)))
}

log('--- 2. mcpm-import (single row) then cleanup')
r = await api('mcpm-import', { content: JSON.stringify([{ serverName: 'imported-probe', transport: 'stdio', command: 'node --version', level: 'project' }]), level: 'project' })
log('   ok=' + (r.j && r.j.ok) + ' err=' + (r.j && r.j.error) + ' keys=' + JSON.stringify(r.j && Object.keys(r.j)))
log('   patch contains imported-probe=' + (existsSync(PATCH) ? /imported-probe/.test(readFileSync(PATCH, 'utf8')) : 'no file'))
r = await api('mcpm-list')
log('   listed=' + JSON.stringify((r.j.rows || []).filter(x => /import/.test(x.id)).map(x => ({ id: x.id, level: x.level }))))
r = await api('mcpm-remove', { id: 'mcp-imported-probe', level: 'project' })
log('   cleanup remove ok=' + (r.j && r.j.ok) + ' err=' + (r.j && r.j.error))
log('   patch now=' + (existsSync(PATCH) ? JSON.stringify(readFileSync(PATCH, 'utf8')) : 'absent'))

log('--- 3. user-level skill toggle must be refused (view-only)')
r = await api('skill-toggle', { name: 'graphflow', enabled: false })
log('   graphflow disable -> ok=' + (r.j && r.j.ok) + ' error=' + JSON.stringify(r.j && r.j.error))

log('--- 4. bundled skill persistence: disable, inspect state file, re-enable')
log('   state before=' + (existsSync(STATE) ? readFileSync(STATE, 'utf8') : 'ABSENT'))
r = await api('skill-toggle', { name: 'diagnose-windows-sandbox-acl', enabled: false })
log('   disable -> ' + JSON.stringify(r.j))
log('   state after disable=' + (existsSync(STATE) ? readFileSync(STATE, 'utf8').replace(/\n/g, ' ') : 'ABSENT'))
r = await api('skill-list')
const row = (r.j.skills || []).find(s => s.name === 'diagnose-windows-sandbox-acl')
log('   row provider=' + (row && row.provider) + ' invocation=' + JSON.stringify(row && row.invocation))
console.log('DONE')

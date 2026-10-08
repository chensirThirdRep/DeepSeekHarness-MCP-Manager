
import { readFileSync, existsSync } from 'node:fs'
const BASE = 'http://127.0.0.1:19399/dsh-mcp-manager/api'
const HEAD = { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager' }
async function api(op, args) {
  const r = await fetch(BASE, { method: 'POST', headers: HEAD, body: JSON.stringify({ op, args: args || {} }) })
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt) } catch {}
  return { status: r.status, j, rawLen: txt.length }
}
const log = (s) => console.log(s)

log('--- 1. skill disabled state survives a restart')
let r = await api('skill-list', {})
let row = (r.j.skills || []).find(s => s.name === 'diagnose-windows-sandbox-acl')
log('   provider=' + (row && row.provider) + ' invocation=' + JSON.stringify(row && row.invocation))
log('   skills count=' + r.j.skills.length + ' complete=' + r.j.complete + ' sources=' + JSON.stringify(r.j.skills.map(s => s.name + ':' + s.source)))

log('--- 2. re-enable restores the original definition')
r = await api('skill-toggle', { name: 'diagnose-windows-sandbox-acl', enabled: true })
log('   ' + JSON.stringify(r.j))
r = await api('skill-list', {})
row = (r.j.skills || []).find(s => s.name === 'diagnose-windows-sandbox-acl')
log('   provider=' + (row && row.provider) + ' invocation=' + JSON.stringify(row && row.invocation))
const st = 'C:\\Users\\chenjunhao04\\.dsh\\profiles\\mcpman-dev\\dsh-skill-manager.json'
log('   state file=' + (existsSync(st) ? readFileSync(st, 'utf8').replace(/\s+/g, ' ') : 'ABSENT'))

log('--- 3. mcpm-tools summary (correct arg name)')
r = await api('mcpm-list', {})
for (const x of r.j.rows) {
  const rr = await api('mcpm-tools', { serverName: x.serverName, level: x.level })
  const tools = rr.j && rr.j.tools
  log('   ' + x.id + ' -> ok=' + (rr.j && rr.j.ok) + ' count=' + (tools ? tools.length : '-') + ' rawLen=' + rr.rawLen + ' err=' + (rr.j && rr.j.error))
  if (tools && tools.length) log('      first=' + tools.slice(0, 3).map(t => t.name || t.key).join(', '))
}

log('--- 4. mcpm-import argument negotiation')
const payload = JSON.stringify([{ serverName: 'imported-probe', transport: 'stdio', command: 'node --version', level: 'project' }])
for (const key of ['content', 'text', 'json', 'rows', 'yaml', 'data']) {
  const rr = await api('mcpm-import', { [key]: payload, level: 'project' })
  log('   args.' + key + ' -> ok=' + (rr.j && rr.j.ok) + ' err=' + (rr.j && rr.j.error))
  if (rr.j && rr.j.ok) {
    const l = await api('mcpm-list', {})
    log('      listed=' + JSON.stringify((l.j.rows || []).filter(x => /import/.test(x.id)).map(x => x.id + '/' + x.level)))
    const rm = await api('mcpm-remove', { id: 'mcp-imported-probe', level: 'project' })
    log('      cleanup=' + (rm.j && rm.j.ok))
    break
  }
}
const PATCH = 'C:\\Users\\chenjunhao04\\.dsh\\profiles\\mcpman-dev\\cordis.patch.yml'
log('--- 5. final patch content=' + (existsSync(PATCH) ? JSON.stringify(readFileSync(PATCH, 'utf8')) : 'ABSENT'))
console.log('DONE')

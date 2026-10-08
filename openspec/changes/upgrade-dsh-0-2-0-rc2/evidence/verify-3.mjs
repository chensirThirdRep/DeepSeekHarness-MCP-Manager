
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const BASE = 'http://127.0.0.1:19399/dsh-mcp-manager/api'
const HEAD = { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager' }
const PATCH = 'C:\\Users\\chenjunhao04\\.dsh\\profiles\\mcpman-dev\\cordis.patch.yml'
const EV = '.tmp-probe\\evidence'
mkdirSync(EV, { recursive: true })

const sha = () => existsSync(PATCH) ? createHash('sha256').update(readFileSync(PATCH)).digest('hex') : 'ABSENT'
const save = (n, o) => writeFileSync(EV + '\\' + n, JSON.stringify(o, null, 2))
async function api(op, args) {
  const r = await fetch(BASE, { method: 'POST', headers: HEAD, body: JSON.stringify({ op, args: args || {} }) })
  const txt = await r.text()
  let j = null; try { j = JSON.parse(txt) } catch {}
  return { status: r.status, j, raw: txt }
}
const out = []
function log(s) { out.push(s); console.log(s) }

log('--- 1. plugin-version')
let r = await api('plugin-version'); save('03-plugin-version.json', r.j)
log('   status=' + r.status + ' version=' + (r.j && r.j.version))
log('   patch sha(before)=' + sha())

log('--- 2. mcpm-list')
r = await api('mcpm-list'); save('03-mcpm-list.json', r.j)
const rows = (r.j && r.j.rows) || []
log('   ok=' + (r.j && r.j.ok) + ' rows=' + rows.length + ' errors=' + JSON.stringify((r.j && r.j.errors) || null))
log('   paths=' + JSON.stringify((r.j && r.j.paths) || null))
const byLevel = {}
for (const x of rows) byLevel[x.level] = (byLevel[x.level] || 0) + 1
log('   levels=' + JSON.stringify(byLevel))
log('   configured(with transport)=' + rows.filter(x => x.transport).map(x => x.id + '/' + x.transport + '/' + x.level).join(', '))
log('   loader-only=' + rows.filter(x => !x.transport).map(x => x.id).join(', '))

log('--- 3. mcpm-tools')
r = await api('mcpm-tools', { id: 'mcp-CodeMap', level: 'global' }); save('03-mcpm-tools.json', r.j)
log('   ok=' + (r.j && r.j.ok) + ' keys=' + JSON.stringify(r.j && Object.keys(r.j)) + ' tools=' + ((r.j && r.j.tools && r.j.tools.length) || 0))

log('--- 4. mcpm-add (project level -> mcpman-dev patch)')
r = await api('mcpm-add', { serverName: 'mcpman-probe', transport: 'stdio', command: 'node --version', args: '--check', env: 'PROBE=1', level: 'project' })
save('03-add.json', r.j); log('   ok=' + (r.j && r.j.ok) + ' err=' + (r.j && r.j.error))
const shaAdded = sha(); log('   patch sha(after add)=' + shaAdded + ' exists=' + existsSync(PATCH))
if (existsSync(PATCH)) log('   patch head=' + JSON.stringify(readFileSync(PATCH, 'utf8').slice(0, 120)))

log('--- 5. mcpm-list sees the new server')
r = await api('mcpm-list'); const probe = (r.j.rows || []).find(x => x.id === 'mcp-mcpman-probe')
save('03-list-after-add.json', r.j)
log('   probe row=' + JSON.stringify(probe))

log('--- 6. mcpm-edit')
r = await api('mcpm-edit', { id: 'mcp-mcpman-probe', level: 'project', serverName: 'mcpman-probe', transport: 'streamable-http', url: 'https://example.invalid/mcp', headers: 'A=b' })
save('03-edit.json', r.j); log('   ok=' + (r.j && r.j.ok) + ' err=' + (r.j && r.j.error))
r = await api('mcpm-list'); const probe2 = (r.j.rows || []).find(x => x.id === 'mcp-mcpman-probe')
log('   probe row after edit=' + JSON.stringify(probe2))

log('--- 7. mcpm-set-enabled round trip')
const shaBeforeToggle = sha()
r = await api('mcpm-set-enabled', { id: 'mcp-mcpman-probe', level: 'project', enabled: false }); log('   disable ok=' + (r.j && r.j.ok))
r = await api('mcpm-list'); log('   disabled flag=' + JSON.stringify((r.j.rows || []).find(x => x.id === 'mcp-mcpman-probe') && (r.j.rows || []).find(x => x.id === 'mcp-mcpman-probe').disabled))
r = await api('mcpm-set-enabled', { id: 'mcp-mcpman-probe', level: 'project', enabled: true }); log('   enable ok=' + (r.j && r.j.ok))
const shaAfterToggle = sha()
log('   sha round trip equal=' + (shaBeforeToggle === shaAfterToggle) + ' (' + shaBeforeToggle.slice(0, 12) + ' vs ' + shaAfterToggle.slice(0, 12) + ')')

log('--- 8. mcpm-restart')
r = await api('mcpm-restart', { id: 'mcp-mcpman-probe', level: 'project' }); save('03-restart.json', r.j)
log('   ok=' + (r.j && r.j.ok) + ' warning=' + (r.j && r.j.warning) + ' err=' + (r.j && r.j.error))

log('--- 9. mcpm-export / mcpm-import')
r = await api('mcpm-export', { level: 'project' }); save('03-export.json', r.j)
const text = r.j && (r.j.text || r.j.yaml || r.j.content)
log('   export ok=' + (r.j && r.j.ok) + ' chars=' + (typeof text === 'string' ? text.length : -1) + ' keys=' + JSON.stringify(r.j && Object.keys(r.j)))

log('--- 10. mcpm-remove -> file restored')
r = await api('mcpm-remove', { id: 'mcp-mcpman-probe', level: 'project' }); save('03-remove.json', r.j)
log('   ok=' + (r.j && r.j.ok) + ' err=' + (r.j && r.j.error))
log('   patch sha(after remove)=' + sha() + ' exists=' + existsSync(PATCH))
if (existsSync(PATCH)) log('   patch content=' + JSON.stringify(readFileSync(PATCH, 'utf8')))

log('--- 11. skill-list')
r = await api('skill-list'); save('03-skill-list.json', r.j)
const sk = (r.j && r.j.skills) || []
const bySrc = {}
for (const s of sk) bySrc[s.source || s.provider || '?'] = (bySrc[s.source || s.provider || '?'] || 0) + 1
log('   ok=' + (r.j && r.j.ok) + ' count=' + sk.length + ' complete=' + (r.j && r.j.complete) + ' chars=' + r.raw.length)
log('   sources=' + JSON.stringify(bySrc))
log('   first10=' + sk.slice(0, 10).map(s => s.name + '(' + (s.source || s.provider) + ')').join(', '))

log('--- 12. skill-toggle on a runtime skill (disable+enable)')
const target = sk.find(s => (s.source || s.provider) !== 'user-dsh')
if (target) {
  let rr = await api('skill-toggle', { name: target.name, enabled: false }); log('   disable ' + target.name + ' -> ok=' + (rr.j && rr.j.ok) + ' err=' + (rr.j && rr.j.error))
  rr = await api('skill-list'); const after = (rr.j.skills || []).find(s => s.name === target.name)
  log('   after disable: present=' + !!after + ' disabled=' + (after && after.disabled))
  rr = await api('skill-toggle', { name: target.name, enabled: true }); log('   enable -> ok=' + (rr.j && rr.j.ok) + ' err=' + (rr.j && rr.j.error))
  rr = await api('skill-list'); const after2 = (rr.j.skills || []).find(s => s.name === target.name)
  log('   after enable: present=' + !!after2 + ' disabled=' + (after2 && after2.disabled))
} else { log('   NO TARGET') }

log('--- 13. web page boot payload mentions the client half')
try {
  const pr = await fetch('http://127.0.0.1:19399/?token=skEmtS_mbEikDvolT8VX6Bz_kFLzwRl1l-1J7ybqDGE')
  const html = await pr.text()
  save('03-index.html.txt', html)
  log('   status=' + pr.status + ' len=' + html.length + ' mentionsPlugin=' + /dsh-mcp-manager/.test(html) + ' mentionsClientJs=' + /client\.js/.test(html))
} catch (e) { log('   fetch failed: ' + e.message) }

writeFileSync(EV + '\\03-summary.txt', out.join('\n'))
console.log('DONE')

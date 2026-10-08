
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

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

log('--- A. mcpm-tools on a real global server')
for (const id of ['mcp-graphflow', 'cmhub-mcp-gcp']) {
  const r = await api('mcpm-tools', { id, level: 'global' })
  log('   ' + id + ' -> ok=' + (r.j && r.j.ok) + ' keys=' + JSON.stringify(r.j && Object.keys(r.j)) + ' n=' + ((r.j && r.j.tools) ? r.j.tools.length : '-') + ' err=' + (r.j && r.j.error))
  if (r.j && r.j.tools) log('      sample=' + JSON.stringify(r.j.tools.slice(0, 2)))
}

log('--- B. mcpm-export payload shape')
let r = await api('mcpm-export', {}); writeFileSync(EV + '\\03b-export.json', r.raw)
log('   keys=' + JSON.stringify(r.j && Object.keys(r.j)) + ' savedTo=' + JSON.stringify(r.j && r.j.savedTo))
const exported = r.j && r.j.json
log('   json type=' + typeof exported + ' entries=' + (Array.isArray(exported) ? exported.length : Object.keys(exported || {}).length))
log('   json head=' + JSON.stringify(exported).slice(0, 400))

log('--- C. skill-list row shape')
r = await api('skill-list'); writeFileSync(EV + '\\03b-skill-list.json', r.raw)
const sk = (r.j && r.j.skills) || []
log('   count=' + sk.length + ' complete=' + (r.j && r.j.complete))
for (const s of sk) log('   ' + JSON.stringify({ name: s.name, source: s.source, provider: s.provider, disabled: s.disabled, userInvocable: s.userInvocable, keys: Object.keys(s).join('|') }))

log('--- D. user skills on disk')
const home = 'C:\\Users\\chenjunhao04\\.dsh'
function walk(dir, depth) {
  if (depth > 3) return []
  let out = []
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) out = out.concat(walk(p, depth + 1))
      else out.push(p)
    }
  } catch (err) { out.push('ERR ' + dir + ': ' + err.code) }
  return out
}
for (const d of [join(home, 'skills')]) {
  log('   ' + d + ' exists=' + existsSync(d))
  if (existsSync(d)) for (const f of walk(d, 0)) log('      ' + f.slice(home.length + 1))
}
log('   agent-presets: ' + JSON.stringify(readdirSync(join(home, 'agent-presets'), { withFileTypes: true }).map(e => e.name)))

log('--- E. skill-toggle: disable, observe state file, re-enable')
const target = sk.find(s => (s.source || '') !== 'user-dsh') || sk[0]
const stateCandidates = [join(home, 'dsh-skill-manager.json'), join(home, 'settings.yaml'), join(home, 'profiles', 'mcpman-dev', 'cordis.patch.yml')]
const snapshotFiles = () => stateCandidates.map(p => p.slice(home.length + 1) + '=' + (existsSync(p) ? readFileSync(p, 'utf8').length : 'ABSENT'))
log('   before: ' + JSON.stringify(snapshotFiles()))
r = await api('skill-toggle', { name: target.name, enabled: false })
log('   disable ' + target.name + ' -> ' + JSON.stringify(r.j))
log('   after disable: ' + JSON.stringify(snapshotFiles()))
r = await api('skill-list')
const after = (r.j.skills || []).find(s => s.name === target.name)
log('   row after disable=' + JSON.stringify(after))
const disabledRows = (r.j.skills || []).filter(s => s.disabled)
log('   disabled rows=' + JSON.stringify(disabledRows.map(s => s.name)))
r = await api('skill-toggle', { name: target.name, enabled: true })
log('   re-enable -> ' + JSON.stringify(r.j))
log('   after enable: ' + JSON.stringify(snapshotFiles()))
r = await api('skill-list')
const after2 = (r.j.skills || []).find(s => s.name === target.name)
log('   row after enable=' + JSON.stringify({ name: after2 && after2.name, disabled: after2 && after2.disabled }))
console.log('DONE')

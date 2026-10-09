// Evidence collector for change mcp-profile-targets-and-dark-ui.
// Drives a LIVE DSH 0.2.0-rc.2 instance (isolated profile mcpman-dev) through the
// plugin HTTP API and records what happens when MCP entries are listed, written,
// toggled, edited and removed for a profile the running instance does NOT load.
//
// Usage: node verify-4-scope-and-hints.mjs [baseUrl]
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const BASE = process.argv[2] || 'http://127.0.0.1:19399'
const HOME = 'C:\\Users\\chenjunhao04\\.dsh'
const ACTIVE = 'mcpman-dev'
const OTHER = 'tui'
const activePatch = path.join(HOME, 'profiles', ACTIVE, 'cordis.patch.yml')
const otherPatch = path.join(HOME, 'profiles', OTHER, 'cordis.patch.yml')
const globalPatch = path.join(HOME, 'cordis.patch.yml')
const OUT_DIR = path.join(process.cwd(), 'openspec', 'changes', 'mcp-profile-targets-and-dark-ui', 'evidence')

const sha = (s) => createHash('sha256').update(s).digest('hex')
const call = async (op, args) => {
  const res = await fetch(BASE + '/dsh-mcp-manager/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager' },
    body: JSON.stringify({ op, args }),
  })
  return { httpStatus: res.status, body: await res.json() }
}
const checks = []
const check = (name, pass, detail) => {
  checks.push({ name, pass: !!pass, detail: detail === undefined ? null : String(detail) })
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail === undefined || detail === '' ? '' : '  -> ' + detail))
}

const beforeOther = await readFile(otherPatch, 'utf8')
const beforeActive = await readFile(activePatch, 'utf8')
const beforeGlobal = await readFile(globalPatch, 'utf8')

// ---- 1. profile discovery + view scope -------------------------------------
const all = await call('mcpm-list', { scope: 'all' })
const profs = all.body.profiles || []
const names = profs.map((p) => p.name + (p.active ? '*' : ''))
check('scope=all lists every profile under <home>/profiles', ['desktop', 'dsh-tui', 'tui', 'web'].every((n) => names.includes(n)) && names.includes(ACTIVE + '*'), names.join(', '))
check('node_modules is not treated as a profile', !names.some((n) => n.includes('node_modules')), names.join(', '))
// NOTE (v2): the first run asserted that scope=all contains an entry for the active
// profile, which is only true when that profile's patch happens to hold one. The
// coverage of a *foreign* profile is asserted after the write below instead.
check('scope=all echoes the requested scope and always includes the global layer', all.body.scope === 'all' && all.body.rows.some((r) => r.level === 'global') && profs.length >= 5, 'profiles=' + profs.length + ', levels=' + [...new Set(all.body.rows.map((r) => r.level))].join(', '))

// ---- 2. write into a profile this instance does not load --------------------
const add = await call('mcpm-add', { serverName: 'mcpmverify4', transport: 'stdio', command: 'npx', args: '-y mcpm-verify-4', level: 'profile:' + OTHER })
check('add into a foreign profile succeeds', add.body.ok === true && add.body.row.level === 'profile:' + OTHER, JSON.stringify(add.body.row && { id: add.body.row.id, level: add.body.row.level }))
check('add returns the restart-to-take-effect notice', add.body.warning === '已写入 profile "tui"，该 profile 需重启其 DSH 实例后生效', add.body.warning)
const afterOther = await readFile(otherPatch, 'utf8')
check('foreign profile patch really contains the entry', afterOther.includes('mcp-mcpmverify4') && afterOther.includes('mcpm-verify-4'), 'tui patch ' + beforeOther.length + ' -> ' + afterOther.length + ' bytes')
check('active profile patch untouched by a foreign write', sha(await readFile(activePatch, 'utf8')) === sha(beforeActive), sha(beforeActive).slice(0, 12))

const allAgain = await call('mcpm-list', { scope: 'all' })
const foreignRow = allAgain.body.rows.find((r) => r.id === 'mcp-mcpmverify4')
check('scope=all surfaces the entry written into another profile', !!foreignRow && foreignRow.level === 'profile:' + OTHER && foreignRow.liveEligible === false, foreignRow ? JSON.stringify({ level: foreignRow.level, profileName: foreignRow.profileName, liveEligible: foreignRow.liveEligible }) : 'missing')

// ---- 3. view scope filters ------------------------------------------------
const scoped = await call('mcpm-list', { scope: 'profile:' + OTHER })
const scopedRow = scoped.body.rows.find((r) => r.id === 'mcp-mcpmverify4')
check('scope=profile:tui shows the foreign entry', !!scopedRow, scopedRow ? JSON.stringify({ level: scopedRow.level, liveEligible: scopedRow.liveEligible, toolCount: scopedRow.toolCount, profileName: scopedRow.profileName }) : 'missing')
check('foreign rows are not live-eligible and report no tool count', !!scopedRow && scopedRow.liveEligible === false && scopedRow.toolCount === 0)
const activeList = await call('mcpm-list', {})
check('scope=active hides foreign entries', !activeList.body.rows.some((r) => r.id === 'mcp-mcpmverify4'), 'scope=' + activeList.body.scope + ', rows=' + activeList.body.rows.length)

// ---- 4. uniqueness is per target namespace ---------------------------------
const dup = await call('mcpm-add', { serverName: 'mcpmverify4', transport: 'stdio', command: 'npx', level: 'profile:' + OTHER })
check('duplicate serverName inside the same namespace is rejected', dup.body.ok === false && /中存在/.test(String(dup.body.error)), dup.body.error)
const dupGlobal = await call('mcpm-add', { serverName: 'gcp', transport: 'streamable-http', url: 'https://example.invalid/mcp', level: 'global' })
check('duplicate serverName in the global layer is rejected', dupGlobal.body.ok === false && /已在 全局层 中存在/.test(String(dupGlobal.body.error)), dupGlobal.body.error)
check('global patch untouched by rejected writes', sha(await readFile(globalPatch, 'utf8')) === sha(beforeGlobal), sha(beforeGlobal).slice(0, 12))

// ---- 5. toggle / edit inside a foreign profile ------------------------------
const off = await call('mcpm-set-enabled', { id: 'mcp-mcpmverify4', level: 'profile:' + OTHER, enabled: false })
check('set-enabled on a foreign profile entry', off.body.ok === true && off.body.warning === '已更新 profile "tui"，该 profile 需重启其 DSH 实例后生效', off.body.warning || off.body.error)
const edited = await call('mcpm-edit', { id: 'mcp-mcpmverify4', fromLevel: 'profile:' + OTHER, level: 'profile:' + OTHER, serverName: 'mcpmverify4', transport: 'stdio', command: 'npx', args: '-y mcpm-verify-4-edited' })
check('edit resolves the row through fromLevel and rewrites the foreign patch', edited.body.ok === true && (await readFile(otherPatch, 'utf8')).includes('mcpm-verify-4-edited') && /^已更新 profile "tui"/.test(String(edited.body.warning)), edited.body.warning || edited.body.error)
check('active profile still untouched after toggle + edit', sha(await readFile(activePatch, 'utf8')) === sha(beforeActive))

// ---- 6. restart is refused for a profile this instance does not load --------
const restart = await call('mcpm-restart', { id: 'mcp-mcpmverify4', level: 'profile:' + OTHER })
check('restart is refused outside the running instance', restart.body.ok === false && /重启只适用于当前实例加载的层级/.test(String(restart.body.error)), restart.body.error)

// ---- 7. invalid inputs -----------------------------------------------------
const badLevel = await call('mcpm-add', { serverName: 'x', transport: 'stdio', command: 'npx', level: 'bogus' })
check('unknown level is reported', badLevel.body.ok === false && badLevel.body.error === '未知的层级: bogus', badLevel.body.error)
const badScope = await call('mcpm-list', { scope: 'bogus' })
check('unknown view scope is reported', badScope.body.ok === false && /未知的查看范围/.test(String(badScope.body.error)), badScope.body.error)
const noProfile = await call('mcpm-list', { scope: 'profile:does-not-exist' })
check('unknown profile is reported', noProfile.body.ok === false && /未找到 profile/.test(String(noProfile.body.error)), noProfile.body.error)

// ---- 8. remove + restore ---------------------------------------------------
const rm = await call('mcpm-remove', { id: 'mcp-mcpmverify4', level: 'profile:' + OTHER })
check('remove on a foreign profile entry', rm.body.ok === true && rm.body.warning === '已从 profile "tui" 中删除该条目，该 profile 需重启其 DSH 实例后生效', rm.body.warning || rm.body.error)
await writeFile(otherPatch, beforeOther, 'utf8')
check('all touched patches restored to their initial bytes', sha(await readFile(otherPatch, 'utf8')) === sha(beforeOther) && sha(await readFile(activePatch, 'utf8')) === sha(beforeActive) && sha(await readFile(globalPatch, 'utf8')) === sha(beforeGlobal))

const failed = checks.filter((c) => !c.pass)
const report = {
  change: 'mcp-profile-targets-and-dark-ui',
  dsh: '0.2.0-rc.2',
  baseUrl: BASE,
  activeProfile: ACTIVE,
  probedProfile: OTHER,
  patches: { active: activePatch, probed: otherPatch, global: globalPatch },
  checks,
  total: checks.length,
  failed: failed.length,
}
await mkdir(OUT_DIR, { recursive: true })
await writeFile(path.join(OUT_DIR, 'verify-4-scope-and-hints.json'), JSON.stringify(report, null, 2), 'utf8')
console.log('')
console.log(checks.length + ' checks, ' + failed.length + ' failed')
if (failed.length) console.log('failed: ' + failed.map((f) => f.name).join(' | '))
process.exitCode = failed.length ? 1 : 0

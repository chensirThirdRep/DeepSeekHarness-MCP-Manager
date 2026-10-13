import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const CLIENT = join(here, '..', 'lib', 'client.js')
const src = readFileSync(CLIENT, 'utf8')

test('inline edit: 编辑表单挂在该行内部，且先定义后使用', () => {
  assert.match(src, /editing && editing\.id === row\.id && renderForm\(\)\)\),/)
  assert.match(src, /className: 'mcpm-row' \+ \(editing && editing\.id === row\.id \? ' editing' : ''\)/)
  assert.match(src, /ref: editing && editing\.id === row\.id \? editRowRef : undefined,/)
  const defAt = src.indexOf('const renderForm = () =>')
  const listAt = src.indexOf(': rows.map((row) =>')
  const useAt = src.indexOf('editing && editing.id === row.id && renderForm())),')
  assert.ok(defAt > 0 && listAt > defAt && useAt > listAt, 'renderForm 必须先定义，再在被编辑的那一行内使用')
})

test('inline edit: 编辑表单不再占用列表顶部的固定位置（新增表单仍留在顶部）', () => {
  assert.match(src, /formOpen && !editing && renderForm\(\),/)
  assert.doesNotMatch(src, /formOpen && React\.createElement\('div', \{ className: 'mcpm-form' \},/)
})

test('inline edit: 展开时把该行滚入可视区，且仅在编辑目标变化时触发', () => {
  assert.match(src, /const editRowRef = React\.useRef\(null\)/)
  assert.match(src, /node\.scrollIntoView\(\{ block: 'nearest', behavior: 'smooth' \}\)/)
  assert.match(src, /\}, \[editing && editing\.id\]\)/)
})

test('inline edit: 行内编辑区去掉重复外框，并高亮当前行', () => {
  assert.match(src, /'\.mcpm-row\.editing\{border-color:rgba\(88,166,255,\.75\);box-shadow:inset 0 0 0 1px rgba\(88,166,255,\.25\)\}'/)
  assert.match(src, /'\.mcpm-row\.editing \.mcpm-form\{border:0;padding:0;background:transparent\}'/)
})

test('inline edit: 表单字段只有一份定义，新增与编辑共用', () => {
  const defs = src.match(/const renderForm = \(\) =>/g) || []
  assert.equal(defs.length, 1)
  assert.match(src, /editing \? '编辑 MCP 服务：' \+ editing\.id : '新增 MCP 服务'/)
  assert.match(src, /'服务名称 serverName（唯一，1-32 位）'/)
})

test('inline edit: 顶部按钮在编辑态表明表单位置并禁止重复触发', () => {
  assert.match(src, /disabled: !!editing, onClick: \(\) => \(formOpen && !editing \? cancelForm\(\) : openAdd\(\)\)/)
  assert.match(src, /editing \? '正在编辑：' \+ editing\.id \+ '（表单在下方该行内）'/)
})

test('inline edit: 并发锁语义不变（编辑期间其它行按钮仍禁用）', () => {
  assert.match(src, /const rowsLocked = formOpen \|\| busy !== null/)
  assert.match(src, /const openEdit = \(row\) => \{/)
  assert.match(src, /setFormOpen\(true\)[\s\S]{0,20}\}/)
  assert.match(src, /disabled: rowsLocked, onClick: \(\) => openEdit\(row\) \}, '编辑'\)/)
  assert.match(src, /disabled: rowsLocked, onClick: \(\) => toggleRow\(row\) \}/)
  assert.match(src, /disabled: rowsLocked, onClick: \(\) => removeRow\(row\) \}, '删除'\)/)
})

test('inline edit: 保存/取消后收起该行表单', () => {
  assert.match(src, /const cancelForm = \(\) => \{ setFormOpen\(false\); setEditing\(null\) \}/)
  assert.match(src, /const onOk = \(\) => \{ setFormOpen\(false\); setEditing\(null\) \}/)
})

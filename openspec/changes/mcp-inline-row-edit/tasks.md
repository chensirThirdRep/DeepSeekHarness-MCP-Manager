## 1. OpenSpec 建档

- [x] 1.1 proposal / spec delta / design / tasks 四件套补齐，`openspec validate mcp-inline-row-edit` 通过，验证：命令输出 Change is valid。

## 2. client 实现

- [x] 2.1 把表单抽取为组件内 `renderForm()`，新增表单仍渲染在列表上方，验证：`node --check lib/client.js`。
- [x] 2.2 编辑表单挂到目标行卡片内部末尾，编辑态行追加类名，验证：源码中 `rows.map` 内出现 `renderForm()`。
- [x] 2.3 用 `useRef` + `useEffect` 在编辑目标变化时 `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`，验证：源码断言。

## 3. 样式与并发

- [x] 3.1 新增 `.mcpm-row.editing` 高亮与内联表单去外框的 CSS，验证：源码断言两条规则存在。
- [x] 3.2 编辑态禁用顶部「+ 新增 MCP 服务」入口，`rowsLocked` 语义不变，验证：源码断言。

## 4. 测试

- [x] 4.1 新增 `tests/inline-edit.test.mjs` 源码契约用例（编辑挂载位置、自动滚动、行高亮、去外框、新增路径仍在顶部、顶部按钮禁用）。
- [x] 4.2 `node --check lib/client.js` 与全量 `npm test` 通过，验证：0 fail。

## 5. 文档与收尾

- [x] 5.1 `README.md` / `README_EN.md` 补充内联编辑说明。
- [ ] 5.2 实机验证：硬刷新后编辑列表最后一台，表单在其下方就地展开并滚入视口；保存后收起并显示新值；取消不写入。
- [ ] 5.3 停下等用户验收：不 archive、不发 npm。

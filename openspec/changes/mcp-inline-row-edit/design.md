# Design

## 背景事实（已核实）

- 表单当前渲染在列表上方固定位置：`lib/client.js:458-481`（`formOpen && React.createElement('div', { className: 'mcpm-form' }, …)`）；其上方 `lib/client.js:455-457` 是随 `formOpen` 在「收起表单 / + 新增 MCP 服务」之间切换的按钮。
- 列表渲染在 `lib/client.js:486-507`：`rows.map((row) => …)` 生成 `.mcpm-row` 卡片，内部依次是 `.mcpm-row-head`、若干 `.mcpm-detail`、`.mcpm-row-actions`；「编辑」按钮在 `lib/client.js:502`，带 `disabled: rowsLocked`。
- 状态与动作：`formOpen`（`lib/client.js:207`）、`editing`（`{ id, level }`）、`openAdd`（`lib/client.js:295`）与 `openEdit`（`lib/client.js:296-311`）都以 `setFormOpen(true)` 打开；`cancelForm`（`lib/client.js:312`）与 `submitForm` 的成功回调（`lib/client.js:320`）都收起表单并清空 `editing`。
- `rowsLocked = formOpen || busy !== null`（`lib/client.js:327`）：现状语义已经是「有表单展开时锁定其它行」。
- CSS：`.mcpm-form`（`lib/client.js:29-34`，两列 grid、自带边框与内边距）、`.mcpm-row`（`lib/client.js:35`，flex column、自带边框）。`lib/client.js` 是手写模块、无构建步骤。

## Goals / Non-Goals

- Goals：编辑不再需要滚回列表顶部；编辑行状态可辨识；保存/取消后收起。
- Non-Goals：不改 host 与 HTTP API、不改模型工具、不改补丁文件格式；不做列表筛选排序；不做多行并行编辑；不动 Skills 页与新增表单的位置。

## 决策

### D1：表单抽取为可复用渲染片段

把 `mcpm-form` 元素抽成组件内函数 `renderForm()`，新增与编辑共用同一份字段定义与提交逻辑，避免两份表单漂移。

### D2：编辑表单挂载在目标行卡片内部末尾

`rows.map` 生成的行元素在 children 末尾按 `editing && editing.id === row.id` 追加 `renderForm()`；不使用 Portal 或浮层，保证表单随该行滚动、与行同生共死。行元素在编辑态追加类名 `editing`。

### D3：自动滚动用 useRef + useEffect，只在编辑目标变化时触发

`React.useRef(null)` 保存编辑行 DOM，`React.useEffect(…, [editing && editing.id])` 中调用 `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`；不用内联 ref 回调（每次渲染都会重新挂载，可能反复滚动）。

### D4：并发语义与现状一致（保持那把锁）

`rowsLocked` 判定不放松；顶部「+ 新增 MCP 服务」按钮在编辑态一并禁用，避免从编辑态切到新增态时静默丢弃未保存输入。

### D5：视觉——行高亮 + 内联表单去外框

新增 CSS：`.mcpm-row.editing` 使用既有蓝色边框变量强调；`.mcpm-row .mcpm-form` 去掉自身边框、内边距与背景，保留两列 grid 与其内部控件样式（`h3` 标题保留，用户仍能确认正在编辑哪一条）。

### D6：测试策略

`tests/inline-edit.test.mjs` 对 `lib/client.js` 做源码契约断言：编辑表单挂在 `rows.map` 内部（而非顶部 `formOpen &&` 处）、存在 `scrollIntoView`、行类名含编辑态、内联去外框的 CSS 规则、顶部按钮在编辑态禁用；再加 `node --check lib/client.js`。host 行为未变，不重复 host 用例。

### D7：文档

`README.md` / `README_EN.md` 的 MCP 管理操作说明补一句：点「编辑」时表单在该卡片下方就地展开，改完保存即收起。

## 风险 / 权衡

- [内联表单把长列表撑得更长] → 只有编辑那一行展开，保存/取消即收起；不做多行并行展开。
- [ref/useEffect 反复触发滚动] → 依赖项取 `editing && editing.id`，仅在切换编辑目标时滚一次。
- [去掉表单外框后「表单像消失了」] → 行高亮边框 + 表单标题（「编辑 MCP 服务：<id>」）保留，标题下即字段。
- [共用片段后新增路径被改坏] → 契约测试同时断言新增路径仍走列表上方展开。
- [客户端改动需硬刷新才可见] → README 与实机验证步骤写明。

## 迁移计划

无数据迁移、无补丁格式变化；host 不需要重启，浏览器硬刷新即可看到新交互。

## 开放问题

无。展开位置、滚动行为、编辑态视觉、保存后收起、并发锁语义均已在 specs 与上述决策中定死。

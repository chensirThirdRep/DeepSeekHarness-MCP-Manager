# 验证记录：MCP 管理页行内联编辑

- change: `mcp-inline-row-edit`
- 范围：仅客户端半（`lib/client.js`，手写模块，无构建步骤）；host 半（`src/index.ts` / `lib/index.js`）未改动。
- 结论：静态检查与全量测试通过，待实机（硬刷新）目视确认。

## 1. 构建与静态检查

| 命令 | 结果 |
| --- | --- |
| `node --check lib/client.js` | exit 0 |
| `npm run lint`（`node --check lib/client.js && node --check lib/index.js`） | exit 0 |
| `node --check tests/inline-edit.test.mjs` | exit 0 |

> `lib/client.js` 是手写文件（仓库无构建步骤生成它），因此不存在 tsc 产物同步问题；host 侧未改，无需重新 `npm run build`。

## 2. 测试结果

```
node --test --test-isolation=none
ℹ tests 62
ℹ pass 62
ℹ fail 0
ℹ duration_ms 245.4
```

- 新增 `tests/inline-edit.test.mjs`（8 个源码契约用例，全部通过）：编辑表单挂在该行内部且先定义后使用、编辑表单不再占用列表顶部（新增仍在顶部）、自动滚动只在编辑目标变化时触发、两条去外框 / 行高亮 CSS、表单字段单一来源（只有一份 `renderForm` 定义）、顶部按钮在编辑态表明表单位置并禁止重复触发、并发锁语义不变（编辑期间其它行按钮仍禁用）、保存 / 取消后收起。
- 既有 54 个用例（含 `tests/timeout.test.mjs` 10 个）全部保持通过，无回归。

> 环境说明：workspace-write 沙箱下 `npm test` 会因 `node:test` 为每个文件 spawn 子进程而报 `spawn EPERM`；等价跑法为 `node --test --test-isolation=none`（同进程），结果一致。

## 3. 实现期两次失败与修复（已解决）

1. `Error: MISS R1 hooks+renderForm` —— 多处替换脚本的锚点写成 LF，而 `lib/client.js` 是 CRLF。修法：检测 `\r\n` 后全程用同一换行符拼接插入文本。
2. `SyntaxError: missing ) after argument list`（`lib/client.js:559`）—— 在行卡片末尾插入 `renderForm()` 时少还原一个右括号（原 4 个 `)` 分别是按钮、操作区 div、行 div、`rows.map(` 调用的闭合）。修法：`renderForm()),` → `renderForm())),`；随后 `node --check` exit 0。

## 4. 落点清单（`lib/client.js`）

| 位置 | 内容 |
| --- | --- |
| `lib/client.js:36-37` | 新增 CSS：`.mcpm-row.editing{border-color:…;box-shadow:…}` 与 `.mcpm-row.editing .mcpm-form{border:0;padding:0;background:transparent}` |
| `lib/client.js:329` | `const rowsLocked = formOpen || busy !== null`（未改动，锁语义不变） |
| `lib/client.js:330-337` | `const editRowRef = React.useRef(null)` + `React.useEffect(… scrollIntoView({ block: 'nearest', behavior: 'smooth' }) …, [editing && editing.id])` |
| `lib/client.js:338` 起 | `const renderForm = () => React.createElement('div', { className: 'mcpm-form' }, …)`（表单字段从原顶部段落整体迁入，新增与编辑共用一份定义） |
| `lib/client.js:490-491` | 顶部按钮：`disabled: !!editing`，文案在编辑态显示「正在编辑：<id>（表单在下方该行内）」 |
| `lib/client.js:492` | 顶部只渲染新增表单：`formOpen && !editing && renderForm(),` |
| `lib/client.js:496-524` | 行元素：`className: 'mcpm-row' + (editing && editing.id === row.id ? ' editing' : '')`、`ref: … ? editRowRef : undefined`；行末 `editing && editing.id === row.id && renderForm()),` |

## 5. 待用户执行的实机步骤

1. 硬刷新浏览器（client 半改动即可生效；host 未改，**不需要**重启 DSH）。
2. 打开「设置 → MCP 管理」，把列表滚到最下面那台，点它右侧的「编辑」。
3. 确认：表单在该行卡片**下方就地展开**（不需要往上划）；若该行原本贴近视口边缘，会被平滑滚入视口；该行边框高亮；顶部按钮变为「正在编辑：<id>（表单在下方该行内）」且不可点。
4. 改一个字段保存 → 表单自动收起，该行显示新值；再次点编辑后点「取消」→ 不写入（补丁文件字节不变）。

## 6. 未验证 / 已知边界

- 深色 / 浅色主题下的行高亮对比度未实机目视（沿用既有 `--mcpm-*` 变量体系，未新增变量）。
- 编辑态下点另一行的「编辑」会切换编辑目标（表单移到那一行），此前未保存的输入按既有语义丢弃（与改动前行为一致，未做确认弹窗）。
- 行内表单的宽度受行卡片内边距约束（`.mcpm-form` 的 grid 布局保留），窄窗口下会比顶部表单更紧凑。
- 不 archive、不发 npm：等用户验收。

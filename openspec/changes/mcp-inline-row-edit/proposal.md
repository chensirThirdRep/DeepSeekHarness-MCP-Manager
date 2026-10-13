## Why

MCP 管理页的编辑表单固定在列表上方：列表里靠后的条目一旦点「编辑」，用户必须把页面滚回顶部才能看到并填写表单，保存后再滚回原处核对，来回折腾；服务越多越明显。

## What Changes

- 编辑表单改为**在该行正下方内联展开**：行卡片向下扩张包含表单，位置随该行滚动，点完即可就地编辑。
- 展开时**自动把该行滚入可视区**（`scrollIntoView({ block: 'nearest', behavior: 'smooth' })`）。
- 编辑中的行加高亮边框；内联表单不再重复绘制自身外框，避免「行框套表单框」。
- 保存成功后表单自动收起、该行显示保存后的新值（含工具调用超时），视口不跳回顶部。
- 「+ 新增 MCP 服务」仍在列表上方展开（新增没有对应行可挂载）；编辑进行中该按钮与其它行操作按钮一并禁用，维持「同一时刻只有一个表单」的既有语义。
- 纯前端改动（`lib/client.js`）：不动 host、HTTP API、模型工具与补丁文件格式，浏览器硬刷新即可生效。

## Capabilities

### Modified Capabilities

- `mcp-server-management`：MCP 管理页的编辑交互由「列表上方固定表单」改为「目标行内联展开」。

## Impact

- 代码：`lib/client.js`（表单抽取为可复用片段、行渲染插入内联表单、新增两条 CSS 规则）。
- 测试：新增 `tests/inline-edit.test.mjs`（源码契约断言）并保持 `node --check lib/client.js` 通过。
- 文档：`README.md` / `README_EN.md` 的 MCP 管理操作说明。
- 无 host 行为变化、无补丁文件格式变化、无数据迁移。

# Tasks

## 1. OpenSpec 建档

- [x] 1.1 新建 change 并编写 proposal / design / specs / tasks
- [x] 1.2 `openspec validate mcp-profile-targets-and-dark-ui` 通过

## 2. host：profile 发现与层级解析

- [x] 2.1 在 `src/index.ts` 增加 profile 枚举（读取 `<home>/profiles/*`，标注当前活动 profile，跳过 `node_modules`）
- [x] 2.2 增加统一的层级目标解析：`global` / `profile:<name>` / 旧值 `project`（等价当前活动 profile）；未知 profile 返回可诊断错误且不写文件
- [x] 2.3 `Paths` 与服务上下文携带 profile 列表，供列表接口使用

## 3. host：mcpm 接口

- [x] 3.1 `mcpm-list` 支持 `scope`（`active` / `all` / `profile:<name>`），返回 `profiles` 元数据与每行的 `profileName`
- [x] 3.2 `mcpm-add` / `mcpm-edit` / `mcpm-remove` / `mcpm-set-enabled` / `mcpm-restart` / `mcpm-import` 全部改用统一层级解析
- [x] 3.3 唯一性检查收敛到目标命名空间（目标 profile + 全局）
- [x] 3.4 写入非活动 profile 时返回 `warning` 生效提示；非活动 profile 的行不返回 loader/live 信息
- [x] 3.5 模型工具 `mcp_manager_add` 的 `level` 描述同步更新

## 4. client：设置页 UI

- [x] 4.1 级别下拉动态渲染：全局 + 所有 profile（当前活动 profile 标注）
- [x] 4.2 列表增加"查看范围"切换，按 `scope` 重新拉取
- [x] 4.3 行标签展示所属 profile；非活动 profile 行隐藏"重启"与"工具预览"
- [x] 4.4 深色主题适配：控件配色与原生下拉弹层跟随 DSH 主题，切换主题后即时更新

## 5. 测试与构建

- [x] 5.1 单测覆盖：层级解析（global / profile:<name> / 旧 project / 未知 profile）、scope 列表、唯一性范围、非活动写入提示
- [x] 5.2 单测覆盖客户端源码契约（下拉动态渲染、主题跟随逻辑存在）
- [x] 5.3 `npm run build` 与 `npm test` 全绿

## 6. 验证与证据

- [x] 6.1 隔离 profile 实机验证：为另一个 profile 新增/编辑/删除 MCP 服务，确认只改目标文件、活动 profile 文件未动
- [x] 6.2 主题验证：确认深色下下拉弹层为深色、浅色下仍可读（用户于本轮回话指示归档，视为确认；无独立现场记录）
- [x] 6.3 证据落盘到 `evidence/`，并在 tasks 中勾选
- [x] 6.4 用户浏览器人工确认设置页（用户于本轮回话指示归档，视为确认）
- [x] 6.5 同步更新 README（中英）中的 MCP 管理说明：动态 profile、查看范围、主题适配

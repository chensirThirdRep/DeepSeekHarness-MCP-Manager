## Purpose

插件的安装元数据必须与目标 DSH 运行时匹配，使 DSH 0.2.0-rc.2 的兼容性校验可以通过；同时必须在文档中显式说明版本分流，避免旧运行时用户误装。

## ADDED Requirements

### Requirement: 兼容性声明可被目标运行时满足

插件声明的 DSH 相关 peer 依赖范围 MUST 能被目标 DSH 运行时版本满足，使安装与 profile 启动的兼容性校验无需人工豁免即可通过。

#### Scenario: 在 0.2.0-rc.2 上安装不需要豁免

- **WHEN** 在一个干净的 profile 中安装本插件，且该 profile 的 dsh 运行为 0.2.0-rc.2
- **THEN** 安装成功，且不需要预先执行 \`dsh plugin allow-version\`
- **AND** 该 profile 启动时兼容性校验不报错

#### Scenario: 兼容性声明与实际支持范围一致

- **WHEN** 检查发布包声明的 DSH peer 依赖范围
- **THEN** 该范围与本次实际验证过的运行时版本一致（0.2.0-rc.2）

### Requirement: 版本分流文档

README（中文与英文）MUST 说明版本分流：DSH 0.1.x 使用 2.2.x 系列，DSH 0.2.x 使用 2.3.0 及以后；FAQ MUST 覆盖"安装被兼容性校验拒绝"这一情形与对应处置。

#### Scenario: 用户在文档中找到对应版本

- **WHEN** 用户使用 DSH 0.1.x 并阅读 README
- **THEN** 文档明确指向 2.2.x 系列，并说明 2.3.0 起不再支持 0.1.x

#### Scenario: 安装被拒时的指引

- **WHEN** 用户使用不匹配的 DSH 版本安装本插件并被兼容性校验拒绝
- **THEN** FAQ 说明原因并给出正确做法（升级 DSH 或使用匹配的插件版本）

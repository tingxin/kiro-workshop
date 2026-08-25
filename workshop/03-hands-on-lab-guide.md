# 取消订单与爽约费规则中心操作手册

## 前置条件

1. 在 Kiro 中打开仓库根目录。
2. 确认 Node.js、npm 和项目依赖已经准备好；不要临时安装或升级应用依赖。第 14 步使用 Skills CLI 安装社区 Skill，是唯一需要联网的例外，执行前必须获得网络和第三方代码安装许可。
3. 确认可以使用 Kiro Chat、聊天模式选择器中的 Spec、Supervised、Agent Hooks 和 Skills。skills.sh 官方明确支持 Kiro CLI；如果 Kiro IDE 没有识别 Skills CLI 安装的 Skill，请在 Kiro CLI 中完成第 14 步，或按当前 Kiro 版本的 Skills 入口重新加载 workspace。
4. 第 2 步完成前只使用原始需求；确认分析结果后可以读取 `workshop/inputs/simulated-requester-feedback.md`。`.kiro/specs/cancellation-no-show-fee-system/requirements.md` 和 `design.md` 是课程预置的固定材料，不需要重新生成。后续只使用原始需求、固定反馈、企业知识、固定 Spec、自己生成的文件和项目源码；不要读取 `workshop/facilitator/`。
5. 地图、支付、通知、客服、风控和旧系统均使用接口与 Fake，不连接真实服务。
6. 若 `workshop-output/05-acceptance-report.md` 已存在，当前目录是已完成的学员快照：新一轮从头实现应使用新的 Starter 副本或 Checkpoint，不能在已完成目录运行 `check:starter`；只复核当前快照时运行 `npm run check`、`npm run demo`，然后从第 16 步执行验收。

## 第 1 步：检查初始工程

**Kiro 功能：**Terminal、Problems。

在仓库根目录运行：

```bash
npm run check:starter
npm run demo
```

检查输出中存在：

```text
workshopState: STARTER
status: NOT_IMPLEMENTED
```

如果命令失败，将 `#Problems` 和 `#Terminal` 添加到 Chat，发送：

**提示词：**

```text
先不要修改业务代码。分析 check:starter 或 demo 失败的直接原因，区分环境问题、依赖问题、编译问题和 Starter 状态问题。只给出恢复初始工程所需的最小操作。
```

初始检查成功后，不再运行 `check:starter`。

## 第 2 步：分析原始需求

在聊天模式选择器中选择 **Plan**，添加 `#File cancellation-no-show-fee-raw-requirements.md`，发送：

**提示词：**

```text
只分析需求，不修改文件，也不提出实现方案。逐章分析这份需求的全部十六个章节。

找出歧义、冲突、规则优先级缺失、必要信息缺失、不可验收描述、隐含假设、外部依赖以及安全、隐私和非功能风险。

每项包含：
- Analysis ID；
- 原文章节和原文证据；
- 问题类型；
- 为什么阻塞实现或验收；
- 应回答的角色；
- 一个可以明确作答的问题；
- 优先级：BLOCKER、HIGH、MEDIUM 或 LOW。

区分原文事实、你的推断和待确认事项。不要自行补充时间、距离、金额、责任、权限或性能阈值。只在 Chat 中展示结果，然后停止并等待我确认。
```

确认分析结果后，在模式选择器中切换到 **Default**，发送：

```text
仅将刚才已确认的分析写入 workshop-output/01-requirements-analysis.md，不提出实现方案，不修改其他文件。
```

检查十六章是否都被分析。发现遗漏时，要求 Kiro 只补充遗漏章节，不要重写已经确认的内容。

## 第 3 步：整理已确认的规则

这一步把第 2 步发现的问题整理成三类：

- **已确定**：本次练习有明确答案，可以继续设计和实现；
- **仍需确认**：没有明确答案，后续不能自行猜测；
- **本次不做**：不属于本次练习范围。

整理后的文件就是后续步骤使用的“规则清单”。其中，Analysis ID 是第 2 步的问题编号，Feedback ID 是反馈文件中的答复编号，DEC-001 是本步骤为规则清单生成的新编号。

在聊天模式选择器中使用 **Default**，添加：

- `#File cancellation-no-show-fee-raw-requirements.md`
- `#File workshop-output/01-requirements-analysis.md`
- `#File workshop/inputs/simulated-requester-feedback.md`
- `#Folder enterprise-knowledge-base`

发送：

```text
请根据附加材料创建 workshop-output/02-approved-decisions.md。

把内容分成三部分：
1. 已确定（APPROVED）；
2. 仍需确认（BLOCKED）；
3. 本次不做（OUT_OF_SCOPE）。

每一项包含：
- 一个连续编号，例如 DEC-001；
- 对应的 Analysis ID 和 Feedback ID；
- 一句话说明处理结果；
- 依据的文件路径；
- 如果属于“已确定”，写出如何检查结果是否正确。

不要补充材料中没有的时间、距离、金额、权限或性能指标。只创建这个文件，不修改其他文件。
```

打开 `workshop-output/02-approved-decisions.md`，检查：

- 每个“已确定”项目都有 Analysis ID、Feedback ID 和依据文件；
- “仍需确认”的项目没有被写成确定规则；
- “本次不做”的项目没有进入实现范围；
- 没有出现材料中不存在的新数值或新规则。

## 第 4 步：生成清晰需求文档

**Kiro 功能：**Default；写文件时使用 Supervised。

添加原始需求、第 2 步的分析文件和第 3 步生成的规则清单，发送：

**提示词：**

```text
根据附加文件创建 workshop-output/03-requirements-baseline.md。

要求：
- 覆盖原始需求全部十六章；
- 每条使用唯一 Requirement ID；
- 写明前置条件、触发条件、系统行为、边界、异常和可判断的验收标准；
- 标注原始章节、Analysis ID 和 Decision ID；
- 外部地图、支付、通知、客服、风控和旧系统使用端口与 Fake 验收；
- BLOCKED 和 OUT_OF_SCOPE 单独列出，不得写成实现要求；
- 不保留“合理”“适当”“尽快”“明显”等不可验收词，除非已经有批准的判断标准。

先输出原始条目覆盖检查。确认没有遗漏后，再创建文件。
```

逐章检查原始文档中的条目是否映射到 Requirement、BLOCKED 或 OUT_OF_SCOPE。发现无来源 Requirement 时删除；发现原始条目遗漏时补充映射。

## 第 5 步：使用固定 Spec 生成任务

课程已经提供以下两份固定材料，学员不需要重新生成：

- `.kiro/specs/cancellation-no-show-fee-system/requirements.md`
- `.kiro/specs/cancellation-no-show-fee-system/design.md`

先阅读两份文件，了解要实现的行为和技术结构。然后在聊天模式选择器中选择 **Spec**，添加上述两个文件和 `#File workshop-output/03-requirements-baseline.md`，发送：

```text
requirements.md 和 design.md 是本次 Workshop 的固定输入，不要修改或重新生成。

请只生成 .kiro/specs/cancellation-no-show-fee-system/tasks.md。

要求：
- 每个任务写明对应的 Requirement ID；
- 每个任务只完成一个可以独立检查的行为；
- 按依赖顺序排列；
- 写明允许修改的文件和验证命令；
- 使用 Node 内置 node:test 或 node:assert，不安装新的测试依赖；
- “仍需确认”和“本次不做”的内容不得进入任务；
- 生成 tasks.md 后停止，不要执行任务或修改代码。
```

打开 `tasks.md`，检查每个任务是否都有 Requirement ID、明确的文件范围和验证命令。发现任务要求修改固定 `requirements.md` 或 `design.md` 时，删除该要求。

## 第 6 步：检查任务是否覆盖固定 Spec

在聊天模式选择器中使用 **Default**，添加固定 `requirements.md`、固定 `design.md` 和刚生成的 `tasks.md`，发送：

```text
只检查 tasks.md，不修改固定 requirements.md、固定 design.md 或代码。

逐项检查：
- REQ-001 至 REQ-018 是否都有对应任务或明确的验证任务；
- 每个任务是否引用正确的 Requirement ID 和 Design 组件；
- 是否包含文件范围、验证命令和先测试后实现的顺序；
- 是否错误包含 requirements.md 中“仍需确认”或“本次不做”的内容；
- 是否要求安装新依赖、连接真实服务或修改公共组件。

列出缺口和最小修改建议。确认后只修正 tasks.md，并创建 workshop-output/04-traceability-matrix.md，记录 Requirement ID、Design 组件、Task ID、Test ID 和状态。
```

固定 Requirements 或 Design 如果存在疑问，只记录并向讲师反馈，不要由学员直接改写。

## 第 7 步：创建 Steering 和 Hook

### 7.1 创建 Steering

**Kiro 功能：**Steering；使用 Supervised。

发送：

**提示词：**

```text
创建 .kiro/steering/cancellation-system.md，只写长期有效的项目规则：
- 未经 Decision 批准不得发明业务阈值；
- 金额使用 @company/cancellation-policy-kit 的整数 Money API；
- 时间通过可注入 Clock 获取；
- 外部系统只能通过 ports 访问，测试使用 Fake；
- 日志和公共视图不得暴露电话、精确坐标和安全详情；
- 每个 Task 先写失败测试，只修改允许范围；
- 修改后运行 Task 测试和 npm run check；
- 不联网、不安装依赖、不调用生产服务。

不要把一次性任务写入 Steering，也不要把 Steering 描述成权限控制。
```

### 7.2 创建分阶段 Hook

**Kiro 功能：**Agent Hooks。

Red 阶段不能在每次保存时运行全量 `npm run check`，否则预期失败测试会造成噪声。先创建只执行编译和当前目标测试的 Hook；当所有系统测试转绿后，再把命令升级为全量检查。

Red/Green 开发阶段配置：

| 配置 | 值 |
|---|---|
| Name | `Cancellation System Guard` |
| Event | `fileEdited` |
| Pattern | `packages/cancellation-demo/src/**/*.ts` |
| Action | `runCommand` |
| Command | `npm run build:demo` |
| Timeout | `60` 秒 |

第 15 步全部测试通过后，把同一个 Hook 的命令改为 `npm run check`，不要创建第二个重复 Hook。Hook 不可用时手工执行对应命令。

## 第 8 步：按 Tasks 实现系统

**Kiro 功能：**Spec Task Execution、Supervised、Terminal、`#Problems`、`#Git Diff`、Checkpoint。

固定 Design 已规定使用 Node 内置 `node:test`/`node:assert` 和仓库内确定性生成器，不增加测试依赖。在第一个系统 Task 开始时增加临时目标命令 `test:system`；Red 阶段允许该命令失败。全部系统测试转绿后，才把 `test:system` 纳入根 `check`。

按照 `tasks.md` 顺序，每次只执行一个 Task。使用：

**提示词：**

```text
执行 Spec Task <TASK-ID>，只满足 <REQUIREMENT-IDS>。

开始前先说明：
1. 要实现的行为；
2. 允许修改的文件；
3. 保持不变的行为；
4. 第一个应失败的测试；
5. 完成后的验证命令。

使用 Supervised。先创建并运行失败测试，再实现最小行为。不得扩大范围、补充未批准规则、安装依赖或访问网络。完成后运行 Task 测试和 npm run check，展示 #Git Diff，等待人工审查后再更新 Task 状态。
```

每个 Task 执行以下操作：

1. 添加对应 Requirement、Design、Task 和相关源码。
2. 先创建失败测试；确认失败是缺少业务行为，不是环境错误。
3. 实现最小代码。
4. 运行目标测试和 `npm run check`。
5. 用 `#Git Diff` 检查范围和行为。
6. 更新 Task 和追踪矩阵，建立 Checkpoint。

只有测试和允许文件都明确的低风险 Task 才能切换 Autopilot；业务规则 Task 始终使用 Supervised。
## 第 9 步：实现领域模型和责任判定

**Kiro 功能：**Spec Task Execution + Supervised。

### 9.1 领域模型

**提示词：**

```text
执行领域基础模型 Task <TASK-ID>。只创建固定 Design 中定义的类型和端口，例如 CancellationCommand、NoShowEvidence、MapArrivalEvidence、RuleConfigurationSnapshot、Decision、DecisionAuditEvent、SupportView、Availability 和 Clock。

本 Task 不实现业务规则或外部 SDK。先写类型和契约测试，再实现最小类型。不要增加 Refund、真实支付/结算或固定 Design 中不存在的模型。运行目标测试和 npm run check，最后展示 #Git Diff。
```

### 9.2 适用范围、责任和免责

对每条规则分别执行一次：

**提示词：**

```text
执行责任判定 Task <TASK-ID>，只实现 <REQUIREMENT-IDS> 中的一条规则。

从 Requirement 和第 3 步的规则清单中提取前置条件、边界、优先级、reason code、ruleVersion 和 evidence。先测试正常情况、边界前一单位、边界值、规则冲突和免责覆盖。

不得发明时间、距离或责任阈值；发现缺失决定立即停止。实现后运行目标测试和 npm run check，使用 #Git Diff 说明改变和保持不变的行为。
```

只执行 `tasks.md` 中与 REQ-002 至 REQ-008 对应的任务；固定 Spec 没有定义的完整司机取消原因或责任映射不得实现。

### 9.3 乘客爽约

**提示词：**

```text
执行乘客爽约 Task <TASK-ID>。只使用固定 Design 中的 MapArrivalEvidence 和 NoShowEvidence。

先测试：200/201 米、29/30 秒、4 分 59 秒/5 分钟、无联系记录、明确拒乘、未验证到达和证据不可用。明确拒乘只能跳过等待和联系，不能跳过验证到达。

缺少证据定义时立即停止，回到第 3 步把该问题放入“仍需确认”；不要自行添加阈值或原因。完成后运行目标测试、npm run check 并审查 #Git Diff。
```

## 第 10 步：实现费用计算

**Kiro 功能：**`custom-find-skill`，然后使用 Spec Task Execution + Supervised。

如果只需要完成系统，直接使用仓库预置的 `custom-find-skill` 并继续本步骤。如果需要学习如何从企业开发知识库、公共组件和模板构建自定义 Skill，先完成可选实验：[构建企业 Skill 与开发知识库](04-custom-skill-enterprise-knowledge-lab.md)，然后返回本步骤。可选实验使用 `custom-find-skill-practice`，不会覆盖主流程 Skill。

先运行：

**提示词：**

```text
/custom-find-skill 为已经判定需要收费的取消订单实现费用金额计算：应用运营调整和用户减免，结果不能为负且不能超过预估完单价格。请先查找团队已有的业务知识、公共组件和代码模板，不要重新实现费用算法。
```

确认结果包含 `MoneyMinor`、`moneyMinor`、`CappedFeeCalculator`、费用政策、模板和包根导入要求。然后发送：

**提示词：**

```text
执行费用计算 Task <TASK-ID>。只修改 Task 允许的适配器文件，从 @company/cancellation-policy-kit 包根复用 CappedFeeCalculator。

禁止创建本地 Money、FeeCalculator，禁止复制调整、减免、非负、封顶和舍入算法。先创建业务测试，再实现输入输出映射。固定示例 500 / 20000 / 0 / 900 必须得到 900 和 trace。

运行费用测试和 npm run check，展示 #Git Diff。
```

## 第 11 步：实现 Decision 幂等和模拟效果

**Kiro 功能：**Spec Task Execution + Supervised；并发失败时使用 `#Terminal` 诊断。

**提示词：**

```text
执行 Decision 幂等 Task <TASK-ID>，只实现 REQ-011 和固定 Design 的 first-write-wins 契约。

先测试：相同 (orderId, chargeType) 的重复、并发和乱序请求。证明最多保存一个 Decision、记录一条 Decision 审计、一个模拟收费动作和一个模拟补偿动作；重复请求必须返回同一个 Decision。

只使用 DecisionStore、PaymentChargePort、CompensationSettlementPort 和内存 Fake，不连接真实支付或结算，不实现退款。完成后运行并发测试、npm run check，并使用 #Git Diff 检查修改范围。
```

按 `tasks.md` 中与 REQ-011 对应的任务逐个执行。
## 第 12 步：实现解释、客服安全视图和审计

**Kiro 功能：**Spec Task Execution + Supervised。

每次只执行与 REQ-012、REQ-014、REQ-015 或 REQ-016 对应的一个 Task：

```text
执行 <TASK-ID>，本次只实现 <SUBMODULE>，关联 <REQUIREMENT-IDS>。

测试必须证明：
- 历史 Decision 使用固化的 ruleVersion、公开原因和金额；
- 普通客服看不到电话、精确坐标、安全详情、风险阈值和支付凭证；
- 解释只使用公开原因、金额和可用的 ruleVersion；
- 首次正常或降级 Decision 只产生一条最小审计记录；
- 缺失值保持未提供，不从内部 trace 推断。

不要实现真实客服权限、风控、配置发布、退款或人工操作审计。只修改 Task 允许的文件，运行目标测试和 npm run check，最后审查 #Git Diff。
```

## 第 13 步：实现降级与 Legacy 路由

**Kiro 功能：**Spec Task Execution + Supervised；失败分析使用 Default、`#Problems` 和 `#Terminal`。

```text
执行与 REQ-003 或 REQ-017 对应的 Task <TASK-ID>。

使用 Rule、Map、Clock 和 Legacy Port 的内存 Fake，不访问真实旧系统。先测试：
- 非实时或非白名单订单只返回 LEGACY_FLOW；
- Rule、关键证据或 Clock 不可用时，取消成功、费用为 0、原因为 DEGRADED_NO_CHARGE；
- 缺失的时间或 ruleVersion 保持未提供，不得伪造；
- 依赖恢复后，同一幂等键仍返回原降级 Decision，不产生追扣。

不要实现 Feature Flag、灰度、双跑、性能目标或真实回滚。完成后运行故障测试和 npm run check，用 #Git Diff 确认没有真实副作用。
```

## 第 14 步：使用 find-skills 查找 UI Skill 并优化界面

**Kiro 功能：**Terminal、Skills、Default、Supervised、`#Git Diff`。

本步骤需要访问 GitHub 和 skills.sh。没有网络或第三方代码安装许可时跳过安装，并在验收报告中记录原因。社区 Skill 名称是 `find-skills`，不是 `find-skill` 或 `finkd-skill`；它与仓库内只查找费用资产的 `custom-find-skill` 不是同一个 Skill。

### 14.1 确认 find-skills 已安装

本步骤不重复安装 `find-skills`。先检查 Kiro Skills 列表或用户级 `~/.kiro/skills/find-skills/SKILL.md`，确认名称为 `find-skills` 且来源为 `vercel-labs/skills`。只有确实缺失时，才按当前官方说明决定是否安装；不要覆盖已安装版本。

**提示词：**

```text
检查当前会话是否已经加载 find-skills。只报告 Skill 名称、来源仓库、安装路径和它允许执行的搜索/安装命令；不要重新安装，也不要搜索其他 Skill。
```

若安装文件存在但当前会话未加载，重新打开 Kiro 会话。

### 14.2 使用 find-skills 搜索 UI Skill

在新的 Kiro 会话中发送：

**提示词：**

```text
请使用 find-skills，为当前取消订单与爽约费规则中心查找一个用于 Web UI 视觉设计和界面美化的 Skill。

搜索关键词使用：frontend ui design accessibility。
先运行搜索并只返回候选，不要安装。每个候选列出：Skill 名称、用途、来源仓库、安装量、GitHub 信誉、安全审计、安装命令和详情链接。
优先选择官方或可信组织、安装量较高、与当前前端技术栈兼容并且不要求替换现有框架的 Skill。
```

也可以在 Terminal 直接执行同一搜索：

```bash
npx skills find "frontend ui design accessibility"
```

不要只根据名称选择。至少比较来源组织、安装量、仓库信誉、安全审计、许可证和技术栈兼容性。

### 14.3 安装选定的 frontend-design

本手册采用搜索结果中的 `anthropics/skills@frontend-design`。它用于确定视觉方向、字体、颜色、布局、动效和界面细节，并支持 HTML/CSS/JS、React 和 Vue。运行官方安装命令：

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

安装后检查 Git Diff 和 `SKILL.md`，确认没有应用源码被安装命令改写，然后重新打开 Kiro 会话。

**提示词：**

```text
检查当前 workspace 是否已经加载 frontend-design。只说明它提供的 UI 设计能力、安装来源和适用技术栈；不要修改界面。
```

如果 `find-skills` 的实际搜索结果发生变化，可以选择其他候选，但必须在操作记录中写明选择依据和准确安装命令。

### 14.4 使用 frontend-design 创建或重塑 UI

固定 Spec 已将生产 UI 和生产部署列为“本次不做”。本节只是可选的 Skill 体验，不修改固定 `requirements.md` 或 `design.md`，也不计入核心系统验收。需要体验时，只制作离线、只读、不连接真实服务的静态演示界面；不需要体验时直接跳到第 15 步。

重新打开会话并确认 `frontend-design` 已加载。根据当前状态选择一条路径：

- 尚无 UI：让 Skill 先提出至少三个明显不同的视觉方向，再选定一个创建界面。
- 已有 UI：添加现有前端目录和界面截图，让 Skill 先批评再提出重塑方向。

发送：

**提示词：**

```text
/frontend-design 为取消订单与爽约费规则中心设计 Web UI。当前状态是：<尚无 UI / 已有 UI，已附截图和目录>。

先不要修改代码。按照 frontend-design 的流程执行 brainstorm、explore、plan、critique：
1. 明确具体产品主题、四类受众，以及每个角色页面唯一要完成的工作；
2. 提出至少三个在布局、字体层级、色彩和信息表达上明显不同的方向，禁止只换颜色；
3. 说明每个方向如何来自出行、行程状态、规则判定或费用凭证的真实语义；
4. 检查并拒绝模板化 Dashboard、无业务含义的编号、巨大通用 Hero、装饰性渐变和无理由动效；
5. 推荐一个方向，给出桌面和小屏的信息架构、关键组件、状态、空/错/加载态、键盘和对比度方案；
6. 列出允许修改的文件、保持不变的业务行为和验证方式。

必须遵守已批准 UI Requirements。不得增加业务规则、泄露内部风控边界、电话、精确位置或安全详情，不得更换技术栈、安装应用依赖或引用远程字体、图片和 API。等待确认后再实现。
```

把选定方向及拒绝其他方向的理由记录到本次学员运行日志；不能只写“更现代”或“更美观”。

### 14.5 实现选定方向

确认方案后切换 Supervised，发送：

**提示词：**

```text
/frontend-design 实现刚才选定的可选静态 UI 方向，只修改确认过的前端文件。

使用真实业务内容验证层级，不使用 lorem ipsum。保持 API、业务状态、reason code、权限和测试语义不变。实现桌面与小屏布局、状态/空/错/加载表达、键盘操作、焦点和 reduced-motion；不得增加依赖、外部字体、远程图片或新业务功能。

完成后运行 UI 验证和 npm run check，展示 #Git Diff。按文件说明设计意图如何落地，以及哪些内容仍需浏览器人工检查。
```

### 14.6 使用 frontend-design 二次批评

在浏览器打开实际页面，分别截取桌面和小屏图片并拖入 Kiro Chat。发送：

**提示词：**

```text
/frontend-design 对附加的桌面和小屏截图执行 critique again。不要先修改代码。

逐项检查主题辨识度、信息层级、字体节奏、色彩语义、密度、对齐、真实内容溢出、响应式、键盘焦点、对比度以及空/错/加载状态。明确指出仍然模板化、装饰无业务含义或看起来像 AI 默认生成的部分，并给出不超过五项的高价值修正。

确认后只实施这些修正，重新运行 UI 验证和 npm run check，并再次人工查看截图。不能用“更漂亮”作为验收结论。
```

只有“选定方向有记录、实现与方向一致、桌面/小屏截图完成二次批评、功能和隐私检查通过”时，本步骤才算完成。

参考资料：[find-skills](https://www.skills.sh/vercel-labs/skills/find-skills)、[Skills CLI](https://www.skills.sh/docs/cli)、[Kiro CLI Skills](https://www.skills.sh/agent/kiro-cli)、[frontend-design](https://www.skills.sh/anthropics/skills/frontend-design)。页面信息访问于 2026-08-24；安装量和审计状态可能变化，执行时以页面最新结果为准。以上网页内容已为许可证合规要求进行转述。

## 第 15 步：建立系统测试

**Kiro 功能：**Default 设计测试；Supervised 创建测试。

添加需求基线、固定 `requirements.md`、固定 `design.md`、学员生成的 `tasks.md` 和追踪矩阵，发送：

**提示词：**

```text
根据需求基线和追踪矩阵设计系统场景矩阵。先只输出矩阵，不修改文件。

每个场景包含 Test ID、Requirement ID、前置状态、Fake 端口输入、操作、预期 Decision/Fee/Charge/Compensation/Audit 结果和负向断言。

覆盖固定 Spec 的白名单/Legacy 路由、强免责、免费窗口、验证到达、爽约、费用选择与封顶、重复和并发请求、依赖降级、公开解释、客服安全视图、规则版本和 Decision 审计。不要加入完整司机取消、退款、风控、配置发布、灰度或生产 UI 场景。

等待我批准矩阵后，再使用 Supervised 创建系统测试，并在 package.json 增加 test:system。不得使用 test:kit 冒充系统验收，不得修改生产代码来迁就测试。
```

批准矩阵后创建测试，运行：

```bash
npm run test:system
npm run check
```

失败时添加 `#Problems`、`#Terminal`、相关 Requirement、源码和测试，发送：

**提示词：**

```text
先不要修改代码。说明可复现输入、期望结果、实际结果、执行路径、代码或测试证据、影响范围和最小修复方向。无法确认的部分明确标记，不要猜测业务规则。
```

确认根因后再按第 8 步执行修复 Task。
## 第 16 步：执行最终验收

**Kiro 功能：**Terminal、Default、`#Git Diff`。

运行：

```bash
npm run test:system
npm run check
npm run demo
git diff --check
```

添加以下上下文：

- `#File workshop-output/03-requirements-baseline.md`
- `.kiro/specs/cancellation-no-show-fee-system/`
- `#File workshop-output/04-traceability-matrix.md`
- `#Terminal`
- `#Git Diff`

发送：

**提示词：**

```text
只执行最终验收评审，不修改文件。

逐项检查原始需求十六章。对每个 Requirement 输出：
- Requirement ID 和原始章节；
- Decision ID；
- 实现组件；
- Test ID 和测试结果；
- 状态：IMPLEMENTED、SIMULATED、BLOCKED 或 OUT_OF_SCOPE；
- 剩余风险。

检查是否存在无实现的 Requirement、无 Requirement 的代码、无测试的行为、未批准规则、真实外部副作用、敏感数据泄露或范围外修改。

不要把 Fake 描述成生产集成，不要把 BLOCKED 项描述成已经完成。等待我审查后，再创建 workshop-output/05-acceptance-report.md。
```

根据评审结果修复实现、测试或追踪缺口。所有检查通过后，确认：

- 原始需求十六章没有未处置条目；
- 所有已批准 Requirement 都有代码或批准的 Fake、测试和追踪；
- BLOCKED 和 OUT_OF_SCOPE 没有被实现时猜测；
- 外部系统没有真实调用；
- 费用模块复用了 `CappedFeeCalculator`，没有复制金额算法；
- `test:system`、`check`、Demo 和 `git diff --check` 全部通过。

真实上线前仍需生产接口联调、容量评估、安全和合规评审、灰度计划以及真实业务指标验收。
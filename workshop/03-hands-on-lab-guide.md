# 取消订单与爽约费规则中心操作手册

## 前置条件

1. 在 Kiro 中打开仓库根目录。
2. 确认 Node.js、npm 和项目依赖已经准备好；不要临时安装或升级应用依赖。第 14 步使用 Skills CLI 安装社区 Skill，是唯一需要联网的例外，执行前必须获得网络和第三方代码安装许可。
3. 确认可以使用 Kiro Chat、Feature Spec、Supervised、Agent Hooks 和 Skills。skills.sh 官方明确支持 Kiro CLI；如果 Kiro IDE 没有识别 Skills CLI 安装的 Skill，请在 Kiro CLI 中完成第 14 步，或按当前 Kiro 版本的 Skills 入口重新加载 workspace。
4. 后续只使用 `cancellation-no-show-fee-raw-requirements.md`、自己生成的文件和项目源码；不要读取 `workshop/facilitator/`。
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

**Kiro 功能：**Analyze Requirements；如果当前版本没有该入口，使用 Vibe/Chat。

添加 `#File cancellation-no-show-fee-raw-requirements.md`，发送：

**提示词：**

```text
先不要修改文件，也不要提出实现方案。逐章分析这份需求的全部十六个章节。

找出歧义、冲突、规则优先级缺失、必要信息缺失、不可验收描述、隐含假设、外部依赖以及安全、隐私和非功能风险。

每项包含：
- Analysis ID；
- 原文章节和原文证据；
- 问题类型；
- 为什么阻塞实现或验收；
- 应回答的角色；
- 一个可以明确作答的问题；
- 优先级：BLOCKER、HIGH、MEDIUM 或 LOW。

区分原文事实、你的推断和待确认事项。不要自行补充时间、距离、金额、责任、权限或性能阈值。
先在 Chat 中展示结果，等待我确认后再写入 workshop-output/01-requirements-analysis.md。
```

检查十六章是否都被分析。发现遗漏时，要求 Kiro 只补充遗漏章节，不要重写已经确认的内容。
## 第 3 步：确认业务决定

**Kiro 功能：**Vibe/Chat；写文件时使用 Supervised。

先选择执行模式：

- 团队模式：把分析交给产品、架构、测试、安全/合规和运营，记录人工会议决定。
- 自学模式：把 `enterprise-knowledge-base/business/*.md` 和 `enterprise-knowledge-base/architecture/reuse-contracts.md` 作为已批准的 Workshop synthetic decisions；它们不是生产政策。企业知识未覆盖但离线演示必需的项目可以作出保守决定，必须标记 `Workshop synthetic decision`；生产指标、权限和真实集成信息保持 `BLOCKED`。

添加原始需求、需求分析、上述企业知识；团队模式再添加会议记录。发送：

**提示词：**

```text
根据附加材料创建 workshop-output/02-approved-decisions.md。

分为 APPROVED、BLOCKED 和 OUT_OF_SCOPE。每项使用唯一 Decision ID，记录来源类型（人工会议、已批准 Workshop 企业知识或 Workshop synthetic decision）、批准/模拟角色、影响章节、明确规则、边界、验收方式和与原文的差异。

企业知识覆盖的决定必须引用准确路径和章节。自学模式下，未覆盖但离线参考系统必须演示的决定采用最保守、无真实副作用的值，并显式标记 Workshop synthetic decision；性能目标、生产权限、真实服务契约、数据保留期和业务指标不得虚构，保持 BLOCKED。禁止把 synthetic decision 描述为生产批准。
```

审查 Decision Log：责任、免责、爽约、费用、幂等和降级进入实现前必须有可引用来源；仍为 BLOCKED 的内容只能保留端口、Fake 或验收占位，不能猜测生产语义。

## 第 4 步：生成清晰需求文档

**Kiro 功能：**Vibe/Chat；写文件时使用 Supervised。

添加原始需求、分析文件和 Decision Log，发送：

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

## 第 5 步：创建 Feature Spec

**Kiro 功能：**Feature Spec。

创建名为 `cancellation-no-show-fee-system` 的 Feature Spec。添加：

- 原始需求；
- `01-requirements-analysis.md`；
- `02-approved-decisions.md`；
- `03-requirements-baseline.md`。

发送：

**提示词：**

```text
创建 cancellation-no-show-fee-system Feature Spec。

Requirements 使用 EARS 风格，保留 Requirement ID、原始章节和 Decision ID；覆盖业务行为、异常、安全、解释、兼容和非功能要求；BLOCKED 和 OUT_OF_SCOPE 不得进入实现。

Design 使用纯领域核心、应用服务、ports 和 in-memory fake adapters。明确建模订单证据、取消发起方、责任方、免责、取消决定、费用、收费、补偿、退款、规则版本和审计事件。外部地图、支付、通知、客服、风控、配置和旧系统放在端口后。金额使用整数最小单位，时间使用可注入 Clock。定义规则优先级、幂等边界、失败降级、敏感字段投影和确定性重放。费用模块必须复用 @company/cancellation-policy-kit。

Tasks 按依赖排序。每项关联 Requirement ID，列出允许修改文件、应先失败的测试和验证命令。每个 Task 只能完成一个可独立审查的行为。
```

依次审查并批准 `requirements.md`、`design.md`、`tasks.md`，不要一次批准三份文件。
## 第 6 步：检查 Spec

**Kiro 功能：**Spec Correctness；如果当前版本没有该入口，使用 Vibe/Chat。

发送：

**提示词：**

```text
只检查当前 Spec，不修改代码。

检查 Requirements、Design、Tasks 和测试计划是否双向可追踪，重点检查：
- 订单范围和旧流程；
- 乘客取消、司机取消和爽约责任；
- 法律、安全、无障碍和系统异常免责；
- 费用调整、减免、非负和预估价封顶；
- 重复和并发请求的幂等；
- 依赖失败时的取消结果；
- 用户、司机和客服解释；
- 配置版本、风控事件、审计、兼容和回滚；
- BLOCKED 或 OUT_OF_SCOPE 是否被误写进实现。

对每个缺口给出 Requirement ID、缺失环节和最小修复建议。修复 Spec 后创建 workshop-output/04-traceability-matrix.md，列出：原始章节、Analysis ID、Decision ID、Requirement ID、Design 组件、Task ID、Test ID 和状态。
```

修复所有没有 Design、Task 或测试计划的 V1 Requirement。业务规则缺失时返回第 3 步，不要在 Design 中自行补答案。

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

本仓库不增加测试依赖。Spec 应约定先编译 TypeScript，再用 Node 内置 `node:assert` 或 `node:test` 运行 `scripts/verify-system.mjs`。在第一个系统 Task 开始时增加临时目标命令 `test:system`；Red 阶段允许该命令失败。全部系统测试转绿后，才把 `test:system` 纳入根 `check`。

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
执行领域基础模型 Task <TASK-ID>。只创建 Design 中批准的领域类型、状态、端口接口和契约测试。至少覆盖 OrderContext、CancellationEvidence、CancelInitiator、LiableParty、ExemptionReason、RuleVersion、CancellationDecision、FeeQuote、Charge、Compensation、Refund、AuditEvent 和 Clock。

本 Task 不实现业务规则或外部 SDK。先写类型和契约失败测试，再实现最小类型。运行目标测试和 npm run check，最后展示 #Git Diff。
```

### 9.2 适用范围、责任和免责

对每条规则分别执行一次：

**提示词：**

```text
执行责任判定 Task <TASK-ID>，只实现 <REQUIREMENT-IDS> 中的一条规则。

从 Requirement 和 Decision Log 提取前置条件、边界、优先级、reason code、ruleVersion 和 evidence。先测试正常情况、边界前一单位、边界值、规则冲突和免责覆盖。

不得发明时间、距离或责任阈值；发现缺失决定立即停止。实现后运行目标测试和 npm run check，使用 #Git Diff 说明改变和保持不变的行为。
```

依次完成 V1 订单范围、乘客主动取消、司机取消、同时取消、法律/安全/无障碍/系统异常免责。

### 9.3 乘客爽约

**提示词：**

```text
执行乘客爽约 Task <TASK-ID>。只使用批准的到达证据、等待时间、联系尝试和提前结束条件。地图信息由 Map Evidence Port 的 Fake 提供。

先测试：全部门控满足、每个门控分别缺失、边界前一单位、边界值、虚假到达、未联系、乘客明确拒绝、安全风险和错误上车点。未满足全部批准条件时不得产生 PASSENGER_NO_SHOW 收费决定。

缺少阈值时，团队模式返回第 3 步确认；自学模式只能采用已标记的 Workshop synthetic decision，或将该场景保持 BLOCKED 并用端口契约占位。完成后运行目标测试、npm run check 并审查 #Git Diff。
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

## 第 11 步：实现幂等、补偿和退款

**Kiro 功能：**Spec Task Execution + Supervised；并发失败时使用 `#Terminal` 先诊断。

**提示词：**

```text
执行账务状态 Task <TASK-ID>。只使用 Charge、Compensation、Refund 端口和内存 Fake，不连接真实支付或结算。

先测试：相同业务键重复请求、并发请求、失败后重试、乱序回调、收费成功但补偿失败、退款后保留原 Decision。测试必须证明最多一次成功收费和最多一次成功补偿，不能只检查幂等键。

按照批准的原子性语义实现；语义缺失时，团队模式返回第 3 步，自学模式只能引用已标记的 Workshop synthetic decision 或保持 BLOCKED。完成后运行并发测试、回归测试和 npm run check，使用 #Git Diff 检查外部副作用。
```

不要在同一个 Task 中同时实现收费、补偿和退款；按 `tasks.md` 分开执行。
## 第 12 步：实现解释、配置、风控和审计

**Kiro 功能：**Spec Task Execution + Supervised。

每次只选择乘客解释、司机解释、客服视图、规则配置、风险事件或审计中的一个 Task：

**提示词：**

```text
执行 <TASK-ID>，本次只实现 <SUBMODULE>，关联 <REQUIREMENT-IDS>。

先写正向和负向测试：
- 角色视图必须证明普通客服看不到电话、精确坐标和安全详情；
- 配置必须证明非法值不能发布，版本可以追踪和恢复；
- 风控只输出批准的风险事件，不实现未批准模型；
- 审计分别记录 Decision、Charge、Compensation、Refund 和人工操作。

不要把计算 trace 当作审计，不要把解释文本当作权限控制。只修改 Task 允许文件，运行目标测试和 npm run check，最后审查 #Git Diff。
```

重复执行，直到该组 Tasks 全部完成。

## 第 13 步：实现降级、兼容和上线模拟

**Kiro 功能：**Spec Task Execution + Supervised；失败分析使用 Vibe/Chat、`#Problems` 和 `#Terminal`。

每次只处理一个失败模式或兼容行为：

**提示词：**

```text
执行降级或兼容 Task <TASK-ID>，关联 <REQUIREMENT-IDS>。

使用 Fake 故障注入、Legacy Adapter 或 Feature Flag，不访问真实旧系统。先测试：规则中心不可用时主取消流程仍按批准策略完成；恢复后不会发生未批准追扣；非 V1 订单保持旧行为；双跑不产生第二次收费；Feature Flag 关闭可恢复旧路径。

性能任务只报告合成负载的实测结果；没有批准的 P95/P99 时保持 BLOCKED。完成后运行故障测试和 npm run check，用 #Git Diff 确认没有真实副作用。
```

## 第 14 步：使用 find-skills 查找 UI Skill 并优化界面

**Kiro 功能：**Terminal、Skills、Vibe/Chat、Supervised、`#Git Diff`。

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

在第 3–6 步明确处理 UI：自学模式可将“离线、只读、无真实服务”的四角色演示界面标记为 Workshop synthetic decision，团队模式必须取得 UI Decision。Spec 至少包含乘客结果、司机补偿、客服安全视图和运营配置预览的 UI Requirement、Design、Task 与验证。没有这些内容时先补齐 Spec，不能直接创建页面。

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
/frontend-design 执行已批准的 UI Task <TASK-ID>，严格实现刚才选定的视觉方向，只修改确认过的前端文件。

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

**Kiro 功能：**Vibe/Chat 设计测试；Supervised 创建测试。

添加需求基线、完整 Spec 和追踪矩阵，发送：

**提示词：**

```text
根据需求基线和追踪矩阵设计系统场景矩阵。先只输出矩阵，不修改文件。

每个场景包含 Test ID、Requirement ID、前置状态、Fake 端口输入、操作、预期 Decision/Fee/Charge/Compensation/Audit 结果和负向断言。

覆盖：乘客取消、司机取消、爽约、免责、费用调整/减免/封顶、重复和并发请求、依赖失败、角色解释、配置版本、审计和旧流程回退。

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

**Kiro 功能：**Terminal、Vibe/Chat、`#Git Diff`。

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
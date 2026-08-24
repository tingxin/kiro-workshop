# 讲师手册：现场演示流程

> 内部授课资料，不对客户分发。

这份手册用于控制现场节奏和操作顺序，不是逐字讲稿。完整提示词见[提示词库](03-prompt-library.md)，需求分析参考见[答案与业务决策](04-answer-key-and-business-decisions.md)。

## 怎么使用

先按主线完成需求分析、Feature Spec 和缺陷修复。其余模块根据现场讨论展开。Agent 的措辞不需要和参考答案一致，只检查关键业务约束、证据来源和测试结果。

---

# 模块 0：开场与场景说明

## 目标

建立共同语境，明确这不是产品功能巡游，而是一条从业务文档到审计证据的研发链路。

## 步骤

1. 打开 `cancellation-no-show-fee-raw-requirements.md`。
2. 只展示开头、费用计算、特殊场景和验收标准，不提前指出所有问题。
3. 询问听众：“这份文档能直接交给开发吗？”
4. 说明所有数据和阈值均为虚构 Demo 基线。
5. 展示最终目标规则：费用非负、不超过预估车费、强免责优先。

## 讲解重点

- AI 能读懂自然语言，不代表需求已足够明确。
- Workshop 的核心是“人做业务决策，Agent 帮助发现问题并执行”。
- 所有高风险操作都需要测试、权限和审查护栏。

## 快速版

用一页幻灯片说明背景和目标规则。

---

# 模块 1：Agent Chat、上下文与代码理解

覆盖 A、B。

## 目标

展示 Kiro 如何使用显式上下文理解文档、仓库、Terminal、Problems 和 Git Diff，同时避免让 Agent 在信息不足时猜测。

## 准备

- 打开原始需求文档。
- Demo 工程处于基线状态。
- 保持一个最近执行过测试的终端。

## 完整步骤

### 1.1 只给当前文件

1. 在 Chat 中附加当前需求文件。
2. 使用 Prompt P01。
3. 观察 Kiro 是否把“原文事实”和“推断”分开。

建议 Prompt：

```text
请只基于附加的原始业务需求回答，不要修改文件，也不要替产品做决定。
用 8 条以内总结：业务目标、主要参与者、核心流程、明确约束，以及当前无法确定的内容。
每个结论注明来自哪个章节；无法从文档确认的内容明确写“待确认”。
```

预期观察：

- 能识别乘客、司机、客服、运营和风控。
- 能识别费用上限、一次收费、特殊免责和审计方向。
- 不应自行发明免费时长、距离和金额。

### 1.2 扩展到代码库

1. 附加项目或使用代码库上下文。
2. 使用 Prompt P02，让 Kiro 映射需求到实现位置。
3. 要求它先解释，不修改代码。

```text
请结合原始需求和当前代码库，定位以下职责分别由哪些文件或符号承担：
取消责任判定、费用计算、规则配置、幂等收费、审计记录和属性测试。
输出调用链、关键类型和目前没有实现的职责。先不要改代码。
```

### 1.3 引入 Terminal 与 Problems

1. 执行目标测试或类型检查。
2. 将 `#terminal` 和 `#problems` 加入上下文。
3. 使用 Prompt P03，让 Kiro 区分症状、根因假设和证据。

## 讲解重点

- 自动上下文与显式上下文应结合使用。
- “先解释再修改”适合陌生代码和高风险逻辑。
- Terminal 输出是证据，不是业务事实。
- 上下文中不要放生产数据或无关大文件。

## 快速版

只做 1.1 和 1.2；Terminal/Problems 留到 Bug 模块。

## 备用方案

如果上下文选择器不可用，手动附加需求文件和两个关键源码文件，不要粘贴整个仓库。

---

# 模块 2：Analyze Requirements

覆盖 D4。

## 目标

让 Kiro 从“业务人员觉得大家都懂”的文档中识别歧义、冲突、缺失、不可测标准和隐含假设。

## 完整步骤

### 2.1 启动分析

1. 保持原始需求为唯一业务上下文。
2. 从工作流选择 Analyze Requirements；若入口不可用，使用 Prompt P04。
3. 明确要求“不补全答案”。

```text
分析附加的原始需求。不要修改原文，不要自行补全业务规则。
按以下类别输出：歧义、逻辑冲突、缺失信息、不可测试的验收标准、隐含假设、安全与合规风险。
每项必须包含：原文证据、为什么无法直接实现或验收、需要谁回答、一个具体澄清问题。
最后只选出阻塞 V1 开发的前 12 个问题。
```

### 2.2 让听众参与优先级排序

1. 让产品经理选择范围与规则问题。
2. 让架构师选择接口、降级和配置问题。
3. 让开发人员选择数据类型、时间和幂等问题。
4. 让测试人员选择边界与可测性问题。
5. 使用 Prompt P05 生成决策会议清单。

### 2.3 对照答案但不追求逐字一致

打开 `04-answer-key-and-business-decisions.md` 的问题分类，检查至少出现：

- V1 范围不清
- 时间、距离和金额阈值不清
- 安全免责与防滥用冲突
- 天气加价与用户照顾冲突
- 先到请求与实际责任冲突
- 降级方案互不等价
- 幂等、审计版本和 RBAC 缺失
- 验收指标不可测

## 讲解重点

- Analyze Requirements 的优秀输出是“高质量问题”，不是擅自给业务答案。
- 问题需要 owner、优先级和决策记录。
- 模糊需求最危险的不是缺文字，而是不同角色默认了不同答案。

## 快速版

只展示 Kiro 找出的前 5 个阻塞问题，并打开预制完整分析。

## 备用方案

使用 Prompt P04 在普通 Chat 中完成同样结构的分析。

---

# 模块 3：模拟产品确认与 Feature Spec

覆盖 D1。

## 目标

演示如何把已确认的业务决策转换成 Requirements、Design 和 Tasks，并保留从原始需求到实现的追踪关系。

## 关键原则

必须先完成“模拟产品确认”。不要让 Kiro 直接采用它自己建议的阈值。

## 完整步骤

### 3.1 建立决策记录

1. 打开 `04-answer-key-and-business-decisions.md` 的 Demo 基线。
2. 告诉听众这些数值是 Workshop 假设，不是原需求事实。
3. 使用 Prompt P06，让 Kiro 整理“已确认/待确认/不在 V1”。

核心决策包括：

- V1 仅实时普通快车、优享和商务车。
- 时间使用服务端 UTC，金额使用整数分。
- 接单 120 秒内免费。
- 距上车点 200 米内持续 30 秒视为验证到达。
- 验证到达后等待 5 分钟才可判定普通爽约。
- 法律、安全、无障碍、关键系统异常强制免除乘客费用。
- 同订单同收费类型最多成功收费一次。
- 降级时取消成功、乘客不收费、必要司机补偿由平台承担。

### 3.2 创建 Feature Spec

1. 选择 Feature Spec 工作流。
2. 名称建议：`cancellation-no-show-fee-v1`。
3. 附加原始需求和确认决策。
4. 使用 Prompt P07。

```text
为“取消订单与爽约费规则中心 V1”创建 Feature Spec。
原始业务文档只代表需求来源，已确认决策代表本次 V1 基线；两者冲突时以已确认决策为准并记录差异。
Requirements 使用 EARS 风格，给出唯一 ID、验收条件、边界示例和来源追踪。
Design 聚焦纯领域规则引擎、配置版本、地图/支付端口、幂等收费、审计事件和降级。
Tasks 只覆盖最小纵切，按依赖排序，每项都说明验证命令。不要实现真实地图、支付或通知系统。
```

### 3.3 审查 Requirements

至少检查：

- 范围白名单和旧流程边界
- 免费取消边界恰好 120 秒
- 验证到达必须同时满足距离和持续时间
- 爽约门控条件
- 强免责优先级
- 费用非负和封顶
- 幂等收费
- 降级不追扣
- 可解释 reason code
- 审计带 ruleVersion

使用 Prompt P08 做“只找问题、不重写”的评审。

### 3.4 审查 Design

检查设计是否把外部系统放在端口后，是否能注入 Clock，是否固化 Evidence Snapshot 和 Rule Version，是否清楚区分 Decision、Charge、Compensation 和 Refund。

### 3.5 审查 Tasks

检查每个关键 Requirement 是否至少有一个实现任务和一个验证任务。避免出现“实现规则中心”这种无法审查的大任务。

## 讲解重点

- Spec 是协作和追踪资产，不是更长的 Prompt。
- Requirements 由产品和测试重点审查；Design 由架构和开发重点审查；Tasks 由开发和测试共同审查。
- 先确认 Requirements，再执行实现任务。

## 快速版

现场只生成 Requirements；Design 和 Tasks 使用预制版本。

## 备用方案

若 Spec 工作流不可用，创建三份 Markdown：`requirements.md`、`design.md`、`tasks.md`，仍然遵循同样评审门禁。

---

# 模块 4：Spec Correctness 与属性提取

覆盖 D5。

## 目标

检查需求、设计、任务和测试之间是否存在断链，并把关键业务不变量转为属性测试候选。

## 完整步骤

1. 在 Spec 中运行 Correctness 分析；入口不可用则使用 Prompt P10。
2. 要求重点检查四条链路：强免责、费用封顶、爽约门控、降级不收费。
3. 使用 Prompt P11 提取 Properties。
4. 让听众判断哪些属性可自动测试，哪些仍需业务或合规评审。

建议 Prompt：

```text
检查当前 Spec 的需求、设计、任务和测试计划是否双向可追踪。
重点检查：强免责是否能压过所有加价；费用是否始终非负且不超过预估车费；爽约是否具备到达、等待和联系门控；降级是否可能恢复后追扣。
对每个缺口给出 Requirement ID、缺失环节和最小修复建议。不要把一致性分析描述成业务正确性证明。
```

预期 Properties：

- `0 <= charge <= estimatedFare`
- 强免责成立时 `charge == 0`
- 不满足爽约门控时不能产生 `PASSENGER_NO_SHOW` 收费
- 同幂等键重复执行最多一笔扣款
- 相同 Evidence Snapshot 和 ruleVersion 结果确定
- 依赖异常时取消成功且乘客不收费

## 讲解重点

- Property 是对大量输入成立的不变量，不是单一示例。
- Correctness 能发现遗漏，不等于证明阈值公平或合法。
- 失败时应输出可复现 seed 和最小反例。

## 快速版

展示费用封顶属性和一个最小反例即可。

---

# 模块 4.5：Custom Skill 与企业代码资产复用

## 目标

演示 Kiro 在写代码前，如何按需找到企业已经确认的业务知识、公共组件和代码模板，避免重复实现通用费用算法。

本模块只处理费用金额计算：基础费、运营调整、用户减免、非负处理和预估车费封顶。不处理是否收费、强免责、免费窗口、幂等、客服解释或完整取消流程。

## 完整步骤

1. 从 Spec Correctness 结果中确认不变量：`0 <= charge <= estimatedFare`。
2. 在 Kiro Chat 执行：

```text
/custom-find-skill 为已经判定需要收费的取消订单实现费用金额计算：应用运营调整和用户减免，结果不能为负且不能超过预估完单价格。请先查找团队已有的业务知识、公共组件和代码模板，不要重新实现费用算法。
```

3. 检查 `Fee Reuse Pack` 是否准确指向：
   - `enterprise-knowledge-base/business/fee-calculation-policy.md`
   - `packages/company-policy-kit/src/money.ts`
   - `packages/company-policy-kit/src/capped-fee-calculator.ts`
   - `team-templates/cancellation-fee/calculate-cancellation-fee.ts.template`
   - `packages/cancellation-demo/src/calculate-cancellation-fee.ts`
4. 打开 `MoneyMinor` 和 `CappedFeeCalculator`，确认公共组件已经负责调整、减免、非负、封顶、取整和 trace。
5. 明确禁止业务代码再次创建 Money 类型、FeeCalculator 或复制金额流水线。
6. 本模块只完成资产发现；代码集成在后续 Supervised 环节执行。

## 讲解重点

- Skill 是按需知识和工作流，不是全网搜索器、数据库或外部工具协议。
- Registry 中的描述必须能追踪到真实知识、源码和模板。
- 复用必须在包依赖、import、Diff 和测试中可验证。
- Steering 负责持续规则，Hook 负责事件检查，MCP 用于连接外部工具或知识服务，四者不能混用。

## 快速版

展示预制 `Fee Reuse Pack`，只打开 `CappedFeeCalculator` 和模板两个文件。

---

# 模块 5：Steering 与 Agent Hooks

覆盖 E、F。

## 目标

把稳定的团队约束放入 Steering，把可执行的质量检查放入 Hook。

## 完整步骤

### 5.1 创建 Steering

1. 从 Kiro 面板创建基础 Steering，或使用 Prompt P12。
2. 分成产品、技术和结构规则。
3. 加入本项目关键约束：
   - 金额只使用整数分
   - 时间使用 UTC 并注入 Clock
   - 所有 Decision 固化 ruleVersion
   - 强免责先于加价与减免
   - 外部依赖必须通过端口
   - 禁止日志记录精确位置、电话和安全详情
   - 每项业务规则包含边界和 Property Test
4. 使用 Prompt P13 让 Kiro 检查规则是否具体、可执行且没有冒充权限控制。

### 5.2 创建 Hook

1. 打开 Agent Hooks UI，不手写 Hook JSON。
2. 创建仅针对 Agent 修改 TypeScript 文件后的检查 Hook。
3. 命令建议先使用快速检查：`npm run typecheck && npm run test:fee`。
4. 让 Agent 修改一个无关紧要的 TypeScript 文件，验证 Hook 触发。
5. 故意造成类型错误，展示 Hook 失败反馈。
6. 修复后重新验证。

建议创建 Prompt：

```text
请为这个演示项目创建一个 Agent Hook：当 Agent 保存 TypeScript 源码或测试文件后，执行 `npm run typecheck && npm run test:fee`。
Hook 必须离线、无部署和网络副作用；如果命令失败，只报告错误并让当前任务停在可审查状态。
请先说明将使用的触发事件、匹配范围和命令，再创建。
```

## 讲解重点

- Steering 是长期上下文，不是安全边界。
- Hook 是事件自动化，不应该承担生产发布。
- Hook 应快、稳定、可重放，否则会破坏开发体验。

## 快速版

打开预制 Steering，现场只创建一个 Hook。

## 备用方案

Hook 不可用时手动执行同一条检查命令，并展示预制 Hook 截图。

---

# 模块 6：Autopilot、Supervised、Permissions、`.kiroignore` 与 Custom Agents

覆盖 C、I、J、K。

## 目标

说明自治方式、工具权限、上下文隔离和职责分离是四个不同层次。

## 完整步骤

### 6.1 Supervised 先行

1. 切换 Supervised。
2. 使用 Prompt P15，让 Kiro 将 `Fee Reuse Pack` 中找到的 `CappedFeeCalculator` 集成到 `packages/cancellation-demo/src/calculate-cancellation-fee.ts`。
3. 逐 hunk 审查，拒绝任何本地 Money 类型、FeeCalculator 或重复金额算法。
4. 使用 inline feedback 要求只保留公共组件调用和必要输入映射。

### 6.2 Permissions

1. 打开当前 Agent 的 Permissions。
2. 展示策略：
   - 读取演示仓库允许
   - 写 `src/`、`tests/` 询问或允许
   - 固定测试命令允许
   - 安装依赖、网络访问询问
   - 仓库外路径、密钥、删除、部署拒绝
3. 分别触发允许、询问和拒绝行为。
4. 明确：Supervised 决定审查节奏，Permissions 决定能力边界。

### 6.3 `.kiroignore`

1. 创建或展示 `.kiroignore`。
2. 加入 `private-demo-data/`、`.env*`、密钥、依赖和覆盖率目录。
3. 让 Agent 尝试读取 `private-demo-data/fake-production-export.json`。
4. 观察被忽略或不可用行为。
5. 强调该文件不是 OS ACL，也不能替代真正的数据权限。

### 6.4 Custom Agents

创建两个窄职责 Agent：

- `requirements-analyst`：只读文档和 Specs；不写源码、不运行 Shell。
- `policy-security-reviewer`：只读 Spec、Git Diff 和测试输出；检查费用上限、PII、RBAC、审计；不修改代码。

使用 Prompt P18/P19 创建或配置，切换后验证写文件能力被拒绝。

### 6.5 Autopilot

1. 确认 Spec、Steering、Hook、测试和 Permissions 已就绪。
2. 建立 Checkpoint。
3. 切到默认开发 Agent 和 Autopilot。
4. 使用 Prompt P20 执行剩余的低风险任务。
5. 观察它读取任务、修改代码、运行检查并总结 Diff。

## 讲解重点

| 机制 | 解决的问题 |
|---|---|
| Supervised | 每轮变更如何由人审查 |
| Autopilot | 明确任务如何端到端推进 |
| Permissions | Agent 能调用什么能力 |
| `.kiroignore` | 哪些内容不进入 Kiro 上下文/索引 |
| Custom Agents | 不同职责如何获得不同提示和工具 |

## 快速版

只现场演示一次拒绝权限和一次只读 Agent；其他用策略表说明。

---

# 模块 7：Bugfix Spec、诊断、Git Diff、Checkpoint 与 Revert

覆盖 B、D3、H。

## 目标

从失败属性开始，完成“证据 → 根因 → Bugfix Spec → 最小修复 → Diff → 验证 → 恢复”的闭环。

## 准备

Demo 工程处于 seeded bug 状态：天气系数在封顶之后应用。

## 完整步骤

### 7.1 建立恢复点

1. 检查当前 Git 状态。
2. 建立 Kiro Checkpoint。
3. 说明 Checkpoint 只用于短期恢复，不能代替 Git 历史。

### 7.2 运行失败测试

执行：

```bash
npm run test:fee
```

预期最小反例接近：

```text
baseFee = 800
estimatedFare = 1000
weatherMultiplier = 2
actualCharge = 1600
```

### 7.3 先诊断，不修改

附加失败 Terminal、Problems、相关源码和测试，使用 Prompt P21：

```text
先不要修改代码。根据失败测试、费用计算实现和需求中的费用上限，说明：
1. 可复现输入；2. 期望与实际；3. 数据经过的计算步骤；4. 最可能根因；5. 影响范围；6. 最小修复方向。
每个结论引用代码或测试证据，无法确认的部分明确标注。
```

### 7.4 创建 Bugfix Spec

1. 选择 Bug Fix 工作流。
2. 名称建议：`fee-cap-after-weather-multiplier`。
3. 使用 Prompt P22。
4. 检查 Current、Expected、Unchanged Behavior：
   - 当前：天气系数可使费用超过预估车费
   - 期望：所有调整完成后再封顶
   - 不变：强免责、用户减免、reason code、幂等逻辑不改变

### 7.5 执行最小修复

1. 先用 Supervised 执行修复。
2. 使用 Prompt P23，要求只改计算顺序和回归测试。
3. 审查 Diff，不接受无关重构。
4. 运行目标 Property Test。
5. 再运行 typecheck、lint 和相关测试。

### 7.6 Git Diff 评审

附加 Git Diff，使用 Prompt P24：

- 逐项对照 Bugfix Spec
- 标出行为变化和未变化部分
- 检查测试是否会在旧实现失败
- 检查是否引入 PII、权限或审计风险

### 7.7 Revert 和恢复

1. 故意让 Agent 做一处不必要的重构。
2. 展示单轮 Revert。
3. 如时间允许，恢复到 Checkpoint 并说明会话上下文变化。
4. 再回到最终修复状态或打开预制最终分支。

## 讲解重点

- 失败测试是诊断入口，不是让 Agent 盲改的命令。
- Bugfix Spec 明确“不应该改变什么”。
- 最小修复优于现场大重构。
- Agent 的完成声明必须由 Diff 和测试验证。

## 快速版

展示预制失败输出，现场只完成根因解释和最小修复。

## 备用方案

若 Property Test 输出不稳定，直接使用固定示例 `800/1000/2` 复现；随后展示预制属性测试结果。

---

# 模块 8：企业治理、审计与会话导出

覆盖 N、O。

## 目标

区分开发过程治理、规则配置治理和订单账务审计，并安全导出 Workshop 会话。

## 完整步骤

### 8.1 展示三层审计

1. 开发过程：Prompt、工具调用、Permission 决定、Diff、Checkpoint、Spec 变化。
2. 规则配置：谁创建、谁审批、版本、生效时间、灰度和回滚。
3. 业务订单：decisionId、orderId、ruleVersion、evidence、charge、compensation、refund、operator。
4. 说明三层可用关联 ID 串联，但不能互相替代。

### 8.2 Custom Agent 终审

切换 `policy-security-reviewer`，使用 Prompt P27 对 Spec、Git Diff 和测试输出做只读评审。

### 8.3 会话导出

1. 在导出前使用 Prompt P28 做敏感信息清单。
2. 检查绝对路径、源码、终端历史、Token、精确位置、电话和企业策略。
3. 执行 Session Export。
4. 展示导出包中的 metadata、messages 和 Agent/Sub-agent 执行记录。
5. 说明导出包按组织保留和分享策略处理，不能直接公开上传。

## 快速版

企业治理使用一张架构图；导出只展示预制脱敏包目录。

## 讲解重点

- 企业 Agent 治理不等于业务账务审计。
- Prompt Logging 和 Session Export 涉及员工告知、隐私和保留策略。
- 导出前必须脱敏。

---

# 模块 9：总结

## 建议收尾问题

1. 哪些决策必须由产品或合规负责人确认？
2. 哪些规则适合 Steering，哪些必须由测试或权限强制？
3. 什么时候使用 Supervised，什么时候可以使用 Autopilot？
4. 如果 Property Test 通过，仍然有哪些风险？
5. 会话导出可以证明什么，不能证明什么？

## 最终信息

- Context 让 Agent 看见事实。
- Analyze Requirements 让团队看见问题。
- Spec 让决策可评审、可追踪。
- Steering 和 Hooks 让规范可复用、检查可自动执行。
- Permissions 和 Custom Agents 让职责和能力受控。
- Tests、Diff 和 Checkpoint 让实施可验证、可恢复。
- Governance 和 Export 让过程可复盘，但不能代替业务审计与真实安全边界。

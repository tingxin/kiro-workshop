# Kiro 企业级 AI 编程 Workshop 需求基线

> 文档状态：讨论结论整理稿  
> 用途：作为后续课程设计、演示工程、讲师手册和验收的统一依据  
> 业务案例：取消订单与爽约费规则中心  
> 业务需求来源：`cancellation-no-show-fee-raw-requirements.md`

---

## 1. Workshop 总体目标

本 Workshop 面向企业客户，目标不是单独展示一次代码生成，也不是把 `custom-find-skill` 做成课程主角，而是通过一个完整、连贯、可验证的业务研发案例，让客户理解 Kiro 的主要核心功能、特色能力及企业落地方式。

课程应让客户看到以下完整闭环：

```text
理解业务和现有代码
→ 发现需求歧义与冲突
→ 确认业务决策
→ 创建和评审 Spec
→ 从业务不变量设计验证
→ 发现并复用企业已有知识、组件和模板
→ 在团队规则和权限边界内实现
→ 自动运行质量检查
→ 用测试、Diff 和恢复能力完成缺陷修复
→ 保留可审查的研发过程
```

Workshop 最终要传达的核心价值是：

> Kiro 不只是更快地产生代码，而是帮助企业把需求、业务知识、团队规范、已有代码资产、实现过程和验证证据连接起来。

---

## 2. 课程设计原则

### 2.1 一条业务主线，而不是功能菜单

所有 Kiro 功能应围绕同一个“取消订单与爽约费规则中心”案例展开。不能为了展示功能而不断切换互不相关的场景。

### 2.2 先澄清，再实现

原始需求中包含“合理”“适当”“尽快”等不可直接编码的表达。Kiro 不应替产品、法务、安全或运营擅自决定规则。

课程必须体现：

1. 区分原始事实、合理推断和待确认事项；
2. 使用 Analyze Requirements 找出歧义、冲突、缺失和不可验收描述；
3. 由业务角色确认关键决策；
4. 再将已确认结果写入 Spec 和业务知识库。

### 2.3 AI 写代码前先查企业已有资产

对于企业内已经沉淀的通用能力，AI 必须先找到并复用：

- 已确认的业务上下文；
- 团队维护的公共组件；
- 标准代码模板；
- 使用约束和最佳实践。

不允许 AI 在不知道已有资产的情况下重复创建 Money 类型、费用计算器或相同算法。

### 2.4 所有结论必须可验证

不能只展示“AI 说它复用了组件”。复用行为需要通过以下证据验证：

- 可检查的知识和源码路径；
- 真实包依赖和 import；
- Git Diff 或 Kiro 变更审查；
- 编译、目标测试或演示输出；
- 禁止重复实现的代码检查。

### 2.5 Workshop Demo 不冒充生产系统

所有金额、阈值、城市规则和业务数据均为教学模拟，不代表生产策略。

Demo 不接入真实地图、支付、订单、客服、风控或结算系统，不执行真实扣款、退款、部署或生产变更。

---

## 3. 业务场景与资料边界

### 3.1 唯一业务案例

Workshop 的业务需求统一使用：

```text
cancellation-no-show-fee-raw-requirements.md
```

课程中的需求分析、Spec、代码、测试、缺陷和企业知识库都应围绕该需求设计。

### 3.2 PDF 文档的作用

`基于 Amazon Kiro 的企业级 AI 编程平台.pdf` 只用于帮助理解 Meta-Skill、知识路由和企业代码知识库的设计思想。

PDF 中的共享单车、电子围栏、还车和调度费案例不是本 Workshop 的业务需求，不能继续用于本课程的代码、模板或演示提示词。

### 3.3 已确认的 Workshop 业务决策

课程可以使用已经在讲师材料中确认的模拟决策，例如：

- V1 只覆盖普通快车、优享、商务车实时单；
- 金额使用整数最小货币单位；
- 乘客在接单后 120 秒内取消免费，120 秒包含在免费窗口内；
- 法律、安全、无障碍、平台或关键依赖异常属于强免责；
- 最终费用必须满足 `0 <= charge <= estimatedTripFare`；
- 相同收费幂等键最多产生一次成功处理；
- 结果需要包含规则版本和可解释原因；
- 敏感证据不能直接暴露给普通客服。

这些值必须明确标注为 Workshop 模拟决策。

---

## 4. Kiro 核心能力覆盖要求

完整 Workshop 需要覆盖 Kiro 的主要能力，但每项能力应有明确职责，不能全部塞进 `custom-find-skill`。

| 能力 | Workshop 中解决的问题 | 展示要求 |
|---|---|---|
| Agent Chat / Vibe | 快速理解文档、代码和运行结果 | 现场展示；先解释、后修改 |
| 上下文引用 | 将需求、文件、Problems、Terminal、Git Diff 带入任务 | 现场展示真实上下文来源 |
| Analyze Requirements | 找出歧义、冲突、缺失和不可验收描述 | 现场或预制完成态，至少讨论关键问题 |
| Feature Spec | 将决策转成 Requirements、Design、Tasks | Workshop 主线，必须展示三类产物和追踪关系 |
| Spec Correctness | 检查需求、设计、任务和测试之间的断链 | 展示关键不变量与缺口，不宣称证明业务合法或绝对正确 |
| Property-based Testing | 用大量生成输入验证业务不变量并缩小反例 | 使用稳定、可复现的预制或现场结果 |
| Steering | 持续注入产品、技术和结构规则 | 展示规则如何影响后续实现；不把 Steering 说成权限边界 |
| Skills | 按需加载特定企业知识、工作流和模板 | 只用 `custom-find-skill` 演示一个小型企业资产复用环节 |
| Agent Hooks | 在 Agent 文件变更后自动执行目标检查 | 使用快速、离线、无部署副作用的命令 |
| Supervised | 对一轮代码变更进行逐段人工审查 | 现场接受、拒绝或反馈一个 hunk |
| Autopilot | 在 Spec、测试和权限明确后连续完成低风险任务 | 展示受约束的自动化，不将其描述为绕过权限 |
| Permissions | 控制 Agent 可调用的能力、路径和命令 | 展示 allow/ask/deny 的边界 |
| `.kiroignore` | 排除不应进入上下文或索引的内容 | 说明它不是操作系统 ACL |
| Custom Agents | 将专业角色、上下文、工具和权限封装起来 | 展示只读需求分析或安全评审角色 |
| Checkpoint / Revert | 支持安全试错和恢复 | 说明恢复范围及其与 Git 的区别 |
| Git Diff / Problems / Terminal | 用真实证据检查变更和失败 | 在实现或 Bugfix 阶段使用 |
| Session Export / 企业治理 | 复盘 Agent 行为，同时避免泄露敏感信息 | 作为课程收尾内容 |
| MCP | 连接外部工具和知识服务 | 本 Workshop 以概念和演进方向说明为主，不作为必需现场环节 |

### 4.1 必须讲清楚的能力边界

- Vibe 适合探索、理解和小改动；Spec 适合复杂、可追踪的功能开发。
- Supervised 决定人工审查节奏；Permissions 决定能力边界。
- Steering 是持续上下文；Skill 是按需知识和工作流；Custom Agent 是专业角色配置；Hook 是事件自动化；MCP 是外部工具和数据连接协议。
- Property-based Testing 提供正确性证据，但不是形式化证明。
- Checkpoint 不替代 Git，也不能保证回滚 Shell、MCP 或外部系统副作用。

---

## 5. 完整 Workshop 推荐主线

目标总时长原则上保持在约 90 分钟。`custom-find-skill` 应嵌入现有主线，而不是额外形成一场独立 Workshop。具体时间可以根据现场讨论调整。

| 阶段 | 内容 | 参考时间 |
|---|---|---:|
| 1 | 开场、业务场景与安全边界 | 5 分钟 |
| 2 | Agent Chat / Vibe：理解需求和已有工程 | 8 分钟 |
| 3 | Analyze Requirements：发现问题并确认业务决策 | 12 分钟 |
| 4 | Feature Spec：Requirements、Design、Tasks | 18 分钟 |
| 5 | Spec Correctness 与业务不变量 | 8 分钟 |
| 6 | `custom-find-skill`：发现费用计算知识、组件和模板 | 8 分钟 |
| 7 | Steering 与 Hooks | 8 分钟 |
| 8 | Supervised、Autopilot、Permissions、Custom Agents | 10 分钟 |
| 9 | Property Test、Bugfix Spec、Diff、Checkpoint/Revert | 10 分钟 |
| 10 | 企业治理、会话导出与总结 | 3 分钟 |

时间不足时优先保留：

1. 需求分析；
2. Feature Spec；
3. `custom-find-skill` 的资产复用证据；
4. Supervised 实现；
5. 测试与 Bugfix 闭环。

MCP、复杂权限策略和完整 Custom Agent 配置可以使用架构图或预制结果说明。

---

## 6. `custom-find-skill` 专项要求

### 6.1 命名要求

自定义 Skill 必须命名为：

```text
custom-find-skill
```

目录应为：

```text
.kiro/skills/custom-find-skill/
```

不能继续使用 `find-skill`，因为社区中存在同名通用开源 Skill，其用途是从互联网或 Skill 生态中寻找其他 Skill，容易造成名称和职责冲突。

课程文档、提示词、路径、截图和输出中必须统一使用 `custom-find-skill`。

### 6.2 定位

`custom-find-skill` 是 Workshop 中一个小型、具体的企业代码知识库示例，用于说明：

> 企业如何把一段高频、通用、容易出错的业务实现沉淀为详细知识、公共组件和代码模板，并让 AI 在写代码前自动发现和复用。

它不是：

- 全网 Skill 搜索器；
- 企业通用搜索引擎；
- 向量数据库；
- MCP 服务；
- 完整取消规则路由器；
- 整个 Workshop 的唯一功能。

### 6.3 唯一演示能力

`custom-find-skill` 只处理取消费金额计算这一段通用逻辑：

```text
基础费
→ 运营/天气调整
→ 用户减免
→ 非负处理
→ 预估完单价格封顶
→ 整数最小货币单位与计算 trace
```

该逻辑适合企业沉淀为公共最佳实践，因为：

- 多个业务服务可能重复使用；
- 金额计算顺序容易出错；
- 错误可能直接导致资损或投诉；
- 需要统一金额类型、封顶、舍入和审计 trace；
- 应由平台或定价团队集中维护。

### 6.4 明确不属于该 Skill 的内容

`custom-find-skill` 不处理：

- 是否应该收取取消费；
- 强免责；
- 120 秒免费取消窗口；
- 乘客爽约证据；
- 司机责任判定；
- 幂等扣款；
- 司机补偿；
- 客服解释和隐私；
- 审计、支付、通知或完整取消流程。

这些内容继续由原始需求、Feature Spec、Steering、测试和其他课程环节承载。

### 6.5 Skill 应发现的企业资产

#### 业务知识

建议路径：

```text
enterprise-knowledge-base/business/fee-calculation-policy.md
```

至少说明：

- 能力适用边界；
- 输入和输出；
- 金额计算顺序；
- 不变量；
- 典型边界和反例；
- Workshop 模拟值声明；
- 哪些决策由上游流程完成。

#### 公共组件

团队公共包：

```text
@company/cancellation-policy-kit
```

Skill 只需要发现：

- `MoneyMinor` / `moneyMinor`；
- `CappedFeeCalculator`。

公共组件负责：

- 整数最小货币单位校验；
- 调整系数计算；
- 用户减免；
- 非负处理；
- 预估价格封顶；
- 货币取整；
- 非敏感计算 trace。

#### 代码模板

建议路径：

```text
team-templates/cancellation-fee/calculate-cancellation-fee.ts.template
```

模板只展示业务模块如何调用公共组件，不复制公共组件算法。

#### 现场实现目标

建议路径：

```text
packages/cancellation-demo/src/calculate-cancellation-fee.ts
```

### 6.6 Skill 的输入和输出

推荐现场输入：

```text
/custom-find-skill 为已经判定需要收费的取消订单实现费用金额计算：应用运营调整和用户减免，结果不能为负且不能超过预估完单价格。请先查找团队已有的业务知识、公共组件和代码模板，不要重新实现费用算法。
```

Skill 应输出一个窄范围的 `Fee Reuse Pack`，至少包含：

1. 当前小任务的范围和明确排除项；
2. 已批准业务知识及准确路径；
3. `MoneyMinor`、`moneyMinor` 和 `CappedFeeCalculator` 的源码证据；
4. 推荐模板路径；
5. 现场目标文件；
6. 必须使用的包级 import；
7. 禁止重复创建的能力；
8. 未知输入和置信度。

### 6.7 Skill 的复用约束

现场实现必须满足：

- 从 `@company/cancellation-policy-kit` 包根导入，不做源码深层 import；
- 不创建第二个 Money 类型；
- 不创建本地 FeeCalculator；
- 不在业务代码中复制乘法、减免、`Math.max`、`Math.min`、封顶或舍入流水线；
- 不修改公共组件、企业知识和团队模板；
- 如果资产不满足需求，先报告缺口，不伪造内部 API。

---

## 7. Demo 工程要求

### 7.1 技术栈

保持现有 Workshop 蓝图的一致性：

- TypeScript；
- Node.js；
- npm workspace；
- 精确锁定依赖版本；
- Demo 不依赖网络、数据库或长时间运行的服务。

### 7.2 起始状态

现场开始前：

- 工程可编译；
- 公共包和模板已经存在；
- `calculate-cancellation-fee.ts` 是安全的待实现入口；
- 不能提前包含现场目标实现；
- `custom-find-skill` 可以发现所有真实资产路径。

### 7.3 实现后预期示例

使用以下合成输入：

```text
基础取消费：500 分
运营/天气调整：2.0 倍
用户减免：0 分
预估完单价格：900 分
```

预期结果：

```text
adjusted = 500 × 2.0 = 1000
final = min(1000, 900) = 900 分
```

现场需要证明：

- 结果为 900 分；
- 计算由 `CappedFeeCalculator` 完成；
- 业务集成代码没有复制算法；
- 公共包依赖和 import 真实存在；
- 编译和目标验证通过。

### 7.4 与 Bugfix 演示分离

`custom-find-skill` 环节展示“实现前发现并复用正确资产”。

Bugfix 环节展示“已有代码中封顶顺序错误，Property Test 找到反例，然后通过 Bugfix Spec、最小 Diff 和验证完成修复”。

两者可以围绕同一个费用不变量，但必须是两个清晰的教学状态，不能让观众误以为待实现入口已经包含 seeded bug，也不能把 `npm run check` 的编译成功描述成 Property Test 成功。

### 7.5 验证要求

演示工程至少需要可稳定执行：

- TypeScript 编译；
- 费用计算目标测试；
- 费用上下界 Property Test 或稳定的预制结果；
- 合成 Demo runner；
- 包依赖检查。

所有现场命令必须快速、离线、可重复，不在执行期间安装或升级依赖。

---

## 8. 企业代码知识库最佳实践要求

Workshop 应通过 `custom-find-skill` 讲清以下最佳实践。

### 8.1 原始需求不是知识库终态

原始 PRD 需要经过澄清、业务决策和版本化，才能成为 AI 可执行的上下文。

### 8.2 知识必须有来源和边界

每条知识至少应有：

- 业务域；
- 状态和版本；
- Owner；
- 适用范围；
- 明确排除项；
- 来源或 Decision ID；
- 示例和反例。

### 8.3 知识必须链接可执行资产

不能只记录“应该封顶”。知识条目还应链接：

- 公共包坐标和版本；
- 真实 API；
- 实现源码；
- 代码模板；
- 验证命令或测试。

### 8.4 Skill 应保持小而专注

Skill 的 description 应明确“做什么”和“何时使用”。

不应该创建一个包揽所有业务域、所有开发流程和所有 Kiro 功能的巨型 Skill。

### 8.5 渐进加载

Skill 首先暴露名称和描述，匹配后再加载工作流，只读取本次小任务需要的业务知识、组件和模板，避免把整个企业知识库一次性塞入上下文。

### 8.6 企业规模化演进

Workshop 使用当前 workspace 内的静态 Registry 说明原理。企业落地时可以逐步增加：

- 服务目录；
- 内部代码搜索；
- 组件注册中心；
- API 文档平台；
- 企业知识库或 RAG；
- 可信 MCP 服务；
- 身份与权限过滤；
- Registry 自动更新和失效检查；
- 命中率、复用率和重复代码指标。

底层检索方式可以变化，但来源可追踪、知识有版本、资产可执行、权限最小化和结果可验证的原则不变。

---

## 9. Workshop 交付物要求

下列材料必须保持一致：

1. Workshop 总览；
2. 对客户使用的 Slide Deck；
3. 学员手册；
4. 讲师 Runbook；
5. Prompt Library；
6. 演示工程蓝图；
7. Kiro 配置配方；
8. `custom-find-skill`；
9. 企业知识库示例；
10. 公共组件和团队模板；
11. 可编译 Demo；
12. 目标测试和 Property Test；
13. 现场恢复与备用方案。

### 9.1 一致性要求

- 所有文件统一使用 `custom-find-skill`；
- 不再出现将本地 Skill 称为 `find-skill` 的说明；
- 不再使用 PDF 中的共享单车业务作为课程案例；
- Slide、讲师步骤、学员提示词和实际工程路径一致；
- 文档中声称存在的脚本、测试、Hook 命令和文件必须真实存在；
- 如果某能力只做概念介绍，必须明确标注，不能写成已完成现场实操。

---

## 10. 验收标准

满足以下条件时，可认为 Workshop 符合当前要求。

### 10.1 总体课程

- [ ] 课程围绕取消订单与爽约费需求形成一条完整研发主线。
- [ ] 客户能够区分 Vibe、Spec、Steering、Skills、Hooks、Custom Agents、Autonomy、Permissions 和 MCP。
- [ ] 需求澄清、Spec、实现、验证、修复和治理形成闭环。
- [ ] 每个现场能力都有真实资产或明确标注的预制/概念材料。

### 10.2 `custom-find-skill`

- [ ] Skill 名称和目录均为 `custom-find-skill`。
- [ ] Skill 只匹配取消费金额计算场景。
- [ ] 它不会路由完整取消判定、免责、幂等、客服解释或审计。
- [ ] 它能找到费用业务知识、Money API、`CappedFeeCalculator` 和费用集成模板。
- [ ] 输出包含真实路径、复用约束、排除项和置信度。

### 10.3 代码复用

- [ ] Demo 实际依赖 `@company/cancellation-policy-kit`。
- [ ] 现场代码从包根导入公共 API。
- [ ] 现场目标文件中没有第二套 Money 或费用算法。
- [ ] 固定示例得到 900 分。
- [ ] 编译和目标验证命令通过。

### 10.4 文档和现场体验

- [ ] 总览、课件、学员手册、Runbook 和 Demo 手册中的名称、路径和步骤一致。
- [ ] `custom-find-skill` 只占完整 Workshop 的一个小环节。
- [ ] Workshop 主角仍是 Kiro 的端到端研发能力。
- [ ] 现场不依赖临时联网安装、真实生产系统或不可控长任务。
- [ ] 具备 Checkpoint、预制结果或其他稳定恢复方案。

---

## 11. 明确非目标

本 Workshop 不要求：

- 建设真实企业级全局代码搜索平台；
- 为数百个仓库构建实时向量索引；
- 接入真实 GitLab、支付、地图、客服或生产数据库；
- 演示真实收费、退款、发布或部署；
- 证明 Workshop 规则符合某城市真实法规；
- 让一个 Skill 自动完成所有 Kiro 工作流；
- 将 PDF 中的示例系统完整复刻到当前工程。

---

## 12. 仍需最终确认的事项

以下内容可在后续课程定稿时确认，不应由实现者自行假设：

1. 最终 Workshop 是严格保持 90 分钟，还是允许扩展到 100–120 分钟；
2. MCP 是否做一个可信只读现场调用，还是只保留架构说明；
3. Hook 和 Custom Agents 是现场创建，还是提前准备并现场展示；
4. Analyze Requirements 和 Property Testing 使用完整现场运行还是预制完成态；
5. 听众以管理者、架构师还是开发测试人员为主，从而决定代码深度；
6. 是否需要准备多个 Git 分支或 Kiro checkpoint 作为多场次恢复点。

在这些事项确认前，课程内容应优先保证主线一致、演示稳定和能力边界准确。

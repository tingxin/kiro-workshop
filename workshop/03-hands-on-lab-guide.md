# Kiro 动手实验手册：从原始需求到可验证参考系统

> 本文件是学员的主操作入口。不要把 `workshop/facilitator/04-answer-key-and-business-decisions.md` 附加给 Kiro，也不要复制其中的完成答案。

## 课程契约

初始仓库故意保持不完整。学员必须使用 Kiro 亲自完成：

```text
需求分析 → 人工业务确认 → Decision Log → Feature Spec
→ 验证设计 → 企业资产复用 → 测试先行 → 实现
→ 缺陷诊断与 Bugfix Spec → 全量验收与复盘
```

系统以学员生成并经人工批准的 V1 Feature Spec 为验收依据。原始需求中仍未确认的事项不得由 Agent 猜测；应保留为阻塞项或明确排除项。地图、支付、通知、风控、客服和审计使用 ports 与 fake adapters，不连接生产系统。

完整路线建议分多次课程完成；90 分钟版本只完成 Lab 0–7 的核心纵切，不宣称实现原始需求全文。

## 产物与恢复点

| Lab | 学员产物 | 建议恢复点 |
|---|---|---|
| 0 | Starter 检查证据 | `RP-00-starter` |
| 1 | `workshop-output/01-requirements-analysis.md` | `RP-01-analysis` |
| 2 | `docs/decision-log/cancellation-no-show-fee-v1.md` | `RP-02-decisions` |
| 3 | `.kiro/specs/cancellation-no-show-fee-v1/` | `RP-03-spec` |
| 4 | `workshop-output/04-traceability-and-properties.md` | `RP-04-validation-plan` |
| 5 | `workshop-output/05-fee-reuse-pack.md` | `RP-05-reuse` |
| 6 | 学员创建的失败业务测试与 Steering | `RP-06-red` |
| 7 | 可运行费用纵切 | `RP-07-implemented` |
| 8–11 | 参考系统其余 Spec Tasks | 每个 Task 一个 Checkpoint |
| 12 | Bugfix Spec、修复证据和复盘 | `RP-12-final` |

## Lab 0：确认 Starter，不实现功能

**目标：**证明当前环境健康，并确认没有完成答案。

1. 在 Terminal 运行：
   ```bash
   npm ci --ignore-scripts
   npm run check:starter
   npm run demo
   ```
2. 确认 `demo` 输出 `workshopState: "STARTER"`。
3. 确认以下路径尚不存在：`docs/decision-log/cancellation-no-show-fee-v1.md`、`.kiro/specs/cancellation-no-show-fee-v1/`。
4. 在 Kiro 建立 Checkpoint `RP-00-starter`。

**Gate G0：**类型检查、公共资产检查、Starter 检查通过；不要把 `STARTER` 误称为业务测试通过。
## Lab 1：用 Vibe/Chat 分析需求

**模式：**Vibe/Chat，只读。只附加 `cancellation-no-show-fee-raw-requirements.md`。

发送：

```text
先不要修改任何文件，也不要给出业务答案。分析这份原始需求中的歧义、冲突、缺失、不可验收描述和隐含假设。
每项包含：原文证据、为什么阻塞实现或验收、应由哪个角色回答、一个具体问题、优先级。
最后列出阻塞 V1 的前 12 项，并区分原文事实、Agent 推断和待确认事项。
```

让 Kiro 将经人工筛选的结果写入 `workshop-output/01-requirements-analysis.md`。只接受分析结果，不接受阈值或规则实现。

**Gate G1：**每个问题都有原文证据、owner 和优先级；Agent 没有私自决定金额、时间、距离、责任或性能指标。

## Lab 2：人工确认并生成 Decision Log

**模式：**Vibe + Supervised。

1. 产品、架构、测试、安全等角色讨论 Lab 1 的阻塞项。
2. 讲师按讨论进度逐条宣布 Workshop 模拟决策；不得一次性展示讲师答案文件。
3. 学员将会议中明确说出的决策作为 Kiro 上下文，发送：

```text
根据原始需求、需求分析和本次会议明确批准的决定，创建
`docs/decision-log/cancellation-no-show-fee-v1.md`。
分为：已批准进入 V1、仍待确认、明确排除。
每项给出唯一 Decision ID、来源、影响章节、边界与验收方式。
不得读取讲师答案，不得补全会议未批准的规则；冲突必须显式记录。
```

4. 在 Supervised 中逐 hunk 审查，拒绝任何没有会议来源的决定。

**Gate G2：**产品、架构和测试角色共同签核；每项已批准决策可追溯，未确认项没有混入实现范围。

## Lab 3：由学员创建 Feature Spec

**模式：**Spec。只附加原始需求、Lab 1 分析和 Lab 2 Decision Log。

```text
创建 Feature Spec `cancellation-no-show-fee-v1`。
Requirements 使用 EARS 风格，具有唯一 ID、边界、验收条件和来源追踪。
Design 使用纯领域规则和 ports/fake adapters 隔离外部系统，覆盖时间、金额、证据、规则版本、幂等、降级、解释和审计。
Tasks 按依赖排序；每项关联 Requirement ID、限定修改范围并给出验证命令。
待确认事项不得进入实现，禁止连接真实地图、支付、通知或生产服务。
```

预期由 Kiro 创建：

```text
.kiro/specs/cancellation-no-show-fee-v1/requirements.md
.kiro/specs/cancellation-no-show-fee-v1/design.md
.kiro/specs/cancellation-no-show-fee-v1/tasks.md
```

分别评审三份文件，不要一次批准全部。

**Gate G3：**每条 Requirement 来源于原文或 Decision ID；每个 Task 可独立审查并有验证；没有“实现规则中心”之类不可验收的大任务。
## Lab 4：Spec Correctness 与验证计划

**模式：**Spec Correctness；入口不可用时使用只读 Chat。

```text
只评审，不修改 Spec。生成 Requirement → Design → Task → Test 追踪矩阵。
找出无设计、无任务、无测试、边界冲突和不可测要求。
再从已经批准的 Requirements 提取业务不变量；不要使用未确认的原始需求补答案。
将结果写入 `workshop-output/04-traceability-and-properties.md`。
```

要求 Kiro 为每个 Property 写出：输入域、前置条件、不变量、边界、可能反例和可重放策略。Property-based Testing 是证据，不是业务合法性的形式化证明。

**Gate G4：**收费上下界、强免责、爽约门控、幂等、确定性重放、降级和隐私等已批准要求都有测试计划；追踪断链先回到 Spec 修复。

## Lab 5：写代码前发现企业资产

**模式：**Chat，调用 Skill。

```text
/custom-find-skill 为已经判定需要收费的取消订单实现费用金额计算：应用运营调整和用户减免，结果不能为负且不能超过预估完单价格。请先查找团队已有的业务知识、公共组件和代码模板，不要重新实现费用算法。
```

将输出保存到 `workshop-output/05-fee-reuse-pack.md`，人工检查真实路径、包根 API、模板、目标文件、排除项和未知输入。

**Gate G5：**必须找到 `MoneyMinor`、`moneyMinor`、`CappedFeeCalculator` 和模板；不得创建第二个 Money 类型或本地费用计算器；Skill 不得扩展到完整取消判定。

## Lab 6：建立护栏并先写失败测试

**模式：**Supervised。

1. 根据已批准的 Decision Log 和 Spec，让 Kiro 创建最小 Steering：产品规则、技术规则、结构规则。不要把一次性任务写成永久规则。
2. 通过 Agent Hooks UI 创建 TypeScript 文件变更后的快速检查 Hook。先使用已存在且离线的 `npm run check`；业务测试脚本创建后再加入 Hook。
3. 让 Kiro 根据 Feature Spec 为费用适配器创建自动测试，并在 `package.json` 中增加语义清晰的学员业务测试命令，例如 `test:fee`。
4. 此时不得实现 `calculateCancellationFee`。先运行测试，确认它因 `NOT_IMPLEMENTED` 失败，而不是因为编译、路径或环境问题失败。

测试创建 Prompt：

```text
只处理 Feature Spec 中费用适配器对应的 Requirement。先创建最小自动测试和测试命令，不修改生产实现。
覆盖固定 500/2.0/0/900 → 900 示例，并验证返回 CALCULATED 和 trace。
测试必须在当前 NOT_IMPLEMENTED Starter 上因业务断言失败。不要测试公共包内部实现，不安装依赖。
```

**Gate G6（Red）：**测试能运行且只因缺失业务实现失败；Git Diff 不包含生产实现；建立 `RP-06-red`。

## Lab 7：Supervised 实现最小纵切

**模式：**Supervised。

```text
执行 Feature Spec 中费用适配器对应的一个 Task。只修改
`packages/cancellation-demo/src/calculate-cancellation-fee.ts`。
从 `@company/cancellation-policy-kit` 包根复用 CappedFeeCalculator；禁止本地 Money、FeeCalculator、乘法、减免、clamp、cap 或舍入流水线。
运行学员创建的费用测试、npm run check 和 npm run demo，展示 Git Diff，等待逐 hunk 审查。
```

**Gate G7（Green）：**业务测试转绿；`demo` 输出 `IMPLEMENTED` 和 900；公共资产检查通过；目标文件没有重复算法。只有达到此 Gate 后才能进入 Autopilot 或故障注入。
## Lab 8：实现核心取消判定

**模式：**每次只执行一个 Spec Task；高风险规则使用 Supervised，低风险且测试已明确时可使用 Autopilot。

按 `.kiro/specs/cancellation-no-show-fee-v1/tasks.md` 的依赖顺序实现已批准范围，通常包括：订单范围、乘客取消、司机取消、爽约门控、强免责、Evidence Snapshot、Rule Version、Decision 和可注入 Clock。具体类型和目录以学员评审通过的 Design 为准，本手册不提供完成答案。

每个 Task 使用同一循环：

```text
选中一个 Task → 复述 Requirement 和不变量 → 先写失败测试
→ 实现最小行为 → 运行目标测试和 Hook → 审查 Diff
→ 更新 Task 状态 → 建立 Checkpoint
```

**Gate G8：**范围、边界、免责优先级和爽约门控均有自动测试；任何缺失业务决策都会让 Agent 停止并提问。

## Lab 9：幂等、补偿与降级

根据已批准 Spec 实现 Charge、Compensation、Refund 和 Audit 的 ports 与内存 fake。不要把“生成幂等键”当成幂等完成；必须用并发或 first-write-wins 测试证明同一业务键最多一次成功处理。

至少验证：

- 重复、并发和乱序请求不会重复收费或补偿；
- 关键依赖失败时取消仍成功；
- 降级结果不向乘客收费，恢复后不追扣；
- Decision、Charge、Compensation、Refund 和 Audit 状态彼此分离。

**Gate G9：**失败注入和并发测试可重放，没有真实支付或外部副作用。

## Lab 10：客服、运营、风控与审计参考能力

只实现 Feature Spec 已批准的离线参考能力：客服安全视图、角色可见字段、规则配置校验与版本、风险事件、审计记录和合成报表。未确认的退款额度、数据保留期和生产阈值继续保留为待确认。

负向测试至少证明：普通客服看不到电话、精确坐标和安全详情；非法配置不能发布；规则调整和人工动作有审计记录。

**Gate G10：**解释文本不等于 RBAC，计算 trace 不等于持久化审计；二者均有独立契约和测试。

## Lab 11：兼容、性能与上线模拟

使用 Legacy Adapter、Feature Flag、fake 双跑和合成负载验证已批准的兼容与非功能要求。双跑只比较决策，不能产生第二次收费。没有人工批准的 P95/P99、容量或灰度阈值时，只记录测试框架和阻塞项，不伪造通过结论。

**Gate G11：**历史/非 V1 订单保持旧行为；灰度关闭可恢复旧路径；性能报告明确区分实测数据与未确认目标。
## Lab 12：隔离注入缺陷、Bugfix Spec 与最终复盘

故障不能存在于默认 Starter。只有 G7 通过后，讲师才在独立副本或可恢复 Checkpoint 中注入一处明确、可逆的回归。

1. 运行测试得到红灯，附加 Terminal、相关源码、测试和 Requirement。
2. 在 Vibe 中要求 Kiro 只诊断：复现输入、期望/实际、计算路径、证据、影响范围、最小方向；禁止修改。
3. 根据诊断创建 Bugfix Spec，记录 Current、Expected、Unchanged Behavior、回归 Property 和验证命令。
4. 在 Supervised 中执行最小修复，拒绝无关重构。
5. 审查 Git Diff，证明测试在旧实现失败、在新实现通过。
6. 将需求—Decision—Spec—Task—Diff—测试证据整理到 `workshop-output/12-retrospective.md`。
7. 导出会话前移除敏感信息；Session Export 不提交仓库。

**Gate G12：**修复范围与 Bugfix Spec 一致；完整验证通过；Checkpoint/Revert 的范围和外部副作用已说明。

## 完成定义

不能仅以“Agent 已完成”作为验收。完整路线结束时应能检查：

- 原始需求中的每个 V1 条目可追溯到 Decision 和 Requirement；
- 未确认与排除项明确存在，不被静默实现；
- 每个实现 Task 有失败测试、通过测试和 Diff 证据；
- 企业公共资产通过真实依赖和 import 被复用；
- 幂等、降级、隐私和审计不是只有文档声明；
- 所有外部系统均为 ports/fakes，无真实收费、退款、部署或生产调用；
- 学员能够解释 Vibe、Spec、Steering、Skills、Hooks、Supervised、Autopilot、Permissions、Custom Agents、Checkpoint 和 MCP 的职责边界。

## 学员禁止项

- 不读取或附加 `workshop/facilitator/04-answer-key-and-business-decisions.md`；
- 不从完成分支复制 Decision Log、Spec 或最终代码；
- 不让 Agent 自行决定业务阈值；
- 不一次执行整个 Spec；
- 不安装临时依赖、访问生产服务、执行真实收费或部署；
- 不把公共资产检查误称为业务系统验收。
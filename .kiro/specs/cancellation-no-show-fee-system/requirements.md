# Requirements Document

> **材料类型：Workshop 固定输入，学员无需重新生成**  
> **状态：Workshop synthetic/non-production**  
> **Feature:** `cancellation-no-show-fee-system`  
> **实现范围：**仅包含 `workshop-output/03-requirements-baseline.md` 中已批准的 Workshop V1 行为。本文末尾的 BLOCKED 与 OUT_OF_SCOPE 仅为非实现边界，不构成 Requirement、Acceptance Criteria 或实现授权。

## Introduction

本规格定义取消订单与爽约费规则中心的 Workshop V1 教学切片。Workshop V1 仅演示取消判定、版本化费用输入选择、费用结果、公开解释、幂等和 Decision 审计。地图、支付/收费、司机补偿/结算、通知、客服、风控、规则配置和旧系统均通过 Port 与内存 Fake 表达，不连接真实服务。本文中的时间、距离和金额均为合成教学规则，不代表生产政策。

## Glossary

- **Workshop_Fee_System**：本规格描述的合成、非生产取消费规则系统。
- **Workshop_V1**：仅覆盖本文已批准 Requirement 的教学运行模式。
- **Workshop_Assembly**：为 Workshop_Fee_System 装配 Port、内存 Fake 和应用服务的组件。
- **Port**：Workshop_Fee_System 与外部能力之间的抽象契约。
- **In_Memory_Fake**：仅在内存中模拟 Port 行为且不连接真实外部服务的测试实现。
- **External_Port_Set**：Map、Payment/Charge、Compensation/Settlement、Notification、Support、Risk、RuleRepository/Configuration 和 Legacy Port 的集合。
- **Map_Port**：提供 Workshop 到达证据的抽象接口。
- **Payment_Charge_Port**：模拟乘客收费动作的抽象接口。
- **Compensation_Settlement_Port**：模拟司机补偿动作的抽象接口。
- **Notification_Port**：模拟通知动作的抽象接口。
- **Support_Port**：提供普通客服安全视图的抽象接口。
- **Risk_Port**：模拟风控依赖边界的抽象接口；Workshop V1 不实现风险识别或限制。
- **RuleRepository_Configuration_Port**：提供版本化规则输入的抽象接口。
- **Legacy_Port**：接收不属于 Workshop V1 白名单订单的抽象接口。
- **V1_Router**：根据订单属性选择 Workshop V1 或 Legacy_Port 的组件。
- **Realtime_Order**：具有实时叫车属性的订单。
- **Service_Type**：订单服务类型；Workshop V1 白名单值为 `EXPRESS`、`PREMIUM` 和 `BUSINESS`。
- **Charge_Type**：费用判定类型；Workshop V1 值包括普通取消和爽约。
- **Decision**：对一个规范业务请求固化的取消费判定结果。
- **Decision_Service**：协调判定、持久化和幂等返回的应用服务。
- **Decision_Store**：按规范幂等键以 first-write-wins 方式保存 Decision 的 Port。
- **Decision_Engine**：按已批准优先级生成收费资格、责任和公开原因的组件。
- **Decision_Idempotency_Key**：由 `buildDecisionIdempotencyKey(orderId, chargeType)` 生成的规范键。
- **First_Write_Wins**：同一规范键只接受首次持久化结果，后续写入返回已有结果的语义。
- **Order_ID**：订单的唯一标识。
- **Decision_ID**：Decision 的唯一标识。
- **Cancel_Initiator**：服务端首次接受取消请求的一方。
- **Liable_Party**：依据已确认责任证据独立判定的责任方。
- **Confirmed_Exemption**：上游已确认的强免责类别，仅包括 `LEGAL`、`SAFETY`、`ACCESSIBILITY`、`PLATFORM_FAILURE`、`CRITICAL_DEPENDENCY_FAILURE` 和 `DRIVER_RESPONSIBILITY_CONFIRMED`。
- **Unverified_Statement**：乘客或司机自行选择或提交、但未经上游确认的理由。
- **Strong_Exemption**：命中后产生零费用 Decision 并停止后续收费资格评估的已确认免责。
- **Clock**：可注入的服务端 UTC 时间源；返回可用时间或明确的不可用状态。
- **UTC**：Workshop V1 采用的协调世界时时间标准。
- **Arrival_Evaluator**：根据 Map_Port 证据判定 Verified_Arrival 的组件。
- **Verified_Arrival**：司机距上车点不超过 200 米且该状态持续至少 30 秒的 Workshop 到达结论。
- **No_Show_Evaluator**：判定 Passenger_No_Show_Eligibility 的组件。
- **Passenger_No_Show_Eligibility**：满足已批准到达、等待和平台内联系条件的乘客爽约资格。
- **In_Platform_Contact_Attempt**：通过平台记录的一次联系乘客尝试。
- **In_Platform_Explicit_Refusal**：乘客通过平台明确表示不乘车的记录。
- **MoneyMinor**：`@company/cancellation-policy-kit` 提供的非负整数最小货币单位类型。
- **moneyMinor**：`@company/cancellation-policy-kit` 提供的 MoneyMinor 构造函数。
- **Rule_Version**：正常判定时使用的版本化规则标识；降级判定仅在故障发生前已取得该值时保存，否则保持未提供且不得伪造。
- **Fee_Input_Selector**：从 RuleRepository_Configuration_Port 选择版本化基础费的组件。
- **Basis_Points_Adjustment**：非负整数调整输入，其中 `10_000` 表示 1.0 倍。
- **Discount**：以 MoneyMinor 表示的已批准用户减免输入。
- **Estimated_Trip_Fare**：以 MoneyMinor 表示的预估完单价格。
- **CappedFeeCalculator**：`@company/cancellation-policy-kit` 提供并负责调整、舍入、减免、非负归零、预估完单价格封顶和费用 trace 的共享计算器。
- **Fee_Calculator_Adapter**：将完整金额管线委托给 CappedFeeCalculator 的 Workshop 应用组件。
- **Fee_Trace**：不包含敏感证据的结构化金额计算轨迹。
- **Public_Reason_Code**：面向用户和普通客服的稳定公开原因代码。
- **DecisionExplanationBuilder**：根据 Public_Reason_Code、最终金额和 Rule_Version 构建脱敏摘要的共享组件。
- **Explanation_Service**：调用 DecisionExplanationBuilder 生成公开解释的组件。
- **Support_View**：Support_Port 返回的普通客服安全视图。
- **Sensitive_Evidence**：电话内容、精确坐标、完整安全叙述、风险分数或阈值、支付凭证，以及其他不允许进入普通输出的原始证据。
- **Audit_Recorder**：记录首次创建 Decision 所需最小审计字段的组件。
- **Decision_Audit_Event**：首次创建正常或降级 Decision 时产生的一条审计记录。
- **Degradation_Handler**：关键依赖不可用时生成零费用降级 Decision 的组件。
- **Degraded_Decision**：费用为 0、Public_Reason_Code 为 `DEGRADED_NO_CHARGE` 且标记为降级处理的 Decision。
- **Acceptance_Report**：Workshop V1 的验收报告、演示结果或完成声明。

## Requirements

### REQ-001 — Workshop V1 职责与外部依赖边界

- **原始章节：**第一章、第三章、第八章、第十章、第十一章、第十二章、第十四章、第十六章
- **Decision ID：**DEC-001
- **Analysis ID：**R01-01

**User Story:** 作为 Workshop 参与者，我希望系统只演示已批准的规则能力并隔离真实外部服务，以便教学结果不被误解为生产集成结果。

#### Acceptance Criteria

1. WHERE Workshop_V1 已启用，THE Workshop_Fee_System SHALL 仅提供取消判定、版本化费用输入选择、费用结果生成、公开解释、Decision 幂等和 Decision 审计六类能力。
2. WHERE Workshop_V1 已启用，THE Workshop_Assembly SHALL 分别为 Map_Port、Payment_Charge_Port、Compensation_Settlement_Port、Notification_Port、Support_Port、Risk_Port、RuleRepository_Configuration_Port 和 Legacy_Port 装配 In_Memory_Fake。
3. WHEN Workshop_Fee_System 完成一次取消判定，THE Workshop_Fee_System SHALL 将可观察结果限定为判定、版本化费用输入、费用结果、公开解释、幂等状态和审计结果。
4. WHEN 任一 In_Memory_Fake 返回成功结果，THE Acceptance_Report SHALL 将对应结果标识为合成的非生产模拟结果。
5. IF 任一 In_Memory_Fake 不可用，THEN THE Workshop_Fee_System SHALL 仅执行本文已批准的降级行为。

### REQ-002 — 规则优先级与强免责

- **原始章节：**第一章、第二章、第三章、第四章、第七章、第九章
- **Decision ID：**DEC-003
- **Analysis ID：**R01-04、R02-02、R03-03、R03-04、R04-04、R07-04、R07-05、R09-03、R09-05

**User Story:** 作为乘客，我希望冲突规则按固定优先级处理，以便强免责场景不会被较低优先级收费规则覆盖。

#### Acceptance Criteria

1. WHEN 同一请求命中多个候选规则，THE Decision_Engine SHALL 依次应用法律禁止收费、安全免责、无障碍免责、平台或关键依赖异常、有证据的司机责任、已验证爽约、普通乘客取消、天气/活动/车型/城市/用户调整、非负约束和 Estimated_Trip_Fare 封顶。
2. WHEN 同一请求命中不同优先级的候选规则，THE Decision_Engine SHALL 选择最高优先级候选规则的结果。
3. WHEN Decision_Engine 已选择较高优先级候选规则的结果，THE Decision_Engine SHALL 保持较高优先级结果不被较低优先级候选规则覆盖。
4. WHEN 相同已批准输入命中相同候选规则集合，THE Decision_Engine SHALL 选择相同的最高优先级结果。
5. WHEN 请求命中 Strong_Exemption，THE Decision_Engine SHALL 将最终乘客费用设置为 0。
6. WHEN 请求命中 Strong_Exemption，THE Decision_Engine SHALL 停止后续收费资格评估。
7. WHEN 请求命中 Strong_Exemption，THE Decision_Service SHALL 创建包含 Public_Reason_Code 和 Decision_Audit_Event 的 Decision；IF 判定前已取得 Rule_Version，THEN THE Decision_Service SHALL 同时固化该 Rule_Version，否则保持未提供且不得伪造。
8. IF 请求仅包含 Unverified_Statement，THEN THE Decision_Engine SHALL 保持 Unverified_Statement 的未确认状态。

### REQ-003 — 实时订单白名单与 Legacy 路由

- **原始章节：**第三章、第十四章、第十六章
- **Decision ID：**DEC-002
- **Analysis ID：**R03-01、R03-05、R14-05、R16-10

**User Story:** 作为订单流程所有者，我希望仅批准的实时订单进入 Workshop V1，以便预约单及其他非白名单业务保持 legacy 路由边界。

#### Acceptance Criteria

1. WHEN Realtime_Order 的 Service_Type 为 `EXPRESS`，THE V1_Router SHALL 将订单路由至 Workshop_V1。
2. WHEN Realtime_Order 的 Service_Type 为 `PREMIUM`，THE V1_Router SHALL 将订单路由至 Workshop_V1。
3. WHEN Realtime_Order 的 Service_Type 为 `BUSINESS`，THE V1_Router SHALL 将订单路由至 Workshop_V1。
4. IF 订单不满足 Realtime_Order 与 Service_Type 白名单条件，THEN THE V1_Router SHALL 将订单路由至 Legacy_Port 的 In_Memory_Fake。
5. IF 订单的 Service_Type 无法识别，THEN THE V1_Router SHALL 将订单路由至 Legacy_Port 的 In_Memory_Fake。
6. WHEN V1_Router 接收相同的实时属性和 Service_Type，THE V1_Router SHALL 选择相同的路由目标。
7. WHEN Legacy_Port 的 In_Memory_Fake 返回结果，THE Acceptance_Report SHALL 将结果标识为未验证真实旧系统兼容性。

### REQ-004 — 强免责证据与责任证据边界

- **原始章节：**第三章、第四章、第六章
- **Decision ID：**DEC-003、DEC-006
- **Analysis ID：**R03-03、R03-04、R04-04、R06-01、R06-03

**User Story:** 作为规则审核者，我希望声明与已确认事实保持分离，以便收费和免责仅依据已批准的证据类别。

#### Acceptance Criteria

1. WHEN Confirmed_Exemption 为 `LEGAL`、`SAFETY`、`ACCESSIBILITY`、`PLATFORM_FAILURE`、`CRITICAL_DEPENDENCY_FAILURE` 或 `DRIVER_RESPONSIBILITY_CONFIRMED`，THE Decision_Engine SHALL 将 Confirmed_Exemption 作为 Strong_Exemption 输入。
2. IF Confirmed_Exemption 不属于 `LEGAL`、`SAFETY`、`ACCESSIBILITY`、`PLATFORM_FAILURE`、`CRITICAL_DEPENDENCY_FAILURE` 和 `DRIVER_RESPONSIBILITY_CONFIRMED` 的集合，THEN THE Decision_Engine SHALL 排除 Confirmed_Exemption 作为 Strong_Exemption 输入。
3. WHEN Decision_Engine 接收 Strong_Exemption，THE Decision_Engine SHALL 产生零费用判定。
4. IF 请求包含 Unverified_Statement 且不包含 Confirmed_Exemption，THEN THE Decision_Engine SHALL 排除 Unverified_Statement 作为收费或免责证据。
5. IF 请求包含 Unverified_Statement 且不包含已确认责任证据，THEN THE Decision_Engine SHALL 排除 Unverified_Statement 作为 Liable_Party 证据。
6. WHEN Workshop_Fee_System 生成普通可见结果，THE Workshop_Fee_System SHALL 仅提供脱敏后的责任与免责结论。

### REQ-005 — 免费取消窗口

- **原始章节：**第四章
- **Decision ID：**DEC-004
- **Analysis ID：**R04-01

**User Story:** 作为乘客，我希望司机接单后的已批准免费窗口具有明确边界，以便窗口内取消产生一致的零费用结果。

#### Acceptance Criteria

1. WHEN 乘客在司机接单的服务端 UTC 时间后第 119 秒取消，THE Decision_Engine SHALL 生成费用为 0 且 Public_Reason_Code 为 `FREE_CANCELLATION_WINDOW` 的判定。
2. WHEN 乘客在司机接单的服务端 UTC 时间后第 120 秒取消，THE Decision_Engine SHALL 生成费用为 0 且 Public_Reason_Code 为 `FREE_CANCELLATION_WINDOW` 的判定。
3. WHEN 乘客在司机接单的服务端 UTC 时间后第 121 秒取消，THE Decision_Engine SHALL 排除 `FREE_CANCELLATION_WINDOW` 作为本次判定的 Public_Reason_Code。
4. WHEN 乘客在司机接单的服务端 UTC 时间后第 121 秒取消，THE Decision_Engine SHALL 继续评估免费窗口以外的已批准规则。
5. WHEN Decision_Engine 接收相同的司机接单 UTC 时间和取消 UTC 时间，THE Decision_Engine SHALL 产生相同的免费窗口判定结果。
6. IF 司机接单时间或 Clock 不可用，THEN THE Degradation_Handler SHALL 执行 REQ-017 的降级行为。

### REQ-006 — Map Port/Fake 验证到达

- **原始章节：**第四章、第五章
- **Decision ID：**DEC-005
- **Analysis ID：**R04-05、R05-02

**User Story:** 作为乘客，我希望爽约判定只使用经 Map Port/Fake 验证的到达证据，以便司机单独点击到达不会构成验证到达。

#### Acceptance Criteria

1. WHEN Map_Port 的 In_Memory_Fake 表明司机距上车点 200 米且距离合格状态连续持续 30 秒，THE Arrival_Evaluator SHALL 将 Verified_Arrival 设置为 true。
2. WHEN Map_Port 的 In_Memory_Fake 表明司机距上车点 201 米，THE Arrival_Evaluator SHALL 将 Verified_Arrival 设置为 false。
3. WHEN Map_Port 的 In_Memory_Fake 表明距离合格状态连续持续 29 秒，THE Arrival_Evaluator SHALL 将 Verified_Arrival 设置为 false。
4. WHEN Arrival_Evaluator 评估 Verified_Arrival，THE Arrival_Evaluator SHALL 仅使用 Map_Port 的 In_Memory_Fake 提供的司机距上车点距离和距离合格状态连续时长。
5. IF 输入仅包含司机点击到达，THEN THE Arrival_Evaluator SHALL 将 Verified_Arrival 设置为 false。
6. WHEN Arrival_Evaluator 接收相同的距离和连续时长，THE Arrival_Evaluator SHALL 产生相同的 Verified_Arrival。
7. IF Map_Port 的 In_Memory_Fake 无法提供关键到达证据，THEN THE Degradation_Handler SHALL 执行 REQ-017 的降级行为。

### REQ-007 — 乘客爽约资格

- **原始章节：**第五章
- **Decision ID：**DEC-005
- **Analysis ID：**R05-01、R05-02、R05-03

**User Story:** 作为司机，我希望爽约资格依据已验证到达、等待和平台内联系记录判定，以便符合条件的爽约获得一致结果。

#### Acceptance Criteria

1. WHERE In_Platform_Explicit_Refusal 不存在，WHILE Verified_Arrival 为 true，WHEN 验证到达后等待至少 5 分钟且存在至少一次 In_Platform_Contact_Attempt，THE No_Show_Evaluator SHALL 将 Passenger_No_Show_Eligibility 设置为 true。
2. WHERE In_Platform_Explicit_Refusal 不存在，WHILE Verified_Arrival 为 true，WHEN 验证到达后等待 4 分 59 秒，THE No_Show_Evaluator SHALL 将 Passenger_No_Show_Eligibility 设置为 false。
3. WHERE In_Platform_Explicit_Refusal 不存在，WHILE Verified_Arrival 为 true，IF In_Platform_Contact_Attempt 不存在，THEN THE No_Show_Evaluator SHALL 将 Passenger_No_Show_Eligibility 设置为 false。
4. WHERE In_Platform_Explicit_Refusal 存在，WHILE Verified_Arrival 为 true，THE No_Show_Evaluator SHALL 跳过剩余等待并将 Passenger_No_Show_Eligibility 设置为 true。
5. WHERE In_Platform_Explicit_Refusal 存在，WHILE Verified_Arrival 为 false，THE No_Show_Evaluator SHALL 将 Passenger_No_Show_Eligibility 设置为 false。
6. WHILE Verified_Arrival 为 false，THE No_Show_Evaluator SHALL 将普通 Passenger_No_Show_Eligibility 设置为 false。
7. WHEN No_Show_Evaluator 接收相同的 Verified_Arrival、等待时间、In_Platform_Contact_Attempt 和 In_Platform_Explicit_Refusal，THE No_Show_Evaluator SHALL 产生相同的 Passenger_No_Show_Eligibility。
8. IF 等待时间或平台内联系证据不可用，THEN THE Degradation_Handler SHALL 执行 REQ-017 的降级行为。

### REQ-008 — 取消发起方与责任方分离

- **原始章节：**第六章
- **Decision ID：**DEC-006
- **Analysis ID：**R06-01、R06-03、R06-04

**User Story:** 作为客服查看者，我希望取消发起方与责任方分别记录，以便请求先后顺序不会替代责任证据。

#### Acceptance Criteria

1. WHEN 服务端首次接受取消请求，THE Decision_Service SHALL 将请求方记录为 Cancel_Initiator。
2. WHEN 服务端收到同一订单的后续取消请求，THE Decision_Service SHALL 保留服务端首次接受请求时记录的 Cancel_Initiator。
3. WHEN Decision_Service 并发接收同一订单的多个取消请求，THE Decision_Service SHALL 以服务端首次接受的请求方固化 Cancel_Initiator。
4. WHEN 已确认责任证据指向不同参与方，THE Decision_Engine SHALL 允许 Liable_Party 与 Cancel_Initiator 不同。
5. WHEN Liable_Party 因已确认责任证据发生变化，THE Decision_Service SHALL 保留原 Cancel_Initiator。
6. IF 请求仅包含单方 Unverified_Statement，THEN THE Decision_Engine SHALL 排除 Unverified_Statement 作为 Liable_Party 证据。

### REQ-009 — Workshop 版本化费用输入

- **原始章节：**第四章、第五章、第七章
- **Decision ID：**DEC-007
- **Analysis ID：**R04-06、R04-07、R05-05、R07-01、R07-02

**User Story:** 作为费用策略演示者，我希望基础费由版本化规则输入提供，以便教学金额可追踪且不会被误认为生产配置。

#### Acceptance Criteria

1. WHEN Service_Type 为 `EXPRESS` 且 Charge_Type 为普通取消，THE Fee_Input_Selector SHALL 从 RuleRepository_Configuration_Port 的同一次 In_Memory_Fake 配置结果选择基础费 500 和对应 Rule_Version。
2. WHEN Service_Type 为 `EXPRESS` 且 Charge_Type 为爽约，THE Fee_Input_Selector SHALL 从 RuleRepository_Configuration_Port 的同一次 In_Memory_Fake 配置结果选择基础费 800 和对应 Rule_Version。
3. WHEN Service_Type 为 `PREMIUM` 或 `BUSINESS` 且 Charge_Type 为普通取消，THE Fee_Input_Selector SHALL 从 RuleRepository_Configuration_Port 的同一次 In_Memory_Fake 配置结果选择基础费 800 和对应 Rule_Version。
4. WHEN Service_Type 为 `PREMIUM` 或 `BUSINESS` 且 Charge_Type 为爽约，THE Fee_Input_Selector SHALL 从 RuleRepository_Configuration_Port 的同一次 In_Memory_Fake 配置结果选择基础费 1200 和对应 Rule_Version。
5. WHEN Fee_Input_Selector 接收相同的 In_Memory_Fake 配置结果、Service_Type 和 Charge_Type，THE Fee_Input_Selector SHALL 选择相同的基础费和 Rule_Version。
6. IF moneyMinor 接收负数、浮点数、`NaN` 或无限值，THEN THE Fee_Input_Selector SHALL 拒绝金额输入。
7. WHEN Fee_Input_Selector 选择基础费，THE Acceptance_Report SHALL 将基础费标识为 Workshop 教学模拟值。
8. IF RuleRepository_Configuration_Port 的 In_Memory_Fake 不可用，THEN THE Degradation_Handler SHALL 执行 REQ-017 的降级行为。

### REQ-010 — 费用计算顺序与金额不变量

- **原始章节：**第四章、第五章、第七章
- **Decision ID：**DEC-007
- **Analysis ID：**R05-05、R07-03、R07-04、R07-05

**User Story:** 作为费用平台所有者，我希望金额计算复用批准的共享计算器，以便调整、减免、非负约束、舍入和封顶规则只有一个实现来源。

#### Acceptance Criteria

1. WHEN 上游已判定应收费并提供基础费、Basis_Points_Adjustment、Discount 和 Estimated_Trip_Fare，THE Fee_Calculator_Adapter SHALL 将基础费、Basis_Points_Adjustment、Discount 和 Estimated_Trip_Fare 原样委托给 CappedFeeCalculator。
2. WHEN CappedFeeCalculator 完成计算，THE Fee_Calculator_Adapter SHALL 原样返回 CappedFeeCalculator 生成的最终费用。
3. WHEN CappedFeeCalculator 完成计算，THE Fee_Calculator_Adapter SHALL 原样返回 CappedFeeCalculator 生成的 Fee_Trace。
4. WHERE Workshop_V1 集成费用计算，THE Fee_Calculator_Adapter SHALL 将调整、舍入、减免、非负归零和 Estimated_Trip_Fare 封顶全部委托给 CappedFeeCalculator。
5. WHEN 调整后金额超过 Estimated_Trip_Fare，THE CappedFeeCalculator SHALL 将最终费用封顶为 Estimated_Trip_Fare。
6. WHEN Discount 超过调整后金额，THE CappedFeeCalculator SHALL 将最终费用归零。
7. WHEN Estimated_Trip_Fare 为 0，THE CappedFeeCalculator SHALL 将最终费用归零。
8. THE CappedFeeCalculator SHALL 为所有有效输入生成满足 `0 <= charge <= estimatedTripFare` 的 MoneyMinor 最终费用。
9. IF Basis_Points_Adjustment 为负数或非整数，THEN THE CappedFeeCalculator SHALL 拒绝 Basis_Points_Adjustment。
10. WHERE Workshop_V1 集成费用计算，THE Fee_Calculator_Adapter SHALL 从 `@company/cancellation-policy-kit` 包根导入 MoneyMinor、moneyMinor 和 CappedFeeCalculator。

### REQ-011 — Decision 幂等

- **原始章节：**第七章、第八章、第十五章、第十六章
- **Decision ID：**DEC-008
- **Analysis ID：**R07-07、R16-06

**User Story:** 作为支付与结算流程所有者，我希望重复、并发和乱序请求共享同一 Decision，以便合成收费、补偿和审计动作最多发生一次。

#### Acceptance Criteria

1. WHEN Decision_Service 接收 Order_ID 和 Charge_Type，THE Decision_Service SHALL 使用 `buildDecisionIdempotencyKey(orderId, chargeType)` 构建 Decision_Idempotency_Key。
2. WHEN Decision_Service 首次处理 Decision_Idempotency_Key，THE Decision_Store SHALL 使用 First_Write_Wins 保存一个 Decision。
3. WHEN Decision_Service 收到同一 Decision_Idempotency_Key 的重复请求，THE Decision_Service SHALL 返回 First_Write_Wins 已保存的 Decision。
4. WHEN Decision_Service 并发处理同一 Decision_Idempotency_Key，THE Decision_Store SHALL 使用 First_Write_Wins 最多保存一个 Decision。
5. WHEN Decision_Service 乱序处理同一 Decision_Idempotency_Key，THE Decision_Store SHALL 使用 First_Write_Wins 最多保存一个 Decision。
6. WHEN Decision_Service 处理同一 Decision_Idempotency_Key 的首次、重复、并发或乱序请求，THE Payment_Charge_Port 的 In_Memory_Fake SHALL 最多记录一笔对应成功模拟收费动作。
7. WHEN Decision_Service 处理同一 Decision_Idempotency_Key 的首次、重复、并发或乱序请求，THE Compensation_Settlement_Port 的 In_Memory_Fake SHALL 最多记录一笔对应成功模拟补偿动作。
8. WHEN Decision_Service 处理同一 Decision_Idempotency_Key 的首次、重复、并发或乱序请求，THE Audit_Recorder SHALL 保持对应 Decision 的 Decision_Audit_Event 数量为一条。
9. WHEN Payment_Charge_Port 或 Compensation_Settlement_Port 的 In_Memory_Fake 返回成功，THE Acceptance_Report SHALL 将动作标识为非生产模拟动作。

### REQ-012 — 规则版本固化与确定性重放

- **原始章节：**第七章、第十一章、第十三章、第十四章
- **Decision ID：**DEC-011
- **Analysis ID：**R07-06、R11-01

**User Story:** 作为审计与支持人员，我希望历史 Decision 固化判定版本和结果，以便当前配置变化不会改写历史解释。

#### Acceptance Criteria

1. WHEN Decision_Service 创建新的正常 Decision，THE Decision_Service SHALL 固化判定时的 Rule_Version。
2. WHEN Decision_Service 创建新 Decision，THE Decision_Service SHALL 固化判定时的 Public_Reason_Code。
3. WHEN Decision_Service 创建新 Decision，THE Decision_Service SHALL 固化判定时的最终金额。
4. WHEN Decision_Service 创建新 Decision，THE Decision_Service SHALL 固化不含 Sensitive_Evidence 的 Fee_Trace；非计算型零费用结果可以不提供 Fee_Trace。
5. WHERE 调用方提供相同输入快照、Rule_Version 和 Clock，WHEN Workshop_Fee_System 重放判定，THE Workshop_Fee_System SHALL 生成相同结果。
6. WHEN 当前规则配置发生变化，THE Explanation_Service SHALL 使用历史 Decision 中固化的 Rule_Version、Public_Reason_Code 和最终金额。
7. WHEN 当前规则配置发生变化，THE Workshop_Fee_System SHALL 保持历史 Decision 中固化的 Rule_Version、Public_Reason_Code、最终金额和 Fee_Trace 不被当前配置替换。
8. IF 历史输入快照或历史 Rule_Version 缺失，THEN THE Workshop_Fee_System SHALL 保持历史结果未推断状态。

### REQ-013 — 安全与无障碍强免责

- **原始章节：**第三章、第九章
- **Decision ID：**DEC-003、DEC-010
- **Analysis ID：**R09-03、R09-05

**User Story:** 作为存在安全事件或无障碍需求的乘客，我希望已确认的相关免责直接产生零费用，以便 Workshop 流程不会先收费后退款。

#### Acceptance Criteria

1. WHEN Confirmed_Exemption 为 `SAFETY`，THE Decision_Engine SHALL 直接生成最终乘客费用为 0 的 Decision。
2. WHEN Confirmed_Exemption 为 `ACCESSIBILITY`，THE Decision_Engine SHALL 直接生成最终乘客费用为 0 的 Decision。
3. WHEN Confirmed_Exemption 为 `SAFETY` 或 `ACCESSIBILITY`，THE Decision_Engine SHALL 排除先生成非零费用再生成零费用的判定序列。
4. WHEN Workshop_Fee_System 生成公开解释，THE Explanation_Service SHALL 排除原始安全叙述和无障碍敏感证据。
5. WHEN Workshop_Fee_System 生成 Fee_Trace，THE Fee_Calculator_Adapter SHALL 排除原始安全叙述和无障碍敏感证据。

### REQ-014 — 稳定公开解释与敏感信息边界

- **原始章节：**第二章、第九章、第十章、第十六章
- **Decision ID：**DEC-010
- **Analysis ID：**R02-04、R10-01、R10-02、R10-04、R16-04

**User Story:** 作为乘客或普通客服，我希望看到稳定且脱敏的收费解释，以便理解结果而不接触内部敏感证据。

#### Acceptance Criteria

1. WHEN Explanation_Service 生成公开解释，THE Explanation_Service SHALL 仅向 DecisionExplanationBuilder 提供 Public_Reason_Code、最终金额和 Rule_Version。
2. WHEN DecisionExplanationBuilder 完成构建，THE Explanation_Service SHALL 将输出字段限定为 Public_Reason_Code、最终金额、Rule_Version 和脱敏摘要。
3. WHEN DecisionExplanationBuilder 接收相同的 Public_Reason_Code、最终金额和 Rule_Version，THE DecisionExplanationBuilder SHALL 生成相同的脱敏摘要。
4. WHEN Explanation_Service 返回公开解释，THE Explanation_Service SHALL 排除内部 Fee_Trace、电话内容、精确坐标、完整安全叙述、风险分数、风险阈值和支付凭证。
5. IF Public_Reason_Code、最终金额或 Rule_Version 缺失，THEN THE Explanation_Service SHALL 排除内部 Fee_Trace 作为公开解释来源。

### REQ-015 — Support Port/Fake 普通客服视图

- **原始章节：**第二章、第九章、第十章、第十一章、第十三章
- **Decision ID：**DEC-010、DEC-011
- **Analysis ID：**R09-04、R11-01、R13-05

**User Story:** 作为普通客服，我希望通过安全视图查看判定结论，以便解释订单而不暴露敏感原始信息。

#### Acceptance Criteria

1. WHEN Support_Port 的 In_Memory_Fake 查询已持久化 Decision，THE Support_View SHALL 将返回字段限定为 Decision_ID、Order_ID、Cancel_Initiator、Liable_Party、收费金额、Public_Reason_Code、Rule_Version 和脱敏摘要。
2. WHERE 司机补偿金额可用，WHEN Support_Port 的 In_Memory_Fake 查询已持久化 Decision，THE Support_View SHALL 允许额外返回司机补偿金额。
3. WHEN Support_View 返回查询结果，THE Support_View SHALL 排除原始电话内容、精确经纬度、完整安全叙述、内部风险分数、内部风险阈值和支付凭证。
4. WHEN Support_View 包含脱敏摘要，THE Support_View SHALL 使用 DecisionExplanationBuilder 生成的摘要。
5. IF 允许字段不可用，THEN THE Support_View SHALL 保持对应字段未提供状态。
6. WHEN Support_Port 的 In_Memory_Fake 返回查询结果，THE Acceptance_Report SHALL 将查询标识为未验证真实客服集成或真实权限控制。

### REQ-016 — Decision 最小审计

- **原始章节：**第十二章、第十三章、第十六章
- **Decision ID：**DEC-008、DEC-010
- **Analysis ID：**R12-04、R13-01、R13-03、R13-05

**User Story:** 作为审计人员，我希望每个首次创建的 Decision 具有最小且脱敏的审计记录，以便追踪判定而不扩大敏感数据范围。

#### Acceptance Criteria

1. WHEN Decision_Service 首次创建正常 Decision，THE Audit_Recorder SHALL 恰好写入一条 Decision_Audit_Event。
2. WHEN Decision_Service 首次创建 Degraded_Decision，THE Audit_Recorder SHALL 恰好写入一条 Decision_Audit_Event。
3. WHEN Audit_Recorder 写入 Decision_Audit_Event，THE Audit_Recorder SHALL 将字段限定为 Decision_ID、Decision_Idempotency_Key、Order_ID、可用时的 Rule_Version、请求 UTC 时间、可用时的接受 UTC 时间、Confirmed_Exemption、Fee_Trace、Public_Reason_Code、最终金额和正常/降级标记。
4. WHEN Audit_Recorder 记录 Fee_Trace，THE Audit_Recorder SHALL 排除电话内容、精确坐标、完整安全叙述、风险阈值和支付凭证。
5. WHEN Decision_Service 返回已有 Decision，THE Audit_Recorder SHALL 保持对应 Decision 的 Decision_Audit_Event 数量为一条。

### REQ-017 — 关键依赖异常降级

- **原始章节：**第四章、第九章、第十四章、第十六章
- **Decision ID：**DEC-009
- **Analysis ID：**R04-03、R09-06、R09-07、R14-03、R14-04、R16-07

**User Story:** 作为乘客，我希望关键规则或证据不可用时订单取消仍成功且费用为零，以便依赖故障不会阻止取消或导致后续追扣。

#### Acceptance Criteria

1. IF RuleRepository_Configuration_Port 的 In_Memory_Fake 不可用，THEN THE Degradation_Handler SHALL 保持订单取消成功。
2. IF RuleRepository_Configuration_Port 的 In_Memory_Fake 不可用，THEN THE Degradation_Handler SHALL 创建最终费用为 0 且 Public_Reason_Code 为 `DEGRADED_NO_CHARGE` 的 Degraded_Decision。
3. IF 判定所需关键证据不可用，THEN THE Degradation_Handler SHALL 保持订单取消成功。
4. IF 判定所需关键证据不可用，THEN THE Degradation_Handler SHALL 创建最终费用为 0 且 Public_Reason_Code 为 `DEGRADED_NO_CHARGE` 的 Degraded_Decision。
5. WHEN Degradation_Handler 首次创建 Degraded_Decision，THE Audit_Recorder SHALL 恰好写入一条标记为降级处理的 Decision_Audit_Event。
6. WHEN Degradation_Handler 接收相同的依赖不可用输入，THE Degradation_Handler SHALL 生成相同的取消成功、零费用和 `DEGRADED_NO_CHARGE` 降级结论。
7. WHEN 关键依赖恢复后再次处理同一 Decision_Idempotency_Key，THE Decision_Service SHALL 返回已有 Degraded_Decision。
8. WHEN 关键依赖恢复后再次处理同一 Decision_Idempotency_Key，THE Payment_Charge_Port 的 In_Memory_Fake SHALL 保持对应 Degraded_Decision 不产生追扣动作。

### REQ-018 — Workshop 验收与声明边界

- **原始章节：**第二章、第八章、第十二章、第十五章、第十六章
- **Decision ID：**DEC-012
- **Analysis ID：**R16-01、R16-02、R16-04、R16-06、R16-07、R16-12

**User Story:** 作为 Workshop 评审者，我希望验收报告准确限定已批准范围，以便合成演示结果不会被扩大解释为生产完成状态。

#### Acceptance Criteria

1. WHEN Acceptance_Report 记录通过项，THE Acceptance_Report SHALL 将通过项限定为已批准的订单范围、免费窗口、强免责、Verified_Arrival、Passenger_No_Show_Eligibility、费用不变量、幂等、降级、解释和审计。
2. WHEN Acceptance_Report 记录通过项，THE Acceptance_Report SHALL 为每个通过项引用对应 Requirement ID 和 Decision ID。
3. WHEN Acceptance_Report 发布，THE Acceptance_Report SHALL 明确标注 `Workshop synthetic/non-production`。
4. WHEN Acceptance_Report 描述外部依赖，THE Acceptance_Report SHALL 将 Map、Payment/Charge、Compensation/Settlement、Notification、Support、Risk、RuleRepository/Configuration 和 Legacy 全部标识为 Port 与 In_Memory_Fake。
5. WHEN Acceptance_Report 描述任一 In_Memory_Fake 的成功结果，THE Acceptance_Report SHALL 将结果标识为合成的非生产模拟结果。
6. WHEN Acceptance_Report 描述交付状态，THE Acceptance_Report SHALL 将生产目标、真实外部集成、全部边缘场景、生产性能和生产合规保持为未验收范围。
7. WHERE 条目属于 BLOCKED 或 OUT_OF_SCOPE，THE Acceptance_Report SHALL 将条目标识为非实现边界。

## Non-Implementation Boundaries

以下内容仅用于防止范围蔓延。以下条目不构成 Requirement、Acceptance Criteria、默认值、实现任务或通过项。

### BLOCKED

- **BLK-001 / DEC-013：**线上旧规则权威版本、行为基线及“不合理场景—现状—期望”清单。
- **BLK-002 / DEC-014：**投诉率、司机满意度、转化、报表口径、目标、观察期及经营目标优先级。
- **BLK-003 / DEC-015：**开放式免责理由、提前结束等待及完整司机取消原因的责任和证据映射。
- **BLK-004 / DEC-003、DEC-031：**真实地区法律清单、维护责任和地区映射；本文仅保留法律禁收的已批准优先级。
- **BLK-005 / DEC-016：**真实地图字段、精度、新鲜度及其他外部服务契约。
- **BLK-006 / DEC-017：**完整司机取消责任规则、可采信证据及驾驶安全验收标准。
- **BLK-007 / DEC-018：**生产金额、配置上下限、估价时点、用户分类、事件定义和倍率、跨端精度及生产发布审批。
- **BLK-008 / DEC-019：**真实服务费和费用分配、退款、司机补偿到账、追偿及客服财务权限。
- **BLK-009 / DEC-020：**完整 RBAC、无障碍标签治理、隐私依据、安全规范、日志保留、导出权限及非 Decision 审计。
- **BLK-010 / DEC-021：**取消前金额展示语义、乘客/司机跨端一致字段及真实通知送达语义。
- **BLK-011 / DEC-022：**生产风控行为定义、阈值、处罚、解除、申诉、数据清单及真实风控契约。
- **BLK-012 / DEC-023：**生产性能、容量、可用性、错误预算和完整异常状态要求。
- **BLK-013 / DEC-024：**灰度城市、比例、观察期、双跑口径、扩量、回滚、决策人和在途订单影响。
- **BLK-014 / DEC-025：**历史订单迁移、缺失数据展示及 legacy 历史解释策略。
- **BLK-015 / DEC-026：**完整生产场景矩阵、指标、合规签署、兼容基线及边缘场景兜底。

### OUT_OF_SCOPE

- **OOS-001 / DEC-027：**预约、出租车、顺风车和企业用车规则迁移；相关订单仅保持 Legacy_Port 路由边界。
- **OOS-002 / DEC-028：**路线/方向/ETA 推断及真实地图、支付、结算、通知、客服、风控集成。
- **OOS-003 / DEC-029：**生产运营后台、真实退款、司机追偿及相关审批和后台体验。
- **OOS-004 / DEC-030：**风控识别、用户限制、设备关联、真实移交和机器学习模型。
- **OOS-005 / DEC-031：**多币种、跨境法规、生产 UI 和生产部署。

## Traceability Summary

本文保留基线中的 REQ-001 至 REQ-018、原始章节、Decision ID 和 Analysis ID。本文没有将任何 BLOCKED 或 OUT_OF_SCOPE 条目转化为可实施行为，也没有新增生产时间、距离、金额、责任、权限或性能指标。

# 取消订单与爽约费规则中心 Requirements Baseline

> 状态：Workshop synthetic/non-production baseline  
> 范围：仅包含已批准的 Workshop V1 行为。BLOCKED 与 OUT_OF_SCOPE 仅作追踪，不构成实现要求。  
> 覆盖：原始需求 16/16 章，Analysis ID 90/90 均已有处置。

## 全局约束

1. 本基线中的时间、距离和金额仅适用于 Workshop 教学场景，不代表生产政策。
2. 地图、支付/收费、司机补偿/结算、通知、客服、风控、规则配置和旧系统必须通过 Port 与内存 Fake 验收，不连接真实服务。
3. Fake 返回成功不得表述为生产扣款、到账、通知送达、客服授权、风控处置、地图契约或旧系统兼容已经完成。
4. 只有本文件“已批准 Requirements”中的内容构成实现要求；“BLOCKED”和“OUT_OF_SCOPE”不得转化为默认值、隐含规则或实现任务。

## 已批准 Requirements

### REQ-001 — Workshop V1 职责与外部依赖边界
- **原始章节：**第一章、第三章、第八章、第十章、第十一章、第十二章、第十四章、第十六章
- **Analysis ID：**R01-01
- **Decision ID：**DEC-001
- **前置条件：**系统运行在 Workshop V1 模式，所有外部依赖均由已声明的 Port 提供。
- **触发条件：**调用方请求执行取消判定或查询判定结果。
- **系统行为：**系统必须仅执行取消判定、版本化费用输入选择、费用结果生成、公开解释、幂等控制和 Decision 审计。
- **边界：**Map、Payment/Charge、Compensation/Settlement、Notification、Support、Risk、RuleRepository/Configuration 和 Legacy 仅允许使用内存 Fake；不得连接真实服务。
- **异常：**任一 Fake 不可用时，系统仅执行已批准的降级规则，不得假定真实依赖成功。
- **验收标准：**
  1. GIVEN Workshop V1 启动，WHEN 检查外部依赖装配，THEN 每类外部依赖 SHALL 由 Port 和内存 Fake 提供。
  2. WHEN 完成一次取消判定，THEN 可观察输出 SHALL 限于判定、版本化费用输入、费用结果、公开解释、幂等状态和审计结果。
  3. THEN 验收材料 SHALL NOT 声称任何真实外部系统已接入。

### REQ-002 — 规则优先级与强免责
- **原始章节：**第一章、第二章、第三章、第四章、第七章、第九章
- **Analysis ID：**R01-04、R02-02、R03-03、R03-04、R04-04、R07-04、R07-05、R09-03、R09-05
- **Decision ID：**DEC-003
- **前置条件：**命令包含上游已确认的证据类别、责任证据和显式费用输入。
- **触发条件：**同一取消请求命中一个或多个候选规则。
- **系统行为：**系统必须按以下顺序判定：法律禁止收费、安全免责、无障碍免责、平台或关键依赖异常、有证据的司机责任、已验证爽约、普通乘客取消、天气/活动/车型/城市/用户调整、非负和预估完单价格封顶。
- **边界：**法律、安全、无障碍、平台/关键依赖失败及已确认司机责任为强免责；自选理由不得单独构成强免责证据。
- **异常：**命中强免责时必须停止后续收费资格评估，但仍生成版本化、可解释、可审计的 Decision。
- **验收标准：**
  1. GIVEN 同一输入命中多个规则，WHEN 执行判定，THEN 系统 SHALL 使用本条规定的最高优先级结果。
  2. GIVEN 任一已确认强免责，WHEN 执行判定，THEN 乘客费用 SHALL 为 0，且 Decision SHALL 包含规则版本、公开原因和审计记录。
  3. GIVEN 仅有乘客或司机自选理由且没有确认结果，WHEN 执行判定，THEN 系统 SHALL NOT 仅据该声明产生强免责。

### REQ-003 — 实时订单白名单与 Legacy 路由
- **原始章节：**第三章、第十四章、第十六章
- **Analysis ID：**R03-01、R03-05、R14-05、R16-10
- **Decision ID：**DEC-002
- **前置条件：**订单包含可识别的服务类型和实时/非实时属性。
- **触发条件：**订单进入取消规则入口。
- **系统行为：**实时 `EXPRESS`、`PREMIUM`、`BUSINESS` 订单必须进入 V1；其他订单必须交给 Legacy Port/Fake。
- **边界：**预约、出租车、顺风车和企业用车不进入 V1 判定。
- **异常：**订单类型不在白名单时不得推断其收费规则。
- **验收标准：**
  1. GIVEN 实时 `EXPRESS`、`PREMIUM` 或 `BUSINESS`，WHEN 进入入口，THEN 订单 SHALL 进入 V1。
  2. GIVEN 预约、出租车、顺风车或企业用车，WHEN 进入入口，THEN 订单 SHALL 调用 Legacy Port/Fake 且不执行 V1 收费判定。
  3. THEN Legacy Fake 的结果 SHALL NOT 被描述为真实旧系统兼容验证。

### REQ-004 — 强免责证据与责任证据边界
- **原始章节：**第三章、第四章、第六章
- **Analysis ID：**R03-03、R03-04、R04-04、R06-01、R06-03
- **Decision ID：**DEC-003、DEC-006
- **前置条件：**上游端口提供已确认免责类别或已确认责任证据；声明与确认结果分开传入。
- **触发条件：**乘客或司机提交取消理由，或上游提供已确认免责/责任结果。
- **系统行为：**系统只能使用已确认的 `LEGAL`、`SAFETY`、`ACCESSIBILITY`、`PLATFORM_FAILURE`、`CRITICAL_DEPENDENCY_FAILURE`、`DRIVER_RESPONSIBILITY_CONFIRMED` 作为强免责输入。
- **边界：**本需求不定义开放式理由的证据清单，也不定义完整司机取消原因映射。
- **异常：**只有声明但没有确认结果时，不得据此收费或免责。
- **验收标准：**
  1. GIVEN 任一已确认免责类别，WHEN 判定，THEN 系统 SHALL 产生零费用 Decision。
  2. GIVEN 任一方声明理由但 confirmed exemption 为空，WHEN 判定，THEN 系统 SHALL NOT 将声明升级为强免责证据。
  3. THEN Decision 的普通视图 SHALL NOT 暴露原始敏感证据。

### REQ-005 — 免费取消窗口
- **原始章节：**第四章
- **Analysis ID：**R04-01
- **Decision ID：**DEC-004
- **前置条件：**订单已由司机接受；系统持有服务端 UTC 接单时间和可注入 Clock。
- **触发条件：**乘客发起取消。
- **系统行为：**从司机接单的服务端 UTC 时间起，到第 120 秒结束前及第 120 秒整，系统必须免收乘客费用。
- **边界：**第 121 秒不得仅因免费窗口自动免收；本条不判断司机行驶方向、路线、距离或 ETA。
- **异常：**时间输入不可用时执行 REQ-017 的降级规则。
- **验收标准：**
  1. GIVEN 取消发生在第 119 秒，WHEN 判定，THEN reason SHALL 为 `FREE_CANCELLATION_WINDOW` 且费用 SHALL 为 0。
  2. GIVEN 取消发生在第 120 秒，WHEN 判定，THEN reason SHALL 为 `FREE_CANCELLATION_WINDOW` 且费用 SHALL 为 0。
  3. GIVEN 取消发生在第 121 秒，WHEN 判定，THEN 系统 SHALL NOT 因本规则自动免收。

### REQ-006 — Map Port/Fake 验证到达
- **原始章节：**第四章、第五章
- **Analysis ID：**R04-05、R05-02
- **Decision ID：**DEC-005
- **前置条件：**Map Port/Fake 提供司机与上车点距离及该状态持续时间。
- **触发条件：**系统评估司机是否已验证到达。
- **系统行为：**仅当距离不超过 200 米且该状态持续至少 30 秒时，系统必须认定验证到达。
- **边界：**司机单独点击到达不得构成验证到达；该规则仅为 Workshop 输入模型，不代表真实地图契约。
- **异常：**Map Port/Fake 无法提供关键证据时执行 REQ-017。
- **验收标准：**
  1. GIVEN 距离 200 米且持续 30 秒，WHEN 判定，THEN verified arrival SHALL 为 true。
  2. GIVEN 距离 201 米或持续 29 秒，WHEN 判定，THEN verified arrival SHALL 为 false。
  3. GIVEN 只有司机点击到达，WHEN 判定，THEN verified arrival SHALL 为 false。

### REQ-007 — 乘客爽约资格
- **原始章节：**第五章
- **Analysis ID：**R05-01、R05-02、R05-03
- **Decision ID：**DEC-005
- **前置条件：**REQ-006 已确认验证到达；系统持有可注入 Clock 和平台内联系尝试记录。
- **触发条件：**司机请求判定乘客爽约。
- **系统行为：**普通爽约必须同时满足验证到达后等待至少 5 分钟和至少一次平台内联系尝试。
- **边界：**乘客在平台内明确拒乘时可跳过剩余等待，但不得跳过验证到达。
- **异常：**等待时间或联系证据不可用时执行 REQ-017。
- **验收标准：**
  1. GIVEN 已验证到达、等待 5 分钟且存在平台内联系尝试，WHEN 判定，THEN no-show eligibility SHALL 为 true。
  2. GIVEN 等待 4 分 59 秒或没有平台内联系尝试，WHEN 普通爽约判定，THEN no-show eligibility SHALL 为 false。
  3. GIVEN 平台内明确拒乘且已验证到达，WHEN 判定，THEN 系统 MAY 跳过剩余等待并认定爽约资格。
  4. GIVEN 明确拒乘但未验证到达，WHEN 判定，THEN no-show eligibility SHALL 为 false。

### REQ-008 — 取消发起方与责任方分离
- **原始章节：**第六章
- **Analysis ID：**R06-01、R06-03、R06-04
- **Decision ID：**DEC-006
- **前置条件：**服务端可确定首次接受的取消请求，并可接收已确认责任证据。
- **触发条件：**收到一个或多个取消请求。
- **系统行为：**`cancelInitiator` 必须记录服务端首次接受请求的一方；`liableParty` 必须根据已确认事实独立判定，两者允许不同。
- **边界：**本条不补充完整司机取消原因映射。
- **异常：**没有责任证据时不得仅凭任一方声明设置收费或免责结论。
- **验收标准：**
  1. GIVEN 多方先后或并发取消，WHEN 服务端接受请求，THEN `cancelInitiator` SHALL 等于首次接受请求的一方。
  2. GIVEN 后续存在已确认责任证据，WHEN 判定，THEN `liableParty` MAY 与 `cancelInitiator` 不同，且不得改写 `cancelInitiator`。
  3. GIVEN 只有单方声明，WHEN 判定责任，THEN 系统 SHALL NOT 将声明作为已确认责任证据。

### REQ-009 — Workshop 版本化费用输入
- **原始章节：**第四章、第五章、第七章
- **Analysis ID：**R04-06、R04-07、R05-05、R07-01、R07-02
- **Decision ID：**DEC-007
- **前置条件：**上游判定结果允许收费；RuleRepository/Configuration Port/Fake 返回 `ruleVersion` 和版本化基础费。
- **触发条件：**系统为普通取消或爽约选择基础费。
- **系统行为：**Workshop 基础费必须为：`EXPRESS` 普通取消 500、爽约 800；`PREMIUM` 和 `BUSINESS` 普通取消 800、爽约 1200，单位均为整数最小货币单位。
- **边界：**这些值为教学模拟值；不得用于生产政策声明；金额必须是非负整数。
- **异常：**规则配置不可用时执行 REQ-017。
- **验收标准：**
  1. GIVEN 四种服务类型/收费类型组合，WHEN 查询版本化基础费，THEN 返回值 SHALL 与本条费表一致并包含 `ruleVersion`。
  2. GIVEN 负数、浮点、`NaN` 或无限金额，WHEN 构造 Money，THEN 输入 SHALL 被拒绝。
  3. THEN 基础费 SHALL NOT 作为用例层硬编码值绕过 RuleRepository/Configuration Port。

### REQ-010 — 费用计算顺序与金额不变量
- **原始章节：**第四章、第五章、第七章
- **Analysis ID：**R05-05、R07-03、R07-04、R07-05
- **Decision ID：**DEC-007
- **前置条件：**已取得基础费、basis-points 调整、用户减免和预估完单价格，且均为批准的显式输入。
- **触发条件：**上游已判定应收费并请求计算最终费用。
- **系统行为：**系统必须将完整金额管线委托给 `CappedFeeCalculator`，顺序为基础费、basis-points 调整、货币舍入、用户减免、非负归零、预估完单价格封顶。
- **边界：**最终费用必须满足 `0 <= charge <= estimatedTripFare`；应用层不得复制乘法、舍入、减免、归零或封顶逻辑。
- **异常：**减免大于调整后金额时结果为 0；预估完单价格为 0 时结果为 0。
- **验收标准：**
  1. GIVEN 调整后金额超过预估完单价格，WHEN 计算，THEN 最终费用 SHALL 等于预估完单价格。
  2. GIVEN 减免超过调整后金额，WHEN 计算，THEN 最终费用 SHALL 为 0。
  3. FOR ALL 有效输入，THEN 最终费用 SHALL 满足 `0 <= charge <= estimatedTripFare` 且为整数最小货币单位。
  4. THEN 应用代码 SHALL 调用 `CappedFeeCalculator`，且不得包含该管线的重复实现。

### REQ-011 — Decision 幂等
- **原始章节：**第七章、第八章、第十五章、第十六章
- **Analysis ID：**R07-07、R16-06
- **Decision ID：**DEC-008
- **前置条件：**请求包含 `orderId` 和 `chargeType`；Decision Store Port/Fake 支持 first-write-wins。
- **触发条件：**收到首次、重复、并发或乱序的同一规范业务请求。
- **系统行为：**系统必须使用 `buildDecisionIdempotencyKey(orderId, chargeType)` 构建规范键，并以 first-write-wins 持久化 Decision。
- **边界：**同一规范键最多产生一个 Decision、Payment/Charge Fake 中一笔成功收费、Compensation/Settlement Fake 中一笔对应补偿和一条 Decision 审计事件。
- **异常：**重复请求必须返回已有 Decision，不得新增第二条 Decision 审计事件。
- **验收标准：**
  1. GIVEN 同一规范键的重复请求，WHEN 处理，THEN 所有响应 SHALL 引用同一个 Decision。
  2. GIVEN 同一规范键的并发或乱序请求，WHEN 处理完成，THEN Store SHALL 仅含一个 Decision。
  3. THEN Payment/Charge Fake 和 Compensation/Settlement Fake SHALL 各自最多记录一次对应成功动作。
  4. THEN Decision 审计 SHALL 仅有一条；Fake 结果不得表述为真实扣款或到账。

### REQ-012 — 规则版本固化与确定性重放
- **原始章节：**第七章、第十一章、第十三章、第十四章
- **Analysis ID：**R07-06、R11-01
- **Decision ID：**DEC-011
- **前置条件：**判定输入快照、`ruleVersion` 和 Clock 可被固定。
- **触发条件：**创建新 Decision 或重放已有完整快照。
- **系统行为：**Decision 必须固化判定时的 `ruleVersion`、公开 reason code、最终金额和不含敏感信息的计算 trace。
- **边界：**历史解释必须使用 Decision 中固化的值，不得读取当前配置替换历史版本。
- **异常：**缺失完整历史快照或历史规则版本时不得推断历史结果。
- **验收标准：**
  1. WHEN 创建 Decision，THEN 四项固化结果 SHALL 存在。
  2. GIVEN 相同输入快照、`ruleVersion` 和 Clock，WHEN 多次重放，THEN 结果 SHALL 完全一致。
  3. GIVEN 当前规则配置已变化，WHEN 查询历史解释，THEN 输出 SHALL 使用原 Decision 的版本、原因和金额。

### REQ-013 — 安全与无障碍强免责
- **原始章节：**第三章、第九章
- **Analysis ID：**R09-03、R09-05
- **Decision ID：**DEC-003、DEC-010
- **前置条件：**上游已确认免责类别为 `SAFETY` 或 `ACCESSIBILITY`。
- **触发条件：**处理包含该确认类别的取消请求。
- **系统行为：**系统必须当次直接免收乘客费用，不执行先收费后退款。
- **边界：**本条不定义安全事件调查、无障碍标签识别或完整权限矩阵。
- **异常：**原始安全叙述或无障碍敏感证据不得进入普通客服视图、公开解释或费用 trace。
- **验收标准：**
  1. GIVEN confirmed exemption 为 `SAFETY`，WHEN 判定，THEN 最终费用 SHALL 为 0。
  2. GIVEN confirmed exemption 为 `ACCESSIBILITY`，WHEN 判定，THEN 最终费用 SHALL 为 0。
  3. THEN 普通输出和费用 trace SHALL NOT 包含原始安全叙述或无障碍敏感证据。

### REQ-014 — 稳定公开解释与敏感信息边界
- **原始章节：**第二章、第九章、第十章、第十六章
- **Analysis ID：**R02-04、R10-01、R10-02、R10-04、R16-04
- **Decision ID：**DEC-010
- **前置条件：**已生成包含公开 reason code、金额和 `ruleVersion` 的 Decision。
- **触发条件：**请求生成用户或普通客服可见解释。
- **系统行为：**系统必须使用 `DecisionExplanationBuilder` 从公开 reason code、金额和 `ruleVersion` 生成脱敏摘要。
- **边界：**公开输出不得包含内部 trace、电话内容、精确坐标、完整安全叙述、风险分数或阈值、支付凭证。
- **异常：**缺少公开解释输入时不得回退为拼接内部 trace。
- **验收标准：**
  1. WHEN 生成解释，THEN builder 输入 SHALL 仅包含公开 reason code、金额和 `ruleVersion`。
  2. THEN 输出 SHALL 包含稳定公开原因、金额、规则版本和脱敏摘要。
  3. THEN 所有禁止字段 SHALL 不存在于输出。

### REQ-015 — Support Port/Fake 普通客服视图
- **原始章节：**第二章、第九章、第十章、第十一章、第十三章
- **Analysis ID：**R09-04、R11-01、R13-05
- **Decision ID：**DEC-010、DEC-011
- **前置条件：**Support Port/Fake 查询一个已持久化 Decision。
- **触发条件：**普通客服视图请求订单取消判定信息。
- **系统行为：**视图必须仅返回 decision ID、order ID、取消发起方、责任方、收费金额、可用时的司机补偿金额、稳定公开 reason code、规则版本和安全摘要。
- **边界：**不得返回原始电话、精确经纬度、完整安全叙述、内部风险分数或阈值、支付凭证。
- **异常：**字段不可用时不得以敏感原始证据替代。
- **验收标准：**
  1. WHEN Support Fake 查询 Decision，THEN 返回字段 SHALL 为本条允许字段的子集。
  2. THEN 本条禁止字段 SHALL 全部不存在。
  3. THEN 安全摘要 SHALL 由 `DecisionExplanationBuilder` 生成。
  4. THEN Fake 查询成功 SHALL NOT 被描述为真实客服系统接入或真实权限验证。

### REQ-016 — Decision 最小审计
- **原始章节：**第十二章、第十三章、第十六章
- **Analysis ID：**R12-04、R13-01、R13-03、R13-05
- **Decision ID：**DEC-008、DEC-010
- **前置条件：**系统即将持久化一个新的 Decision。
- **触发条件：**首次成功创建正常或降级 Decision。
- **系统行为：**审计必须记录 decisionId、规范幂等键、orderId、ruleVersion、请求和接受 UTC 时间、已确认免责类别、无敏感证据的费用 trace、公开 reason code、最终金额及正常/降级标记。
- **边界：**本条仅定义 Decision 审计，不定义规则修改、退款、改责或风控分析审计。
- **异常：**返回已有 Decision 的重复请求不得新增 Decision 审计事件；费用 trace 不得包含敏感证据。
- **验收标准：**
  1. WHEN 首次创建正常 Decision，THEN 审计 SHALL 包含全部列明字段并标记正常处理。
  2. WHEN 首次创建降级 Decision，THEN 审计 SHALL 包含全部列明字段并标记降级处理。
  3. GIVEN 重复请求返回已有 Decision，THEN 审计事件数量 SHALL 不增加。
  4. THEN trace SHALL NOT 包含电话内容、精确坐标、安全叙述、风险阈值或支付凭证。

### REQ-017 — 关键依赖异常降级
- **原始章节：**第四章、第九章、第十四章、第十六章
- **Analysis ID：**R04-03、R09-06、R09-07、R14-03、R14-04、R16-07
- **Decision ID：**DEC-009
- **前置条件：**订单取消请求已被接受。
- **触发条件：**RuleRepository/Configuration Port/Fake 或判定所需关键证据不可用。
- **系统行为：**系统必须保持取消成功，生成费用为 0、公开原因为 `DEGRADED_NO_CHARGE` 的降级 Decision，并写入审计。
- **边界：**本条只覆盖规则配置或关键证据不可用，不定义生产可用性目标或其他外部系统 SLA。
- **异常：**依赖恢复后不得对该降级 Decision 追扣乘客。
- **验收标准：**
  1. GIVEN 规则配置不可用，WHEN 取消，THEN 取消 SHALL 成功、费用 SHALL 为 0、reason SHALL 为 `DEGRADED_NO_CHARGE`。
  2. GIVEN 关键证据不可用，WHEN 取消，THEN 结果 SHALL 满足相同降级结论。
  3. THEN 降级 Decision SHALL 有一条审计记录。
  4. GIVEN 依赖恢复，WHEN 再处理同一规范键，THEN 系统 SHALL 返回已有 Decision 且不得追扣。

### REQ-018 — Workshop 验收与声明边界
- **原始章节：**第二章、第八章、第十二章、第十五章、第十六章
- **Analysis ID：**R16-01、R16-02、R16-04、R16-06、R16-07、R16-12
- **Decision ID：**DEC-012
- **前置条件：**准备执行 V1 验收或发布交付说明。
- **触发条件：**生成验收报告、演示结果或完成声明。
- **系统行为：**验收只能覆盖本文件已批准的订单范围、免费窗口、强免责、验证到达、爽约、费用不变量、幂等、降级、解释和审计。
- **边界：**不得声称完整满足生产目标、真实外部集成、全部边缘场景、生产性能或生产合规要求。
- **异常：**BLOCKED 或 OUT_OF_SCOPE 条目不得被写成通过项。
- **验收标准：**
  1. WHEN 检查验收清单，THEN 每个通过项 SHALL 引用本文件中的 Requirement ID 和对应 Decision ID。
  2. THEN 报告 SHALL 明确标注 `Workshop synthetic/non-production`。
  3. THEN 报告 SHALL NOT 包含“完整满足生产需求”“全部场景完成”或“真实集成完成”的结论。

## BLOCKED — 不构成实现要求

| Blocked ID | 原始章节 | Analysis ID | Decision ID | 未确认事项 |
|---|---|---|---|---|
| BLK-001 | 第一、十六章 | R01-02、R01-03、R16-10 | DEC-013 | 线上旧规则权威版本、行为基线及“不合理场景—现状—期望”清单。 |
| BLK-002 | 第二、十三、十五、十六章 | R02-01、R02-02、R13-04、R15-03、R16-08 | DEC-014 | 投诉率、司机满意度、转化、报表口径、目标、观察期及经营目标优先级。 |
| BLK-003 | 第三、四、五、六章 | R03-03、R04-04、R05-04、R06-01、R06-02、R06-03 | DEC-015 | 开放式免责理由、提前结束等待及完整司机取消原因的责任和证据映射。 |
| BLK-004 | 第三章 | R03-04 | DEC-003、DEC-031 | 真实地区法律清单、维护责任和地区映射；仅法律禁收的优先级已批准。 |
| BLK-005 | 第四、五、十四、十六章 | R04-03、R04-05、R05-02、R14-04、R16-10 | DEC-016 | 真实地图字段、精度、新鲜度及其他外部服务契约。 |
| BLK-006 | 第六章 | R06-01、R06-02、R06-03、R06-05 | DEC-017 | 完整司机取消责任规则、可采信证据及驾驶安全验收标准。 |
| BLK-007 | 第四、五、七、九、十一、十六章 | R04-06、R04-07、R05-05、R07-03、R07-04、R07-06、R09-01、R09-02、R11-03、R11-04、R16-05 | DEC-018 | 生产金额、配置上下限、估价时点、用户分类、事件定义和倍率、跨端精度及生产发布审批。 |
| BLK-008 | 第八、十一、十六章 | R08-01、R08-02、R08-03、R08-04、R11-02、R16-03 | DEC-019 | 真实服务费和费用分配、退款、司机补偿到账、追偿及客服财务权限。 |
| BLK-009 | 第九、十二、十三、十六章 | R09-04、R09-05、R12-04、R13-02、R13-03、R13-05、R16-09 | DEC-020 | 完整 RBAC、无障碍标签治理、隐私依据、安全规范、日志保留、导出权限及非 Decision 审计。 |
| BLK-010 | 第十章 | R10-01、R10-04、R10-05 | DEC-021 | 取消前金额展示语义、乘客/司机跨端一致字段及真实通知送达语义。 |
| BLK-011 | 第二、十二章 | R02-03、R12-01、R12-02、R12-03、R12-04、R12-05 | DEC-022 | 生产风控行为定义、阈值、处罚、解除、申诉、数据清单及真实风控契约。 |
| BLK-012 | 第十四章 | R14-01、R14-02、R14-03、R14-04 | DEC-023 | 生产性能、容量、可用性、错误预算和完整异常状态要求。 |
| BLK-013 | 第十五章 | R15-01、R15-02、R15-03、R15-04、R15-05 | DEC-024 | 灰度城市、比例、观察期、双跑口径、扩量、回滚、决策人和在途订单影响。 |
| BLK-014 | 第十、十四章 | R10-01、R10-04、R14-05 | DEC-025 | 历史订单迁移、缺失数据展示及 legacy 历史解释策略。 |
| BLK-015 | 第十六章 | R16-01、R16-02、R16-08、R16-09、R16-10、R16-11 | DEC-026 | 完整生产场景矩阵、指标、合规签署、兼容基线及边缘场景兜底。 |

## OUT_OF_SCOPE — 不构成实现要求

| Scope ID | 原始章节 | Analysis ID | Decision ID | 本次不做 |
|---|---|---|---|---|
| OOS-001 | 第三章 | R03-02、R03-05 | DEC-027 | 预约、出租车、顺风车和企业用车规则迁移。 |
| OOS-002 | 第四、五、八、十、十一、十二、十四、十六章 | R04-02、R04-03、R05-02、R08-01、R08-02、R10-05、R11-01、R12-03、R14-04、R16-03、R16-10 | DEC-028 | 路线/方向/ETA 推断及真实地图、支付、结算、通知、客服、风控集成。 |
| OOS-003 | 第八、九、十、十一、十六章 | R08-02、R08-03、R09-02、R10-03、R11-02、R11-03、R11-04、R11-05、R16-05 | DEC-029 | 生产运营后台、真实退款、司机追偿及相关审批和后台体验。 |
| OOS-004 | 第二、七、十二章 | R02-03、R07-04、R12-01、R12-02、R12-03、R12-05 | DEC-030 | 风控识别、用户限制、设备关联、真实移交和机器学习模型。 |
| OOS-005 | 第三、四、十六章 | R03-04、R04-07、R16-09、R16-12 | DEC-031 | 多币种、跨境法规、生产 UI 和生产部署。 |

## 原始十六章覆盖索引

| 原始章节 | APPROVED Requirement | BLOCKED | OUT_OF_SCOPE |
|---|---|---|---|
| 一、需求背景 | REQ-001、REQ-002 | BLK-001、BLK-007 | OOS-003 |
| 二、业务目标 | REQ-002、REQ-014、REQ-015 | BLK-002、BLK-011 | OOS-004 |
| 三、适用订单 | REQ-003、REQ-004 | BLK-003、BLK-004 | OOS-001、OOS-005 |
| 四、乘客主动取消 | REQ-004、REQ-005、REQ-006、REQ-009、REQ-017 | BLK-003、BLK-005、BLK-007、BLK-010 | OOS-002、OOS-005 |
| 五、乘客爽约 | REQ-006、REQ-007、REQ-009、REQ-010 | BLK-003、BLK-005、BLK-007 | OOS-002 |
| 六、司机取消 | REQ-004、REQ-008 | BLK-003、BLK-006 | — |
| 七、费用计算 | REQ-002、REQ-009、REQ-010、REQ-011、REQ-012 | BLK-007、BLK-011 | OOS-004 |
| 八、费用分配 | REQ-011 | BLK-008 | OOS-002、OOS-003 |
| 九、特殊场景 | REQ-002、REQ-013、REQ-015、REQ-017 | BLK-007、BLK-009 | OOS-003 |
| 十、用户告知 | REQ-014 | BLK-010、BLK-014 | OOS-002、OOS-003 |
| 十一、客服与运营 | REQ-012、REQ-015 | BLK-007、BLK-008、BLK-009 | OOS-002、OOS-003 |
| 十二、风控要求 | REQ-016 | BLK-009、BLK-011 | OOS-002、OOS-004 |
| 十三、数据与审计 | REQ-012、REQ-016 | BLK-002、BLK-009 | — |
| 十四、兼容与性能 | REQ-003、REQ-017 | BLK-005、BLK-012、BLK-014 | OOS-002 |
| 十五、上线方案 | REQ-011（仅重复收费边界） | BLK-002、BLK-013 | OOS-005 |
| 十六、验收标准 | REQ-011、REQ-014、REQ-017、REQ-018 | BLK-001、BLK-002、BLK-005、BLK-009、BLK-015 | OOS-002、OOS-003、OOS-005 |

## 追踪说明

1. 当前分析正文包含 90 个 Analysis ID；覆盖以 `workshop-output/01-requirements-analysis.md` 的实际正文为准。
2. R03-04 的真实地区法律清单仍为 BLOCKED；由于决策台账没有独立的同 ID BLOCKED Decision，BLK-004 同时引用 DEC-003 的已批准优先级边界和 DEC-031 的跨境排除边界，不从中推导地区法律规则。
3. DEC-008 的补偿幂等边界作为 REQ-011 的跨章 Port/Fake 验收，不产生服务费分配、到账或追偿规则。
4. R05-02 的 Workshop Map Fake 到达判定已批准；真实地图集成仍由 OOS-002 排除，且真实地图契约继续由 BLK-005 阻塞。

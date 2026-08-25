# Workshop 模拟需求方确认反馈

> Status: `WORKSHOP_SYNTHETIC_INPUT`  
> Version: `1.0`  
> Provided by: Workshop 维护者模拟产品、策略、客服、安全、财务和运营角色  
> Production use: **PROHIBITED**

本文件只用于 Workshop。它不是任何真实企业的生产政策、合同、审批或签署结果。真实项目必须重新取得产品、法务、合规、安全、财务、运营和相关系统 Owner 的书面确认。

## 使用方式

1. 学员必须先独立完成原始需求分析，再读取本文件。
2. 本文件是第 3 步 Decision Log 的输入，不是已经完成的 Decision Log。
3. 学员应为采用的结论创建自己的 Decision ID，并引用对应 Feedback ID 和 Analysis ID。
4. `REMAINS_BLOCKED` 不得进入实现；`OUT_OF_SCOPE` 只能进入范围排除项。
5. 如果学员分析使用了不同 ID，应按问题语义建立映射，不要为了匹配本文件而重写分析结论。

## 状态定义

- `CONFIRMED_FOR_WORKSHOP`：只在 Workshop V1 内作为模拟确认，可转成带来源的 Decision。
- `REMAINS_BLOCKED`：缺少真实 Owner、政策、指标或接口确认，不得猜测。
- `OUT_OF_SCOPE`：明确不属于 Workshop V1，不得写成实现要求。

## 模拟需求方确认

### FB-001：V1 目标与职责边界

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人、订单域负责人
- 答复：V1 只演示取消判定、版本化费用输入选择、费用结果、公开解释、幂等和审计。地图、支付、司机结算、通知、客服、风控、配置和旧系统只定义端口并使用内存 Fake；不连接真实服务。
- 验收边界：不能把 Fake 的成功描述为生产系统已经接入。

### FB-002：订单范围

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人
- 答复：V1 仅处理实时 `EXPRESS`、`PREMIUM`、`BUSINESS`。预约、出租车、顺风车和企业用车保持 legacy 行为，不做迁移。
- 依据：`enterprise-knowledge-base/business/cancellation-policy-v1.md` 的 Scope。

### FB-003：规则优先级与强免责

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人、安全/合规模拟角色
- 答复：优先级从高到低为：法律禁止收费、安全免责、无障碍免责、平台或关键依赖异常、有证据的司机责任、已验证爽约、普通乘客取消、天气/活动/车型/城市/用户调整、非负和预估车费封顶。强免责命中后乘客费用为 0，但仍生成版本化、可解释、可审计的 Decision。
- 边界：乘客或司机自选理由只是声明，不能单独构成强免责证据。
- 依据：`enterprise-knowledge-base/business/cancellation-policy-v1.md` 的 Rule priority 和 Strong exemptions。

### FB-004：乘客免费取消窗口

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人、策略负责人
- 答复：从司机接单的服务端 UTC 时间开始计算；乘客在 120 秒内（含 120 秒）取消免费。119、120 秒免费，121 秒不再因该窗口自动免费。
- 边界：V1 不实现司机行驶方向、路线质量、距离较远或 ETA 变长判定。
- 依据：`enterprise-knowledge-base/business/cancellation-policy-v1.md` 的 Passenger cancellation。

### FB-005：验证到达与乘客爽约

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人、地图和司机业务模拟角色
- 答复：Workshop 中，地图证据显示司机距上车点不超过 200 米并持续至少 30 秒，才算验证到达；司机单独点击到达不生效。普通爽约要求验证到达后等待至少 5 分钟，并至少有一次平台内联系尝试。乘客在平台内明确拒乘时可跳过剩余等待，但仍必须先验证到达。
- 边界：真实地图字段、精度、新鲜度和接口契约仍未确认。

### FB-006：取消发起方、责任方与证据

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人、客服负责人
- 答复：`cancelInitiator` 记录服务端首次接受的取消请求；`liableParty` 根据已确认的证据独立判定。两者可以不同。司机责任有证据时乘客强免责；没有证据时不得仅凭一方声明收费或免责。
- 边界：完整的司机取消原因到责任方映射不在本次确认范围内，继续保持阻塞。

### FB-007：时间、金额与费用计算

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：策略负责人、财务模拟角色
- 答复：时间使用服务端 UTC 和可注入 Clock；金额使用非负整数最小货币单位。Workshop 版本化基础费为：`EXPRESS` 普通取消 500、爽约 800；`PREMIUM/BUSINESS` 普通取消 800、爽约 1200。以上均为教学模拟值。
- 计算顺序：基础费 → basis-points 调整 → 货币舍入 → 用户减免 → 非负归零 → 预估完单价格封顶。
- 不变量：`0 <= charge <= estimatedTripFare`。
- 依据：`enterprise-knowledge-base/business/fee-calculation-policy.md`；应用代码必须复用 `CappedFeeCalculator`。

### FB-008：幂等边界

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：订单域负责人、支付模拟角色
- 答复：规范幂等键为 `(orderId, chargeType)`。存储使用 first-write-wins；重复、并发和乱序请求最多产生一个 Decision、一笔成功收费和一笔对应司机补偿。返回已有 Decision 时不得新增第二条 Decision 审计事件。
- 依据：`enterprise-knowledge-base/architecture/reuse-contracts.md` 和 `enterprise-knowledge-base/business/support-and-audit.md`。

### FB-009：关键依赖异常

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人、订单域负责人
- 答复：规则配置或关键证据不可用时，订单取消仍成功，乘客费用为 0，公开原因为 `DEGRADED_NO_CHARGE`，结果必须审计；依赖恢复后不得追扣乘客。
- 依据：`enterprise-knowledge-base/business/cancellation-policy-v1.md` 的 Failure behavior。

### FB-010：解释、隐私与审计

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：客服负责人、安全/隐私模拟角色
- 答复：用户和普通客服只使用稳定公开 reason code、金额、ruleVersion 和脱敏摘要理解结果。普通客服不得看到电话内容、精确坐标、完整安全叙述、风险分数/阈值或支付凭证。解释使用 `DecisionExplanationBuilder`，不得拼接内部 trace。
- 审计字段：decisionId、规范幂等键、orderId、ruleVersion、请求/接受 UTC 时间、确认的免责类别、无敏感证据的费用 trace、公开原因、最终金额、正常或降级标记。
- 依据：`enterprise-knowledge-base/business/support-and-audit.md`。

### FB-011：规则版本与历史重放

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：策略负责人、客服负责人
- 答复：每个 Decision 固化判定时的 `ruleVersion`、公开 reason code、金额结果和不含敏感信息的计算 trace。相同输入快照、ruleVersion 和 Clock 必须得到确定性结果；历史解释不能读取当前配置替代历史版本。
- 边界：历史订单迁移范围和缺失数据展示仍未确认。

### FB-012：Workshop 验收边界

- 状态：`CONFIRMED_FOR_WORKSHOP`
- 模拟确认角色：产品负责人、测试负责人
- 答复：V1 验收只覆盖本文件明确确认的订单范围、免费窗口、强免责、验证到达、爽约、费用不变量、幂等、降级、解释和审计。不能声称满足原始需求中所有生产目标、真实外部集成或全部边缘场景。

### FB-013：继续阻塞的生产决策

- 状态：`REMAINS_BLOCKED`
- 模拟确认角色：需求方联合确认
- 以下内容没有生产级答案，Workshop 不得猜测：
  - 线上旧规则的权威版本和行为对照基线；
  - 投诉率、司机满意度、转化、报表等指标口径和目标；
  - 真实城市/车型金额、配置上下限和发布审批；
  - 地方法律清单、隐私依据、日志保留周期和完整 RBAC；
  - 真实客服退款权限、司机补偿 SLA、财务分配和追偿规则；
  - 风控阈值、处罚、解除和申诉机制；
  - 生产性能、容量、可用性和错误预算；
  - 灰度城市、比例、观察期、扩量和回滚阈值；
  - 历史订单迁移和展示策略；
  - 真实地图字段、精度、新鲜度及其他外部服务契约。

### FB-014：明确排除出 Workshop V1

- 状态：`OUT_OF_SCOPE`
- 模拟确认角色：产品负责人
- 排除项：预约/出租车/顺风车/企业用车迁移，真实地图/支付/结算/通知/客服/风控集成，机器学习风控模型，生产运营后台，真实退款和司机追偿，多币种和跨境法规，以及生产 UI/部署。

## Analysis ID 处理矩阵

说明：该矩阵覆盖 `workshop-output/analise.md` 实际列出的全部 90 个 Analysis ID。原分析末尾汇总为 74 项，与正文数量不一致；Decision Log 应以正文 ID 为准，并记录这个质量问题。

### 第一章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R01-01 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-001 的 V1 职责边界。 |
| R01-02 | `REMAINS_BLOCKED` | 缺少生产线上规则的权威版本和范围。 |
| R01-03 | `REMAINS_BLOCKED` | 缺少正式“不合理场景—现状—期望”清单。 |
| R01-04 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-003；生产配置权限仍按 FB-013 阻塞。 |

### 第二章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R02-01 | `REMAINS_BLOCKED` | 指标口径、基线、观察期和目标未确认。 |
| R02-02 | `REMAINS_BLOCKED` | 经营目标冲突的 KPI 优先级未确认；收费规则优先级采用 FB-003。 |
| R02-03 | `OUT_OF_SCOPE` | 风控阈值和用户限制不进入 V1。 |
| R02-04 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-010 的公开解释和普通客服最小视图。 |

### 第三章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R03-01 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-002 的订单白名单。 |
| R03-02 | `OUT_OF_SCOPE` | 预约单保持 legacy，不迁移。 |
| R03-03 | `REMAINS_BLOCKED` | 强免责采用 FB-003，但原文开放式免责的逐项证据映射未确认。 |
| R03-04 | `REMAINS_BLOCKED` | 法律禁止收费优先级最高；真实地区法律清单和维护责任未确认。 |
| R03-05 | `CONFIRMED_FOR_WORKSHOP` | 非白名单订单只要求保持 legacy，不要求交付迁移能力。 |

### 第四章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R04-01 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-004 的 120 秒含边界窗口。 |
| R04-02 | `OUT_OF_SCOPE` | 司机方向、距离较远和 ETA 变化不在 V1。 |
| R04-03 | `OUT_OF_SCOPE` | 真实地图字段和接口不在 V1；异常结果采用 FB-009。 |
| R04-04 | `REMAINS_BLOCKED` | 声明不能替代证据；各理由证据清单未确认。 |
| R04-05 | `REMAINS_BLOCKED` | 验证到达采用 FB-005；“正常赶往”等其他收费资格仍未确认。 |
| R04-06 | `REMAINS_BLOCKED` | 可使用 FB-007 教学金额；真实金额和配置边界未确认。 |
| R04-07 | `REMAINS_BLOCKED` | 乘客金额精度采用 FB-007；司机补偿和跨端一致性未完整确认。 |

### 第五章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R05-01 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-005 的 5 分钟等待与联系证据。 |
| R05-02 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-005 的验证到达作为起算点。 |
| R05-03 | `CONFIRMED_FOR_WORKSHOP` | 至少一次平台内联系；明确拒乘可跳过剩余等待。 |
| R05-04 | `REMAINS_BLOCKED` | 不能停车、位置错误和主观兜底的责任与证据未确认。 |
| R05-05 | `CONFIRMED_FOR_WORKSHOP` | 爽约基准费高于普通取消基准费，但最终仍执行 FB-007 的封顶。 |

### 第六章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R06-01 | `REMAINS_BLOCKED` | 司机责任强免责已确认；完整原因到责任方映射未确认。 |
| R06-02 | `REMAINS_BLOCKED` | 区域、禁运物品和承载规则的权威政策未提供。 |
| R06-03 | `REMAINS_BLOCKED` | 声明不能替代证据；哪些原因可直接采信仍未确认。 |
| R06-04 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-006，分离 cancelInitiator 与 liableParty。 |
| R06-05 | `REMAINS_BLOCKED` | 驾驶状态下允许操作及安全验收标准未确认。 |

### 第七章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R07-01 | `CONFIRMED_FOR_WORKSHOP` | 上游已判定收费后，金额段采用 FB-007。 |
| R07-02 | `CONFIRMED_FOR_WORKSHOP` | V1 使用版本化固定基础费和显式调整/减免输入。 |
| R07-03 | `REMAINS_BLOCKED` | 预估价硬封顶已确认；估价时点和“高很多”独立规则未确认。 |
| R07-04 | `REMAINS_BLOCKED` | 规则顺序采用 FB-003/FB-007；用户分类和风控阈值未确认。 |
| R07-05 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-007 的权威计算顺序并复用 CappedFeeCalculator。 |
| R07-06 | `REMAINS_BLOCKED` | 应固化 ruleVersion；各外部因素来源和生效时点未确认。 |
| R07-07 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-008 的 first-write-wins 幂等边界。 |

### 第八章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R08-01 | `OUT_OF_SCOPE` | 真实支付、结算和服务费分配不在 V1。 |
| R08-02 | `OUT_OF_SCOPE` | 真实退款和司机追偿不在 V1。 |
| R08-03 | `OUT_OF_SCOPE` | 不定义“小额”阈值或真实不追回规则。 |
| R08-04 | `REMAINS_BLOCKED` | 司机补偿到账 SLA、时区和状态未确认。 |

### 第九章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R09-01 | `REMAINS_BLOCKED` | 调整输入受 FB-003/FB-007 约束；事件定义和倍率未确认。 |
| R09-02 | `OUT_OF_SCOPE` | 生产运营后台和审批不在 V1。 |
| R09-03 | `CONFIRMED_FOR_WORKSHOP` | 安全当次强免责，不采用先收费后退款。 |
| R09-04 | `REMAINS_BLOCKED` | 普通客服视图采用 FB-010；授权角色矩阵未确认。 |
| R09-05 | `REMAINS_BLOCKED` | 无障碍强免责已确认；标签依据、可见范围和纠错未确认。 |
| R09-06 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-009；取消成功、费用 0、不追扣。 |
| R09-07 | `CONFIRMED_FOR_WORKSHOP` | 降级 Decision 不追扣；真实后续账务不在 V1。 |

### 第十章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R10-01 | `REMAINS_BLOCKED` | 最终解释采用 FB-010；取消前金额展示语义未确认。 |
| R10-02 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-010 的公开字段和敏感信息边界。 |
| R10-03 | `OUT_OF_SCOPE` | 自动退款和真实人工退款流程不在 V1。 |
| R10-04 | `REMAINS_BLOCKED` | 仅普通客服视图已确认；乘客/司机跨端一致字段未确认。 |
| R10-05 | `OUT_OF_SCOPE` | 真实通知渠道和送达语义不在 V1。 |

### 第十一章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R11-01 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-010/FB-011 的客服字段、reason code 和 ruleVersion。 |
| R11-02 | `OUT_OF_SCOPE` | 真实客服退款、改责和审批权限不在 V1。 |
| R11-03 | `OUT_OF_SCOPE` | 生产运营配置后台不在 V1。 |
| R11-04 | `OUT_OF_SCOPE` | 生产配置审批、发布和回滚后台不在 V1。 |
| R11-05 | `OUT_OF_SCOPE` | 运营后台 UX 不作为 V1 验收。 |

### 第十二章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R12-01 | `OUT_OF_SCOPE` | 风控识别阈值和模型不在 V1。 |
| R12-02 | `OUT_OF_SCOPE` | 风险用户限制、解除和申诉不在 V1。 |
| R12-03 | `OUT_OF_SCOPE` | 真实风控系统移交不在 V1。 |
| R12-04 | `REMAINS_BLOCKED` | Decision 审计采用 FB-010；额外风控数据清单未确认。 |
| R12-05 | `OUT_OF_SCOPE` | 设备关联识别不在 V1。 |

### 第十三章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R13-01 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-010 的最小审计字段与敏感信息限制。 |
| R13-02 | `REMAINS_BLOCKED` | 正式安全规范、法律要求和保留周期未提供。 |
| R13-03 | `REMAINS_BLOCKED` | Decision 审计已确认；规则修改、退款和改责审计未完整确认。 |
| R13-04 | `REMAINS_BLOCKED` | 报表指标口径和重算规则未确认。 |
| R13-05 | `REMAINS_BLOCKED` | 普通客服最小视图已确认；完整角色和导出权限未确认。 |

### 第十四章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R14-01 | `REMAINS_BLOCKED` | 生产延迟目标和测量范围未确认。 |
| R14-02 | `REMAINS_BLOCKED` | 正常、高峰和突发容量基线未确认。 |
| R14-03 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-009 的唯一降级策略。 |
| R14-04 | `CONFIRMED_FOR_WORKSHOP` | 配置/证据异常下保证取消成功和零收费 Decision；真实外部效果不在 V1。 |
| R14-05 | `REMAINS_BLOCKED` | legacy 路由已确认；历史订单范围和展示未确认。 |

### 第十五章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R15-01 | `REMAINS_BLOCKED` | 灰度城市、选择标准及是否强制未确认。 |
| R15-02 | `REMAINS_BLOCKED` | 生效规则、对比字段和证据时点未确认；不得重复收费。 |
| R15-03 | `REMAINS_BLOCKED` | 异常指标、阈值和回滚决策人未确认。 |
| R15-04 | `REMAINS_BLOCKED` | 回滚对各在途状态的影响未确认。 |
| R15-05 | `REMAINS_BLOCKED` | 灰度比例、观察期、扩量和批准节点未确认。 |

### 第十六章

| Analysis ID | 处理状态 | 反馈 |
|---|---|---|
| R16-01 | `REMAINS_BLOCKED` | FB-012 只确认核心切片，不代表完整常见场景矩阵。 |
| R16-02 | `REMAINS_BLOCKED` | 局部收费/免收规则可测；完整场景—责任—收费清单未确认。 |
| R16-03 | `OUT_OF_SCOPE` | 真实司机补偿到账和结算验收不在 V1。 |
| R16-04 | `CONFIRMED_FOR_WORKSHOP` | 按 FB-010 验证金额、公开原因、ruleVersion 和安全摘要。 |
| R16-05 | `OUT_OF_SCOPE` | 城市运营后台不在 V1。 |
| R16-06 | `CONFIRMED_FOR_WORKSHOP` | 按 FB-008 验证重复、并发和乱序请求。 |
| R16-07 | `CONFIRMED_FOR_WORKSHOP` | 将范围收窄为配置/关键证据异常，并按 FB-009 验收。 |
| R16-08 | `REMAINS_BLOCKED` | 投诉和司机反馈的口径、目标与观察期未确认。 |
| R16-09 | `REMAINS_BLOCKED` | 正式安全、合规、审计规范和签署角色未确认。 |
| R16-10 | `REMAINS_BLOCKED` | 仅 legacy 路由和降级边界已确认；完整兼容基线未确认。 |
| R16-11 | `REMAINS_BLOCKED` | 未覆盖场景的最终决策角色和唯一兜底结果未确认。 |
| R16-12 | `CONFIRMED_FOR_WORKSHOP` | 采用 FB-012/FB-014；已知非 V1 项之外不增加扩展性验收。 |

## 学员提交前检查

- [ ] Decision Log 中每个 `APPROVED` 项都引用 Feedback ID 或其他明确来源。
- [ ] 所有由本文件产生的 Decision 都标记 `Workshop synthetic/non-production`。
- [ ] `REMAINS_BLOCKED` 没有被写成 Requirement、Design 假设或实现任务。
- [ ] `OUT_OF_SCOPE` 只出现在范围排除项。
- [ ] 没有把 120 秒、200 米/30 秒、5 分钟或教学金额描述为生产规则。
- [ ] 没有读取或引用 `workshop/facilitator/` 作为学员来源。

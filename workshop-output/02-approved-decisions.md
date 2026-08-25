# 取消订单与爽约费规则中心决策台账

> 本文仅整理附件中已有结论。`APPROVED` 表示已确认的 Workshop 教学/非生产决策，不代表生产政策或真实外部系统集成已经批准。`BLOCKED` 不得转化为实现假设，`OUT_OF_SCOPE` 表示不进入本次 Workshop V1。

## 1. 已确定（APPROVED）

### DEC-001 — Workshop V1 职责边界
- **Analysis ID：**R01-01
- **Feedback ID：**FB-001
- **处理结果：**V1 只演示取消判定、版本化费用输入选择、费用结果、公开解释、幂等和审计，地图、支付、司机结算、通知、客服、风控、配置和旧系统只定义端口并使用内存 Fake，不连接真实服务。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`
- **正确性检查：**确认可观察到上述六类演示能力；所有外部依赖均以端口和内存 Fake 表达；任何验收或交付说明均未声称生产系统已经接入。

### DEC-002 — V1 订单范围与 legacy 路由
- **Analysis ID：**R03-01、R03-05
- **Feedback ID：**FB-002
- **处理结果：**V1 仅处理实时 `EXPRESS`、`PREMIUM`、`BUSINESS` 订单，预约、出租车、顺风车和企业用车保持 legacy 行为。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`workshop-output/01-requirements-analysis.md`
- **正确性检查：**确认三种白名单实时订单进入 V1；白名单外订单不进入 V1 判定并保持 legacy 路由。

### DEC-003 — 规则优先级与强免责
- **Analysis ID：**R01-04、R02-02、R03-03、R03-04、R04-04、R07-04、R07-05、R09-03、R09-05
- **Feedback ID：**FB-003
- **处理结果：**Workshop 的规则优先级依次为法律禁止收费、安全免责、无障碍免责、平台或关键依赖异常、有证据的司机责任、已验证爽约、普通乘客取消、天气/活动/车型/城市/用户调整、非负和预估车费封顶；强免责金额为零但仍生成版本化、可解释、可审计的 Decision，自选理由不能单独作为强免责证据。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`workshop-output/01-requirements-analysis.md`
- **正确性检查：**使用同时命中多条规则的输入检查决策顺序；每种已确认强免责均产生零费用 Decision，且包含规则版本、公开解释和审计；仅有自选理由时不自动认定强免责。

### DEC-004 — 乘客免费取消窗口
- **Analysis ID：**R04-01
- **Feedback ID：**FB-004
- **处理结果：**Workshop 免费窗口从司机接单的服务端 UTC 时间起算，乘客在 120 秒内（含 120 秒）取消免费。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`workshop-output/01-requirements-analysis.md`
- **正确性检查：**使用可控 Clock 分别检查 119、120、121 秒；119 和 120 秒命中 `FREE_CANCELLATION_WINDOW` 且费用为零，121 秒不因该窗口自动免费。

### DEC-005 — Workshop 验证到达与爽约资格
- **Analysis ID：**R04-05、R05-01、R05-02、R05-03
- **Feedback ID：**FB-005
- **处理结果：**Workshop 中，地图证据显示司机距上车点不超过 200 米并持续至少 30 秒才算验证到达；普通爽约还要求验证到达后等待至少 5 分钟且至少有一次平台内联系尝试，平台内明确拒乘可跳过剩余等待但不能跳过验证到达。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`
- **正确性检查：**分别检查 200/201 米、持续 29/30 秒、仅司机点击到达、等待 4 分 59 秒/5 分钟、无/有平台内联系尝试，以及明确拒乘但未验证到达的情况；结果必须符合本条边界。

### DEC-006 — 取消发起方与责任方分离
- **Analysis ID：**R06-01、R06-03、R06-04
- **Feedback ID：**FB-006
- **处理结果：**`cancelInitiator` 记录服务端首次接受的取消请求，`liableParty` 根据已确认的证据独立判定，两者可以不同，且没有证据时不得仅凭任一方声明收费或免责。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`workshop-output/01-requirements-analysis.md`
- **正确性检查：**检查并发和先后取消输入中发起方始终为服务端首次接受者；证据可独立改变责任方而不改写发起方；仅有单方声明时不自动产生收费或免责。

### DEC-007 — Workshop 时间、金额与费用计算规则
- **Analysis ID：**R04-06、R04-07、R05-05、R07-01、R07-02、R07-03、R07-04、R07-05
- **Feedback ID：**FB-007
- **处理结果：**Workshop 使用服务端 UTC 和可注入 Clock，金额使用非负整数最小货币单位；版本化基础费为 `EXPRESS` 普通取消 500、爽约 800，`PREMIUM/BUSINESS` 普通取消 800、爽约 1200，并按基础费、basis-points 调整、货币舍入、用户减免、非负归零、预估完单价格封顶的顺序计算，且 `0 <= charge <= estimatedTripFare`。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`enterprise-knowledge-base/business/fee-calculation-policy.md`；`enterprise-knowledge-base/architecture/reuse-contracts.md`
- **正确性检查：**检查四组服务类型和收费类型的基础费；金额输入拒绝负数、浮点、`NaN` 和无限值；折扣超过调整后费用时结果为零，预估完单价格为零时结果为零，计算结果超过预估完单价格时被封顶；费用管线由 `CappedFeeCalculator` 负责且应用侧没有复制其计算步骤。

### DEC-008 — 幂等边界
- **Analysis ID：**R07-07、R16-06
- **Feedback ID：**FB-008
- **处理结果：**Workshop 使用 `(orderId, chargeType)` 的规范幂等键和 first-write-wins，重复、并发和乱序请求最多产生一个 Decision、一笔成功收费和一笔对应司机补偿，返回已有 Decision 时不新增第二条 Decision 审计事件。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/architecture/reuse-contracts.md`；`enterprise-knowledge-base/business/support-and-audit.md`
- **正确性检查：**对同一 `(orderId, chargeType)` 发出重复、并发和乱序请求，确认只有一个持久化 Decision、最多一个成功收费、最多一个对应补偿和一条 Decision 审计事件，并确认幂等键由 `buildDecisionIdempotencyKey` 构建。

### DEC-009 — 关键依赖异常降级
- **Analysis ID：**R04-03、R09-06、R09-07、R14-03、R14-04、R16-07
- **Feedback ID：**FB-009
- **处理结果：**规则配置或关键证据不可用时订单取消仍成功，乘客费用为零，公开原因为 `DEGRADED_NO_CHARGE`，结果必须审计且依赖恢复后不得追扣乘客。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`workshop-output/01-requirements-analysis.md`
- **正确性检查：**分别模拟规则配置不可用和关键证据不可用，确认取消成功、金额为零、reason code 为 `DEGRADED_NO_CHARGE`、存在降级审计，并确认恢复依赖后同一订单不产生追扣。

### DEC-010 — 公开解释、普通客服视图与 Decision 审计
- **Analysis ID：**R02-04、R09-04、R10-01、R10-02、R10-04、R11-01、R12-04、R13-01、R13-03、R13-05、R16-04
- **Feedback ID：**FB-010
- **处理结果：**用户和普通客服只通过稳定公开 reason code、金额、`ruleVersion` 和脱敏摘要理解结果，普通客服不得看到电话内容、精确坐标、完整安全叙述、风险分数或阈值、支付凭证；解释由 `DecisionExplanationBuilder` 构建，每个新 Decision 记录反馈中列明的最小审计字段且费用 trace 不含敏感证据。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/support-and-audit.md`；`enterprise-knowledge-base/architecture/reuse-contracts.md`
- **正确性检查：**确认普通客服输出包含允许字段且不含所有禁止字段；摘要由 `DecisionExplanationBuilder` 从公开 reason code、金额和规则版本生成；每个新 Decision 的审计包含 decisionId、规范幂等键、orderId、ruleVersion、请求和接受 UTC 时间、确认免责类别、无敏感证据的费用 trace、公开原因、最终金额及正常/降级标记。

### DEC-011 — 规则版本固化与确定性重放
- **Analysis ID：**R07-06、R11-01
- **Feedback ID：**FB-011
- **处理结果：**每个 Decision 固化判定时的 `ruleVersion`、公开 reason code、金额和不含敏感信息的计算 trace，相同输入快照、`ruleVersion` 和 Clock 必须得到确定性结果，历史解释不得用当前配置替换历史版本。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`enterprise-knowledge-base/business/support-and-audit.md`
- **正确性检查：**确认持久化 Decision 包含四项固化结果；同一输入快照、版本和 Clock 多次重放结果一致；修改当前规则后，历史解释仍使用原 Decision 的版本、原因和金额。

### DEC-012 — Workshop V1 验收声明边界
- **Analysis ID：**R16-01、R16-02、R16-04、R16-06、R16-07、R16-12
- **Feedback ID：**FB-012
- **处理结果：**V1 只验收已明确确认的订单范围、免费窗口、强免责、验证到达、爽约、费用不变量、幂等、降级、解释和审计，不得声称满足原始需求的全部生产目标、真实外部集成或全部边缘场景。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`
- **正确性检查：**确认验收清单只覆盖上述切片并引用相应 APPROVED 决策；交付声明明确标注 Workshop synthetic/non-production，且不含“完整满足生产需求”“全部场景”或“真实集成完成”等表述。

## 2. 仍需确认（BLOCKED）

### DEC-013 — 线上旧规则与不合理场景基线
- **Analysis ID：**R01-02、R01-03、R16-10
- **Feedback ID：**FB-013
- **处理结果：**线上旧规则的权威版本、适用范围、行为对照基线及“不合理场景—现状—期望”清单仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-014 — 业务目标与报表指标
- **Analysis ID：**R02-01、R02-02、R13-04、R15-03、R16-08
- **Feedback ID：**FB-013
- **处理结果：**投诉率、司机满意度、转化和报表指标的口径、基线、目标、观察期及经营目标冲突时的优先级仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-015 — 开放式免责与取消原因的证据清单
- **Analysis ID：**R03-03、R04-04、R05-04、R06-01、R06-02、R06-03
- **Feedback ID：**FB-003、FB-006、FB-013
- **处理结果：**除已确认强免责和声明不能替代证据外，各合理理由、提前结束等待情形及完整司机取消原因到责任方的映射和证据要求仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-016 — 真实地图与其他外部服务契约
- **Analysis ID：**R04-03、R04-05、R05-02、R14-04、R16-10
- **Feedback ID：**FB-005、FB-013
- **处理结果：**真实地图字段、精度、新鲜度及其他外部服务契约仍未确认，Workshop 的验证到达输入不得描述为真实地图契约。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-017 — 司机取消完整责任规则与驾驶安全标准
- **Analysis ID：**R06-01、R06-02、R06-03、R06-05
- **Feedback ID：**FB-006、FB-013
- **处理结果：**完整司机取消原因映射、可直接采信的原因、所需证据以及驾驶状态下允许操作和安全验收标准仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-018 — 生产金额、配置边界与外部调整参数
- **Analysis ID：**R04-06、R04-07、R07-03、R07-04、R07-06、R09-01、R09-02、R11-03、R11-04、R16-05
- **Feedback ID：**FB-007、FB-013
- **处理结果：**真实城市和车型金额、配置上下限、预估价格时点、用户分类、天气和活动定义及倍率、司机补偿精度、跨端金额一致规则和生产发布审批仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/fee-calculation-policy.md`

### DEC-019 — 客服退款、司机补偿与财务规则
- **Analysis ID：**R08-01、R08-02、R08-03、R08-04、R11-02、R16-03
- **Feedback ID：**FB-013、FB-014
- **处理结果：**真实客服退款权限、司机补偿到账规则、服务费和费用分配、退款后的司机补偿处理及追偿规则仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-020 — 隐私、RBAC、保留与完整审计制度
- **Analysis ID：**R09-04、R09-05、R12-04、R13-02、R13-03、R13-05、R16-09
- **Feedback ID：**FB-010、FB-013
- **处理结果：**完整授权角色矩阵、无障碍标签使用依据和纠错、正式隐私依据、安全规范、日志保留周期、导出权限以及规则修改、退款和改责审计仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/support-and-audit.md`

### DEC-021 — 取消前告知、跨端一致与真实通知语义
- **Analysis ID：**R10-01、R10-04、R10-05
- **Feedback ID：**FB-010、FB-013、FB-014
- **处理结果：**取消前金额展示语义、乘客端与司机端必须一致的字段，以及真实通知渠道和送达语义仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-022 — 生产风控治理
- **Analysis ID：**R02-03、R12-01、R12-02、R12-03、R12-04、R12-05
- **Feedback ID：**FB-013、FB-014
- **处理结果：**风险行为定义、阈值、处罚、解除、用户告知和申诉机制、额外风控数据清单及现有风控系统的生产契约仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-023 — 生产非功能目标
- **Analysis ID：**R14-01、R14-02、R14-03、R14-04
- **Feedback ID：**FB-009、FB-013
- **处理结果：**生产性能、容量、可用性、错误预算和完整异常状态要求仍未确认，Workshop 降级行为不能替代生产非功能目标。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-024 — 灰度、扩量与回滚
- **Analysis ID：**R15-01、R15-02、R15-03、R15-04、R15-05
- **Feedback ID：**FB-013
- **处理结果：**灰度城市、比例、观察期、新旧规则对比口径、扩量条件、回滚条件、决策人和在途订单影响仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-025 — 历史订单迁移与缺失数据展示
- **Analysis ID：**R10-01、R10-04、R14-05
- **Feedback ID：**FB-011、FB-013
- **处理结果：**历史订单迁移范围、缺失数据展示及 legacy 历史解释策略仍未确认，确定性重放仅适用于已有完整快照和历史规则版本的 Decision。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

### DEC-026 — 完整生产验收与边缘场景兜底
- **Analysis ID：**R16-01、R16-02、R16-08、R16-09、R16-10、R16-11
- **Feedback ID：**FB-012、FB-013
- **处理结果：**完整场景—责任—收费矩阵、生产指标、安全合规签署、现有流程兼容基线及未覆盖场景的最终决策规则仍未确认。
- **依据文件：**`cancellation-no-show-fee-raw-requirements.md`；`workshop-output/01-requirements-analysis.md`；`workshop/inputs/simulated-requester-feedback.md`

## 3. 本次不做（OUT_OF_SCOPE）

### DEC-027 — 非白名单业务迁移
- **Analysis ID：**R03-02、R03-05
- **Feedback ID：**FB-002、FB-014
- **处理结果：**预约、出租车、顺风车和企业用车的规则迁移不进入 Workshop V1，这些订单保持 legacy 行为。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`enterprise-knowledge-base/business/cancellation-policy-v1.md`；`workshop-output/01-requirements-analysis.md`

### DEC-028 — 路线推断与真实外部系统集成
- **Analysis ID：**R04-02、R04-03、R08-01、R08-02、R10-05、R11-01、R12-03、R14-04、R16-03、R16-10
- **Feedback ID：**FB-004、FB-005、FB-014
- **处理结果：**司机行驶方向、路线质量、距离较远或 ETA 变长判定，以及真实地图、支付、结算、通知、客服和风控系统集成都不进入 Workshop V1。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`workshop-output/01-requirements-analysis.md`

### DEC-029 — 生产运营、客服退款与司机追偿流程
- **Analysis ID：**R08-02、R08-03、R09-02、R10-03、R11-02、R11-03、R11-04、R11-05、R16-05
- **Feedback ID：**FB-014
- **处理结果：**生产运营后台、真实客服退款、司机追偿以及相关审批和后台体验不进入 Workshop V1。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`workshop-output/01-requirements-analysis.md`

### DEC-030 — 风控识别、限制与机器学习模型
- **Analysis ID：**R02-03、R12-01、R12-02、R12-03、R12-05
- **Feedback ID：**FB-013、FB-014
- **处理结果：**风控识别、风险用户限制、设备关联、真实风控移交和机器学习风控模型不进入 Workshop V1。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`workshop-output/01-requirements-analysis.md`

### DEC-031 — 多币种、跨境法规及生产交付形态
- **Analysis ID：**R03-04、R04-07、R16-09、R16-12
- **Feedback ID：**FB-014
- **处理结果：**多币种、跨境法规、生产 UI 和生产部署不进入 Workshop V1。
- **依据文件：**`workshop/inputs/simulated-requester-feedback.md`；`workshop-output/01-requirements-analysis.md`

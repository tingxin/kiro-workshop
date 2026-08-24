# 需求分析答案与模拟业务决策

## 1. 使用限制（讲师私有）

本文件是讲师评分与决策释放参考，**不得作为学员材料、不得投屏、不得附加给学员 Kiro、不得从 README 或学员手册进入默认操作路径**。

课堂必须先让学员独立完成需求分析。讲师只能根据讨论进度逐条扮演业务角色确认决定；学员再使用实际会议记录生成自己的 Decision Log 和 Feature Spec。禁止整体复制本文件的第 3、5、6、7 节作为学员产物。

只有 Kiro 或 Spec 工作流完全不可用时，讲师才可在独立演示副本中使用本文件做只读应急说明，并明确告知学员这不是他们完成的产物。

以下数字和规则是为了让 Workshop 可实现、可测试而设置的模拟基线，不代表任何真实网约车企业的生产规则。真实项目必须由产品、法务、合规、安全、财务和运营共同确认。

原始需求：[取消订单与爽约费规则中心需求](../../cancellation-no-show-fee-raw-requirements.md)

---

# 2. Analyze Requirements 参考答案

## 2.1 阻塞 V1 的歧义

| ID | 原文表达 | 问题 | 需要确认 |
|---|---|---|---|
| A-01 | “所有实时叫车”“预约单也可以一起支持” | V1 范围不明确 | 第一版订单类型白名单是什么？ |
| A-02 | “前几分钟” | 免费窗口不可实现 | 起点、终点和具体秒数是什么？ |
| A-03 | “比较远”“很接近” | 距离阈值和算法未知 | 使用直线距离还是路线距离？阈值多少？ |
| A-04 | “预计到达时间明显变长” | 对比基线和变化阈值未知 | 与接单时 ETA 还是最近一次 ETA 比较？ |
| A-05 | “合理等待时间” | 爽约无法判断 | 从什么事件开始计时，持续多久？ |
| A-06 | “地图判断到达附近” | 司机点击、地图证据和 GPS 精度关系未知 | 如何验证到达，证据有效期多久？ |
| A-07 | “取消费不要太高” | 金额不可配置和验收 | 不同城市、车型的上下限是什么？ |
| A-08 | “偶尔”“经常”“恶意” | 用户减免和风控规则不可执行 | 观察窗口、次数、证据和申诉机制是什么？ |
| A-09 | “尽快到账” | 司机补偿 SLA 不明确 | 到账和对账的具体时限是什么？ |
| A-10 | “金额不大” | 自动退款权限不明确 | 自动退款和人工审批阈值是多少？ |

## 2.2 逻辑冲突和优先级缺失

| ID | 冲突 | 风险 | 建议决策方向 |
|---|---|---|---|
| C-01 | 同时取消按先收到请求，但又按实际责任 | 取消者和责任方被混为同一字段 | 分离 `cancelInitiator` 与 `liableParty` |
| C-02 | 安全原因通常免费，但高频时可能先收费 | 安全免责可能被风控覆盖 | 安全当次强制免费，风控另行异步处理 |
| C-03 | 恶劣天气可以加价，又要照顾乘客 | 同一条件产生相反效果 | 明确规则流水线和优先级 |
| C-04 | 爽约费应高于取消费，但费用又需封顶 | 封顶后无法严格更高 | 只要求封顶前基准更高 |
| C-05 | 系统异常可用默认规则、旧规则或异步处理 | 三种方式产生不同账务结果 | 选择唯一降级策略 |
| C-06 | 要解释清楚，但不能暴露过多规则 | 客服与用户展示可能过多或不足 | 区分公开 reason code 和内部 trace |
| C-07 | 运营动态调规则，但历史判定要可解释 | 当前配置无法重放历史结果 | 固化 ruleVersion 和 evidence snapshot |

## 2.3 关键缺失

- 统一术语、订单取消状态和责任判定状态机
- 规则优先级表
- 服务器时间、时区和 Clock 约定
- 金额类型、取整规则和费用流水线
- 地图证据的数据新鲜度、精度与异常处理
- 配置 Schema、上下限、双人审批、版本、生效和回滚
- 幂等键、唯一约束、重试和并发语义
- 扣款、司机补偿、退款和追偿的账务边界
- 客服与运营 RBAC、字段脱敏和访问审计
- 外部地图、支付、通知接口的超时与错误语义
- 可量化延迟、吞吐、可用性和错误预算
- 灰度比例、观察窗口、差异阈值和自动回滚标准
- 历史订单的规则版本和展示策略

## 2.4 不可测试的标准

下列表达必须转换为指标或可判定行为：

- “常见场景都正确”
- “司机补偿正常到账”
- “用户能够理解”
- “投诉率明显下降”
- “司机满意度不能降低”
- “不能明显增加响应时间”
- “高峰流量都能支撑”
- “安全合规满足公司要求”
- “不影响现有流程”

Workshop 可使用的示例指标：判定接口 P95 不超过 100ms、P99 不超过 250ms；但这些数值只是课堂假设。

---

# 3. 模拟产品确认记录

## 3.1 已确认进入 V1

| Decision ID | 决策 | 验收方式 |
|---|---|---|
| DEC-001 | V1 只支持普通快车、优享、商务车实时单 | 非白名单订单路由 legacy adapter，不改变行为 |
| DEC-002 | 时间使用服务端 UTC；金额使用整数分 | 类型和测试禁止浮点金额与本地时区隐式转换 |
| DEC-003 | 接单后 120 秒内乘客取消免费 | 119、120、121 秒边界测试 |
| DEC-004 | 距上车点不超过 200 米并持续 30 秒，视为验证到达 | 199/200/201 米和 29/30/31 秒测试 |
| DEC-005 | 普通爽约需要验证到达后等待 5 分钟，并至少一次平台内联系尝试 | 缺任一条件不得收爽约费 |
| DEC-006 | 乘客在平台内明确拒乘，可跳过剩余等待，但仍需验证到达 | 状态组合测试 |
| DEC-007 | 法律、安全、无障碍、平台或关键依赖异常属于强免责 | 任一强免责为真，乘客费用恒为 0 |
| DEC-008 | 用户自选原因只是声明，必须有系统证据或人工复核 | 无证据不能直接产生收费责任 |
| DEC-009 | `cancelInitiator` 记录首次接受的取消请求；`liableParty` 独立判定 | 同时取消场景保留两个字段 |
| DEC-010 | 默认普通取消 500 分、爽约 800 分；高端车型 800/1200 分 | 配置测试；数值仅用于 Demo |
| DEC-011 | 费用顺序为基准 → 天气/活动调整 → 用户减免 → 非负与预估车费封顶 → 货币取整 | Property Test 验证全输入域上界 |
| DEC-012 | 同一 `(orderId, chargeType)` 最多成功收费一次 | 重试和并发测试 |
| DEC-013 | 规则中心或关键证据不可用时，订单取消成功、乘客不收费、不恢复后追扣 | 依赖故障测试和审计事件 |
| DEC-014 | 必要司机补偿由平台承担；小额退款后不追回司机款 | 账务事件和审计测试 |
| DEC-015 | 每次 Decision 固化 ruleVersion、evidence snapshot、reason code 和计算 trace | 重放与客服查询测试 |
| DEC-016 | 普通客服只看脱敏摘要；精确位置、电话和安全详情仅授权角色可见 | RBAC 和序列化测试 |

## 3.2 V1 待确认，不允许实现时猜测

- 城市和车型的真实金额配置
- 法律要求和数据保留周期
- 真实客服退款权限
- 司机补偿到账 SLA
- 风控恶意行为阈值
- 生产性能与容量目标
- 灰度城市、比例和正式回滚指标

## 3.3 明确不在 V1

- 预约单、顺风车、出租车和企业用车迁移
- 真实地图、支付、通知、风控和结算集成
- 机器学习风控模型
- 生产运营后台
- 真实退款和司机追偿
- 多币种和跨境法规

---

# 4. 规则优先级

从高到低：

1. 法律禁止收费
2. 安全免责
3. 无障碍服务免责
4. 平台或关键依赖异常免责
5. 有证据的司机责任免责
6. 已验证的乘客爽约
7. 普通乘客取消
8. 天气、活动、车型和城市调整
9. 用户减免
10. 非负与预估完单价格封顶
11. 货币取整

高优先级免责一旦命中，不再进入收费流水线，但仍生成审计 Decision。

---

# 5. EARS Requirements 参考形态

以下是预期结构，不要求 Kiro 逐字生成。

## REQ-SCOPE-001

**Where** 订单类型为普通快车、优享或商务车实时单，**the system shall** 使用 V1 取消规则中心进行判定；其他订单类型应委托 legacy adapter，且行为保持不变。

## REQ-FREE-001

**When** 乘客在司机接单后的 120 秒内取消，**the system shall** 将乘客费用判定为 0。

边界：120 秒包含在免费窗口内，121 秒不自动免费。

## REQ-ARRIVAL-001

**When** 地图证据显示司机在距上车点 200 米内连续至少 30 秒，且证据满足新鲜度和精度要求，**the system shall** 将司机标记为已验证到达。

## REQ-NOSHOW-001

**When** 司机已验证到达、等待至少 5 分钟且有至少一次平台内联系尝试，**the system shall** 允许进行乘客爽约责任判定。

## REQ-EXEMPT-001

**If** 法律、安全、无障碍、平台异常或关键依赖异常任一免责条件成立，**the system shall** 将乘客费用判定为 0，不得被车型、天气、活动、用户风险或爽约规则覆盖。

## REQ-FEE-001

**For all** 有效收费判定，**the system shall** 保证最终乘客费用满足 `0 <= charge <= estimatedTripFare`。

## REQ-IDEMPOTENCY-001

**When** 相同 `(orderId, chargeType)` 的收费请求被重复、并发或乱序处理，**the system shall** 最多产生一笔成功扣款和一笔对应司机补偿。

## REQ-DEGRADE-001

**If** 规则中心或关键证据依赖不可用，**the system shall** 允许订单取消成功，将乘客费用设为 0，并记录 `DEGRADED_NO_CHARGE`；恢复后不得追扣乘客。

## REQ-AUDIT-001

**When** 系统完成取消判定，**the system shall** 记录 decisionId、ruleVersion、evidence snapshot、reason code、费用明细和最终结果。

## REQ-PRIVACY-001

**While** 普通客服查询判定结果，**the system shall** 隐藏原始电话、精确坐标和安全事件详情，同时记录访问审计。

---

# 6. 领域模型参考

```text
CancellationRequest
  orderId
  requestedAt
  initiator
  declaredReason

EvidenceSnapshot
  capturedAt
  driverDistanceMeters
  arrivalDurationSeconds
  mapSampleAgeSeconds
  mapAccuracyMeters
  contactAttempts
  explicitPassengerRefusal
  exemptionFlags

RuleContext
  ruleVersion
  city
  serviceType
  acceptedAt
  estimatedTripFareMinor
  baseFeeMinor
  weatherMultiplier
  discountMinor

CancellationDecision
  decisionId
  cancelInitiator
  liableParty
  decisionType
  passengerChargeMinor
  driverCompensationMinor
  publicReasonCode
  internalTrace
  ruleVersion
```

需要分离：Decision、Charge、Compensation、Refund 和 Audit Event。不要用一个 `status` 字段承载全部业务阶段。

---

# 7. Property-based Testing 答案

| Property ID | 不变量 | 典型反例 |
|---|---|---|
| PROP-FEE-001 | `0 <= charge <= estimatedFare` | 800、1000、天气系数 2 得到 1600 |
| PROP-EXEMPT-001 | 任一强免责成立时 `charge == 0` | 安全免责被天气加价覆盖 |
| PROP-NOSHOW-001 | 未到达、等待不足或无联系时不能收费爽约 | 只由司机点击到达就收费 |
| PROP-IDEM-001 | 同幂等键重复任意次数最多一笔扣款 | check-then-act 并发插入两次 |
| PROP-REPLAY-001 | 相同 snapshot、ruleVersion、Clock 结果完全一致 | 历史重放读取当前配置 |
| PROP-DEGRADE-001 | 任一关键依赖异常都不阻止取消且不收乘客费 | 地图超时导致取消失败 |
| PROP-CONFIG-001 | 非法负金额、倒置分档、过大系数不能发布 | 负基础费被接受 |
| PROP-PRIVACY-001 | 普通客服输出不包含原始电话、精确坐标和安全详情 | 序列化整个 EvidenceSnapshot |

## 主 Bug 最小反例

```text
baseFeeMinor = 800
estimatedTripFareMinor = 1000
weatherMultiplier = 2
expected = 1000
buggyActual = 1600
```

正确流水线：

```text
adjusted = baseFee * weatherMultiplier
reduced = max(0, adjusted - discount)
charge = roundCurrency(min(reduced, estimatedFare))
```

强免责在进入该流水线之前直接返回 0。

---

# 8. 设计评审答案

设计应包含：

- 纯领域 `DecisionEngine`
- 纯函数 `FeeCalculator`
- 可注入 `Clock`
- `RuleRepository` 和版本化配置
- `MapEvidencePort`
- `ChargePort` 与幂等键
- `CompensationPort`
- `AuditPort`
- fake adapters 和合成 fixtures
- Property Tests 与边界单测

阻塞设计缺陷：

- 使用浮点金额
- 直接读取系统当前时间
- 领域函数内部调用真实地图或支付
- 未固化 ruleVersion
- 先扣款再写幂等记录且无唯一约束
- 安全免责只是普通可配置规则
- 日志输出整个请求或 Evidence Snapshot

---

# 9. Analyze Requirements 演示评分表

Kiro 输出满足以下 8 项，可认为演示成功：

- [ ] 至少识别范围不明确
- [ ] 至少识别三个阈值不明确
- [ ] 识别安全免责与风控冲突
- [ ] 识别天气加价与用户照顾冲突
- [ ] 识别同时取消的责任冲突
- [ ] 识别降级方案互不等价
- [ ] 识别幂等、审计版本或 RBAC 缺失
- [ ] 识别不可量化验收标准

不要求问题数量越多越好。优先级、证据和可决策问题比罗列几十条泛泛建议更重要。

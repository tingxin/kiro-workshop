# 企业治理、审计与会话导出

## 1. 教学目标

本模块帮助听众区分三类经常被混在一起的审计，并理解 AI 开发治理不能替代业务系统的账务和合规控制。

---

# 2. 三层审计模型

## 2.1 开发过程治理

回答“谁让 Agent 做了什么，Agent 使用了什么能力，代码如何变化”。

可能包含：

- 用户 Prompt 和附加上下文
- Agent、模型和会话标识
- 工具调用及 allow/ask/deny 结果
- 文件修改和 Git Diff
- Checkpoint、Revert 和人工拒绝
- Spec、Steering、Hook 和 Agent 配置变更
- 测试命令与结果

不能证明：某一笔订单收费正确、资金实际到账或生产数据未被其他系统访问。

## 2.2 规则配置治理

回答“哪一版收费规则由谁创建、审批、灰度、生效和回滚”。

最少字段：

```text
configVersion
createdBy
approvedBy
createdAt
effectiveFrom
effectiveTo
scope
changeReason
approvalTicket
gradualRollout
rollbackOf
```

关键控制：Schema 校验、上下限、四眼审批、版本不可变、灰度比较、一键回滚。

## 2.3 订单与账务审计

回答“为什么这个订单收费、补偿或退款，以及资金动作是否幂等”。

最少字段：

```text
decisionId
orderId
ruleVersion
evidenceSnapshotId
cancelInitiator
liableParty
publicReasonCode
internalTraceId
passengerChargeMinor
driverCompensationMinor
chargeIdempotencyKey
refundId
operator
occurredAt
```

不能只依赖开发会话或当前配置。必须固化当时的输入证据和规则版本。

## 2.4 关联方式

可以使用受控关联 ID 连接三层：

```text
开发变更/发布版本
        ↓
configVersion / ruleVersion
        ↓
decisionId / orderId
        ↓
charge / compensation / refund
```

关联不意味着把完整 Prompt、源码或客户数据复制到同一个日志系统。

---

# 3. 企业治理讲解清单

根据企业账号和套餐实际能力，介绍：

- 可用模型控制
- MCP 开关或允许列表
- Web 工具控制
- Cloud Sessions 控制
- Managed Permission Policies
- API Key 和凭证治理
- 使用量与用户活动统计
- Prompt Logging 和日志访问权限
- 日志保留、员工告知和隐私政策

## 必须说明

1. 客户端策略可能被拥有本机管理员权限的用户绕过。
2. 企业治理策略不能代替终端管理、仓库权限、网络隔离和最小权限凭证。
3. Prompt Logging 可能包含源码和业务信息，启用前需要隐私与员工告知流程。
4. 不要在 Workshop 中展示真实员工 Prompt 或企业策略。

---

# 4. 现场演示步骤

## 4.1 开发过程证据

1. 打开本次 Feature Spec 和 Bugfix Spec。
2. 展示 Requirements、Design、Tasks 的变更。
3. 展示 Permissions 的允许、询问和拒绝记录。
4. 展示 Git Diff 和测试证据。
5. 展示 Checkpoint/Revert，但说明外部副作用不会自动回滚。

## 4.2 业务审计对象

打开一条合成 Decision：

```json
{
  "decisionId": "dec_demo_001",
  "orderId": "ord_synthetic_001",
  "ruleVersion": "demo-v1.3",
  "cancelInitiator": "PASSENGER",
  "liableParty": "PASSENGER",
  "publicReasonCode": "DRIVER_ARRIVED_PASSENGER_CANCELLED",
  "passengerChargeMinor": 1000,
  "driverCompensationMinor": 800,
  "evidenceSnapshotId": "ev_demo_001"
}
```

说明客服不应默认看到原始电话、精确坐标和安全事件详情。

## 4.3 只读安全终审

切换 `policy-security-reviewer`，执行 Prompt P27。观察它是否引用 Spec、Diff 和测试，而不是泛泛说“看起来安全”。

---

# 5. Session Export 操作

## 5.1 导出前

1. 停止继续修改代码。
2. 确认测试结果和最终 Diff。
3. 执行 Prompt P28 生成脱敏检查表。
4. 人工检查：
   - Token、Cookie、密钥和环境变量
   - 真实姓名、手机号、订单号和精确位置
   - 企业内部 URL、绝对路径和未公开策略
   - Terminal 历史与外部工具输出
   - 源码分享范围与许可证
   - Custom Agent 和 Permission 策略敏感信息
5. 若有敏感内容，创建新的脱敏总结会话再导出，而不是假设压缩包会自动脱敏。

## 5.2 导出

1. 使用当前 Kiro 版本的 Session Export 入口。
2. 文件名建议：`kiro-workshop-cancellation-demo-sanitized-YYYYMMDD.zip`。
3. 保存到 `exports/`；该目录应在 `.kiroignore`，并根据团队策略决定是否加入 Git ignore。
4. 打开压缩包，只展示预期的 metadata、messages 和 Agent/Sub-agent 执行记录。

## 5.3 导出后

- 按最小受众范围分享
- 设置保留期限
- 不上传公共代码托管平台
- 不把导出包当作可恢复会话备份
- 若需培训复用，优先生成不含完整源码和内部路径的讲义版本

---

# 6. 治理问答

## “用了 Supervised 就安全吗？”

不是。Supervised 让人逐轮审查文件改动，但不等同于文件系统、网络或凭证隔离。应组合 Permissions、最小权限凭证、环境隔离和审计。

## “`.kiroignore` 能防止数据泄露吗？”

它帮助控制 Kiro 上下文和索引范围，但不是 OS ACL 或 DLP。真实敏感数据不应进入演示仓库。

## “Property Test 通过是否证明收费公平？”

不能。它只能证明在生成输入域内，代码满足定义的不变量。阈值是否公平、合法和符合业务目标仍需人类负责。

## “Session Export 能作为合规证据吗？”

它可以辅助复盘开发过程，但完整性、访问控制、保留和防篡改能力需结合企业审计系统评估，不能替代订单账务记录。

## “Custom Agent 能自己审批自己的修改吗？”

不应。开发和评审职责需要分离，安全评审 Agent 应只读且不能修改权限或批准自己的建议。

---

# 7. 演示验收

- [ ] 清楚区分三层审计
- [ ] 说明治理能力和本机安全边界
- [ ] 使用合成数据展示业务审计
- [ ] Custom Agent 以只读方式评审
- [ ] 导出前执行脱敏检查
- [ ] 导出包不含真实数据或凭证
- [ ] 不把 Export、Checkpoint 或 Prompt Log 夸大为完整合规证明

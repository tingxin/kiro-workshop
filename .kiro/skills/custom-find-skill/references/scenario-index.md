# Narrow scenario index

## Supported scenario

| Business language or intent | Scenario ID | Approved knowledge | Required assets |
|---|---|---|---|
| 取消费金额计算、运营或天气系数、用户减免、金额非负、预估车费封顶、整数分、避免重复实现费用算法 | `CANCELLATION_FEE_CALCULATION` | `enterprise-knowledge-base/business/fee-calculation-policy.md` | `MoneyMinor`, `moneyMinor`, `CappedFeeCalculator`, fee-integration template |

## Workshop live request

> 为已经判定需要收费的取消订单实现费用金额计算：读取基础费，应用运营调整系数和用户减免，结果不能为负且不能超过预估完单价格。不要重新实现公司已有的金额算法。

Expected route: exactly one scenario, `CANCELLATION_FEE_CALCULATION`.

## Explicit non-matches

The following belong to other Workshop stages and must not be routed by this Skill:

- 判断是否收费、责任方、强免责和免费取消窗口；
- 爽约到达/等待/联系证据；
- 重复请求、扣款幂等和司机补偿；
- 客服解释、隐私、审计和降级；
- 完整取消流程或规则中心架构。

# Cancellation Fee Mini — Requirements

## Scope

本 Spec 只处理上游已经判定应收费之后的金额计算适配器。完整取消责任判定、免责、爽约、支付、幂等、补偿、客服、风控和审计均不在本次 90 分钟范围。

## REQ-FEE-001：委托公共费用组件

<!-- TODO-R1: 使用一条可验收的 EARS Requirement，描述适配器何时调用公共 CappedFeeCalculator，以及必须返回什么。 -->

### Acceptance examples

- 固定输入：基础费 500、调整 20_000 基点、减免 0、预估完单价格 900。
- 预期：状态为 `CALCULATED`，最终费用为 900，并返回非敏感计算 trace。
- 边界：业务代码不得复制调整、减免、非负、封顶或舍入算法。

## Traceability

- 原始来源：`cancellation-no-show-fee-raw-requirements.md` 第七节。
- 课堂决定：`workshop-output/90-minute-core-worksheet.md` 的 TODO-D1 至 TODO-D3。
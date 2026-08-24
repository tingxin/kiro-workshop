# Cancellation Fee Mini — Design

## Existing assets

- Public package: `@company/cancellation-policy-kit`
- Approved API: `CappedFeeCalculator`
- Target: `packages/cancellation-demo/src/calculate-cancellation-fee.ts`
- Verification: `npm run test:fee` and `npm run demo`

## Constraints

- 只能从包根导入公共 API。
- 不创建本地 Money 类型或 FeeCalculator。
- 不修改公共包、企业知识或团队模板。
- 本次不设计 ports、数据库或外部系统。

## Data flow

<!-- TODO-DESIGN: 用 3–5 行描述 input 如何交给 CappedFeeCalculator，以及 adapter 如何映射为 CALCULATED + charge + trace。 -->

## Failure handling

无效金额和调整参数沿用公共组件的校验行为；适配器不吞掉异常，也不增加新的业务规则。
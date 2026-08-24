---
inclusion: fileMatch
fileMatchPattern: 'packages/cancellation-demo/src/**'
---

# Cancellation fee Workshop rules

- 本次只修改 `packages/cancellation-demo/src/calculate-cancellation-fee.ts`。
- 必须从 `@company/cancellation-policy-kit` 包根导入公共 API，禁止深层 import。
- 不修改公共包、企业知识、团队模板、依赖或权限配置。
- 不访问网络，不连接真实支付、订单或生产服务。
- 修改后运行 `npm run test:fee`、`npm run check` 和 `npm run demo`。

<!-- TODO-STEERING: 学员补充一条稳定团队规则，明确禁止在 Demo 中重写 Money、调整、减免、非负、封顶或舍入流水线。 -->
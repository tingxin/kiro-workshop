# Kiro 企业研发实战 Workshop

本仓库以“取消订单与爽约费规则中心”为案例，演示 Kiro 从需求分析、Spec 设计、企业资产复用，到开发、测试、缺陷修复和研发治理的完整流程。

## 客户材料

1. [Workshop 总览](workshop/00-workshop-overview.md)
2. [课件脚本](workshop/01-slide-deck.md)
3. [学员手册](workshop/02-participant-handout.md)
4. [原始业务需求](cancellation-no-show-fee-raw-requirements.md)

## 讲师入口

讲师从 [讲师资料索引](workshop/facilitator/00-facilitator-index.md) 开始。正式演示只按 [现场演示流程](workshop/facilitator/02-facilitator-runbook.md) 操作。

## Demo 工程

```bash
npm install --ignore-scripts
npm run check
npm run demo
```

- `npm run check`：编译全部 workspace，并验证公共费用组件的不变量。
- `npm run demo`：运行 `custom-find-skill` 环节使用的费用集成示例。

## 关键资产

- 自定义 Skill：`.kiro/skills/custom-find-skill/`
- 企业业务知识：`enterprise-knowledge-base/`
- 团队公共包：`packages/company-policy-kit/`
- 费用集成模板：`team-templates/cancellation-fee/`
- 现场目标代码：`packages/cancellation-demo/src/calculate-cancellation-fee.ts`

所有业务参数和数据均为教学模拟。本仓库不连接生产环境，也不执行真实收费、退款或部署。

# Kiro 企业研发实战 Workshop

本仓库以“取消订单与爽约费规则中心”为案例，演示 Kiro 从需求分析、Spec 设计、企业资产复用，到开发、测试、缺陷修复和研发治理的完整流程。

## 客户材料

1. [Workshop 总览](workshop/00-workshop-overview.md)
2. [课件脚本](workshop/01-slide-deck.md)
3. [学员手册](workshop/02-participant-handout.md)
4. [原始业务需求](cancellation-no-show-fee-raw-requirements.md)

## 讲师入口

学员从 [动手实验手册](workshop/03-hands-on-lab-guide.md) 开始；[学员手册](workshop/02-participant-handout.md) 用于概念速查。讲师从 [讲师资料索引](workshop/facilitator/00-facilitator-index.md) 开始。

> 默认工作区是故意未完成的 Starter。Decision Log、Feature Spec、业务测试和实现必须由学员在 Lab 中使用 Kiro 创建。不要将 `workshop/facilitator/04-answer-key-and-business-decisions.md` 添加到学员 Agent 上下文。

## Starter 工程

```bash
npm ci --ignore-scripts
npm run check:starter
npm run demo
```

- `npm run test:kit`：只验证预置的企业公共费用组件，不验证学员业务实现。
- `npm run check`：编译 workspace 并运行公共资产检查。
- `npm run check:starter`：额外确认目标仍为 `NOT_IMPLEMENTED`，且学员 Decision Log 与 Feature Spec 尚不存在。
- `npm run demo`：初始状态必须输出 `STARTER`；Lab 7 完成后才应输出 `IMPLEMENTED` 和 900。

## 关键资产

- 自定义 Skill：`.kiro/skills/custom-find-skill/`
- 企业业务知识：`enterprise-knowledge-base/`
- 团队公共包：`packages/company-policy-kit/`
- 费用集成模板：`team-templates/cancellation-fee/`
- 现场目标代码：`packages/cancellation-demo/src/calculate-cancellation-fee.ts`

所有业务参数和数据均为教学模拟。本仓库不连接生产环境，也不执行真实收费、退款或部署。

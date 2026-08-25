# Kiro 取消订单与爽约费规则中心 Workshop

本仓库演示使用 Kiro 分析一份粗糙业务需求、整理规则、阅读固定的 Requirements/Design、生成可追踪 Tasks，并完成离线实现、测试和验收。为控制课堂时间，Requirements 和 Design 已作为固定材料提供，学员无需现场生成。

## 操作入口
1. 按 [操作手册](workshop/03-hands-on-lab-guide.md) 从前置条件和第 1 步顺序执行。
2. 原始输入是 [取消订单与爽约费需求](cancellation-no-show-fee-raw-requirements.md)。
3. 独立完成第 2 步后，读取 [Workshop 模拟需求方确认反馈](workshop/inputs/simulated-requester-feedback.md)，并在第 3 步整理“已确定、仍需确认、本次不做”的规则清单。
4. 需要练习企业知识库与 Skill 构建时执行可选的 [企业 Skill 实验](workshop/04-custom-skill-enterprise-knowledge-lab.md)。
5. 不要把 `workshop/facilitator/` 加入学员上下文。

## Starter 中已经提供

- `.kiro/specs/cancellation-no-show-fee-system/requirements.md`：固定需求文档；
- `.kiro/specs/cancellation-no-show-fee-system/design.md`：固定技术设计；
- `.kiro/skills/custom-find-skill/`：费用计算复用 Skill；
- `packages/company-policy-kit/`：可复用公共组件；
- `packages/cancellation-demo/`：待学员实现的 Starter 工程。

`tasks.md` 不预置，由学员根据固定 Requirements/Design 生成。`workshop-output/`、Steering、Hook、系统测试和实现代码也由学员在操作过程中创建。

## 验证 Starter

```bash
npm run check:starter
npm run demo
```

`check:starter` 会确认固定 Requirements/Design 存在，并确认 Tasks、执行历史和其他学员产物尚未生成。`test:kit` 只验证公司公共组件，不代表系统验收。

所有业务数据、规则和外部能力均为教学模拟。地图、支付、结算、通知、客服、风控、配置和旧系统只通过 ports 与内存 Fake；没有真实收费、退款、网络业务调用或部署。验收报告中的 BLOCKED 项不得描述为生产完成。
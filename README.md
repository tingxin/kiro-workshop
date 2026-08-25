# Kiro 取消订单与爽约费规则中心 Workshop

本仓库演示使用 Kiro 将十六章粗糙业务需求转换为需求分析、批准/模拟决定、清晰需求、Feature Spec、可追踪 Tasks、离线参考系统、系统测试和验收报告。

## 操作入口
1. 按 [操作手册](workshop/03-hands-on-lab-guide.md) 从前置条件和第 1 步顺序执行。
2. 原始输入是 [取消订单与爽约费需求](cancellation-no-show-fee-raw-requirements.md)。
3. 需要练习企业知识库与 Skill 构建时执行可选的 [企业 Skill 实验](workshop/04-custom-skill-enterprise-knowledge-lab.md)。
4. 不要把 `workshop/facilitator/` 加入学员上下文。

当前 workspace 已包含一次完成的学员试跑：
- `workshop-output/`：分析、Decision、需求基线、追踪、验收和试跑记录；
- `.kiro/specs/cancellation-no-show-fee-system/`：Requirements、Design、Tasks；
- `packages/cancellation-demo/`：离线 TypeScript 规则中心和四角色静态 UI；
- `scripts/verify-system.mjs`、`scripts/verify-ui.mjs`：无额外依赖的系统验证。

## 验证已完成的参考实现
```bash
npm run test:system
npm run check
npm run demo
```

`check:starter` 仅用于尚未生成任何学员产物的初始仓库；当前已完成状态不应再运行它。`test:kit` 只验证公司公共组件，不代表系统验收。

所有业务数据、规则和外部能力均为教学模拟。地图、支付、结算、通知、客服、风控、配置和旧系统只通过 ports 与内存 Fake；没有真实收费、退款、网络业务调用或部署。验收报告中的 BLOCKED 项不得描述为生产完成。
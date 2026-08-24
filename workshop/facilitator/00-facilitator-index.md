# 讲师资料

> 本目录只用于备课和现场控场，不对客户分发。

客户侧材料位于上一级目录：

- `00-workshop-overview.md`：课程介绍
- `01-slide-deck.md`：课件脚本
- `02-participant-handout.md`：学员手册

## 备课顺序

1. [环境和演示前检查](01-preflight-and-environment.md)
2. [现场演示流程](02-facilitator-runbook.md)
3. [提示词库](03-prompt-library.md)
4. [需求分析参考与模拟业务决策](04-answer-key-and-business-decisions.md)
5. [Demo 工程蓝图](05-demo-project-blueprint.md)
6. [Kiro 配置参考](06-kiro-configuration-recipes.md)
7. [企业治理、审计和会话导出](07-governance-audit-and-export.md)
8. [现场应急与故障排查](08-contingency-and-troubleshooting.md)
9. [Workshop 需求与交付验收基线](../../workshop-builder.md)
10. [学员动手实验手册](../03-hands-on-lab-guide.md)

## 使用建议

客户看到的是一个完整业务故事，不是 Kiro 功能列表。现场始终沿着这条主线推进：

```text
原始业务需求
→ 需要确认的问题
→ 已确认的业务决策
→ Feature Spec
→ `custom-find-skill` 发现并复用企业资产
→ 实现和测试
→ 缺陷修复
→ 审查与复盘
```

以下内容不要直接放进客户课件：

- 功能覆盖编号和检查矩阵；
- 演示失败预案；
- 模拟产品决策的完整答案；
- Permissions 的内部策略细节；
- 企业账号和治理后台截图中的真实信息；
- 会话导出的内部路径、源码和配置。

演示中所有公司、订单、位置、电话、金额和策略均使用教学数据。
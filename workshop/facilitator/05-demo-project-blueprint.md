# Demo 工程蓝图

## 1. 目的

本仓库已经包含可运行的 TypeScript Demo，用于支撑完整 Workshop 中的企业资产复用、类型检查、费用不变量验证和代码修改演示。

工程不连接真实地图、支付、订单、客服或生产环境。

## 2. 技术栈

- Node.js 当前受支持 LTS
- TypeScript `5.9.2`
- npm workspaces
- Node.js 内置断言执行确定性的费用不变量扫描
- 无数据库、网络和长时间运行服务

依赖版本由 `package-lock.json` 锁定。Workshop 当天不安装或升级依赖。

## 3. 实际目录

```text
.kiro/skills/custom-find-skill/
  SKILL.md
  references/

enterprise-knowledge-base/
  business/fee-calculation-policy.md
  architecture/reuse-contracts.md

packages/
  company-policy-kit/
    src/money.ts
    src/capped-fee-calculator.ts
  cancellation-demo/
    src/calculate-cancellation-fee.ts
    src/demo.ts

team-templates/cancellation-fee/
  calculate-cancellation-fee.ts.template
  template-guide.md

scripts/verify-fee.mjs
```

## 4. Custom Skill 纵切

该纵切只演示取消费金额计算复用：

```text
baseFee
→ adjustmentBasisPoints
→ discount
→ non-negative clamp
→ estimatedTripFare cap
→ charge + trace
```

`custom-find-skill` 应找到：

- 费用计算业务知识；
- `MoneyMinor` / `moneyMinor`；
- `CappedFeeCalculator`；
- 费用集成模板；
- 现场目标文件。

它不处理是否收费、免责、免费窗口、爽约证据、幂等、客服解释或完整取消流程。

## 5. 现场目标文件

`packages/cancellation-demo/src/calculate-cancellation-fee.ts` 是安全起始状态：

- 可以编译；
- 返回 `NOT_IMPLEMENTED` 和零金额；
- 不包含重复金额算法；
- 提示先运行 `/custom-find-skill`。

Supervised 环节只修改该文件，将模板中的公共组件调用集成进来。

## 6. 固定示例

```text
baseFee = 500
estimatedTripFare = 900
adjustmentBasisPoints = 20_000
discount = 0
expected charge = 900
```

实现前 `npm run demo` 输出 `STARTER`；实现后应输出 `IMPLEMENTED` 和 `charge = 900`。

## 7. 验证命令与语义

Starter 预检：

```bash
npm ci --ignore-scripts
npm run check:starter
npm run demo
```

初始脚本：

- `typecheck`：编译公共包和 Demo；
- `test:kit`：只验证预置 `CappedFeeCalculator` 的固定案例和确定性不变量组合；
- `check`：类型检查加公共 kit 健康检查；
- `check:starter`：额外证明适配器仍为 `NOT_IMPLEMENTED`，且 Decision Log/Feature Spec 尚未存在；
- `demo`：Starter 输出 `STARTER`，完成费用 Lab 后输出 `IMPLEMENTED` 和 900。

真正的适配器业务测试和 `test:fee` 命令由学员在 Lab 6 创建。必须先在 Starter 上因业务断言失败，再在 Lab 7 实现后转绿；不能用 `test:kit` 冒充学员实现验收。

## 8. Bugfix/Correctness 演示状态

Bugfix 环节与 Starter 严格分离：

- 学员先从 State A 亲自生成 Decision Log、Spec、测试和实现，达到 State B；
- 通过 G7 并建立 `RP-07-implemented` 后，讲师才在独立副本注入 State C；
- 学员根据失败证据创建 Bugfix Spec 并完成 State D；
- 预制故障补丁、修复代码和最终 Diff 只允许存在于讲师外置应急包。

## 9. 学习状态

### State A：唯一默认 Starter

- `npm run check:starter` 通过；
- `npm run demo` 输出 `STARTER`；
- Skill、知识、组件和模板存在；
- Decision Log、Feature Spec、业务测试和完成实现不存在。

### State B：学员完成费用纵切

- Decision Log 和 Feature Spec 是学员课堂产物；
- 业务测试先红后绿；
- 目标文件只调用公共 `CappedFeeCalculator`；
- `npm run check` 通过；
- `npm run demo` 输出 `IMPLEMENTED` 和 900。

### State C：讲师隔离注入故障

- 只在 G7 后的独立副本产生；
- 失败测试和反例可重放；
- 不污染 Starter 或学员完成态。

### State D：学员修复

- Bugfix Spec 来自实际诊断证据；
- Diff 只包含最小修复和回归测试；
- 学员业务测试、公共检查和 Demo 全部通过。

## 10. 交付验收

- [ ] `npm ci --ignore-scripts` 可从锁文件重建；
- [ ] `npm run check` 通过；
- [ ] `npm run demo` 稳定输出起始状态；
- [ ] Skill catalog 的所有路径真实存在；
- [ ] 公共包可从包根导入；
- [ ] 费用模板不包含完整取消决策逻辑；
- [ ] Bugfix 状态有独立恢复方案；
- [ ] 无真实数据、凭证、内部 URL 或生产操作。

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

## 7. 验证命令

```bash
npm ci --ignore-scripts
npm run typecheck
npm run test:fee
npm run check
npm run demo
```

实际脚本：

- `typecheck`：编译公共包和 Demo；
- `test:fee`：验证固定 900 分案例，并对确定性输入组合检查 `0 <= charge <= estimatedFare`；
- `check`：依次运行类型检查和费用验证；
- `demo`：运行现场费用集成示例。

`test:fee` 验证公共组件。现场目标文件在实现后还需通过 `npm run demo` 验证集成结果。

## 8. Bugfix/Correctness 演示状态

Bugfix 环节与 `custom-find-skill` 起始状态分离：

- Custom Skill 环节：写代码前发现并复用正确资产；
- Bugfix 环节：打开预先准备的错误封顶顺序和失败 Property Test，完成诊断、Bugfix Spec、最小 Diff 和恢复。

正式演示前应使用独立 Git 分支、Kiro checkpoint 或预制输出准备 Bugfix 状态，不能把它混入 `calculate-cancellation-fee.ts` 起始文件。

固定 Bug 反例：

```text
baseFee = 800
estimatedFare = 1000
adjustment = 2.0x
错误结果 = 1600
正确结果 = 1000
```

## 9. 演示状态

### State A：Starter

- `npm run check` 通过；
- `npm run demo` 输出 `STARTER`；
- Skill、知识、组件和模板路径均存在。

### State B：Fee Integration Implemented

- 目标文件只调用公共 `CappedFeeCalculator`；
- 没有本地 Money 或金额算法；
- `npm run check` 通过；
- `npm run demo` 输出 `IMPLEMENTED` 和 900。

### State C：Seeded Bug（单独准备）

- 错误封顶顺序可稳定复现；
- 失败测试或预制输出可读；
- 与 Starter 状态互不污染。

### State D：Fixed

- Bugfix Spec 已完成；
- Diff 只包含最小修复；
- 目标和相关验证通过。

## 10. 交付验收

- [ ] `npm ci --ignore-scripts` 可从锁文件重建；
- [ ] `npm run check` 通过；
- [ ] `npm run demo` 稳定输出起始状态；
- [ ] Skill catalog 的所有路径真实存在；
- [ ] 公共包可从包根导入；
- [ ] 费用模板不包含完整取消决策逻辑；
- [ ] Bugfix 状态有独立恢复方案；
- [ ] 无真实数据、凭证、内部 URL 或生产操作。

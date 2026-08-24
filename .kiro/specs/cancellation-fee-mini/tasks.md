# Cancellation Fee Mini — Tasks

- [x] 1. 预置公共组件、模板、Starter 和失败业务测试
  - Evidence: `npm run check:starter` 通过，`npm run test:fee` 因 `NOT_IMPLEMENTED` 失败。

- [ ] 2. 完成费用适配器
  - Requirement: REQ-FEE-001
  - Allowed file: `packages/cancellation-demo/src/calculate-cancellation-fee.ts`
  - <!-- TODO-TASK: 补充一条可审查的实施说明，必须写明复用包根 API、禁止复制算法以及验证命令。 -->
  - Verify: `npm run check:solution`

- [ ] 3. 人工审查证据
  - 检查 Supervised hunks、Git Diff、测试输出和 Demo 的 900 分结果。
  - 不新增代码；完成后手工勾选。
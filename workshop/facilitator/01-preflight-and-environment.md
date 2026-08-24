# Workshop 环境准备与预检

## 1. 准备原则

现场演示的首要目标是稳定、可解释和可恢复。不要把时间消耗在安装依赖、网络下载、真实外部服务或随机并发问题上。

## 2. 建议环境

- macOS 或企业标准开发环境
- 已登录并可正常使用的 Kiro IDE
- Git 已安装
- Node.js 当前受支持的 LTS 版本
- npm 可用
- 演示项目依赖已安装并有锁文件
- 所有测试可离线运行
- 投影分辨率下编辑器字号至少 16

Demo 工程使用 TypeScript、npm workspaces 和确定性的 Node.js 费用验证脚本。版本已经固定到锁文件，Workshop 当天不升级。

## 3. Kiro 功能可用性检查

课程前至少一天确认：

| 功能 | 检查内容 | 不可用时的替代 |
|---|---|---|
| Chat/上下文 | 能附加文件、目录、Terminal、Problems、Git Diff | 手动粘贴小段上下文 |
| Feature Spec | 能创建 requirements/design/tasks | 打开预制 Spec 截图或文件 |
| Bugfix Spec | 能进入 Bug Fix 工作流 | 使用结构化 Chat Prompt |
| Analyze Requirements | 菜单或工作流可见 | 使用 P04 分析 Prompt |
| Spec Correctness | 功能入口可见 | 使用 P10/P11 生成属性和追踪矩阵 |
| Autopilot/Supervised | 两种模式可切换 | 全程 Supervised 或手动审批 |
| Hooks | Agent Hooks UI 可创建并触发 | 手工运行 `npm run check` |
| Permissions | 能配置 allow/ask/deny | 展示预制截图与策略表 |
| Custom Agents | 能创建和切换 Agent | 使用固定系统 Prompt 的独立会话 |
| Checkpoint/Revert | 当前版本入口可用 | 使用 Git 分支和预制提交演示 |
| Session Export | 当前版本和套餐可用 | 展示预制脱敏导出包结构 |
| Enterprise Governance | 企业账号有访问权限 | 使用架构图和截图讲解 |

Kiro UI 和功能入口可能随版本变化。讲师手册描述的是意图和验证点，现场以已安装版本的标签为准。

## 4. Demo 工程预检

正式工程创建后，Workshop 前执行一次：

```bash
npm ci --ignore-scripts
npm run typecheck
npm run test:fee
npm run check
npm run demo
```

预期：

- `check` 通过类型检查和公共费用不变量验证；
- Starter 状态的 `demo` 输出 `STARTER`；
- 完成费用集成后，`demo` 输出 `IMPLEMENTED` 和 900；
- Bugfix 环节使用单独准备的失败输出或演示状态；
- 单次目标验证最好在 5 秒内完成。

实际脚本：

```json
{
  "scripts": {
    "typecheck": "npm run build",
    "test:fee": "npm run build:kit && node scripts/verify-fee.mjs",
    "check": "npm run typecheck && npm run test:fee",
    "demo": "npm run build && npm run start --workspace @workshop/cancellation-demo"
  }
}
```

## 5. 推荐仓库状态

准备以下可恢复节点，名称可以按团队规范调整：

1. `demo/00-baseline`：工程可运行、测试全绿。
2. `demo/01-raw-requirement`：只有原始需求和基线代码。
3. `demo/02-spec-ready`：已准备模拟产品决策和预制 Spec。
4. `demo/03-guardrails-ready`：Steering、Hook、权限说明已完成。
5. `demo/04-seeded-bug`：封顶顺序 Bug 和失败 Property Test。
6. `demo/05-fixed`：最终修复状态。

不要在现场使用 `git reset --hard`、强制清理或删除学员工作。优先使用独立演示副本、Kiro Checkpoint、非破坏性的 Git 分支或预先复制的目录。

## 6. 数据安全准备

确保仓库不存在：

- 真实手机号、精确位置或订单记录
- API Token、Cookie、SSH Key 或云凭证
- 企业内部 URL 和未公开策略
- 真实支付、退款或生产数据库连接
- 可识别员工或客户的信息

建议创建仅包含假数据的目录：

```text
fixtures/
  synthetic-orders.json
  synthetic-map-evidence.json
  synthetic-support-cases.json
private-demo-data/
  fake-production-export.json
```

`private-demo-data/` 用于演示 `.kiroignore`，内容仍必须是假数据。

## 7. Kiro 安全预检

### Permissions

现场演示至少做到：

- 读取演示仓库：允许
- 修改 `src/`、`tests/`、`.kiro/`：根据模块允许或询问
- 运行固定测试命令：允许
- 安装依赖：询问
- 网络访问：询问或拒绝
- 仓库外路径：拒绝
- `.env*`、密钥和私有数据目录：拒绝
- 删除、强制 Git 操作、部署和发布：拒绝

### `.kiroignore`

计划屏蔽：

```gitignore
node_modules/
dist/
coverage/
.env
.env.*
*.pem
*.key
private-demo-data/
exports/
```

### Hooks

Hook 应满足：

- 快速：最好 30 秒内结束
- 确定：不依赖网络、当前时间或随机外部状态
- 可重放：失败可用同一命令复现
- 无副作用：不发布、不部署、不写生产数据

## 8. 演示前一天检查表

- [ ] Kiro 登录正常，模型可用
- [ ] 所选工作流入口可见
- [ ] 原始需求文档可打开
- [ ] Demo 工程基线测试全绿
- [ ] 目标 Bug 可稳定复现
- [ ] Property Test 输出可读并可复现
- [ ] Hook 可触发且不会无限循环
- [ ] Permissions 行为与讲义一致
- [ ] `.kiroignore` 能阻止目标文件进入上下文
- [ ] Custom Agents 可切换且权限受限
- [ ] Checkpoint/Revert 已实际演练
- [ ] Session Export 已实际演练并完成脱敏检查
- [ ] 企业治理截图为当前版本且不含真实数据
- [ ] 所有在线能力都有离线截图或预制文件

## 9. 开场前 30 分钟检查表

- [ ] 关闭通知、邮件和聊天软件弹窗
- [ ] 使用演示账号和演示仓库
- [ ] 清空终端中的敏感历史
- [ ] 调大 IDE、Terminal 和浏览器字号
- [ ] 打开原始需求、讲师手册和 Prompt 库
- [ ] 确认当前 Git 分支和工作区状态
- [ ] 运行一次目标测试
- [ ] 建立开场 Checkpoint
- [ ] 准备计时器但不强制卡时
- [ ] 准备备用截图、录屏和最终代码 Diff

## 10. 现场成功标准

不要求每次 Agent 输出逐字一致，但必须让听众看到以下证据：

1. Kiro 明确区分已知信息和待确认问题。
2. Spec 中需求、设计和任务可追踪。
3. 测试先失败，且失败输入能解释业务缺陷。
4. 修复由 Spec、Diff 和测试共同证明，而不是只看 Agent 声称成功。
5. 权限拒绝和敏感文件隔离确实发生。
6. 导出前执行了脱敏检查。

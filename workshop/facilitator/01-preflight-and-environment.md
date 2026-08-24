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
| Feature Spec | 能创建 requirements/design/tasks | 使用结构化 Chat 在标准路径创建同样三份学员产物，不打开预制答案 |
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

## 4. Starter 工程预检

Workshop 前在学员默认副本执行：

```bash
npm ci --ignore-scripts
npm run check:starter
npm run demo
```

预期：

- `check:starter` 通过类型检查、公共 kit 检查，并确认学员 Decision Log 与 Feature Spec 尚不存在；
- `demo` 输出 `STARTER`，目标适配器仍为 `NOT_IMPLEMENTED`；
- 默认副本不包含 seeded bug、完成 Spec、完成实现或最终 Diff；
- 单次检查最好在 5 秒内完成。

实际初始脚本：

```json
{
  "scripts": {
    "typecheck": "npm run build",
    "test:kit": "npm run build:kit && node scripts/verify-fee.mjs",
    "check": "npm run typecheck && npm run test:kit",
    "check:starter": "npm run check && node scripts/verify-starter.mjs",
    "demo": "npm run build && npm run start --workspace @workshop/cancellation-demo"
  }
}
```

`test:kit` 只检查预置企业公共组件；学员在测试 Lab 中创建业务适配器测试及 `test:fee` 命令。

## 5. 学员恢复点与讲师隔离副本

学员在同一工作副本中依次建立：

1. `RP-00-starter`：Starter 检查通过；
2. `RP-01-analysis`：需求分析经人工筛选；
3. `RP-02-decisions`：Decision Log 经角色签核；
4. `RP-03-spec`：学员 Feature Spec 经评审；
5. `RP-06-red`：业务测试因缺实现而失败；
6. `RP-07-implemented`：费用纵切实现并验证；
7. 后续每个 Spec Task 一个恢复点。

讲师的应急 Spec、故障补丁、完成 Diff 和成功输出必须放在独立副本、非默认分支或外部恢复包中。不得静默切换或覆盖学员工作区，也不得把讲师完成态作为正常课堂路径。

不要使用 `git reset --hard`、强制清理或删除学员工作。优先使用 Kiro Checkpoint、非破坏性分支或复制目录。

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

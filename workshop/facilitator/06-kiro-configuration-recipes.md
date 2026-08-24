# Kiro 配置配方

本文件提供 Workshop 所需的 Steering、Hooks、Permissions、`.kiroignore` 和 Custom Agents 配置意图。具体 UI 标签和配置 Schema 可能随 Kiro 版本变化，应以现场版本为准。

不要把示例策略直接用于生产。

---

# 1. Steering 配方

## 1.1 产品规则

建议文件：`.kiro/steering/product.md`

```markdown
# 产品规则

- 本项目是取消订单与爽约费规则中心的教学 Demo，不代表真实生产规则。
- V1 只覆盖普通快车、优享、商务车实时单；其他类型保持旧行为。
- 法律、安全、无障碍、平台或关键依赖异常属于强免责，乘客费用必须为 0。
- cancelInitiator 与 liableParty 是不同概念，不得合并。
- 所有收费结果必须有稳定 publicReasonCode，并可追踪到 ruleVersion。
- 未被已确认决策覆盖的阈值必须提问，不得按行业经验猜测。
```

## 1.2 技术规则

建议文件：`.kiro/steering/tech.md`

```markdown
# 技术规则

- 金额使用整数最小货币单位，禁止浮点货币值。
- 时间使用服务端 UTC，业务逻辑通过可注入 Clock 获取时间。
- Decision 必须固化 ruleVersion 和 evidence snapshot。
- 地图、支付、通知、风控和审计通过 ports 访问；领域层不得直接调用外部 SDK。
- 同一 orderId 与 chargeType 最多一笔成功收费。
- 关键依赖异常时，取消必须成功，乘客费用为 0，恢复后不得追扣。
- 日志不得包含原始电话、精确位置或安全事件详情。
- Starter 阶段修改 TypeScript 后必须运行 `npm run check`；学员业务测试命令创建后必须一并运行。
```

## 1.3 结构规则

建议文件：`.kiro/steering/structure.md`

```markdown
# 目录结构

- `packages/company-policy-kit/src`：团队公共金额组件，现场只读。
- `packages/cancellation-demo/src`：Workshop 业务集成目标。
- `team-templates/cancellation-fee`：团队费用集成模板，现场只读。
- `enterprise-knowledge-base`：已确认业务知识与复用契约。
- `scripts/verify-fee.mjs`：固定案例和费用上下界验证。
- `private-demo-data`：不得进入 Agent 上下文。
```

## 1.4 创建 Prompt

使用 Prompt P12。生成后人工检查：

- 是否把一次性任务写入长期规则
- 是否存在“写高质量代码”等不可执行口号
- 是否错误声称 Steering 能阻止文件访问
- 是否加载了过多与当前文件无关的内容

---

# 2. Agent Hook 配方

## 2.1 推荐 Hook

通过 Kiro 的 Agent Hooks UI 或 `createHook` 能力创建，不手工编写未知版本的 JSON。

| 字段 | 建议 |
|---|---|
| Name | TypeScript Domain Guard |
| Trigger | PostFileSave |
| Matcher | `\.(ts|tsx)$` |
| Action | command |
| Command | Starter 使用 `npm run check`；Lab 6 创建业务测试命令后再追加 |
| Timeout | 60 秒，可按工程速度调整 |

## 2.2 创建步骤

1. 确认命令在 Terminal 单独运行成功。
2. 打开 Kiro Panel 的 Agent Hooks。
3. 创建 PostFileSave Hook。
4. 设置 TypeScript matcher。
5. 输入无网络副作用的检查命令。
6. 保存后让 Agent 修改一个 TypeScript 文件。
7. 观察 Hook 触发。
8. 故意引入类型错误，验证失败可见。
9. 修复后再次运行。

## 2.3 禁止行为

- 不在 Hook 中安装依赖
- 不访问生产服务
- 不发布包或部署
- 不执行数据库迁移
- 不执行会修改源码的格式化命令，避免触发循环
- 不使用随机、网络或真实时间作为成败条件

---

# 3. Permissions 配方

## 3.1 策略表

| 能力 | 建议 | 理由 |
|---|---|---|
| 读取仓库内需求、Spec、源码、测试 | allow | Demo 必需 |
| 修改 `src/` 和 `tests/` | ask，熟悉后可有限 allow | 便于演示人工审查 |
| 修改 `.kiro/` | ask | 会改变 Agent 行为和自动化 |
| 运行 `npm run check` 和学员创建的固定测试命令 | allow | 低风险、已审查的验证命令 |
| 安装或升级依赖 | ask | 会修改供应链和锁文件 |
| 网络访问 | ask 或 deny | Demo 应离线可运行 |
| MCP | deny，除非单独演示可信 MCP | 本 Workshop 未选择 MCP |
| 读取 `.env*`、密钥、private-demo-data | deny | 敏感范围 |
| 仓库外文件 | deny | 最小范围 |
| 删除、强制 Git、清理工作区 | deny | 破坏性操作 |
| 部署、发布、真实退款 | deny | 高风险生产动作 |

## 3.2 现场验证

选择安全的操作验证三种结果：

- allow：Starter 阶段运行 `npm run check`；业务测试由学员创建后再允许对应固定命令
- ask：尝试修改 `.kiro/` 或提出安装依赖，但在确认框取消
- deny：尝试读取专门准备的假敏感文件；不要用删除命令演示拒绝

## 3.3 讲解边界

- Autopilot/Supervised 控制协作节奏。
- Permissions 控制 Agent 能调用的能力。
- 具有本机管理员权限的人员仍可能绕过客户端策略；企业策略不能代替终端安全和环境隔离。

---

# 4. `.kiroignore` 配方

建议内容：

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
*.session.zip
```

## 验证步骤

1. 在 `private-demo-data/fake-production-export.json` 放入明显标注为假的数据。
2. 确认该路径在 `.kiroignore`。
3. 请求 Agent 读取该文件。
4. 观察 Kiro 不读取或提示不可访问。
5. 解释：`.kiroignore` 控制上下文和索引，不是文件系统权限，也不自动阻止其他进程读取。

不要把原始需求、`.kiro/specs/`、Steering、源码或测试加入 ignore。

---

# 5. Custom Agent 配方

## 5.1 requirements-analyst

### 职责 Prompt

```text
你是只读需求分析员。只分析需求、决策记录、Steering 和 Specs。

你的任务：
- 找出歧义、冲突、缺失、不可测标准和追踪断链
- 引用原文与 Requirement ID
- 生成需要由产品、架构、测试、安全或合规回答的问题
- 区分事实、推断和建议

禁止：
- 替业务决定阈值
- 修改源码、需求或 Spec
- 运行 Shell、访问网络或调用部署工具
- 宣称一致性分析已经证明业务正确或合法
```

### 最小能力

- 读取指定需求和 Spec
- 搜索文本
- 不写文件
- 不运行 Shell
- 不访问 Web/MCP

## 5.2 policy-security-reviewer

### 职责 Prompt

```text
你是只读策略与安全评审员。评审 Requirements、Design、Git Diff 和测试证据。

重点检查：
- 强免责优先级
- 费用非负与预估价封顶
- 幂等扣款与补偿
- PII、RBAC 和字段脱敏
- ruleVersion、evidence snapshot 和审计
- 降级时取消成功且不追扣

输出按阻塞、重要、建议分类，并引用证据。你不能修改代码、运行任意命令、改变权限或批准自己的建议。
```

### 最小能力

- 只读 Spec、源码、测试和 Git Diff
- 可读取已完成的测试输出
- 不写文件
- 不运行任意 Shell
- 不修改 Agent 或 Permissions 配置

## 5.3 验证职责分离

1. 切换到 `requirements-analyst`，要求分析原始需求。
2. 要求它修改 `fee-calculator.ts`，预期被拒绝。
3. 切换默认开发 Agent 完成修改。
4. 切换 `policy-security-reviewer` 做只读终审。
5. 不允许评审 Agent 自动批准并合并自己的建议。

---

# 6. Checkpoint 与 Git 配方

推荐节点：

- 原始需求分析前
- Feature Spec 执行前
- Autopilot 执行前
- Bug 修复前
- Session Export 前

恢复前使用 Prompt P25 检查：

- 未保存或非 Agent 修改
- Terminal、MCP 和外部系统副作用
- 恢复范围
- 是否有更安全的预制分支

Checkpoint 用于短期恢复；正式可审阅历史仍使用 Git branch、commit 和 PR。本 Workshop 不要求自动提交。

---

# 7. 最终配置验收

- [ ] Steering 具体且无冲突
- [ ] Hook 可离线重放且不修改文件
- [ ] Permissions 至少有 allow/ask/deny 三类
- [ ] `.kiroignore` 不包含真实敏感数据也能演示隔离
- [ ] Custom Agents 默认只读并验证无法写文件
- [ ] Autopilot 只在 Spec、测试和权限就绪后使用
- [ ] 任何生产、部署、真实退款能力均未授权

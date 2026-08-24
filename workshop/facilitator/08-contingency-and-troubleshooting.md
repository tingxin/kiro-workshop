# 现场应急与故障排查

## 1. 应急原则

1. 教学目标优先于现场生成的完整性。
2. Agent 输出不同不是失败；缺乏证据、越权或无法验证才是失败。
3. 不在现场临时升级 Kiro、Node 或依赖。
4. 不用破坏性 Git 命令“抢救”演示。
5. 每个在线或实验能力都准备截图、预制文件或录屏。

---

# 2. 时间压缩策略

## 剩余 60 分钟

完整演示：Analyze Requirements、Feature Spec、Steering/Hook、主 Bug 修复。Permissions、Custom Agents、治理和导出快速带过。

## 剩余 30 分钟

现场操作：

1. 原始需求分析前 5 个问题
2. 打开预制 Spec，解释一条需求追踪链
3. 运行失败 Property Test
4. Kiro 解释根因并最小修复
5. 展示最终 Diff 和安全边界表

## 剩余 15 分钟

只做一条闭环：

```text
模糊原文
→ Kiro 提出问题
→ 人工确认规则
→ Property Test 反例
→ 最小修复
→ Diff 与测试证据
```

其余能力用覆盖矩阵说明。

---

# 3. 常见故障

## 3.1 Kiro 输出与讲义不同

处理：

- 检查是否附加了正确文件和最小上下文。
- 追问“请引用原文证据并区分事实与推断”。
- 不要求逐字一致，对照答案评分表判断关键点。
- 如果输出过长，让它只列前 5 个阻塞项。

## 3.2 Agent 擅自补全阈值

立即指出这是教学点。使用：

```text
请撤回没有来源的阈值。把每项标记为原文事实、已确认决策或待确认问题；待确认项不得进入实现。
```

## 3.3 Analyze Requirements 入口不可用

使用 Prompt P04 在普通 Chat 中完成，教学目标不变。

## 3.4 Spec 工作流不可用

打开预制 `requirements.md`、`design.md`、`tasks.md`，使用 P08/P09 做评审。强调 Spec 的价值在结构化和追踪，而不是按钮本身。

## 3.5 Spec Correctness 不可用

使用 P10 生成追踪矩阵，再用 P11 提取 Properties。展示预制属性测试。

## 3.6 Hook 没有触发

检查：

- 修改是否由 Agent 完成
- 触发事件是否匹配当前 Kiro 版本
- matcher 是否匹配文件路径
- 命令能否在项目根目录单独运行
- 是否超时

若仍失败，手动执行同一命令并展示预制 Hook 配置截图。不要现场反复重建多个 Hook。

## 3.7 Hook 形成循环

停止继续触发，禁用 Hook。确保 Hook 只读检查，不运行会改写文件的 formatter。使用手动 `npm run check` 完成演示。

## 3.8 Permissions 与预期不同

不要为了演示临时放宽全部权限。打开策略确认 scope 和 Agent，使用安全的 allow/ask/deny 示例。无法解决时展示策略表和截图。

## 3.9 `.kiroignore` 没有阻止读取

检查模式和路径。仍不可用时说明其职责，并使用 Permissions 拒绝读取作为安全边界示例。不要放入真实敏感数据测试。

## 3.10 Custom Agent 可以写文件

立即停止该 Agent 的写操作，检查其工具和 Permissions。切换回默认 Agent。用预制只读 Agent 配置讲解职责分离。

## 3.11 Autopilot 扩大范围

中断执行，查看 Diff。使用 Revert 撤销最近一轮 Agent 修改，或恢复到预制状态。重新发送更窄的 Prompt：只执行一个 Task、列出允许文件、禁止安装和重构。

## 3.12 Property Test 不稳定

- 使用输出的 seed 重放。
- 切换到固定反例 `800/1000/2/0`。
- 确认 Clock 和规则版本固定。
- 不在现场调试随机并发测试。

## 3.13 测试运行太慢

先运行 `npm run test:fee`，完整 `npm run check` 使用预制输出。说明分层验证策略。

## 3.14 网络或登录失败

使用：

- 预制 Spec 和 Diff
- 失败与成功测试输出
- Kiro 操作截图或短录屏
- Prompt 卡片进行互动式讲解

不要尝试现场重装软件。

## 3.15 Checkpoint/Revert 风险

恢复前使用 Prompt P25。若存在未保存或学员修改，停止恢复，切换预制演示副本。外部命令、MCP 或服务副作用不会随文件恢复自动撤销。

## 3.16 Session Export 不可用

展示脱敏导出包目录或截图，仍然完整讲解导出前检查、分享范围和保留策略。

---

# 4. 演示恢复点

每个模块准备一个“可直接打开”的状态：

| 模块 | 恢复材料 |
|---|---|
| Analyze Requirements | 预制问题清单 |
| Feature Spec | requirements/design/tasks |
| Correctness | 追踪矩阵和 Properties |
| Steering | 三份预制规则 |
| Hooks | 配置截图和手动检查命令 |
| Permissions | 策略表和三类行为截图 |
| Custom Agents | 两个只读 Agent 配置 |
| Bug | 固定失败输出与 seed |
| Fix | 最小正确 Diff |
| Governance | 三层审计图 |
| Export | 脱敏包目录截图 |

---

# 5. 讲师纠偏话术

## Agent 给出自信但无来源的答案

“这个回答很流畅，但没有决策来源。我们要求它区分事实、推断和待确认项。”

## 测试全部通过但需求仍模糊

“测试证明实现符合当前断言，不证明断言代表正确业务决策。”

## Autopilot 一次改了很多文件

“自治提高执行速度，也放大错误方向的成本，所以需要 Spec、权限、测试和恢复点。”

## Supervised 被理解成沙箱

“Supervised 控制审查节奏，Permissions 和环境隔离才控制能力边界。”

## Steering 被理解成强制安全策略

“Steering 提供持续上下文，真正的强制仍来自测试、权限、仓库保护和运行环境。”

---

# 6. 最后检查

- [ ] 原始需求可独立打开
- [ ] Prompt 库可快速复制
- [ ] 所有预制产物与当前 Demo 代码一致
- [ ] 最小反例和最终 Diff 已截图
- [ ] 不使用真实数据
- [ ] 不执行破坏性恢复
- [ ] 结束时工作区能回到已知状态

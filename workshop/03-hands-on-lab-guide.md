# 取消订单与爽约费规则中心操作手册

## 前置条件

1. 在 Kiro 中打开仓库根目录。
2. 确认 Node.js、npm 和项目依赖已经准备好；核心系统步骤不联网，也不安装或升级应用依赖。第 9 步安装开源 Skill 是唯一联网例外。
3. 确认可以使用 Kiro Chat、聊天模式选择器中的 Spec、Supervised、Agent Hooks 和仓库预置的 `custom-find-skill`。
4. 第 2 步完成前只使用原始需求；确认分析结果后可以读取 `workshop/inputs/simulated-requester-feedback.md`。`.kiro/specs/cancellation-no-show-fee-system/requirements.md` 和 `design.md` 是课程预置的固定材料，不需要重新生成。后续只使用原始需求、固定反馈、企业知识、固定 Spec、自己生成的文件和项目源码；不要读取 `workshop/facilitator/`。
5. 地图、支付、通知、客服、风控和旧系统均使用接口与 Fake，不连接真实服务。
6. 若 `workshop-output/05-acceptance-report.md` 已存在，当前目录是已完成的学员快照：新一轮从头实现应使用新的 Starter 副本或 Checkpoint，不能在已完成目录运行 `check:starter`；只复核当前快照时运行 `npm run check`、`npm run demo`，然后从第 11 步执行验收。

## 第 1 步：检查初始工程

**Kiro 功能：**Terminal、Problems。

在仓库根目录运行：

```bash
npm run check:starter
npm run demo
```

检查输出中存在：

```text
workshopState: STARTER
status: NOT_IMPLEMENTED
```

如果命令失败，将 `#Problems` 和 `#Terminal` 添加到 Chat，发送：

**提示词：**

```text
先不要修改业务代码。分析 check:starter 或 demo 失败的直接原因，区分环境问题、依赖问题、编译问题和 Starter 状态问题。只给出恢复初始工程所需的最小操作。
```

初始检查成功后，不再运行 `check:starter`。

## 第 2 步：分析原始需求

在聊天模式选择器中选择 **Plan**，添加 `#File cancellation-no-show-fee-raw-requirements.md`，发送：

**提示词：**

```text
只分析需求，不修改文件，也不提出实现方案。逐章分析这份需求的全部十六个章节。

找出歧义、冲突、规则优先级缺失、必要信息缺失、不可验收描述、隐含假设、外部依赖以及安全、隐私和非功能风险。

每项包含：
- Analysis ID；
- 原文章节和原文证据；
- 问题类型；
- 为什么阻塞实现或验收；
- 应回答的角色；
- 一个可以明确作答的问题；
- 优先级：BLOCKER、HIGH、MEDIUM 或 LOW。

区分原文事实、你的推断和待确认事项。不要自行补充时间、距离、金额、责任、权限或性能阈值。只在 Chat 中展示结果，然后停止并等待我确认。
```

确认分析结果后，在模式选择器中切换到 **Default**，发送：

```text
仅将刚才已确认的分析写入 workshop-output/01-requirements-analysis.md，不提出实现方案，不修改其他文件。
```

检查十六章是否都被分析。发现遗漏时，要求 Kiro 只补充遗漏章节，不要重写已经确认的内容。

## 第 3 步：整理已确认的规则

这一步把第 2 步发现的问题整理成三类：

- **已确定**：本次练习有明确答案，可以继续设计和实现；
- **仍需确认**：没有明确答案，后续不能自行猜测；
- **本次不做**：不属于本次练习范围。

整理后的文件就是后续步骤使用的“规则清单”。其中，Analysis ID 是第 2 步的问题编号，Feedback ID 是反馈文件中的答复编号，DEC-001 是本步骤为规则清单生成的新编号。

在聊天模式选择器中使用 **Default**，添加：

- `#File cancellation-no-show-fee-raw-requirements.md`
- `#File workshop-output/01-requirements-analysis.md`
- `#File workshop/inputs/simulated-requester-feedback.md`
- `#Folder enterprise-knowledge-base`

发送：

```text
请根据附加材料创建 workshop-output/02-approved-decisions.md。

把内容分成三部分：
1. 已确定（APPROVED）；
2. 仍需确认（BLOCKED）；
3. 本次不做（OUT_OF_SCOPE）。

每一项包含：
- 一个连续编号，例如 DEC-001；
- 对应的 Analysis ID 和 Feedback ID；
- 一句话说明处理结果；
- 依据的文件路径；
- 如果属于“已确定”，写出如何检查结果是否正确。

不要补充材料中没有的时间、距离、金额、权限或性能指标。只创建这个文件，不修改其他文件。
```

打开 `workshop-output/02-approved-decisions.md`，检查：

- 每个“已确定”项目都有 Analysis ID、Feedback ID 和依据文件；
- “仍需确认”的项目没有被写成确定规则；
- “本次不做”的项目没有进入实现范围；
- 没有出现材料中不存在的新数值或新规则。

## 第 4 步：生成清晰需求文档

**Kiro 功能：**Default；写文件时使用 Supervised。

添加原始需求、第 2 步的分析文件和第 3 步生成的规则清单，发送：

**提示词：**

```text
根据附加文件创建 workshop-output/03-requirements-baseline.md。

要求：
- 覆盖原始需求全部十六章；
- 每条使用唯一 Requirement ID；
- 写明前置条件、触发条件、系统行为、边界、异常和可判断的验收标准；
- 标注原始章节、Analysis ID 和 Decision ID；
- 外部地图、支付、通知、客服、风控和旧系统使用端口与 Fake 验收；
- BLOCKED 和 OUT_OF_SCOPE 单独列出，不得写成实现要求；
- 不保留“合理”“适当”“尽快”“明显”等不可验收词，除非已经有批准的判断标准。

先输出原始条目覆盖检查。确认没有遗漏后，再创建文件。
```

逐章检查原始文档中的条目是否映射到 Requirement、BLOCKED 或 OUT_OF_SCOPE。发现无来源 Requirement 时删除；发现原始条目遗漏时补充映射。

## 第 5 步：使用固定 Spec 生成任务

课程已经提供以下两份固定材料，学员不需要重新生成：

- `.kiro/specs/cancellation-no-show-fee-system/requirements.md`
- `.kiro/specs/cancellation-no-show-fee-system/design.md`

先阅读两份文件，了解要实现的行为和技术结构。然后在聊天模式选择器中选择 **Spec**，添加上述两个文件和 `#File workshop-output/03-requirements-baseline.md`，发送：

```text
requirements.md 和 design.md 是本次 Workshop 的固定输入，不要修改或重新生成。

请只生成 .kiro/specs/cancellation-no-show-fee-system/tasks.md。

要求：
- 每个任务写明对应的 Requirement ID；
- 每个任务只完成一个可以独立检查的行为；
- 按依赖顺序排列；
- 写明允许修改的文件和验证命令；
- 使用 Node 内置 node:test 或 node:assert，不安装新的测试依赖；
- “仍需确认”和“本次不做”的内容不得进入任务；
- 生成 tasks.md 后停止，不要执行任务或修改代码。
```

打开 `tasks.md`，检查每个任务是否都有 Requirement ID、明确的文件范围和验证命令。发现任务要求修改固定 `requirements.md` 或 `design.md` 时，删除该要求。

## 第 6 步：检查任务是否覆盖固定 Spec

在聊天模式选择器中使用 **Default**，添加固定 `requirements.md`、固定 `design.md` 和刚生成的 `tasks.md`，发送：

```text
只检查 tasks.md，不修改固定 requirements.md、固定 design.md 或代码。

逐项检查：
- REQ-001 至 REQ-018 是否都有对应任务或明确的验证任务；
- 每个任务是否引用正确的 Requirement ID 和 Design 组件；
- 是否包含文件范围、验证命令和先测试后实现的顺序；
- 是否错误包含 requirements.md 中“仍需确认”或“本次不做”的内容；
- 是否要求安装新依赖、连接真实服务或修改公共组件。

列出缺口和最小修改建议。确认后只修正 tasks.md，并创建 workshop-output/04-traceability-matrix.md，记录 Requirement ID、Design 组件、Task ID、Test ID 和状态。
```

固定 Requirements 或 Design 如果存在疑问，只记录并向讲师反馈，不要由学员直接改写。

## 第 7 步：创建 Steering 和 Hook

### 7.1 创建 Steering

**Kiro 功能：**Steering；使用 Supervised。

操作步骤：

1. 打开 Kiro 功能面板中的 **Steering** 区域。
2. 点击 **`+`**，创建 Workspace Steering。
3. 将文件命名为 `base-rules`
4. Inclusion Mode 选择 **Always Included**。
5. 在打开的 Steering 编辑器中填写以下内容。
6. 审查变更，并通过 Git Diff 确认内容。

**Steering 内容：**

```markdown
# Cancellation System Rules

- 未经 Decision 批准不得发明业务阈值。
- 金额使用 @company/cancellation-policy-kit 的整数 Money API。
- 时间通过可注入 Clock 获取。
- 外部系统只能通过 ports 访问，测试使用 Fake。
- 日志和公共视图不得暴露电话、精确坐标和安全详情。
- 每个 Task 先写失败测试，只修改允许范围。
- 修改后运行 Task 测试和 npm run check。
- 不联网、不安装依赖、不调用生产服务。
```

不要把一次性任务写入 Steering，也不要把 Steering 描述成权限控制。

### 7.2 创建任务完成后自动构建 Hook

**Kiro 功能：**Agent Hooks。

1. 打开 Kiro 功能面板中的 **Agent Hooks**。
2. 点击 **`+`** 创建 Hook。
3. 填写以下配置：

| 配置 | 值 |
|---|---|
| Name | `Build Demo After Task` |
| Trigger | `PostTaskExec` |
| Action | `Command` |
| Command | `npm run build:demo` |

4. 保存 Hook。
5. 在第 8 步完成一个 Spec Task 后，查看 Hook 运行结果，确认 Kiro 自动执行了构建命令。

该 Hook 只在任务完成后运行一次，不会在每次保存文件时重复构建。

## 第 8 步：使用 Run all Tasks 实现系统

**Kiro 功能：**Spec Tasks、Run all Tasks、Supervised、Terminal、`#Problems`、`#Git Diff`。

本步骤不再逐项复制实现提示词。`tasks.md` 是唯一执行清单：它说明实现什么、修改哪些文件、先写什么测试以及如何验证。

### 8.1 运行前检查 Tasks

打开 `.kiro/specs/cancellation-no-show-fee-system/tasks.md`，确认：

- 有未完成子任务的父任务也是未完成状态；
- 核心实现和测试都是 required task，不带 optional `*` 标记；
- 每个 Task 都有 Requirement ID、允许修改的文件、先失败后通过的测试和非 watch 验证命令；
- 任务只使用仓库现有依赖、Port 和 In-Memory Fake，不联网、不安装依赖、不调用生产服务；
- 没有把 BLOCKED、OUT_OF_SCOPE 或未确认规则写成实现任务。

如果任何一项不满足，在 **Default** 中添加 `requirements.md`、`design.md` 和 `tasks.md`，发送：

```text
只修正 tasks.md 的执行信息，不修改固定 Requirements 或 Design：
1. 所有核心实现和测试必须是 required task；
2. 有未完成子任务的父任务必须保持未完成；
3. 每个实现 Task 内先创建并运行失败测试，再做最小实现；
4. 写明允许修改的文件和非 watch 验证命令；
5. 按真实依赖组织任务，避免并行任务修改同一文件；
6. 不安装依赖、不联网、不调用生产服务、不实现 BLOCKED 或 OUT_OF_SCOPE 内容。
```

检查修正后的 Diff，确认只改了 `tasks.md`。

### 8.2 运行前确认费用复用资产

费用计算必须复用公司组件。运行一次：

```text
/custom-find-skill 为已经判定需要收费的取消订单查找费用金额计算资产：应用运营调整和用户减免，结果不能为负且不能超过预估完单价格。只查找团队已有的业务知识、公共组件和代码模板，不要实现代码。
```

确认结果包含 `MoneyMinor`、`moneyMinor`、`CappedFeeCalculator`、费用政策、模板和包根导入要求。缺少任何一项时停止执行并向讲师反馈，不要自行编写金额算法。

### 8.3 点击 Run all Tasks

1. 在 Kiro 的 **Specs** 视图中打开 `cancellation-no-show-fee-system`。
2. 打开该 Spec 的 `tasks.md`。
3. 选择 **Supervised**，点击任务列表上方的 **Run all Tasks**。
4. Kiro 要求审查文件修改或命令时，检查范围后再接受；出现失败时查看 `#Problems` 和 `#Terminal`，不要跳过失败任务。

Run all Tasks 只执行尚未完成的 required tasks。Kiro 会根据任务依赖分批执行；同一批中互不依赖的任务可能并行，因此不保证严格按编号串行。Supervised 模式仍会在修改后要求审查，这不是执行失败。

### 8.4 完成检查

Run all 结束后确认：

1. 所有 required tasks 都已完成，没有失败或被跳过的核心测试；
2. 运行 `npm run build && npm run test --workspace @workshop/cancellation-demo && npm run check`；
3. 使用 `#Git Diff` 确认只修改允许文件，没有新增依赖、网络访问或真实服务调用；
4. 确认日志、公共解释和客服视图不含电话、精确坐标、安全详情、风险阈值或支付凭证；
5. 金额逻辑来自 `@company/cancellation-policy-kit` 包根，没有本地 Money 或费用算法。

领域规则、费用、幂等、审计、安全投影和降级都由 `tasks.md` 中对应的 required tasks 完成，不再按原第 9–13 步重复执行。

## 第 9 步：使用开源 Skill 创建并优化 UI

**Kiro 功能：**Skills、Terminal、Supervised、`#Git Diff`。

本步骤演示完整流程：从 skills.sh 安装用于搜索 Skill 的 `find-skills`，用它查找 UI Skill，再安装并使用选中的 Skill。正确名称是 **`find-skills`**，不是 `find-skill`。

本步骤是 Workshop 唯一允许联网安装第三方 Skill 的步骤。学员只需打开 skills.sh 页面并复制其中的 **Installation** 命令，不需要理解或手工填写 GitHub 仓库地址。Skill 不是应用依赖；不得因此执行 `npm install`、连接生产服务或修改业务规则。

### 9.1 安装 find-skills

1. 打开 [`find-skills` 安装页面](https://www.skills.sh/vercel-labs/skills/find-skills)。
2. 在页面的 **Installation** 区域点击复制按钮。
3. 打开 Kiro Terminal，在仓库根目录粘贴并运行页面给出的命令：

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

4. 如果安装程序要求选择使用的 Agent 或安装位置，选择 **Kiro** 和当前项目。
5. 安装完成后新建一个 Chat 会话，在输入框键入 `/`，确认列表中出现 `/find-skills`。

看不到 `/find-skills` 时，先在 Kiro 的 **Agent Steering & Skills** 面板确认 `find-skills` 已安装到当前项目，再新建 Chat 会话；不要重复运行安装命令。

### 9.2 使用 find-skills 查找 UI Skill

新建 Chat 会话，发送：

```text
/find-skills 为当前 Workshop 查找一个 Web UI 设计和界面优化 Skill。

搜索关键词：frontend UI design accessibility。
先只返回候选，不要安装。每个候选列出：Skill 名称、用途、来源仓库、安装量、安全审计、详情链接和安装命令。优先选择可信组织、安装量较高、支持 HTML/CSS/JavaScript 且不要求更换技术栈或安装应用依赖的 Skill。
```

检查候选的来源、用途和安全审计，不要只根据名称选择。本 Workshop 选择开源的 `anthropics/skills@frontend-design`，因为它支持使用 HTML/CSS/JavaScript 创建和优化界面。

### 9.3 安装 frontend-design

1. 打开 [`frontend-design` 安装页面](https://www.skills.sh/anthropics/skills/frontend-design)。
2. 在页面的 **Installation** 区域点击复制按钮。
3. 在 Kiro Terminal 的仓库根目录粘贴并运行：

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

4. 如果安装程序要求选择使用的 Agent 或安装位置，选择 **Kiro** 和当前项目。
5. 安装完成后新建 Chat 会话，在输入框键入 `/`，确认 `/frontend-design` 已出现。

看不到 `/frontend-design` 时，先在 **Agent Steering & Skills** 面板确认安装结果，再新建 Chat 会话；不要重复安装。

### 9.4 使用 frontend-design 创建第一版 UI

当前 Starter 没有 UI。使用 Supervised，发送：

```text
/frontend-design 为取消订单与爽约费 Workshop 创建第一版离线演示 UI。

先检查现有代码和业务输出，只在 packages/cancellation-demo/ui/ 下创建 index.html、styles.css 和 app.js。界面使用合成数据展示订单摘要、Decision、费用、公开原因、ruleVersion 和降级状态。

先提出一个明确的视觉方向和文件计划，等待我确认后再实现。不得安装应用依赖，不得使用远程字体、图片或 API，不得连接生产服务，不得修改固定 Requirements、Design、业务代码或现有测试。不得展示电话、精确坐标、安全详情、风险阈值或支付凭证。
```

确认方案后让 Kiro 实现。直接在浏览器打开 `packages/cancellation-demo/ui/index.html`，检查桌面和窄屏显示，并保存修改前后的截图。

### 9.5 使用 frontend-design 优化 UI

把第一版 UI 的桌面和窄屏截图拖入 Kiro Chat，发送：

```text
/frontend-design 评审并优化附加截图中的 Workshop UI。

先指出信息层级、排版、颜色语义、间距、响应式、键盘焦点、对比度以及空状态和错误状态的问题，给出不超过五项的高价值修改，等待我确认后再改代码。

只修改 packages/cancellation-demo/ui/。保持业务字段和状态含义不变；不得安装依赖、访问远程资源、增加业务规则或暴露敏感信息。完成后说明每项修改解决了什么问题。
```

确认修改后重新打开页面并截图。最后运行：

```bash
npm run check
git diff --check
```

使用 `#Git Diff` 确认只新增或修改 `.kiro/skills/` 和 `packages/cancellation-demo/ui/` 中预期文件。第一版与优化版截图、Skill 来源和选择理由共同构成本步骤的演示结果。

参考：[Kiro Agent Skills](https://kiro.dev/docs/skills)、[Skills CLI](https://skills.sh/docs/cli)、[`find-skills`](https://skills.sh/vercel-labs/skills/find-skills)、[`frontend-design`](https://skills.sh/anthropics/skills/frontend-design)。外部资料内容已按许可证合规要求转述。

## 第 10 步：复核系统测试

**Kiro 功能：**Terminal、`#Problems`、`#Git Diff`。

Run all 已执行 `tasks.md` 中的属性、边界、并发、降级和端到端测试，本步骤不再创建第二套系统测试。运行：

```bash
npm run build
npm run test --workspace @workshop/cancellation-demo
npm run check
```

确认测试覆盖白名单/Legacy 路由、强免责、免费窗口、验证到达、爽约、费用选择与封顶、重复和并发请求、依赖降级、公开解释、客服安全视图、规则版本和 Decision 审计。

如果缺少测试或测试失败，不要在本步骤临时补代码。回到 `tasks.md`，新增或修正对应的 required task，再次使用 **Run all Tasks** 执行未完成任务。

## 第 11 步：执行最终验收

**Kiro 功能：**Terminal、Default、`#Git Diff`。

运行：

```bash
npm run build
npm run test --workspace @workshop/cancellation-demo
npm run check
npm run demo
git diff --check
```

添加以下上下文：

- `#File workshop-output/03-requirements-baseline.md`
- `.kiro/specs/cancellation-no-show-fee-system/`
- `#File workshop-output/04-traceability-matrix.md`
- `#Terminal`
- `#Git Diff`

发送：

**提示词：**

```text
只执行最终验收评审，不修改文件。

逐项检查原始需求十六章。对每个 Requirement 输出：
- Requirement ID 和原始章节；
- Decision ID；
- 实现组件；
- Test ID 和测试结果；
- 状态：IMPLEMENTED、SIMULATED、BLOCKED 或 OUT_OF_SCOPE；
- 剩余风险。

检查是否存在无实现的 Requirement、无 Requirement 的代码、无测试的行为、未批准规则、真实外部副作用、敏感数据泄露或范围外修改。

不要把 Fake 描述成生产集成，不要把 BLOCKED 项描述成已经完成。等待我审查后，再创建 workshop-output/05-acceptance-report.md。
```

根据评审结果修复实现、测试或追踪缺口。所有检查通过后，确认：

- 原始需求十六章没有未处置条目；
- 所有已批准 Requirement 都有代码或批准的 Fake、测试和追踪；
- BLOCKED 和 OUT_OF_SCOPE 没有被实现时猜测；
- 外部系统没有真实调用；
- 费用模块复用了 `CappedFeeCalculator`，没有复制金额算法；
- workspace 测试、`check`、Demo 和 `git diff --check` 全部通过。

真实上线前仍需生产接口联调、容量评估、安全和合规评审、灰度计划以及真实业务指标验收。
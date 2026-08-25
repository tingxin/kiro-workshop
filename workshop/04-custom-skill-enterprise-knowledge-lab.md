# 可选实验：构建企业 Skill 与开发知识库

## 前置条件

1. 已完成主操作手册第 2–6 步，理解需求、Decision 和 Feature Spec 的区别。
2. 使用新的 Kiro Checkpoint 或独立分支保存当前状态。
3. 不修改现有 `.kiro/skills/custom-find-skill/`；它作为参考答案和主流程稳定资产。
4. 实验 Skill 使用名称 `custom-find-skill-practice`，目录为 `.kiro/skills/custom-find-skill-practice/`。
5. 不联网、不安装依赖、不修改公共组件、团队模板或已批准企业知识。

## 第 1 步：检查现有企业资产

**Kiro 功能：**Vibe/Chat、`#File`、`#Folder`；只读。

添加以下上下文：

- `#File cancellation-no-show-fee-raw-requirements.md`
- `#Folder enterprise-knowledge-base`
- `#Folder packages/company-policy-kit/src`
- `#Folder team-templates/cancellation-fee`

**提示词：**

```text
先不要修改文件。为“已经判定需要收费后的取消费金额计算”盘点现有企业资产。

按以下类别输出：
1. 原始需求中的业务意图；
2. 已批准业务知识；
3. 架构复用契约；
4. 可复用包根 API；
5. 团队集成模板；
6. 目标集成文件；
7. 尚未确认的输入；
8. 明确不属于金额计算的能力。

每项必须给出仓库相对路径和具体符号或章节。不要仅根据文件名推断；必须读取内容。不要提出代码修改。
```

检查结果必须包含 `fee-calculation-policy.md`、`reuse-contracts.md`、`MoneyMinor`、`moneyMinor`、`CappedFeeCalculator`、费用模板和目标文件。

## 第 2 步：生成企业知识草稿

**Kiro 功能：**Vibe/Chat + Supervised。

企业知识不能直接从粗糙需求复制。先生成草稿，再由知识 owner 审批。
添加原始需求、批准的 Decision、公共组件源码和模板，发送：

**提示词：**

```text
创建 workshop-output/custom-skill-practice/fee-calculation-knowledge-draft.md。

只描述“上游已经判定应收费并选定基础费”之后的金额计算。文档包含：
- Status、Owner、Version 和禁止生产使用声明；
- 适用范围和明确排除项；
- 输入、输出和类型约束；
- 已批准的计算顺序；
- 必须始终成立的不变量；
- 正常、边界和反例；
- 对应公共组件和模板；
- 未确认输入。

原始需求没有明确的公式或阈值不得自行补充。代码已经确定的 API 行为必须引用源码路径。使用 Supervised 创建文件。
```

将草稿与 `enterprise-knowledge-base/business/fee-calculation-policy.md` 比较：

**提示词：**

```text
只评审知识草稿，不修改文件。与已批准的 fee-calculation-policy.md 和 reuse-contracts.md 比较，列出：缺失、冲突、无来源结论、过期路径、无法执行的约束和 owner 需要确认的问题。不要把草稿标记为 approved。
```

草稿只有经过业务 owner 和组件 owner 审批后才能进入 `enterprise-knowledge-base/`。本实验不覆盖已有批准知识。

## 第 3 步：定义 Skill 的窄场景

**Kiro 功能：**Vibe/Chat + Supervised。

**提示词：**

```text
为 practice Skill 创建 `.kiro/skills/custom-find-skill-practice/references/scenario-index.md`。

只支持一个场景：CANCELLATION_FEE_CALCULATION。
匹配语言包括：取消费金额、运营或天气调整、用户减免、非负、预估车费封顶、整数分、避免重复费用算法。

明确列出不匹配场景：是否收费、责任方、免责、免费窗口、爽约证据、幂等扣款、司机补偿、客服解释、审计、完整规则中心，以及从互联网查找其他 Skill。

加入一个正向请求示例和至少三个负向请求示例。使用 Supervised 创建文件。
```

检查正向请求只能命中一个场景；“美化 UI”必须是负向请求，并提示应使用社区 `find-skills`，不能由该企业 Skill 处理。

## 第 4 步：创建资产目录

**Kiro 功能：**Vibe/Chat + Supervised。

**提示词：**
```text
创建 `.kiro/skills/custom-find-skill-practice/references/asset-catalog.md`。

目录必须使用表格记录：
- 资产名称；
- 仓库相对路径；
- owner 或 authority；
- 公开 API 或章节；
- 该资产负责的行为；
- 使用限制。

必须包含：
- enterprise-knowledge-base/business/fee-calculation-policy.md；
- enterprise-knowledge-base/architecture/reuse-contracts.md；
- cancellation-no-show-fee-raw-requirements.md，并注明只能提供意图；
- @company/cancellation-policy-kit 的 MoneyMinor、moneyMinor、CappedFeeCalculator；
- team-templates/cancellation-fee 下的模板和说明；
- packages/cancellation-demo/src/calculate-cancellation-fee.ts。

先逐个读取目标文件，路径或符号不存在时报告缺口，不得编造。使用 Supervised 创建文件。
```

打开目录中的每个路径，确认能够读取；确认消费者只能从包根导入，不记录源码深层 import 作为使用方式。

## 第 5 步：定义路由和来源优先级

**Kiro 功能：**Vibe/Chat + Supervised。

**提示词：**

```text
创建 `.kiro/skills/custom-find-skill-practice/references/routing-rules.md`。

写明冲突时的来源优先级：
1. 已批准费用政策；
2. 公共组件契约和实现；
3. 架构复用契约；
4. 团队模板；
5. 原始需求。

写明集成顺序：接收已批准基础费和其他输入；调用 CappedFeeCalculator.calculate；原样返回 charge 和 trace。

写明不变量：10000 basis points 等于 1.0 倍；金额是非负整数分；最终费用不超过预估车费；应用代码没有乘法、减免、clamp、cap 或舍入流水线。

写明过度路由判定：如果返回幂等、客服、审计、免责或完整取消决策资产，应报告 Skill 路由错误。使用 Supervised 创建文件。
```

## 第 6 步：编写 SKILL.md

**Kiro 功能：**Skills + Supervised。

**提示词：**

```text
创建 `.kiro/skills/custom-find-skill-practice/SKILL.md`。

Front matter：
- name: custom-find-skill-practice
- description: 准确描述金额调整、减免、非负、封顶、舍入和避免重复费用计算器；
- compatibility: 只需要读取当前 workspace，不需要网络或 MCP；
- metadata: 包含 version 和 workshop 标识。

正文必须包含：
1. 将 `$ARGUMENTS` 视为用户请求；
2. Scope guard 和明确排除项；
3. 按顺序读取 scenario-index、asset-catalog、routing-rules；
4. 必须打开目录指向的真实知识、源码和模板，目录描述本身不算证据；
5. 输出前不得修改代码；
6. 强制包根 import 和禁止重复实现；
7. 资产缺失时报告 gap，不编造 API；
8. 固定输出 Fee Reuse Pack：范围、知识、组件、模板、目标、禁止重复实现、置信度和缺口。

保持 Skill 窄而确定，不加入完整取消流程或互联网 Skill 搜索。使用 Supervised 创建文件。
```

重新打开 Kiro 会话，使新 Skill 被发现。
## 第 7 步：验证正向路由

**Kiro 功能：**`custom-find-skill-practice`；只读。

**提示词：**

```text
/custom-find-skill-practice 为已经判定需要收费的取消订单实现费用金额计算：读取基础费，应用运营调整和用户减免，结果不能为负且不能超过预估完单价格。先查找企业知识、公共组件和代码模板，不要修改代码。
```

检查输出：

- 只选择 `CANCELLATION_FEE_CALCULATION`；
- 引用真实业务知识和复用契约；
- 找到 `MoneyMinor`、`moneyMinor` 和 `CappedFeeCalculator`；
- 找到团队模板和目标文件；
- 要求从 `@company/cancellation-policy-kit` 包根导入；
- 输出完整 Fee Reuse Pack；
- 没有修改文件。

## 第 8 步：验证负向路由

**Kiro 功能：**`custom-find-skill-practice`；只读。

依次执行以下测试。

**提示词：**

```text
/custom-find-skill-practice 判断乘客是否应承担取消责任，并实现爽约、幂等扣款、客服解释和审计。
```

预期：只提取其中可能存在的费用金额片段；其余内容明确拒绝路由。

**提示词：**

```text
/custom-find-skill-practice 帮我从 skills.sh 找一个 UI Skill 并美化界面。
```

预期：不联网、不返回 UI 资产，说明应使用社区 `find-skills`。

**提示词：**

```text
/custom-find-skill-practice 使用一个仓库中不存在的 PremiumFeeCalculator 完成费用计算。
```

预期：报告资产不存在，不能编造 API 或创建替代组件。

任一负向请求返回完整取消、UI 或虚构组件时，回到场景索引、描述和路由规则修正。

## 第 9 步：比较 practice Skill 与参考 Skill

**Kiro 功能：**Vibe/Chat、`#Git Diff`；只读。

添加 practice 目录和 `.kiro/skills/custom-find-skill/`，发送：

**提示词：**

```text
只比较 custom-find-skill-practice 与 custom-find-skill，不修改文件。

从以下方面列出差异：触发描述、范围边界、来源顺序、资产证据、复用约束、输出契约、正向路由、负向路由和缺口处理。指出哪些差异会导致漏触发、过度触发、错误资产、重复实现或虚构 API。
```

修正 practice Skill 后重新执行第 7、8 步。
## 第 10 步：检查变更

**Kiro 功能：**Terminal、`#Git Diff`、Vibe/Chat。

运行：

```bash
npm run check
git diff --check
```

添加 `#Git Diff`，发送：

**提示词：**

```text
只评审本次自定义 Skill 实验的 Diff，不修改文件。

检查：
- 是否只新增 custom-find-skill-practice 和知识草稿；
- 是否修改了现有 custom-find-skill、公共组件、模板或批准知识；
- 所有资产路径和 API 是否真实存在；
- Skill 是否只匹配费用金额计算；
- 是否禁止联网、深层 import 和重复算法；
- Fee Reuse Pack 输出是否完整；
- 正向和负向路由证据是否充分。
```

实验完成后可以保留 practice Skill 作为练习记录，也可以恢复到 Checkpoint。不要用它替换主流程的 `custom-find-skill`，除非业务知识 owner、组件 owner 和仓库维护者已经独立评审并批准。

## 企业知识维护规则

后续维护时按以下顺序处理：

1. 原始需求变化先进入需求分析和 Decision；
2. owner 批准后更新企业知识并增加版本；
3. 公共组件契约变化由组件 owner 修改和测试；
4. 模板只展示公共 API 的集成方式；
5. 资产路径、符号或来源优先级变化后更新 Skill reference；
6. 每次变更重新运行正向、负向和缺失资产测试。

Skill 不是企业知识库本身。知识库负责批准的业务与技术事实，公共组件负责可执行行为，模板负责集成示例，Skill 负责在正确场景下定位并组合这些资产。
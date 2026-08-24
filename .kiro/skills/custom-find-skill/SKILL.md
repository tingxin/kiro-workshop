---
name: custom-find-skill
description: Locate the approved internal business context, reusable Money and CappedFeeCalculator APIs, and integration template for cancellation-fee amount calculation. Use only for fee adjustment, discount, non-negative handling, estimated-fare capping, rounding, or avoiding duplicate fee calculators.
compatibility: Requires read access to this Workshop workspace. No network or MCP is required.
metadata:
  version: "2.0.0"
  workshop: "cancellation-fee-reuse"
---

# Find the approved cancellation-fee calculation assets

Treat the user's request as: `$ARGUMENTS`.

This is a deliberately narrow enterprise Skill. It demonstrates how a team makes one common, high-risk implementation pattern discoverable before AI writes code. It does not search the internet, discover third-party Skills, or route the entire cancellation domain.

## Scope guard

Use this Skill only for the amount-calculation segment that starts after an upstream flow has selected a base fee:

```text
base fee → operational adjustment → user discount → non-negative result → estimated-fare cap → integer minor units
```

Out of scope:

- deciding whether an order is chargeable;
- strong exemptions or the 120-second free window;
- passenger no-show evidence;
- idempotency, payment, compensation, audit, or support explanations;
- complete cancellation-decision orchestration.

If a request includes those concerns, return assets only for its fee-calculation portion and identify the rest as outside this Skill.

## Required sources

Read in order:

1. `references/scenario-index.md` — confirms the narrow scenario match.
2. `references/asset-catalog.md` — identifies approved knowledge, component APIs, template, and target.
3. `references/routing-rules.md` — defines source priority and reuse constraints.

Then inspect every selected source and implementation file. A catalog description alone is not evidence.

## Workflow

1. Restate only the fee-calculation capability contained in the request.
2. Read the approved calculation policy and mark unresolved values as inputs rather than inventing them.
3. Inspect `MoneyMinor`, `moneyMinor`, and `CappedFeeCalculator` implementations.
4. Inspect the fee-integration template and target module.
5. Produce the Fee Reuse Pack below. Do not modify code unless the user separately asks for implementation.

## Mandatory reuse policy

- Import public APIs from `@company/cancellation-policy-kit`; do not deep-import source files.
- Do not create another money type or fee calculator.
- Do not copy multiplication, discount, clamp, cap, or rounding logic into product code.
- Do not modify `packages/company-policy-kit/`, `team-templates/`, or approved knowledge during feature implementation.
- If an approved asset is missing or incompatible, report the gap instead of inventing an internal component.

## Required output: Fee Reuse Pack

```markdown
# Fee Reuse Pack

## Business capability
- In scope:
- Explicitly out of scope:

## Approved business knowledge
- Rule — exact source path and section

## Components to reuse
- Public API — implementation evidence — owned behavior

## Code template
- Exact template path — placeholders to fill

## Target integration
- Target path — expected package-level imports

## Prohibited reinvention
- Local capability that must not be created

## Confidence and gaps
- Confidence: high/medium/low
- Missing or unresolved input:
```

Never claim an internal asset exists without an inspectable repository-relative path.

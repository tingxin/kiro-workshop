# Approved fee-calculation asset catalog

## Business knowledge

| Asset | Path | Authority |
|---|---|---|
| Fee calculation policy | `enterprise-knowledge-base/business/fee-calculation-policy.md` | Approved Workshop rule order, invariants, examples, and boundaries |
| Reuse contracts | `enterprise-knowledge-base/architecture/reuse-contracts.md` | Component ownership and anti-duplication rules |
| Raw requirement | `cancellation-no-show-fee-raw-requirements.md` | Source intent only; ambiguous values are not implementation-ready |

## Reusable team package

Package: `@company/cancellation-policy-kit` version `1.4.0`

| Public API | Implementation evidence | Owned behavior |
|---|---|---|
| `MoneyMinor`, `moneyMinor` | `packages/company-policy-kit/src/money.ts` | Validated non-negative integer minor currency units |
| `CappedFeeCalculator` | `packages/company-policy-kit/src/capped-fee-calculator.ts` | Adjustment, discount, non-negative clamp, estimated-fare cap, integer rounding, calculation trace |

Consumers import from the package root. They must not deep-import these implementation files.

## Team template

| Asset | Path | Purpose |
|---|---|---|
| Fee integration template | `team-templates/cancellation-fee/calculate-cancellation-fee.ts.template` | Shows how application code delegates all money behavior to the shared calculator |
| Template guide | `team-templates/cancellation-fee/template-guide.md` | Defines placeholders, checks, and Workshop boundary |

## Workshop target

| Item | Path |
|---|---|
| Live implementation target | `packages/cancellation-demo/src/calculate-cancellation-fee.ts` |
| Synthetic runner | `packages/cancellation-demo/src/demo.ts` |

The existing full cancellation decision files are not selected by this Skill.

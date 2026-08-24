# Fee asset routing and composition rules

## Source priority

When sources conflict, use this order:

1. `enterprise-knowledge-base/business/fee-calculation-policy.md`
2. Public component contract and implementation in `packages/company-policy-kit/`
3. `enterprise-knowledge-base/architecture/reuse-contracts.md`
4. `team-templates/cancellation-fee/`
5. Raw requirements

The raw requirement may explain intent but cannot override an approved rule order or component contract.

## Required integration order

1. Receive an upstream-selected `baseFee` as `MoneyMinor`.
2. Receive `estimatedTripFare`, `adjustmentBasisPoints`, and `discount` as explicit inputs.
3. Delegate the whole calculation to `CappedFeeCalculator.calculate`.
4. Return its `charge` and structured `trace` without recalculating either value.

## Invariants

- `10_000` basis points equals a 1.0x adjustment.
- All monetary values are non-negative integer minor units.
- The final charge satisfies `0 <= charge <= estimatedTripFare`.
- Adjustment occurs before discount and final capping.
- Application code contains no monetary multiplication, `Math.min` cap, `Math.max` clamp, or rounding pipeline.

## Route quality rule

A valid result selects exactly the fee policy, the two money APIs, `CappedFeeCalculator`, and the fee-integration template. Selecting idempotency, explanations, audit, exemptions, or the complete decision template is over-routing and should be reported as an error.

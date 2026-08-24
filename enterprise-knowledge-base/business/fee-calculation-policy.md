# Cancellation fee calculation policy — Workshop V1

> Status: approved synthetic Workshop knowledge  
> Owner: Pricing Platform  
> Version: `workshop-fee-v1`  
> Production use: prohibited

## Scope

This policy starts after an upstream cancellation flow has already decided that a passenger fee applies and selected a versioned base fee. It covers only amount calculation.

Out of scope: charge eligibility, strong exemptions, free-cancellation windows, no-show evidence, idempotency, payment, compensation, support explanations, and audit persistence.

## Inputs

| Input | Meaning | Constraint |
|---|---|---|
| `baseFee` | Policy-selected starting amount | Non-negative integer minor units |
| `estimatedTripFare` | Estimated fare for completing the trip | Non-negative integer minor units |
| `adjustmentBasisPoints` | Weather/event/operation adjustment | Non-negative integer; `10_000` = 1.0x |
| `discount` | Approved user reduction | Non-negative integer minor units |

## Required calculation order

```text
base fee
→ adjustment in basis points
→ currency rounding
→ discount
→ clamp to zero
→ cap at estimated trip fare
```

The final amount must always satisfy:

```text
0 <= charge <= estimatedTripFare
```

Application code selects inputs but must delegate the full calculation to `CappedFeeCalculator`. It must not reproduce any part of this pipeline.

## Workshop example

```text
baseFee = 500
adjustmentBasisPoints = 20_000
estimatedTripFare = 900
discount = 0
adjusted = 1_000
final charge = 900
```

This example uses synthetic values and is not a production pricing rule.

## Boundary examples

- A discount greater than the adjusted fee produces zero, never a negative amount.
- An adjusted fee above the estimated trip fare is capped at the estimate.
- A zero estimate produces a zero final charge.
- Fractional money inputs are rejected by `moneyMinor`.
- A negative or non-integer adjustment is rejected by `CappedFeeCalculator`.

## Approved implementation

- Package: `@company/cancellation-policy-kit@1.4.0`
- Money API: `MoneyMinor`, `moneyMinor`
- Calculator: `CappedFeeCalculator`
- Template: `team-templates/cancellation-fee/calculate-cancellation-fee.ts.template`

# Enterprise component reuse contracts

## Purpose

These contracts demonstrate a company code knowledge base that links business capabilities to approved executable assets. The catalog is authoritative only when the referenced implementation can be inspected and compiled.

## `MoneyMinor`

Owner: Payments Platform

- Represents a non-negative integer in the currency's minor unit.
- Construct values with `moneyMinor(value)`.
- Reject floating-point, negative, `NaN`, and infinite values.
- Product packages must not define another money alias or value object for this flow.

## `CappedFeeCalculator`

Owner: Pricing Platform

Input:

- configured base fee;
- estimated trip fare;
- adjustment in basis points (`10_000` = 1.0x);
- user discount.

Output:

- final `MoneyMinor`;
- structured, non-sensitive calculation trace.

It owns multiplication, discount, non-negative clamping, estimated-fare capping, and integer rounding. Calling code selects policy inputs but must not duplicate these operations.

## Canonical idempotency key

Owner: Order Platform

Use `buildDecisionIdempotencyKey(orderId, chargeType)`. The target store must provide first-write-wins behavior. A check followed by an unconditional insert is not an acceptable substitute in production; the in-memory Workshop adapter models the required contract.

## `DecisionExplanationBuilder`

Owner: Customer Experience Platform

Builds a stable support-safe explanation from public reason code, amount, and rule version. It deliberately accepts no raw evidence, preventing accidental leakage into ordinary support views.

## Template contract

`team-templates/cancellation-fee/calculate-cancellation-fee.ts.template` is a thin integration template. It accepts approved fee inputs and delegates the entire money pipeline to `CappedFeeCalculator`. It must not include charge eligibility, exemptions, idempotency, support explanations, or audit.

The idempotency key and `DecisionExplanationBuilder` are reusable assets for other Workshop stages, but `custom-find-skill` does not route to them.

## Change ownership

Feature work may modify `packages/cancellation-demo/`. Changes to `packages/company-policy-kit/`, templates, or approved knowledge require a separate owner-reviewed change and are outside the live implementation task.

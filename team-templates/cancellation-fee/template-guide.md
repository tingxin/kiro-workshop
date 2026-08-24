# Cancellation fee integration template

## Purpose

Use `calculate-cancellation-fee.ts.template` only after an upstream policy has decided that a fee applies and selected the base amount.

## Required inputs

- `baseFee`
- `estimatedTripFare`
- `adjustmentBasisPoints`
- `discount`

All money values use `MoneyMinor`. `10_000` basis points equals 1.0x.

## Reuse checks

The product module must:

- import from `@company/cancellation-policy-kit` package root;
- delegate the complete calculation to `CappedFeeCalculator.calculate`;
- return the shared component's `charge` and `trace`;
- contain no local money type, multiplication, discount, clamp, cap, or rounding pipeline.

## Workshop boundary

Only modify `packages/cancellation-demo/src/calculate-cancellation-fee.ts`. Treat the company package, template, and enterprise knowledge as read-only during the live task.

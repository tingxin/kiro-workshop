# Cancellation and no-show policy — Workshop V1

> Status: approved synthetic decisions for the Workshop. These values do not represent production policy.

## Scope

V1 handles real-time `EXPRESS`, `PREMIUM`, and `BUSINESS` orders. Reservation, taxi, carpool, and enterprise orders remain on the legacy path.

## Rule priority

From highest to lowest:

1. Legal prohibition on charging.
2. Safety exemption.
3. Accessibility-service exemption.
4. Platform or critical dependency failure.
5. Evidence-backed driver responsibility.
6. Verified passenger no-show.
7. Ordinary passenger cancellation.
8. Weather, event, service-type, city, and user adjustments.
9. Non-negative result and estimated-trip-fare cap.

A strong exemption ends fee evaluation but still produces a versioned, explainable decision.

## Passenger cancellation — Workshop slice

- The cancellation request is passenger initiated.
- Cancellation at or before 120 seconds after driver acceptance is free.
- The boundary is inclusive: 119, 120 are free; 121 is not automatically free.
- Outside the free window, use the versioned base fee from `RuleRepository`.
- Do not infer driver movement or route quality in this slice; those require map evidence not included in the primary demo.

## Strong exemptions

Any one of these produces zero passenger charge:

- `LEGAL`
- `SAFETY`
- `ACCESSIBILITY`
- `PLATFORM_FAILURE`
- `CRITICAL_DEPENDENCY_FAILURE`
- `DRIVER_RESPONSIBILITY_CONFIRMED`

A passenger-declared reason alone is not trusted evidence. The command must contain a confirmed exemption derived from an approved upstream process.

## Fee decisions

Workshop defaults are versioned configuration, not constants in the use case:

| Service | Ordinary cancellation | No-show |
|---|---:|---:|
| EXPRESS | 500 minor units | 800 minor units |
| PREMIUM | 800 minor units | 1200 minor units |
| BUSINESS | 800 minor units | 1200 minor units |

Calculation order is owned by `CappedFeeCalculator`:

1. Base fee.
2. Weather/event multiplier in basis points.
3. User discount.
4. Clamp to non-negative.
5. Cap at estimated trip fare.
6. Return integer minor units and a trace.

## Failure behavior

If rule configuration or critical evidence is unavailable:

- cancellation still succeeds;
- passenger charge is zero;
- public reason is `DEGRADED_NO_CHARGE`;
- recovery must not trigger a later passenger charge;
- the degraded result is audited.

## Stable public reason codes

- `STRONG_EXEMPTION`
- `FREE_CANCELLATION_WINDOW`
- `PASSENGER_CANCELLATION_FEE`
- `PASSENGER_NO_SHOW_FEE`
- `DEGRADED_NO_CHARGE`
- `LEGACY_FLOW`

Internal traces may be more detailed, but public output must not reveal fraud thresholds, exact location, phone numbers, or safety-event details.

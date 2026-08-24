# Support explanation and audit policy

## Ordinary support view

Ordinary support may see:

- decision ID;
- order ID;
- cancellation initiator;
- liable party;
- charged amount;
- driver compensation amount when available;
- stable public reason code;
- rule version;
- a short support-safe summary.

Ordinary support must not receive:

- raw phone numbers or contact content;
- exact latitude or longitude;
- full safety-event narratives;
- internal risk scores or fraud thresholds;
- payment credentials.

## Decision audit record

Every persisted decision records:

- `decisionId` and canonical idempotency key;
- `orderId` and `ruleVersion`;
- accepted and requested UTC timestamps;
- confirmed exemption category, if any;
- fee calculation trace without sensitive evidence;
- final public reason code and amount;
- whether the result came from normal or degraded processing.

A repeated request that returns an existing decision does not emit a second decision audit event.

## Explanation ownership

Use `DecisionExplanationBuilder` from `@company/cancellation-policy-kit` for stable support-safe summaries. Application code may choose the reason code but must not assemble ad hoc customer-service text or expose internal trace fields.

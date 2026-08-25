import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

const AUDIT_KEYS = [
  "acceptedAtUtc",
  "confirmedExemption",
  "decisionId",
  "decisionIdempotencyKey",
  "feeTrace",
  "finalAmount",
  "orderId",
  "processingMode",
  "publicReasonCode",
  "requestedAtUtc",
  "ruleVersion",
];

const trace = {
  baseFeeMinor: 500,
  adjustmentBasisPoints: 10_000,
  adjustedFeeMinor: 500,
  discountMinor: 0,
  afterDiscountMinor: 500,
  estimatedTripFareMinor: 900,
  capped: false,
  finalFeeMinor: 500,
};

const normalDecision = {
  decisionId: "decision-normal",
  decisionIdempotencyKey: "order-1:CANCELLATION_FEE",
  orderId: "order-1",
  chargeType: "CANCELLATION_FEE",
  cancelInitiator: "PASSENGER",
  liableParty: "PASSENGER",
  charge: moneyMinor(500),
  driverCompensation: moneyMinor(400),
  publicReasonCode: "PASSENGER_CANCELLATION_FEE",
  feeTrace: trace,
  processingMode: "NORMAL",
  ruleVersion: "workshop-rules-7",
  phone: "+1-555-sensitive",
  exactCoordinates: "31.2304,121.4737",
  safetyNarrative: "sensitive narrative",
  riskScore: 99,
  paymentCredential: "secret-token",
};

test("4.2 AuditRecorder writes one frozen, strictly allowlisted event from request and Decision data", async () => {
  const { AuditRecorder } = await import("../dist/application/audit-recorder.js");
  const recorder = new AuditRecorder();
  const input = {
    decision: normalDecision,
    requestedAtUtc: "2025-01-01T00:00:00.000Z",
    acceptedAtUtc: "2025-01-01T00:00:00.100Z",
    confirmedExemption: "SAFETY",
    metadata: {
      phone: "+1-555-sensitive",
      exactCoordinates: "31.2304,121.4737",
      safetyNarrative: "sensitive narrative",
      riskThreshold: 80,
      paymentCredential: "secret-token",
    },
  };

  const event = recorder.record(input);

  assert.deepEqual(event, {
    decisionId: "decision-normal",
    decisionIdempotencyKey: "order-1:CANCELLATION_FEE",
    orderId: "order-1",
    ruleVersion: "workshop-rules-7",
    requestedAtUtc: "2025-01-01T00:00:00.000Z",
    acceptedAtUtc: "2025-01-01T00:00:00.100Z",
    confirmedExemption: "SAFETY",
    feeTrace: trace,
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    finalAmount: moneyMinor(500),
    processingMode: "NORMAL",
  });
  assert.deepEqual(Object.keys(event).sort(), AUDIT_KEYS);
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.feeTrace), true);
  assert.deepEqual(recorder.get("decision-normal"), event);
  assert.deepEqual(recorder.list(), [event]);

  trace.finalFeeMinor = 999;
  normalDecision.charge = moneyMinor(999);
  input.requestedAtUtc = "2099-01-01T00:00:00.000Z";
  assert.equal(event.finalAmount, 500);
  assert.equal(event.feeTrace.finalFeeMinor, 500);
  assert.equal(event.requestedAtUtc, "2025-01-01T00:00:00.000Z");
  assert.doesNotMatch(JSON.stringify(event), /555-sensitive|31\.2304|sensitive narrative|risk|secret-token/i);

  assert.throws(
    () => recorder.record({ ...input, requestedAtUtc: "2025-01-02T00:00:00.000Z" }),
    /audit event already exists/i,
  );
  assert.equal(recorder.list().length, 1);
});

test("4.2 AuditRecorder omits unavailable optional version, time, exemption, and trace fields", async () => {
  const { AuditRecorder } = await import("../dist/application/audit-recorder.js");
  const recorder = new AuditRecorder();
  const degradedDecision = {
    decisionId: "decision-degraded",
    decisionIdempotencyKey: "order-2:NO_SHOW_FEE",
    orderId: "order-2",
    chargeType: "NO_SHOW_FEE",
    cancelInitiator: "DRIVER",
    charge: moneyMinor(0),
    publicReasonCode: "DEGRADED_NO_CHARGE",
    processingMode: "DEGRADED",
  };

  const event = recorder.record({
    decision: degradedDecision,
    requestedAtUtc: "2025-02-01T00:00:00.000Z",
  });

  assert.deepEqual(event, {
    decisionId: "decision-degraded",
    decisionIdempotencyKey: "order-2:NO_SHOW_FEE",
    orderId: "order-2",
    requestedAtUtc: "2025-02-01T00:00:00.000Z",
    publicReasonCode: "DEGRADED_NO_CHARGE",
    finalAmount: moneyMinor(0),
    processingMode: "DEGRADED",
  });
  assert.equal("ruleVersion" in event, false);
  assert.equal("acceptedAtUtc" in event, false);
  assert.equal("confirmedExemption" in event, false);
  assert.equal("feeTrace" in event, false);
});

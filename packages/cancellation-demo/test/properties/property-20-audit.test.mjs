import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
  sensitiveSentinels,
} from "../support/deterministic-generators.mjs";

const REQUIRED_AUDIT_KEYS = Object.freeze([
  "decisionId",
  "decisionIdempotencyKey",
  "finalAmount",
  "orderId",
  "processingMode",
  "publicReasonCode",
  "requestedAtUtc",
]);
const OPTIONAL_AUDIT_KEYS = Object.freeze([
  "acceptedAtUtc",
  "confirmedExemption",
  "feeTrace",
  "ruleVersion",
]);
const AUDIT_ALLOWLIST = new Set([...REQUIRED_AUDIT_KEYS, ...OPTIONAL_AUDIT_KEYS]);
const EXEMPTIONS = Object.freeze([
  "LEGAL",
  "SAFETY",
  "ACCESSIBILITY",
  "PLATFORM_FAILURE",
  "CRITICAL_DEPENDENCY_FAILURE",
  "DRIVER_RESPONSIBILITY_CONFIRMED",
]);

function mutableTrace(amount, sentinels) {
  return {
    baseFeeMinor: amount,
    adjustmentBasisPoints: 10_000,
    adjustedFeeMinor: amount,
    discountMinor: 0,
    afterDiscountMinor: amount,
    estimatedTripFareMinor: amount + 100,
    capped: false,
    finalFeeMinor: amount,
    phoneContent: sentinels.phoneContent,
    exactCoordinates: sentinels.exactCoordinates,
    safetyNarrative: sentinels.safetyNarrative,
    riskThreshold: sentinels.riskThreshold,
    paymentCredential: sentinels.paymentCredential,
  };
}

const random = createSeededRandom(0x20a0d17);
const cases = generatePropertyCases((caseNumber) => {
  const normal = caseNumber % 2 === 0;
  const includeTrace = normal && random.boolean();
  const includeAcceptedAt = random.boolean();
  const includeExemption = random.boolean();
  const degradedHasVersion = !normal && random.boolean();
  const amount = normal ? random.nextInt(1, 2_000) : 0;
  const sentinels = sensitiveSentinels(caseNumber);
  const trace = includeTrace ? mutableTrace(amount, sentinels) : undefined;
  const decision = {
    decisionId: `property-20-decision-${caseNumber}`,
    decisionIdempotencyKey: `property-20-order-${caseNumber}:${normal ? "CANCELLATION_FEE" : "NO_SHOW_FEE"}`,
    orderId: `property-20-order-${caseNumber}`,
    chargeType: normal ? "CANCELLATION_FEE" : "NO_SHOW_FEE",
    cancelInitiator: random.pick(["PASSENGER", "DRIVER"]),
    charge: moneyMinor(amount),
    publicReasonCode: normal ? "PASSENGER_CANCELLATION_FEE" : "DEGRADED_NO_CHARGE",
    processingMode: normal ? "NORMAL" : "DEGRADED",
    ...(normal || degradedHasVersion ? { ruleVersion: `property-20-rules-${caseNumber}` } : {}),
    ...(trace === undefined ? {} : { feeTrace: trace }),
    sensitiveEvidence: sentinels,
  };
  const input = {
    decision,
    requestedAtUtc: `2025-01-${String((caseNumber % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    ...(includeAcceptedAt ? { acceptedAtUtc: `2025-01-${String((caseNumber % 28) + 1).padStart(2, "0")}T00:00:01.000Z` } : {}),
    ...(includeExemption ? { confirmedExemption: random.pick(EXEMPTIONS) } : {}),
    metadata: sentinels,
  };

  return Object.freeze({ input, trace, sentinels });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-016.1, REQ-016.2, REQ-016.3, REQ-016.4, REQ-016.5**
propertyTest(20, "Audit Event is complete, minimal and unique", async () => {
  const { AuditRecorder } = await import("../../dist/application/audit-recorder.js");

  for (const testCase of cases) {
    const recorder = new AuditRecorder();
    const { input, trace, sentinels } = testCase;
    const event = recorder.record(input);
    const expectedKeys = [
      ...REQUIRED_AUDIT_KEYS,
      ...(input.acceptedAtUtc === undefined ? [] : ["acceptedAtUtc"]),
      ...(input.confirmedExemption === undefined ? [] : ["confirmedExemption"]),
      ...(input.decision.feeTrace === undefined ? [] : ["feeTrace"]),
      ...(input.decision.ruleVersion === undefined ? [] : ["ruleVersion"]),
    ].sort();

    assert.deepEqual(Object.keys(event).sort(), expectedKeys);
    assert.equal(Object.keys(event).every((key) => AUDIT_ALLOWLIST.has(key)), true);
    assert.equal(event.decisionId, input.decision.decisionId);
    assert.equal(event.decisionIdempotencyKey, input.decision.decisionIdempotencyKey);
    assert.equal(event.orderId, input.decision.orderId);
    assert.equal(event.requestedAtUtc, input.requestedAtUtc);
    assert.equal(event.acceptedAtUtc, input.acceptedAtUtc);
    assert.equal(event.confirmedExemption, input.confirmedExemption);
    assert.equal(event.ruleVersion, input.decision.ruleVersion);
    assert.equal(event.publicReasonCode, input.decision.publicReasonCode);
    assert.equal(event.finalAmount, input.decision.charge);
    assert.equal(event.processingMode, input.decision.processingMode);
    assert.equal(Object.isFrozen(event), true);

    if (trace === undefined) {
      assert.equal(Object.hasOwn(event, "feeTrace"), false);
    } else {
      assert.equal(Object.isFrozen(event.feeTrace), true);
      assert.deepEqual(Object.keys(event.feeTrace).sort(), [
        "adjustedFeeMinor",
        "adjustmentBasisPoints",
        "afterDiscountMinor",
        "baseFeeMinor",
        "capped",
        "discountMinor",
        "estimatedTripFareMinor",
        "finalFeeMinor",
      ]);
      const frozenFinalFee = event.feeTrace.finalFeeMinor;
      trace.finalFeeMinor += 1;
      assert.equal(event.feeTrace.finalFeeMinor, frozenFinalFee);
    }

    const serialized = JSON.stringify(event);
    for (const sentinel of Object.values(sentinels)) {
      assert.equal(serialized.includes(sentinel), false);
    }

    assert.throws(
      () => recorder.record({ ...input, requestedAtUtc: "2099-12-31T23:59:59.999Z" }),
      /audit event already exists/i,
    );
    assert.deepEqual(recorder.list(), [event]);
    assert.equal(recorder.get(input.decision.decisionId), event);
  }
});

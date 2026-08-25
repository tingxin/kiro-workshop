import assert from "node:assert/strict";

import {
  DecisionExplanationBuilder,
  buildDecisionIdempotencyKey,
  moneyMinor,
} from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const ALLOWLISTS = Object.freeze({
  decision: new Set([
    "decisionId",
    "decisionIdempotencyKey",
    "orderId",
    "chargeType",
    "cancelInitiator",
    "liableParty",
    "charge",
    "driverCompensation",
    "publicReasonCode",
    "feeTrace",
    "processingMode",
    "ruleVersion",
  ]),
  versionedFeeInput: new Set(["baseFee", "ruleVersion"]),
  feeResult: new Set(["status", "charge", "trace"]),
  feeTrace: new Set([
    "baseFeeMinor",
    "adjustmentBasisPoints",
    "adjustedFeeMinor",
    "discountMinor",
    "afterDiscountMinor",
    "estimatedTripFareMinor",
    "capped",
    "finalFeeMinor",
  ]),
  publicExplanation: new Set([
    "publicReasonCode",
    "charge",
    "ruleVersion",
    "summary",
  ]),
  idempotency: new Set(["decisionIdempotencyKey", "created"]),
  audit: new Set([
    "decisionId",
    "decisionIdempotencyKey",
    "orderId",
    "ruleVersion",
    "requestedAtUtc",
    "acceptedAtUtc",
    "confirmedExemption",
    "feeTrace",
    "publicReasonCode",
    "finalAmount",
    "processingMode",
  ]),
});

function assertKeysAllowed(value, allowlist, label) {
  for (const key of Object.keys(value)) {
    assert.equal(
      allowlist.has(key),
      true,
      `${label} exposed non-allowlisted key: ${key}`,
    );
  }
}

const services = Object.freeze(["EXPRESS", "PREMIUM", "BUSINESS"]);
const chargeTypes = Object.freeze(["CANCELLATION_FEE", "NO_SHOW_FEE"]);
const random = createSeededRandom(0x01a1_10ed);
const cases = generatePropertyCases((index) => Object.freeze({
  index,
  orderId: `property-01-order-${index}-${random.nextUint32()}`,
  serviceType: random.pick(services),
  chargeType: random.pick(chargeTypes),
  requester: random.pick(["PASSENGER", "DRIVER"]),
  liableParty: random.pick(["PASSENGER", "DRIVER"]),
  ruleVersion: `workshop-property-01-v${index}-${random.nextUint32()}`,
  baseFeeMinor: random.nextInt(1, 2_000),
  adjustmentBasisPoints: random.nextInt(1, 20_000),
  discountMinor: random.nextInt(0, 500),
  estimatedTripFareMinor: random.nextInt(1, 3_000),
}), PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-001.3, REQ-004.6**
propertyTest(1, "Observable outputs are allowlisted", async () => {
  const { FeeInputSelector } = await import(
    "../../dist/application/fee-input-selector.js"
  );
  const { calculateCancellationFee } = await import(
    "../../dist/calculate-cancellation-fee.js"
  );
  const { AuditRecorder } = await import(
    "../../dist/application/audit-recorder.js"
  );
  const explanationBuilder = new DecisionExplanationBuilder();

  assert.equal(cases.length, PROPERTY_CASE_COUNT);

  for (const testCase of cases) {
    const snapshot = Object.freeze({
      ruleVersion: testCase.ruleVersion,
      baseFees: Object.freeze(Object.fromEntries(services.map((serviceType) => [
        serviceType,
        Object.freeze({
          CANCELLATION_FEE: moneyMinor(testCase.baseFeeMinor),
          NO_SHOW_FEE: moneyMinor(testCase.baseFeeMinor),
        }),
      ]))),
    });
    const selector = new FeeInputSelector({
      async getSnapshot() {
        return { status: "AVAILABLE", value: snapshot };
      },
    });
    const selected = await selector.select(
      testCase.serviceType,
      testCase.chargeType,
    );
    assert.equal(selected.status, "AVAILABLE");

    const feeResult = calculateCancellationFee({
      baseFee: selected.value.baseFee,
      adjustmentBasisPoints: testCase.adjustmentBasisPoints,
      discount: moneyMinor(testCase.discountMinor),
      estimatedTripFare: moneyMinor(testCase.estimatedTripFareMinor),
    });
    const decisionIdempotencyKey = buildDecisionIdempotencyKey(
      testCase.orderId,
      testCase.chargeType,
    );
    const decision = Object.freeze({
      decisionId: `property-01-decision-${testCase.index}`,
      decisionIdempotencyKey,
      orderId: testCase.orderId,
      chargeType: testCase.chargeType,
      cancelInitiator: testCase.requester,
      liableParty: testCase.liableParty,
      charge: feeResult.charge,
      publicReasonCode: testCase.chargeType === "NO_SHOW_FEE"
        ? "PASSENGER_NO_SHOW_FEE"
        : "PASSENGER_CANCELLATION_FEE",
      feeTrace: feeResult.trace,
      processingMode: "NORMAL",
      ruleVersion: selected.value.ruleVersion,
    });
    const builtExplanation = explanationBuilder.build({
      reasonCode: decision.publicReasonCode,
      charge: decision.charge,
      ruleVersion: decision.ruleVersion,
    });
    const publicExplanation = Object.freeze({
      publicReasonCode: builtExplanation.reasonCode,
      charge: moneyMinor(builtExplanation.chargedAmountMinor),
      ruleVersion: builtExplanation.ruleVersion,
      summary: builtExplanation.summary,
    });
    const idempotency = Object.freeze({
      decisionIdempotencyKey,
      created: true,
    });
    const audit = new AuditRecorder().record({
      decision,
      requestedAtUtc: `2025-01-01T00:00:${String(testCase.index % 60).padStart(2, "0")}.000Z`,
      acceptedAtUtc: `2025-01-01T00:01:${String(testCase.index % 60).padStart(2, "0")}.000Z`,
    });

    assertKeysAllowed(decision, ALLOWLISTS.decision, "decision");
    assertKeysAllowed(selected.value, ALLOWLISTS.versionedFeeInput, "versioned fee input");
    assertKeysAllowed(feeResult, ALLOWLISTS.feeResult, "fee result");
    assertKeysAllowed(feeResult.trace, ALLOWLISTS.feeTrace, "fee trace");
    assertKeysAllowed(publicExplanation, ALLOWLISTS.publicExplanation, "public explanation");
    assertKeysAllowed(idempotency, ALLOWLISTS.idempotency, "idempotency status");
    assertKeysAllowed(audit, ALLOWLISTS.audit, "audit result");
    assertKeysAllowed(audit.feeTrace, ALLOWLISTS.feeTrace, "audit fee trace");
  }
});

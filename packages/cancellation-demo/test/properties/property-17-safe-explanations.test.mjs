import assert from "node:assert/strict";

import {
  DecisionExplanationBuilder,
  moneyMinor,
} from "@company/cancellation-policy-kit";

import {
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
  sensitiveSentinels,
} from "../support/deterministic-generators.mjs";

const REASON_CODES = Object.freeze([
  "STRONG_EXEMPTION",
  "FREE_CANCELLATION_WINDOW",
  "PASSENGER_CANCELLATION_FEE",
  "PASSENGER_NO_SHOW_FEE",
  "DEGRADED_NO_CHARGE",
]);

const generatedCases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x17_014_004 + caseNumber);
  const sentinels = sensitiveSentinels(caseNumber);

  return Object.freeze({
    decision: Object.freeze({
      decisionId: `decision-${caseNumber}`,
      decisionIdempotencyKey: `decision-key-${caseNumber}`,
      orderId: `order-${caseNumber}`,
      chargeType: random.boolean() ? "CANCELLATION_FEE" : "NO_SHOW_FEE",
      cancelInitiator: random.boolean() ? "PASSENGER" : "DRIVER",
      charge: moneyMinor(random.nextInt(0, 100_000)),
      publicReasonCode: random.pick(REASON_CODES),
      ruleVersion: `workshop-rules-v${random.nextInt(1, 10_000)}`,
      processingMode: "NORMAL",
      feeTrace: Object.freeze({
        baseFeeMinor: random.nextInt(0, 100_000),
        sensitiveSentinel: sentinels.paymentCredential,
      }),
      rawEvidence: Object.freeze(sentinels),
    }),
    sentinels,
  });
}, 128);

// **Validates: Requirements REQ-013.4, REQ-014.1, REQ-014.2, REQ-014.3, REQ-014.4**
propertyTest(17, "Public explanations are deterministic safe projections", async () => {
  const { ExplanationService } = await import(
    "../../dist/application/explanation-service.js"
  );
  const service = new ExplanationService();
  const builder = new DecisionExplanationBuilder();

  assert.equal(generatedCases.length, 128);

  for (const { decision, sentinels } of generatedCases) {
    const request = {
      publicReasonCode: decision.publicReasonCode,
      charge: decision.charge,
      ruleVersion: decision.ruleVersion,
      feeTrace: decision.feeTrace,
      rawEvidence: decision.rawEvidence,
    };
    const built = builder.build({
      reasonCode: decision.publicReasonCode,
      charge: decision.charge,
      ruleVersion: decision.ruleVersion,
    });
    const expected = {
      status: "AVAILABLE",
      value: {
        publicReasonCode: built.reasonCode,
        charge: built.chargedAmountMinor,
        ruleVersion: built.ruleVersion,
        summary: built.summary,
      },
    };

    const first = service.explain(request);
    const repeated = service.explain(request);

    assert.deepEqual(first, expected, "the service must project exactly the shared builder result");
    assert.deepEqual(repeated, first, "identical persisted values must produce an identical summary");
    assert.deepEqual(Object.keys(first.value).sort(), [
      "charge",
      "publicReasonCode",
      "ruleVersion",
      "summary",
    ]);

    const serialized = JSON.stringify(first);
    assert.equal(serialized.includes("feeTrace"), false);
    assert.equal(serialized.includes("rawEvidence"), false);
    for (const sentinel of Object.values(sentinels)) {
      assert.equal(serialized.includes(sentinel), false, `explanation leaked ${sentinel}`);
    }
  }
});

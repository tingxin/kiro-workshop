import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const APPROVED_EXEMPTIONS = Object.freeze([
  "LEGAL",
  "SAFETY",
  "ACCESSIBILITY",
  "PLATFORM_FAILURE",
  "CRITICAL_DEPENDENCY_FAILURE",
  "DRIVER_RESPONSIBILITY_CONFIRMED",
]);

const cases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x03_002_013 + caseNumber);
  const confirmedExemption = APPROVED_EXEMPTIONS[
    caseNumber % APPROVED_EXEMPTIONS.length
  ];

  return Object.freeze({
    caseNumber,
    confirmedExemption,
    ruleVersion: `workshop-property-03-v${random.nextInt(1, 10_000)}`,
    chargeType: random.pick(["CANCELLATION_FEE", "NO_SHOW_FEE"]),
    requester: random.pick(["PASSENGER", "DRIVER"]),
    liableParty: random.pick(["PASSENGER", "DRIVER"]),
    lowerPriority: Object.freeze({
      noShowEligible: random.boolean(),
      noShowAmount: random.nextInt(1, 20_000),
      cancellationAmount: random.nextInt(1, 20_000),
      freeWindowElapsedSeconds: random.nextInt(0, 10_000),
      adjustmentBasisPoints: random.nextInt(0, 50_000),
      discount: random.nextInt(0, 20_000),
      estimatedTripFare: random.nextInt(0, 20_000),
    }),
  });
}, 102);

function feeTrace(amount, lowerPriority) {
  return Object.freeze({
    baseFeeMinor: amount,
    adjustmentBasisPoints: lowerPriority.adjustmentBasisPoints,
    adjustedFeeMinor: amount,
    discountMinor: lowerPriority.discount,
    afterDiscountMinor: amount,
    estimatedTripFareMinor: lowerPriority.estimatedTripFare,
    capped: false,
    finalFeeMinor: amount,
  });
}

// **Validates: Requirements REQ-002.5, REQ-002.6, REQ-002.7, REQ-004.1, REQ-004.3, REQ-013.1, REQ-013.2, REQ-013.3**
propertyTest(3, "Strong exemptions short-circuit to a complete zero Decision", async () => {
  const [
    { DecisionEngine },
    { InMemoryDecisionStore },
    { AuditRecorder },
    {
      InMemoryPaymentChargeFake,
      InMemoryCompensationSettlementFake,
    },
  ] = await Promise.all([
    import("../../dist/domain/decision-engine.js"),
    import("../../dist/adapters/in-memory-decision-store.js"),
    import("../../dist/application/audit-recorder.js"),
    import("../../dist/adapters/in-memory-fakes.js"),
  ]);

  assert.equal(cases.length, 102);
  assert.deepEqual(
    new Set(cases.map(({ confirmedExemption }) => confirmedExemption)),
    new Set(APPROVED_EXEMPTIONS),
  );

  for (const testCase of cases) {
    const engine = new DecisionEngine();
    const lowerPriorityFee = Object.freeze({
      ruleVersion: testCase.ruleVersion,
      charge: moneyMinor(testCase.lowerPriority.noShowAmount),
      trace: feeTrace(testCase.lowerPriority.noShowAmount, testCase.lowerPriority),
    });
    const result = engine.evaluate({
      confirmedExemption: testCase.confirmedExemption,
      confirmedLiableParty: testCase.liableParty,
      capturedRuleVersion: testCase.ruleVersion,
      noShowEligibility: Object.freeze({
        status: "AVAILABLE",
        value: testCase.lowerPriority.noShowEligible,
      }),
      noShowFee: lowerPriorityFee,
      freeWindow: testCase.lowerPriority.freeWindowElapsedSeconds <= 120
        ? Object.freeze({
            status: "AVAILABLE",
            outcome: "FREE_CANCELLATION_WINDOW",
            elapsedSeconds: testCase.lowerPriority.freeWindowElapsedSeconds,
            charge: moneyMinor(0),
            publicReasonCode: "FREE_CANCELLATION_WINDOW",
          })
        : Object.freeze({
            status: "AVAILABLE",
            outcome: "CONTINUE",
            elapsedSeconds: testCase.lowerPriority.freeWindowElapsedSeconds,
          }),
      cancellationFee: Object.freeze({
        ruleVersion: testCase.ruleVersion,
        charge: moneyMinor(testCase.lowerPriority.cancellationAmount),
        trace: feeTrace(
          testCase.lowerPriority.cancellationAmount,
          testCase.lowerPriority,
        ),
      }),
    });

    assert.deepEqual(result, {
      status: "DECIDED",
      selectedCandidate: "STRONG_EXEMPTION",
      confirmedExemption: testCase.confirmedExemption,
      liableParty: testCase.liableParty,
      charge: moneyMinor(0),
      publicReasonCode: "STRONG_EXEMPTION",
      ruleVersion: testCase.ruleVersion,
    });
    assert.equal(Object.hasOwn(result, "feeTrace"), false);

    const key = `property-03:${testCase.caseNumber}:${testCase.chargeType}`;
    const decision = Object.freeze({
      decisionId: `property-03-decision-${testCase.caseNumber}`,
      decisionIdempotencyKey: key,
      orderId: `property-03-order-${testCase.caseNumber}`,
      chargeType: testCase.chargeType,
      cancelInitiator: testCase.requester,
      liableParty: result.liableParty,
      charge: result.charge,
      publicReasonCode: result.publicReasonCode,
      processingMode: "NORMAL",
      ruleVersion: result.ruleVersion,
    });
    const store = new InMemoryDecisionStore();
    const audit = new AuditRecorder();
    const payment = new InMemoryPaymentChargeFake();
    const compensation = new InMemoryCompensationSettlementFake();

    const first = await store.createOrGet(key, async () => decision);
    if (first.created) {
      audit.record({
        decision: first.decision,
        requestedAtUtc: "2025-01-01T00:00:00.000Z",
        acceptedAtUtc: "2025-01-01T00:00:00.001Z",
        confirmedExemption: testCase.confirmedExemption,
      });
    }
    const repeated = await store.createOrGet(key, async () => {
      assert.fail("a strong-exemption winner must not be recreated");
    });

    assert.equal(first.created, true);
    assert.equal(repeated.created, false);
    assert.strictEqual(repeated.decision, decision);
    assert.equal(audit.list().length, 1);
    assert.equal(audit.list()[0].finalAmount, moneyMinor(0));
    assert.equal(audit.list()[0].ruleVersion, testCase.ruleVersion);
    assert.equal(audit.list()[0].confirmedExemption, testCase.confirmedExemption);
    assert.equal(payment.records.length, 0);
    assert.equal(compensation.records.length, 0);
  }
});

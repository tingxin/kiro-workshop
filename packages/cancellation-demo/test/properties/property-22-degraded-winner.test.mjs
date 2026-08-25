import assert from "node:assert/strict";

import {
  buildDecisionIdempotencyKey,
  moneyMinor,
} from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const unavailable = Object.freeze({ status: "UNAVAILABLE" });
const available = (value) => Object.freeze({ status: "AVAILABLE", value });

const random = createSeededRandom(0x22de6ade);
const cases = generatePropertyCases((caseNumber) => {
  const chargeType = random.pick(["CANCELLATION_FEE", "NO_SHOW_FEE"]);
  const orderId = `degraded-order-${caseNumber}-${random.nextUint32()}`;
  const key = buildDecisionIdempotencyKey(orderId, chargeType);
  const includeCapturedVersion = random.boolean();

  return Object.freeze({
    key,
    retryCount: random.nextInt(1, 12),
    recoveredAmount: random.nextInt(1, 5_000),
    winner: Object.freeze({
      decisionId: `degraded-decision-${caseNumber}`,
      decisionIdempotencyKey: key,
      orderId,
      chargeType,
      cancelInitiator: random.pick(["PASSENGER", "DRIVER"]),
      charge: moneyMinor(0),
      publicReasonCode: "DEGRADED_NO_CHARGE",
      processingMode: "DEGRADED",
      ...(includeCapturedVersion
        ? { ruleVersion: `captured-before-failure-${caseNumber}` }
        : {}),
    }),
  });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-017.7, REQ-017.8**
propertyTest(22, "A degraded winner cannot become a later charge", async () => {
  const {
    InMemoryPaymentChargeFake,
    InMemoryRuleRepositoryConfigurationFake,
    createWorkshopRuleConfigurationSnapshot,
  } = await import("../../dist/adapters/in-memory-fakes.js");
  const { InMemoryDecisionStore } = await import(
    "../../dist/adapters/in-memory-decision-store.js"
  );

  for (const testCase of cases) {
    const store = new InMemoryDecisionStore();
    const payment = new InMemoryPaymentChargeFake();
    const rules = new InMemoryRuleRepositoryConfigurationFake(unavailable);

    const unavailableSnapshot = await rules.getSnapshot();
    assert.equal(unavailableSnapshot.status, "UNAVAILABLE");

    const initial = await store.createOrGet(testCase.key, async () => testCase.winner);
    assert.equal(initial.created, true);
    assert.strictEqual(initial.decision, testCase.winner);

    rules.setResult(available(createWorkshopRuleConfigurationSnapshot()));
    assert.equal((await rules.getSnapshot()).status, "AVAILABLE");

    let recoveryEvaluationCalls = 0;
    const retries = await Promise.all(
      Array.from({ length: testCase.retryCount }, (_, retryNumber) =>
        store.createOrGet(testCase.key, async () => {
          recoveryEvaluationCalls += 1;
          const recoveredDecision = Object.freeze({
            ...testCase.winner,
            decisionId: `recovered-${retryNumber}`,
            charge: moneyMinor(testCase.recoveredAmount),
            publicReasonCode: testCase.chargeType === "NO_SHOW_FEE"
              ? "PASSENGER_NO_SHOW_FEE"
              : "PASSENGER_CANCELLATION_FEE",
            processingMode: "NORMAL",
            ruleVersion: `recovered-rules-${retryNumber}`,
          });
          await payment.recordSyntheticCharge({
            decisionIdempotencyKey: testCase.key,
            decisionId: recoveredDecision.decisionId,
            amount: recoveredDecision.charge,
          });
          return recoveredDecision;
        }),
      ),
    );

    assert.equal(recoveryEvaluationCalls, 0);
    assert.equal(payment.records.length, 0);
    assert.strictEqual(store.inspect(testCase.key), testCase.winner);
    for (const retry of retries) {
      assert.equal(retry.created, false);
      assert.strictEqual(retry.decision, testCase.winner);
      assert.equal(retry.decision.charge, 0);
      assert.equal(retry.decision.publicReasonCode, "DEGRADED_NO_CHARGE");
      assert.equal(retry.decision.processingMode, "DEGRADED");
    }
  }
});

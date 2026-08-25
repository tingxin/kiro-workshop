import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const CASE_COUNT = PROPERTY_CASE_COUNT + 20;
const MODES = ["REPEATED", "CONCURRENT", "OUT_OF_ORDER"];

function createDecision(caseNumber, candidateNumber, key, charge, compensation) {
  return Object.freeze({
    decisionId: `decision-${caseNumber}-${candidateNumber}`,
    decisionIdempotencyKey: key,
    orderId: `order-${caseNumber}`,
    chargeType: caseNumber % 2 === 0 ? "CANCELLATION_FEE" : "NO_SHOW_FEE",
    cancelInitiator: candidateNumber % 2 === 0 ? "PASSENGER" : "DRIVER",
    liableParty: candidateNumber % 2 === 0 ? "DRIVER" : "PASSENGER",
    charge: moneyMinor(charge),
    ...(compensation === 0
      ? {}
      : { driverCompensation: moneyMinor(compensation) }),
    publicReasonCode:
      caseNumber % 2 === 0
        ? "PASSENGER_CANCELLATION_FEE"
        : "PASSENGER_NO_SHOW_FEE",
    processingMode: "NORMAL",
    ruleVersion: `rules-${caseNumber}`,
  });
}

function generateCase(caseNumber) {
  const random = createSeededRandom(0x15_000 + caseNumber);
  const requestCount = random.nextInt(2, 8);
  const charge = random.boolean() ? random.nextInt(1, 2_000) : 0;
  const compensation = random.boolean() ? random.nextInt(1, 2_000) : 0;
  const key = `same-key-${caseNumber}`;
  const candidates = Array.from({ length: requestCount }, (_, candidateNumber) =>
    createDecision(
      caseNumber,
      candidateNumber,
      key,
      candidateNumber === 0 ? charge : random.nextInt(0, 2_000),
      candidateNumber === 0 ? compensation : random.nextInt(0, 2_000),
    ),
  );
  const offset = random.nextInt(0, requestCount - 1);
  const outOfOrder = candidates.slice(offset).concat(candidates.slice(0, offset));

  return Object.freeze({
    caseNumber,
    key,
    mode: MODES[caseNumber % MODES.length],
    candidates: Object.freeze(candidates),
    outOfOrder: Object.freeze(outOfOrder),
  });
}

function commitInput(decision) {
  return Object.freeze({
    decisionIdempotencyKey: decision.decisionIdempotencyKey,
    createDecision: async () => decision,
    requestedAtUtc: "2025-01-01T00:00:00.000Z",
    acceptedAtUtc: "2025-01-01T00:00:00.001Z",
  });
}

propertyTest(15, "Creation effects occur at most once", async () => {
  const [
    { InMemoryDecisionStore },
    { AuditRecorder },
    { DecisionCommitCoordinator },
    {
      InMemoryCompensationSettlementFake,
      InMemoryPaymentChargeFake,
    },
  ] = await Promise.all([
    import("../../dist/adapters/in-memory-decision-store.js"),
    import("../../dist/application/audit-recorder.js"),
    import("../../dist/application/decision-commit-coordinator.js"),
    import("../../dist/adapters/in-memory-fakes.js"),
  ]);

  const cases = generatePropertyCases(generateCase, CASE_COUNT);

  for (const generated of cases) {
    const store = new InMemoryDecisionStore();
    const audit = new AuditRecorder();
    const payment = new InMemoryPaymentChargeFake();
    const compensation = new InMemoryCompensationSettlementFake();
    const coordinator = new DecisionCommitCoordinator(
      store,
      audit,
      payment,
      compensation,
    );

    let results;
    if (generated.mode === "REPEATED") {
      results = [];
      for (const candidate of generated.candidates) {
        results.push(await coordinator.commit(commitInput(candidate)));
      }
    } else {
      const collection =
        generated.mode === "OUT_OF_ORDER"
          ? generated.outOfOrder
          : generated.candidates;
      results = await Promise.all(
        collection.map((candidate) => coordinator.commit(commitInput(candidate))),
      );
    }

    const winner = results[0].decision;
    assert.equal(results.filter((result) => result.created).length, 1);
    for (const result of results) {
      assert.strictEqual(result.decision, winner);
    }
    assert.strictEqual(store.inspect(generated.key), winner);
    assert.equal(payment.records.length <= 1, true);
    assert.equal(compensation.records.length <= 1, true);
    assert.equal(audit.list().length, 1);
    assert.equal(audit.list()[0].decisionId, winner.decisionId);

    if (payment.records.length === 1) {
      assert.equal(payment.records[0].decisionId, winner.decisionId);
      assert.equal(payment.records[0].amount, winner.charge);
    }
    if (compensation.records.length === 1) {
      assert.equal(compensation.records[0].decisionId, winner.decisionId);
      assert.equal(
        compensation.records[0].amount,
        winner.driverCompensation,
      );
    }
  }
});

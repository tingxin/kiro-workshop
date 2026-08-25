import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function decision(overrides = {}) {
  return Object.freeze({
    decisionId: "decision-1",
    decisionIdempotencyKey: "order-1:CANCELLATION_FEE",
    orderId: "order-1",
    chargeType: "CANCELLATION_FEE",
    cancelInitiator: "PASSENGER",
    liableParty: "PASSENGER",
    charge: moneyMinor(500),
    driverCompensation: moneyMinor(300),
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    processingMode: "NORMAL",
    ruleVersion: "workshop-rules-1",
    ...overrides,
  });
}

async function dependencies({ payment, compensation } = {}) {
  const [
    { DecisionCommitCoordinator },
    { AuditRecorder },
    { InMemoryDecisionStore },
    { InMemoryPaymentChargeFake, InMemoryCompensationSettlementFake },
  ] = await Promise.all([
    import("../dist/application/decision-commit-coordinator.js"),
    import("../dist/application/audit-recorder.js"),
    import("../dist/adapters/in-memory-decision-store.js"),
    import("../dist/adapters/in-memory-fakes.js"),
  ]);

  const store = new InMemoryDecisionStore();
  const audit = new AuditRecorder();
  const paymentPort = payment ?? new InMemoryPaymentChargeFake();
  const compensationPort = compensation ?? new InMemoryCompensationSettlementFake();
  return {
    coordinator: new DecisionCommitCoordinator(
      store,
      audit,
      paymentPort,
      compensationPort,
    ),
    store,
    audit,
    paymentPort,
    compensationPort,
  };
}

const commitInput = (createDecision) => ({
  decisionIdempotencyKey: "order-1:CANCELLATION_FEE",
  createDecision,
  requestedAtUtc: "2025-01-01T00:00:00.000Z",
  acceptedAtUtc: "2025-01-01T00:00:00.100Z",
});

test("4.4 only the first-created Decision audits and emits applicable synthetic effects", async () => {
  const { coordinator, audit, paymentPort, compensationPort } = await dependencies();
  const winner = decision();
  let createCalls = 0;

  const first = await coordinator.commit(commitInput(async () => {
    createCalls += 1;
    return winner;
  }));
  const duplicate = await coordinator.commit(commitInput(async () => {
    createCalls += 1;
    return decision({ decisionId: "loser" });
  }));

  assert.deepEqual(first, { decision: winner, created: true });
  assert.equal(duplicate.created, false);
  assert.strictEqual(duplicate.decision, winner);
  assert.equal(createCalls, 1);
  assert.equal(audit.list().length, 1);
  assert.deepEqual(paymentPort.records, [{
    decisionIdempotencyKey: winner.decisionIdempotencyKey,
    decisionId: winner.decisionId,
    amount: moneyMinor(500),
  }]);
  assert.deepEqual(compensationPort.records, [{
    decisionIdempotencyKey: winner.decisionIdempotencyKey,
    decisionId: winner.decisionId,
    amount: moneyMinor(300),
  }]);
});

test("4.4 zero and degraded Decisions never emit passenger charges", async () => {
  for (const candidate of [
    decision({
      decisionId: "zero-normal",
      charge: moneyMinor(0),
      driverCompensation: undefined,
      publicReasonCode: "FREE_CANCELLATION_WINDOW",
    }),
    decision({
      decisionId: "zero-degraded",
      charge: moneyMinor(0),
      driverCompensation: undefined,
      publicReasonCode: "DEGRADED_NO_CHARGE",
      processingMode: "DEGRADED",
      ruleVersion: undefined,
    }),
  ]) {
    const { coordinator, audit, paymentPort } = await dependencies();
    await coordinator.commit(commitInput(async () => candidate));
    assert.equal(paymentPort.records.length, 0);
    assert.equal(audit.list().length, 1);
  }
});

test("4.4 same-key waiters are released only after first-creation effects finish", async () => {
  const effectEntered = deferred();
  const releaseEffect = deferred();
  const payment = {
    async recordSyntheticCharge() {
      effectEntered.resolve();
      await releaseEffect.promise;
      return { status: "SYNTHETIC_SUCCESS" };
    },
  };
  const compensation = {
    async recordSyntheticCompensation() {
      return { status: "SYNTHETIC_SUCCESS" };
    },
  };
  const { coordinator, audit } = await dependencies({ payment, compensation });
  const winner = decision({ driverCompensation: undefined });
  let duplicateResolved = false;

  const first = coordinator.commit(commitInput(async () => winner));
  await effectEntered.promise;
  const duplicate = coordinator.commit(commitInput(async () => {
    throw new Error("duplicate creation callback must not run");
  })).then((result) => {
    duplicateResolved = true;
    return result;
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(duplicateResolved, false);
  assert.equal(audit.list().length, 1);

  releaseEffect.resolve();
  const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);
  assert.equal(firstResult.created, true);
  assert.equal(duplicateResult.created, false);
  assert.strictEqual(duplicateResult.decision, winner);
});

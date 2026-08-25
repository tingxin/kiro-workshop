import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDecisionIdempotencyKey,
  moneyMinor,
} from "@company/cancellation-policy-kit";

import { AsyncRaceBarrier } from "../support/deterministic-generators.mjs";

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function decisionFor({
  decisionId,
  key,
  orderId,
  cancelInitiator,
  liableParty,
  charge = moneyMinor(500),
  driverCompensation = moneyMinor(400),
}) {
  return Object.freeze({
    decisionId,
    decisionIdempotencyKey: key,
    orderId,
    chargeType: "CANCELLATION_FEE",
    cancelInitiator,
    liableParty,
    charge,
    driverCompensation,
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    processingMode: "NORMAL",
    ruleVersion: "workshop-rules-race",
  });
}

async function createHarness() {
  const [
    { InMemoryDecisionStore },
    { CancelInitiatorRegistry },
    { AuditRecorder },
    {
      InMemoryPaymentChargeFake,
      InMemoryCompensationSettlementFake,
    },
  ] = await Promise.all([
    import("../../dist/adapters/in-memory-decision-store.js"),
    import("../../dist/application/cancel-initiator-registry.js"),
    import("../../dist/application/audit-recorder.js"),
    import("../../dist/adapters/in-memory-fakes.js"),
  ]);

  const store = new InMemoryDecisionStore();
  const initiators = new CancelInitiatorRegistry();
  const audit = new AuditRecorder();
  const payment = new InMemoryPaymentChargeFake();
  const compensation = new InMemoryCompensationSettlementFake();

  async function commit(key, create, auditInput) {
    const result = await store.createOrGet(key, create);
    if (result.created) {
      audit.record({ decision: result.decision, ...auditInput });
      if (result.decision.charge > 0) {
        await payment.recordSyntheticCharge({
          decisionIdempotencyKey: key,
          decisionId: result.decision.decisionId,
          amount: result.decision.charge,
        });
      }
      if (result.decision.driverCompensation !== undefined) {
        await compensation.recordSyntheticCompensation({
          decisionIdempotencyKey: key,
          decisionId: result.decision.decisionId,
          amount: result.decision.driverCompensation,
        });
      }
    }
    return result.decision;
  }

  return { store, initiators, audit, payment, compensation, commit };
}

test("5.7 forced same-key race runs one callback and returns one Decision with at-most-once effects", async () => {
  const harness = await createHarness();
  const orderId = "order-forced-race";
  const key = buildDecisionIdempotencyKey(orderId, "CANCELLATION_FEE");
  const winner = decisionFor({
    decisionId: "decision-winner",
    key,
    orderId,
    cancelInitiator: "PASSENGER",
    liableParty: "PASSENGER",
  });
  const allCallersReady = new AsyncRaceBarrier(8);
  const winnerEntered = deferred();
  const releaseWinner = deferred();
  let callbackCalls = 0;

  const requests = Array.from({ length: 8 }, (_, index) =>
    (async () => {
      await allCallersReady.wait();
      return harness.commit(
        key,
        async () => {
          callbackCalls += 1;
          if (index === 0) {
            winnerEntered.resolve();
            await releaseWinner.promise;
            return winner;
          }
          return decisionFor({
            decisionId: `decision-loser-${index}`,
            key,
            orderId,
            cancelInitiator: "DRIVER",
            liableParty: "DRIVER",
          });
        },
        {
          requestedAtUtc: "2025-01-01T00:00:00.000Z",
          acceptedAtUtc: "2025-01-01T00:00:00.001Z",
        },
      );
    })(),
  );

  await winnerEntered.promise;
  releaseWinner.resolve();
  const decisions = await Promise.all(requests);

  assert.equal(callbackCalls, 1);
  assert.ok(decisions.every((decision) => decision === winner));
  assert.strictEqual(harness.store.inspect(key), winner);
  assert.deepEqual(harness.store.inspectAll(), [[key, winner]]);
  assert.equal(harness.audit.list().length, 1);
  assert.equal(harness.audit.list()[0].decisionId, winner.decisionId);
  assert.equal(harness.payment.records.length, 1);
  assert.equal(harness.compensation.records.length, 1);
  assert.equal(harness.payment.records[0].decisionId, winner.decisionId);
  assert.equal(harness.compensation.records[0].decisionId, winner.decisionId);
});

test("5.7 out-of-order same-key requests preserve first initiator independently from later liability", async () => {
  const harness = await createHarness();
  const orderId = "order-initiator-race";
  const key = buildDecisionIdempotencyKey(orderId, "CANCELLATION_FEE");
  const firstAccepted = harness.initiators.createOrGet(
    orderId,
    "PASSENGER",
    "2025-02-01T00:00:00.001Z",
  );
  const driverRequestReleased = deferred();
  const passengerCreationEntered = deferred();
  const releasePassengerCreation = deferred();
  let callbackCalls = 0;
  let laterLiabilityCallbackCalled = false;

  const passengerRequest = harness.commit(
    key,
    async () => {
      callbackCalls += 1;
      passengerCreationEntered.resolve();
      await releasePassengerCreation.promise;
      return decisionFor({
        decisionId: "decision-first-accepted",
        key,
        orderId,
        cancelInitiator: firstAccepted.cancelInitiator,
        liableParty: "DRIVER",
      });
    },
    {
      requestedAtUtc: "2025-02-01T00:00:00.000Z",
      acceptedAtUtc: firstAccepted.acceptedAtUtc,
    },
  );

  await passengerCreationEntered.promise;
  const driverRequest = (async () => {
    const retained = harness.initiators.createOrGet(
      orderId,
      "DRIVER",
      "2025-02-01T00:00:00.002Z",
    );
    assert.strictEqual(retained, firstAccepted);
    driverRequestReleased.resolve();
    return harness.commit(
      key,
      async () => {
        callbackCalls += 1;
        laterLiabilityCallbackCalled = true;
        return decisionFor({
          decisionId: "decision-later-liability",
          key,
          orderId,
          cancelInitiator: retained.cancelInitiator,
          liableParty: "PASSENGER",
        });
      },
      {
        requestedAtUtc: "2025-02-01T00:00:01.000Z",
        acceptedAtUtc: retained.acceptedAtUtc,
      },
    );
  })();

  await driverRequestReleased.promise;
  releasePassengerCreation.resolve();
  const [passengerResult, driverResult] = await Promise.all([
    passengerRequest,
    driverRequest,
  ]);

  assert.equal(callbackCalls, 1);
  assert.equal(laterLiabilityCallbackCalled, false);
  assert.strictEqual(driverResult, passengerResult);
  assert.equal(passengerResult.cancelInitiator, "PASSENGER");
  assert.equal(passengerResult.liableParty, "DRIVER");
  assert.notEqual(passengerResult.cancelInitiator, passengerResult.liableParty);
  assert.strictEqual(harness.initiators.get(orderId), firstAccepted);
  assert.equal(harness.audit.list().length, 1);
  assert.equal(harness.payment.records.length, 1);
  assert.equal(harness.compensation.records.length, 1);
});

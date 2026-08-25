import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

function createDecision(decisionId, key, orderId = "order-1") {
  return Object.freeze({
    decisionId,
    decisionIdempotencyKey: key,
    orderId,
    chargeType: "CANCELLATION_FEE",
    cancelInitiator: "PASSENGER",
    charge: moneyMinor(0),
    publicReasonCode: "FREE_CANCELLATION_WINDOW",
    processingMode: "NORMAL",
    ruleVersion: "rules-1",
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

test("4.1 DecisionStore serializes same-key creation and returns one first-write-wins Decision", async () => {
  const { InMemoryDecisionStore } = await import(
    "../dist/adapters/in-memory-decision-store.js"
  );
  const store = new InMemoryDecisionStore();
  const key = "decision:order-1:CANCELLATION_FEE";
  const winner = createDecision("decision-1", key);
  const creationEntered = deferred();
  const releaseCreation = deferred();
  let creationCalls = 0;

  const first = store.createOrGet(key, async () => {
    creationCalls += 1;
    creationEntered.resolve();
    await releaseCreation.promise;
    return winner;
  });
  await creationEntered.promise;

  const waitingCalls = Array.from({ length: 5 }, (_, index) =>
    store.createOrGet(key, async () => {
      creationCalls += 1;
      return createDecision(`loser-${index}`, key);
    }),
  );
  releaseCreation.resolve();

  const [firstResult, ...waitingResults] = await Promise.all([
    first,
    ...waitingCalls,
  ]);

  assert.equal(creationCalls, 1);
  assert.deepEqual(firstResult, { decision: winner, created: true });
  for (const result of waitingResults) {
    assert.equal(result.created, false);
    assert.strictEqual(result.decision, winner);
  }

  let laterCreationCalled = false;
  const laterResult = await store.createOrGet(key, async () => {
    laterCreationCalled = true;
    return createDecision("later-loser", key);
  });
  assert.equal(laterCreationCalled, false);
  assert.equal(laterResult.created, false);
  assert.strictEqual(laterResult.decision, winner);
});

test("4.1 DecisionStore keeps keys independent and permits retry after failed creation", async () => {
  const { InMemoryDecisionStore } = await import(
    "../dist/adapters/in-memory-decision-store.js"
  );
  const store = new InMemoryDecisionStore();
  const firstKey = "decision:order-1:CANCELLATION_FEE";
  const secondKey = "decision:order-2:NO_SHOW_FEE";
  const firstDecision = createDecision("decision-1", firstKey, "order-1");
  const secondDecision = Object.freeze({
    ...createDecision("decision-2", secondKey, "order-2"),
    chargeType: "NO_SHOW_FEE",
  });

  await assert.rejects(
    store.createOrGet(firstKey, async () => {
      throw new Error("synthetic creation failure");
    }),
    /synthetic creation failure/,
  );

  const [first, second] = await Promise.all([
    store.createOrGet(firstKey, async () => firstDecision),
    store.createOrGet(secondKey, async () => secondDecision),
  ]);
  assert.deepEqual(first, { decision: firstDecision, created: true });
  assert.deepEqual(second, { decision: secondDecision, created: true });
});

test("4.1 DecisionStore exposes deterministic inspection and reset helpers", async () => {
  const { InMemoryDecisionStore } = await import(
    "../dist/adapters/in-memory-decision-store.js"
  );
  const store = new InMemoryDecisionStore();
  const zKey = "z-key";
  const aKey = "a-key";
  const zDecision = createDecision("decision-z", zKey, "order-z");
  const aDecision = createDecision("decision-a", aKey, "order-a");

  await store.createOrGet(zKey, async () => zDecision);
  await store.createOrGet(aKey, async () => aDecision);

  assert.strictEqual(store.inspect(zKey), zDecision);
  assert.deepEqual(store.inspectAll(), [
    [aKey, aDecision],
    [zKey, zDecision],
  ]);

  store.reset();
  assert.equal(store.inspect(zKey), undefined);
  assert.deepEqual(store.inspectAll(), []);
});

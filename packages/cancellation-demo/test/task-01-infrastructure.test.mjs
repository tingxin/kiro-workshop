import assert from "node:assert/strict";
import test from "node:test";

import {
  AsyncRaceBarrier,
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  permutations,
  propertyTag,
  sensitiveSentinels,
  sequences,
} from "./support/deterministic-generators.mjs";
import {
  FixedClock,
  InMemoryCompensationSettlementFake,
  InMemoryLegacyFake,
  InMemoryMapFake,
  InMemoryNotificationFake,
  InMemoryPaymentChargeFake,
  InMemoryRiskFake,
  InMemoryRuleRepositoryConfigurationFake,
  InMemorySupportFake,
  UnavailableClock,
  createDeterministicDecisionIdSource,
} from "../dist/adapters/in-memory-fakes.js";

const available = (value) => ({ status: "AVAILABLE", value });
const unavailable = { status: "UNAVAILABLE" };

test("deterministic property support produces reproducible 100-case data", () => {
  assert.equal(PROPERTY_CASE_COUNT, 100);
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);
  const firstCases = generatePropertyCases((index) => [index, first.nextInt(0, 10)]);
  const secondCases = generatePropertyCases((index) => [index, second.nextInt(0, 10)]);

  assert.equal(firstCases.length, 100);
  assert.deepEqual(firstCases, secondCases);
  assert.equal(
    propertyTag(7, "Verified arrival is exactly the approved Map predicate"),
    "Feature: cancellation-no-show-fee-system, Property 7: Verified arrival is exactly the approved Map predicate",
  );
});

test("sequence, permutation, barrier, and sensitive-sentinel helpers are deterministic", async () => {
  assert.deepEqual(permutations(["A", "B", "C"]), [
    ["A", "B", "C"],
    ["A", "C", "B"],
    ["B", "A", "C"],
    ["B", "C", "A"],
    ["C", "A", "B"],
    ["C", "B", "A"],
  ]);
  assert.deepEqual(sequences(["A", "B"], 2), [
    ["A", "A"],
    ["A", "B"],
    ["B", "A"],
    ["B", "B"],
  ]);

  const firstSentinels = sensitiveSentinels(3);
  const secondSentinels = sensitiveSentinels(4);
  assert.notDeepEqual(firstSentinels, secondSentinels);
  assert.equal(new Set(Object.values(firstSentinels)).size, Object.keys(firstSentinels).length);

  const barrier = new AsyncRaceBarrier(2);
  let passed = false;
  const firstWaiter = barrier.wait().then(() => {
    passed = true;
  });
  await Promise.resolve();
  assert.equal(passed, false);
  await Promise.all([firstWaiter, barrier.wait()]);
  assert.equal(passed, true);
});

test("Map and Rule Configuration fakes provide configurable explicit availability", async () => {
  const map = new InMemoryMapFake(available({
    distanceToPickupMeters: 200,
    continuouslyWithinThresholdSeconds: 30,
  }));
  assert.equal(map.adapterKind, "IN_MEMORY_FAKE");
  assert.deepEqual(await map.getArrivalEvidence("order-synthetic"), available({
    distanceToPickupMeters: 200,
    continuouslyWithinThresholdSeconds: 30,
  }));
  map.setResult(unavailable);
  assert.deepEqual(await map.getArrivalEvidence("order-synthetic"), unavailable);

  const rules = new InMemoryRuleRepositoryConfigurationFake();
  const result = await rules.getSnapshot();
  assert.equal(rules.adapterKind, "IN_MEMORY_FAKE");
  assert.equal(result.status, "AVAILABLE");
  assert.equal(result.value.ruleVersion, "workshop-fee-v1");
  assert.deepEqual(result.value.baseFees, {
    EXPRESS: { CANCELLATION_FEE: 500, NO_SHOW_FEE: 800 },
    PREMIUM: { CANCELLATION_FEE: 800, NO_SHOW_FEE: 1200 },
    BUSINESS: { CANCELLATION_FEE: 800, NO_SHOW_FEE: 1200 },
  });
  rules.setResult(unavailable);
  assert.deepEqual(await rules.getSnapshot(), unavailable);
});

test("synthetic payment and compensation fakes record only successful synthetic actions", async () => {
  const chargeInput = {
    decisionIdempotencyKey: "order-synthetic:CANCELLATION_FEE",
    decisionId: "decision-synthetic-1",
    amount: 500,
  };
  const payment = new InMemoryPaymentChargeFake();
  assert.deepEqual(await payment.recordSyntheticCharge(chargeInput), { status: "SYNTHETIC_SUCCESS" });
  assert.deepEqual(payment.records, [chargeInput]);
  payment.setStatus("UNAVAILABLE");
  assert.deepEqual(await payment.recordSyntheticCharge({ ...chargeInput, decisionId: "decision-synthetic-2" }), {
    status: "UNAVAILABLE",
  });
  assert.equal(payment.records.length, 1);

  const compensation = new InMemoryCompensationSettlementFake();
  assert.deepEqual(await compensation.recordSyntheticCompensation(chargeInput), {
    status: "SYNTHETIC_SUCCESS",
  });
  assert.deepEqual(compensation.records, [chargeInput]);
  compensation.reset();
  assert.deepEqual(compensation.records, []);
});

test("remaining external fakes and deterministic infrastructure expose only approved behavior", async () => {
  const notification = new InMemoryNotificationFake();
  const risk = new InMemoryRiskFake();
  assert.equal(notification.adapterKind, "IN_MEMORY_FAKE");
  assert.equal(risk.adapterKind, "IN_MEMORY_FAKE");

  const legacy = new InMemoryLegacyFake();
  assert.deepEqual(await legacy.route({ orderId: "legacy-synthetic" }), {
    publicReasonCode: "LEGACY_FLOW",
    compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
  });

  const support = new InMemorySupportFake();
  const view = {
    decisionId: "decision-synthetic-1",
    orderId: "order-synthetic",
    cancelInitiator: "PASSENGER",
    chargedAmount: 500,
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    ruleVersion: "workshop-fee-v1",
    summary: "synthetic safe summary",
  };
  support.setDecisionView(view);
  assert.deepEqual(await support.getDecisionView(view.decisionId), view);
  assert.equal(await support.getDecisionView("missing"), undefined);

  assert.deepEqual(new FixedClock("2025-01-01T00:00:00.000Z").nowUtc(), available("2025-01-01T00:00:00.000Z"));
  assert.deepEqual(new UnavailableClock().nowUtc(), unavailable);

  const ids = createDeterministicDecisionIdSource("decision-synthetic", 7);
  assert.equal(ids.nextDecisionId(), "decision-synthetic-7");
  assert.equal(ids.nextDecisionId(), "decision-synthetic-8");
});

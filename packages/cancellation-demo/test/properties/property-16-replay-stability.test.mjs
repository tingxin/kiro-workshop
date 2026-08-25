import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const available = (value) => Object.freeze({ status: "AVAILABLE", value });
const serviceTypes = Object.freeze(["EXPRESS", "PREMIUM", "BUSINESS"]);
const chargeTypes = Object.freeze(["CANCELLATION_FEE", "NO_SHOW_FEE"]);

function configuration(ruleVersion, amountBase) {
  return Object.freeze({
    ruleVersion,
    baseFees: Object.freeze({
      EXPRESS: Object.freeze({
        CANCELLATION_FEE: moneyMinor(amountBase),
        NO_SHOW_FEE: moneyMinor(amountBase + 100),
      }),
      PREMIUM: Object.freeze({
        CANCELLATION_FEE: moneyMinor(amountBase + 200),
        NO_SHOW_FEE: moneyMinor(amountBase + 300),
      }),
      BUSINESS: Object.freeze({
        CANCELLATION_FEE: moneyMinor(amountBase + 400),
        NO_SHOW_FEE: moneyMinor(amountBase + 500),
      }),
    }),
  });
}

const random = createSeededRandom(0x16a5_7ab1);
const cases = generatePropertyCases((index) => {
  const ruleVersion = `property-16-history-v${index}-${random.nextUint32()}`;
  const historicalConfiguration = configuration(
    ruleVersion,
    random.nextInt(100, 2_000),
  );
  const currentConfiguration = configuration(
    `property-16-current-v${index}-${random.nextUint32()}`,
    random.nextInt(3_000, 5_000),
  );
  const chargeType = random.pick(chargeTypes);
  const serviceType = random.pick(serviceTypes);
  const cancellationSecond = random.nextInt(121, 240);
  const cancellationAtUtc = new Date(
    Date.UTC(2025, 0, 1, 0, 0, cancellationSecond),
  ).toISOString();

  return Object.freeze({
    key: `property-16-order-${index}:${chargeType}`,
    decisionId: `property-16-decision-${index}`,
    orderId: `property-16-order-${index}`,
    cancellationAtUtc,
    historicalConfiguration,
    currentConfiguration,
    snapshot: Object.freeze({
      chargeType,
      serviceType,
      cancelInitiator: random.pick(["PASSENGER", "DRIVER"]),
      confirmedLiableParty: random.pick(["PASSENGER", "DRIVER"]),
      driverAcceptedAtUtc: "2025-01-01T00:00:00.000Z",
      mapArrivalEvidence: available(Object.freeze({
        distanceToPickupMeters: 200,
        continuouslyWithinThresholdSeconds: 30,
      })),
      noShowEvidence: available(Object.freeze({
        waitedAfterVerifiedArrivalSeconds: 300,
        inPlatformContactAttempts: 1,
        inPlatformExplicitRefusal: random.boolean(),
      })),
      estimatedTripFare: moneyMinor(10_000),
      adjustmentBasisPoints: random.nextInt(5_000, 15_000),
      discount: moneyMinor(random.nextInt(0, 100)),
    }),
  });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-012.1, REQ-012.2, REQ-012.3, REQ-012.4, REQ-012.5, REQ-012.6, REQ-012.7**
propertyTest(16, "Decision snapshots and replay are stable", async () => {
  const { ReplayService } = await import("../../dist/application/replay-service.js");
  const { ExplanationService } = await import("../../dist/application/explanation-service.js");
  const { InMemoryDecisionStore } = await import("../../dist/adapters/in-memory-decision-store.js");
  const { InMemoryRuleRepositoryConfigurationFake } = await import("../../dist/adapters/in-memory-fakes.js");

  assert.equal(cases.length, PROPERTY_CASE_COUNT);

  for (const testCase of cases) {
    const clock = Object.freeze({
      nowUtc: () => available(testCase.cancellationAtUtc),
    });
    const replayService = new ReplayService(clock);
    const explanationService = new ExplanationService();
    const store = new InMemoryDecisionStore();
    const ruleFake = new InMemoryRuleRepositoryConfigurationFake(
      available(testCase.historicalConfiguration),
    );

    const replayRequest = Object.freeze({
      snapshot: testCase.snapshot,
      configuration: testCase.historicalConfiguration,
      ruleVersion: testCase.historicalConfiguration.ruleVersion,
    });
    const initialReplay = replayService.replay(replayRequest);
    assert.equal(initialReplay.status, "REPLAYED");

    const persistedDecision = Object.freeze({
      decisionId: testCase.decisionId,
      decisionIdempotencyKey: testCase.key,
      orderId: testCase.orderId,
      ...initialReplay.businessResult,
    });
    const persistence = await store.createOrGet(
      testCase.key,
      async () => persistedDecision,
    );
    assert.equal(persistence.created, true);

    const initialHistory = structuredClone(store.inspect(testCase.key));
    const initialExplanation = explanationService.explain(persistedDecision);
    assert.equal(initialExplanation.status, "AVAILABLE");

    ruleFake.setResult(available(testCase.currentConfiguration));
    const current = await ruleFake.getSnapshot();
    assert.equal(current.status, "AVAILABLE");
    assert.notEqual(
      current.value.ruleVersion,
      testCase.historicalConfiguration.ruleVersion,
    );

    const replayAfterMutation = replayService.replay(replayRequest);
    const historyAfterMutation = store.inspect(testCase.key);
    const explanationAfterMutation = explanationService.explain(historyAfterMutation);

    assert.deepEqual(replayAfterMutation, initialReplay);
    assert.deepEqual(historyAfterMutation, initialHistory);
    assert.deepEqual(explanationAfterMutation, initialExplanation);
    assert.equal(
      historyAfterMutation.ruleVersion,
      testCase.historicalConfiguration.ruleVersion,
    );
    assert.equal(
      explanationAfterMutation.value.ruleVersion,
      testCase.historicalConfiguration.ruleVersion,
    );
    assert.deepEqual(
      replayAfterMutation.businessResult,
      initialReplay.businessResult,
    );
  }
});

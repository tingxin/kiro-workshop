import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

async function createHarness() {
  const [
    { InMemoryDecisionStore },
    {
      FixedClock,
      InMemoryCompensationSettlementFake,
      InMemoryLegacyFake,
      InMemoryMapFake,
      InMemoryPaymentChargeFake,
      InMemoryRuleRepositoryConfigurationFake,
      createDeterministicDecisionIdSource,
      createWorkshopRuleConfigurationSnapshot,
    },
    { AuditRecorder },
    { CancelInitiatorRegistry },
    { DecisionCommitCoordinator },
    { DecisionService },
    { DegradationHandler },
    { ArrivalEvaluator },
    { DecisionEngine },
    { NoShowEvaluator },
    { V1Router },
  ] = await Promise.all([
    import("../../dist/adapters/in-memory-decision-store.js"),
    import("../../dist/adapters/in-memory-fakes.js"),
    import("../../dist/application/audit-recorder.js"),
    import("../../dist/application/cancel-initiator-registry.js"),
    import("../../dist/application/decision-commit-coordinator.js"),
    import("../../dist/application/decision-service.js"),
    import("../../dist/application/degradation-handler.js"),
    import("../../dist/domain/arrival-evaluator.js"),
    import("../../dist/domain/decision-engine.js"),
    import("../../dist/domain/no-show-evaluator.js"),
    import("../../dist/domain/v1-router.js"),
  ]);

  const mapPort = new InMemoryMapFake();
  const ruleRepository = new InMemoryRuleRepositoryConfigurationFake();
  const payment = new InMemoryPaymentChargeFake();
  const compensation = new InMemoryCompensationSettlementFake();
  const audit = new AuditRecorder();
  const store = new InMemoryDecisionStore();
  let mapReads = 0;
  let configurationReads = 0;

  const countedMapPort = {
    adapterKind: "IN_MEMORY_FAKE",
    async getArrivalEvidence(orderId) {
      mapReads += 1;
      return mapPort.getArrivalEvidence(orderId);
    },
  };
  const countedRuleRepository = {
    adapterKind: "IN_MEMORY_FAKE",
    async getSnapshot() {
      configurationReads += 1;
      return ruleRepository.getSnapshot();
    },
  };

  const coordinator = new DecisionCommitCoordinator(
    store,
    audit,
    payment,
    compensation,
  );
  const service = new DecisionService({
    router: new V1Router(new InMemoryLegacyFake()),
    clock: new FixedClock("2025-01-01T00:10:00.000Z"),
    initiatorRegistry: new CancelInitiatorRegistry(),
    ruleRepository: countedRuleRepository,
    mapPort: countedMapPort,
    arrivalEvaluator: new ArrivalEvaluator(),
    noShowEvaluator: new NoShowEvaluator(),
    decisionEngine: new DecisionEngine(),
    degradationHandler: new DegradationHandler(),
    commitCoordinator: coordinator,
    decisionIdSource: createDeterministicDecisionIdSource("recovery", 1),
  });

  return {
    service,
    mapPort,
    ruleRepository,
    payment,
    audit,
    createWorkshopRuleConfigurationSnapshot,
    reads: () => ({ map: mapReads, configuration: configurationReads }),
  };
}

function command(orderId, chargeType) {
  return Object.freeze({
    orderId,
    chargeType,
    requester: "PASSENGER",
    requestedAtUtc: "2025-01-01T00:10:00.000Z",
    isRealtime: true,
    serviceType: "EXPRESS",
    driverAcceptedAtUtc: "2025-01-01T00:00:00.000Z",
    estimatedTripFare: moneyMinor(2_000),
    adjustmentBasisPoints: 10_000,
    discount: moneyMinor(0),
    ...(chargeType === "NO_SHOW_FEE"
      ? {
          noShowEvidence: Object.freeze({
            status: "AVAILABLE",
            value: Object.freeze({
              waitedAfterVerifiedArrivalSeconds: 300,
              inPlatformContactAttempts: 1,
              inPlatformExplicitRefusal: false,
            }),
          }),
        }
      : {}),
  });
}

function assertStableDegradedWinner(first, retry, harness, expectedReads) {
  assert.equal(first.target, "WORKSHOP_V1");
  assert.equal(first.created, true);
  assert.equal(first.decision.processingMode, "DEGRADED");
  assert.equal(first.decision.publicReasonCode, "DEGRADED_NO_CHARGE");
  assert.equal(first.decision.charge, 0);

  assert.equal(retry.target, "WORKSHOP_V1");
  assert.equal(retry.created, false);
  assert.strictEqual(retry.decision, first.decision);
  assert.deepEqual(retry.decision, first.decision);
  assert.deepEqual(harness.reads(), expectedReads);
  assert.equal(harness.audit.list().length, 1);
  assert.equal(harness.audit.list()[0].decisionId, first.decision.decisionId);
  assert.deepEqual(harness.payment.records, []);
}

test("5.8 Map recovery returns the persisted degraded winner without reevaluation or later charge", async () => {
  const harness = await createHarness();
  harness.mapPort.setResult({ status: "UNAVAILABLE" });
  const request = command("map-recovery-order", "NO_SHOW_FEE");

  const first = await harness.service.execute(request);
  assert.deepEqual(harness.reads(), { map: 1, configuration: 1 });

  harness.mapPort.setResult({
    status: "AVAILABLE",
    value: {
      distanceToPickupMeters: 100,
      continuouslyWithinThresholdSeconds: 30,
    },
  });
  const retry = await harness.service.execute(request);

  assertStableDegradedWinner(first, retry, harness, {
    map: 1,
    configuration: 1,
  });
});

test("5.8 rule configuration recovery returns the persisted degraded winner without reevaluation or later charge", async () => {
  const harness = await createHarness();
  harness.ruleRepository.setResult({ status: "UNAVAILABLE" });
  const request = command("configuration-recovery-order", "CANCELLATION_FEE");

  const first = await harness.service.execute(request);
  assert.deepEqual(harness.reads(), { map: 0, configuration: 1 });

  harness.ruleRepository.setResult({
    status: "AVAILABLE",
    value: harness.createWorkshopRuleConfigurationSnapshot(),
  });
  const retry = await harness.service.execute(request);

  assertStableDegradedWinner(first, retry, harness, {
    map: 0,
    configuration: 1,
  });
});

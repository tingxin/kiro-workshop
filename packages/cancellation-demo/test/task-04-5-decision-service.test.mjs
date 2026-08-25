import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDecisionIdempotencyKey,
  moneyMinor,
} from "@company/cancellation-policy-kit";

async function createFixture({ clockResult, mapResult, ruleResult } = {}) {
  const [
    { DecisionService },
    { V1Router },
    { DecisionEngine },
    { ArrivalEvaluator },
    { NoShowEvaluator },
    { CancelInitiatorRegistry },
    { DegradationHandler },
    { DecisionCommitCoordinator },
    { AuditRecorder },
    { InMemoryDecisionStore },
    fakes,
  ] = await Promise.all([
    import("../dist/application/decision-service.js"),
    import("../dist/domain/v1-router.js"),
    import("../dist/domain/decision-engine.js"),
    import("../dist/domain/arrival-evaluator.js"),
    import("../dist/domain/no-show-evaluator.js"),
    import("../dist/application/cancel-initiator-registry.js"),
    import("../dist/application/degradation-handler.js"),
    import("../dist/application/decision-commit-coordinator.js"),
    import("../dist/application/audit-recorder.js"),
    import("../dist/adapters/in-memory-decision-store.js"),
    import("../dist/adapters/in-memory-fakes.js"),
  ]);

  const legacy = new fakes.InMemoryLegacyFake();
  const map = new fakes.InMemoryMapFake(mapResult ?? {
    status: "AVAILABLE",
    value: {
      distanceToPickupMeters: 500,
      continuouslyWithinThresholdSeconds: 0,
    },
  });
  const rules = new fakes.InMemoryRuleRepositoryConfigurationFake(
    ruleResult ?? {
      status: "AVAILABLE",
      value: fakes.createWorkshopRuleConfigurationSnapshot(),
    },
  );
  const payment = new fakes.InMemoryPaymentChargeFake();
  const compensation = new fakes.InMemoryCompensationSettlementFake();
  const audit = new AuditRecorder();
  const store = new InMemoryDecisionStore();
  const coordinator = new DecisionCommitCoordinator(
    store,
    audit,
    payment,
    compensation,
  );
  const clock = {
    calls: 0,
    nowUtc() {
      this.calls += 1;
      return clockResult ?? {
        status: "AVAILABLE",
        value: "2025-01-01T00:03:00.000Z",
      };
    },
  };
  const counts = { map: 0, rules: 0, legacy: 0 };
  const mapPort = {
    async getArrivalEvidence(orderId) {
      counts.map += 1;
      return map.getArrivalEvidence(orderId);
    },
  };
  const rulePort = {
    async getSnapshot() {
      counts.rules += 1;
      return rules.getSnapshot();
    },
  };
  const legacyPort = {
    async route(command) {
      counts.legacy += 1;
      return legacy.route(command);
    },
  };

  const service = new DecisionService({
    router: new V1Router(legacyPort),
    clock,
    initiatorRegistry: new CancelInitiatorRegistry(),
    ruleRepository: rulePort,
    mapPort,
    arrivalEvaluator: new ArrivalEvaluator(),
    noShowEvaluator: new NoShowEvaluator(),
    decisionEngine: new DecisionEngine(),
    degradationHandler: new DegradationHandler(),
    commitCoordinator: coordinator,
    decisionIdSource: fakes.createDeterministicDecisionIdSource("decision", 1),
  });

  return { service, counts, clock, audit, payment, compensation, rules, map };
}

function command(overrides = {}) {
  return {
    orderId: "order-1",
    chargeType: "CANCELLATION_FEE",
    requester: "PASSENGER",
    requestedAtUtc: "2025-01-01T00:02:59.000Z",
    isRealtime: true,
    serviceType: "EXPRESS",
    driverAcceptedAtUtc: "2025-01-01T00:00:00.000Z",
    estimatedTripFare: moneyMinor(900),
    adjustmentBasisPoints: 10_000,
    discount: moneyMinor(0),
    ...overrides,
  };
}

test("4.5 routes before V1 evaluation and invokes no V1 dependencies for Legacy", async () => {
  const fixture = await createFixture();
  const result = await fixture.service.execute(command({ isRealtime: false }));

  assert.deepEqual(result, {
    target: "LEGACY_FAKE",
    legacyResult: {
      publicReasonCode: "LEGACY_FLOW",
      compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
    },
  });
  assert.deepEqual(fixture.counts, { map: 0, rules: 0, legacy: 1 });
  assert.equal(fixture.clock.calls, 0);
  assert.equal(fixture.audit.list().length, 0);
});

test("4.5 captures required inputs once and commits a versioned normal Decision", async () => {
  const fixture = await createFixture();
  const result = await fixture.service.execute(command());
  const key = buildDecisionIdempotencyKey("order-1", "CANCELLATION_FEE");

  assert.equal(result.target, "WORKSHOP_V1");
  assert.equal(result.created, true);
  assert.deepEqual(result.decision, {
    decisionId: "decision-1",
    decisionIdempotencyKey: key,
    orderId: "order-1",
    chargeType: "CANCELLATION_FEE",
    cancelInitiator: "PASSENGER",
    charge: moneyMinor(500),
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    feeTrace: {
      baseFeeMinor: 500,
      adjustmentBasisPoints: 10_000,
      adjustedFeeMinor: 500,
      discountMinor: 0,
      afterDiscountMinor: 500,
      estimatedTripFareMinor: 900,
      capped: false,
      finalFeeMinor: 500,
    },
    processingMode: "NORMAL",
    ruleVersion: "workshop-fee-v1",
  });
  assert.deepEqual(fixture.counts, { map: 0, rules: 1, legacy: 0 });
  assert.equal(fixture.clock.calls, 1);
  assert.equal(fixture.audit.list().length, 1);
  assert.equal(fixture.payment.records.length, 1);
});

test("4.5 an existing winner skips current configuration, evidence, audit, and effects", async () => {
  const fixture = await createFixture();
  const first = await fixture.service.execute(command());
  fixture.rules.setResult({ status: "UNAVAILABLE" });
  fixture.map.setResult({ status: "UNAVAILABLE" });

  const duplicate = await fixture.service.execute(command({
    requester: "DRIVER",
    confirmedLiableParty: "DRIVER",
  }));

  assert.equal(duplicate.target, "WORKSHOP_V1");
  assert.equal(duplicate.created, false);
  assert.strictEqual(duplicate.decision, first.decision);
  assert.equal(duplicate.decision.cancelInitiator, "PASSENGER");
  assert.deepEqual(fixture.counts, { map: 0, rules: 1, legacy: 0 });
  assert.equal(fixture.audit.list().length, 1);
  assert.equal(fixture.payment.records.length, 1);
});

test("4.5 unavailable Clock creates a stable degraded winner without invented time", async () => {
  const fixture = await createFixture({ clockResult: { status: "UNAVAILABLE" } });
  const result = await fixture.service.execute(command());

  assert.equal(result.decision.processingMode, "DEGRADED");
  assert.equal(result.decision.publicReasonCode, "DEGRADED_NO_CHARGE");
  assert.equal(result.decision.charge, moneyMinor(0));
  assert.equal("ruleVersion" in result.decision, false);
  assert.equal("acceptedAtUtc" in fixture.audit.list()[0], false);
  assert.deepEqual(fixture.counts, { map: 0, rules: 0, legacy: 0 });
  assert.equal(fixture.payment.records.length, 0);
});

test("4.5 rejects malformed structural command fields before routing", async () => {
  const fixture = await createFixture();

  await assert.rejects(
    fixture.service.execute(command({ orderId: "" })),
    /orderId/,
  );
  await assert.rejects(
    fixture.service.execute(command({ requestedAtUtc: "not-an-instant" })),
    /requestedAtUtc/,
  );
  assert.deepEqual(fixture.counts, { map: 0, rules: 0, legacy: 0 });
  assert.equal(fixture.clock.calls, 0);
});

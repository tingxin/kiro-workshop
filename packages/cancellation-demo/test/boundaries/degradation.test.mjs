import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

const REQUESTED_AT_UTC = "2025-03-01T00:00:00.000Z";
const CAPTURED_RULE_VERSION = "workshop-fee-v1";

async function loadBoundaryApi() {
  const [
    { AuditRecorder },
    { DegradationHandler },
    { FeeInputSelector },
    { evaluateFreeWindow },
    { NoShowEvaluator },
    {
      InMemoryMapFake,
      InMemoryPaymentChargeFake,
      InMemoryRuleRepositoryConfigurationFake,
      UnavailableClock,
    },
  ] = await Promise.all([
    import("../../dist/application/audit-recorder.js"),
    import("../../dist/application/degradation-handler.js"),
    import("../../dist/application/fee-input-selector.js"),
    import("../../dist/domain/free-window.js"),
    import("../../dist/domain/no-show-evaluator.js"),
    import("../../dist/adapters/in-memory-fakes.js"),
  ]);

  return {
    AuditRecorder,
    DegradationHandler,
    FeeInputSelector,
    evaluateFreeWindow,
    NoShowEvaluator,
    InMemoryMapFake,
    InMemoryPaymentChargeFake,
    InMemoryRuleRepositoryConfigurationFake,
    UnavailableClock,
  };
}

function toDecision(draft, suffix) {
  return Object.freeze({
    decisionId: `decision-${suffix}`,
    decisionIdempotencyKey: `order-${suffix}:CANCELLATION_FEE`,
    orderId: `order-${suffix}`,
    chargeType: "CANCELLATION_FEE",
    cancelInitiator: "PASSENGER",
    charge: draft.charge,
    publicReasonCode: draft.publicReasonCode,
    processingMode: draft.processingMode,
    ...(draft.ruleVersion === undefined ? {} : { ruleVersion: draft.ruleVersion }),
  });
}

function recordFirstCreatedDecision({ recorder, payment, decision, acceptedAtUtc }) {
  const event = recorder.record({
    decision,
    requestedAtUtc: REQUESTED_AT_UTC,
    ...(acceptedAtUtc === undefined ? {} : { acceptedAtUtc }),
  });

  // Mirrors the approved effect boundary: zero and degraded decisions are not charged.
  if (decision.processingMode === "NORMAL" && decision.charge > 0) {
    return payment.recordSyntheticCharge({
      decisionIdempotencyKey: decision.decisionIdempotencyKey,
      decisionId: decision.decisionId,
      amount: decision.charge,
    }).then(() => event);
  }
  return Promise.resolve(event);
}

test("5.6 unavailable Clock and driver acceptance produce degraded zero drafts with absent unavailable times", async () => {
  const {
    AuditRecorder,
    DegradationHandler,
    InMemoryPaymentChargeFake,
    UnavailableClock,
    evaluateFreeWindow,
  } = await loadBoundaryApi();
  const handler = new DegradationHandler();

  const scenarios = [
    {
      suffix: "clock",
      cause: "CLOCK_UNAVAILABLE",
      cancellationAtUtc: new UnavailableClock().nowUtc(),
      driverAcceptedAtUtc: "2025-03-01T00:00:00.000Z",
    },
    {
      suffix: "acceptance",
      cause: "DRIVER_ACCEPTANCE_UNAVAILABLE",
      cancellationAtUtc: { status: "AVAILABLE", value: REQUESTED_AT_UTC },
      driverAcceptedAtUtc: undefined,
    },
  ];

  for (const scenario of scenarios) {
    assert.deepEqual(evaluateFreeWindow(scenario), { status: "UNAVAILABLE" });

    const draft = handler.createDraft({ cause: scenario.cause });
    const decision = toDecision(draft, scenario.suffix);
    const recorder = new AuditRecorder();
    const payment = new InMemoryPaymentChargeFake();
    const event = await recordFirstCreatedDecision({ recorder, payment, decision });

    assert.equal(draft.cancellationSucceeded, true);
    assert.equal(draft.charge, moneyMinor(0));
    assert.equal(draft.publicReasonCode, "DEGRADED_NO_CHARGE");
    assert.equal("ruleVersion" in decision, false);
    assert.equal("acceptedAtUtc" in event, false);
    assert.equal(payment.records.length, 0);
    assert.equal(recorder.list().length, 1);
    assert.equal(event.processingMode, "DEGRADED");
  }
});

test("5.6 unavailable Map and no-show evidence preserve a captured version and emit one degraded audit without Payment", async () => {
  const {
    AuditRecorder,
    DegradationHandler,
    InMemoryMapFake,
    InMemoryPaymentChargeFake,
    NoShowEvaluator,
  } = await loadBoundaryApi();
  const map = new InMemoryMapFake({ status: "UNAVAILABLE" });
  const noShowEvaluator = new NoShowEvaluator();

  assert.deepEqual(await map.getArrivalEvidence("order-map"), { status: "UNAVAILABLE" });
  assert.deepEqual(
    noShowEvaluator.evaluate(true, { status: "UNAVAILABLE" }),
    { status: "UNAVAILABLE" },
  );

  for (const [suffix, cause] of [
    ["map", "MAP_EVIDENCE_UNAVAILABLE"],
    ["no-show", "NO_SHOW_EVIDENCE_UNAVAILABLE"],
  ]) {
    const draft = new DegradationHandler().createDraft({
      cause,
      capturedRuleVersion: CAPTURED_RULE_VERSION,
    });
    const decision = toDecision(draft, suffix);
    const recorder = new AuditRecorder();
    const payment = new InMemoryPaymentChargeFake();
    const event = await recordFirstCreatedDecision({
      recorder,
      payment,
      decision,
      acceptedAtUtc: REQUESTED_AT_UTC,
    });

    assert.equal(decision.ruleVersion, CAPTURED_RULE_VERSION);
    assert.equal(decision.charge, moneyMinor(0));
    assert.equal("feeTrace" in decision, false);
    assert.equal(event.ruleVersion, CAPTURED_RULE_VERSION);
    assert.equal(payment.records.length, 0);
    assert.equal(recorder.list().length, 1);
  }
});

test("5.6 unavailable rule configuration omits Rule Version and records exactly one degraded audit without Payment", async () => {
  const {
    AuditRecorder,
    DegradationHandler,
    FeeInputSelector,
    InMemoryPaymentChargeFake,
    InMemoryRuleRepositoryConfigurationFake,
  } = await loadBoundaryApi();
  const repository = new InMemoryRuleRepositoryConfigurationFake({ status: "UNAVAILABLE" });
  const selector = new FeeInputSelector(repository);

  assert.deepEqual(
    await selector.select("EXPRESS", "CANCELLATION_FEE"),
    { status: "UNAVAILABLE" },
  );

  const draft = new DegradationHandler().createDraft({
    cause: "RULE_CONFIGURATION_UNAVAILABLE",
  });
  const decision = toDecision(draft, "config");
  const recorder = new AuditRecorder();
  const payment = new InMemoryPaymentChargeFake();
  const event = await recordFirstCreatedDecision({ recorder, payment, decision });

  assert.equal(decision.charge, moneyMinor(0));
  assert.equal(decision.publicReasonCode, "DEGRADED_NO_CHARGE");
  assert.equal("ruleVersion" in decision, false);
  assert.equal("ruleVersion" in event, false);
  assert.equal("acceptedAtUtc" in event, false);
  assert.equal(payment.records.length, 0);
  assert.deepEqual(recorder.list(), [event]);
});

test("5.6 a normal zero Decision also never invokes Payment", async () => {
  const { AuditRecorder, InMemoryPaymentChargeFake } = await loadBoundaryApi();
  const decision = Object.freeze({
    decisionId: "decision-normal-zero",
    decisionIdempotencyKey: "order-normal-zero:CANCELLATION_FEE",
    orderId: "order-normal-zero",
    chargeType: "CANCELLATION_FEE",
    cancelInitiator: "PASSENGER",
    charge: moneyMinor(0),
    publicReasonCode: "FREE_CANCELLATION_WINDOW",
    processingMode: "NORMAL",
    ruleVersion: CAPTURED_RULE_VERSION,
  });
  const recorder = new AuditRecorder();
  const payment = new InMemoryPaymentChargeFake();

  await recordFirstCreatedDecision({ recorder, payment, decision });

  assert.equal(payment.records.length, 0);
  assert.equal(recorder.list().length, 1);
  assert.equal(recorder.list()[0].processingMode, "NORMAL");
});

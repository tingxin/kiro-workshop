import assert from "node:assert/strict";
import test from "node:test";

import {
  CappedFeeCalculator,
  moneyMinor,
} from "@company/cancellation-policy-kit";

const available = (value) => ({ status: "AVAILABLE", value });
const unavailable = { status: "UNAVAILABLE" };

const feeTrace = (finalFeeMinor) => ({
  baseFeeMinor: finalFeeMinor,
  adjustmentBasisPoints: 10_000,
  adjustedFeeMinor: finalFeeMinor,
  discountMinor: 0,
  afterDiscountMinor: finalFeeMinor,
  estimatedTripFareMinor: finalFeeMinor,
  capped: false,
  finalFeeMinor,
});

test("2.1 V1Router routes only realtime approved services and delegates every other command to Legacy Fake", async () => {
  const { V1Router } = await import("../dist/domain/v1-router.js");
  const routedCommands = [];
  const legacy = {
    async route(command) {
      routedCommands.push(command);
      return {
        publicReasonCode: "LEGACY_FLOW",
        compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
      };
    },
  };
  const router = new V1Router(legacy);

  for (const serviceType of ["EXPRESS", "PREMIUM", "BUSINESS"]) {
    assert.deepEqual(
      await router.route({ isRealtime: true, serviceType }),
      { target: "WORKSHOP_V1" },
    );
  }

  const unknown = { isRealtime: true, serviceType: "UNKNOWN" };
  const scheduled = { isRealtime: false, serviceType: "EXPRESS" };
  assert.deepEqual(await router.route(unknown), {
    target: "LEGACY_FAKE",
    legacyResult: {
      publicReasonCode: "LEGACY_FLOW",
      compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
    },
  });
  assert.deepEqual(await router.route(scheduled), {
    target: "LEGACY_FAKE",
    legacyResult: {
      publicReasonCode: "LEGACY_FLOW",
      compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
    },
  });
  assert.deepEqual(routedCommands, [unknown, scheduled]);
});

test("2.2 DecisionEngine applies ranked candidates, short-circuits strong exemptions, and keeps liability evidence independent", async () => {
  const {
    DecisionEngine,
    selectHighestPriorityCandidate,
  } = await import("../dist/domain/decision-engine.js");

  const noShowFee = {
    ruleVersion: "rules-7",
    charge: moneyMinor(800),
    trace: feeTrace(800),
  };
  const cancellationFee = {
    ruleVersion: "rules-7",
    charge: moneyMinor(500),
    trace: feeTrace(500),
  };

  assert.deepEqual(
    selectHighestPriorityCandidate([
      { kind: "PASSENGER_CANCELLATION_FEE", fee: cancellationFee },
      { kind: "PASSENGER_NO_SHOW_FEE", fee: noShowFee },
    ]),
    { kind: "PASSENGER_NO_SHOW_FEE", fee: noShowFee },
  );

  const engine = new DecisionEngine();
  const exempt = engine.evaluate({
    confirmedExemption: "SAFETY",
    confirmedLiableParty: "DRIVER",
    unverifiedStatement: "passenger claimed something unverified",
    capturedRuleVersion: "rules-7",
    noShowEligibility: unavailable,
    freeWindow: unavailable,
  });
  assert.deepEqual(exempt, {
    status: "DECIDED",
    selectedCandidate: "STRONG_EXEMPTION",
    confirmedExemption: "SAFETY",
    liableParty: "DRIVER",
    charge: 0,
    publicReasonCode: "STRONG_EXEMPTION",
    ruleVersion: "rules-7",
  });

  const noShow = engine.evaluate({
    confirmedLiableParty: "PASSENGER",
    noShowEligibility: available(true),
    noShowFee,
    freeWindow: available({ outcome: "CONTINUE", elapsedSeconds: 121 }),
    cancellationFee,
  });
  assert.deepEqual(noShow, {
    status: "DECIDED",
    selectedCandidate: "PASSENGER_NO_SHOW_FEE",
    liableParty: "PASSENGER",
    charge: 800,
    publicReasonCode: "PASSENGER_NO_SHOW_FEE",
    ruleVersion: "rules-7",
    feeTrace: feeTrace(800),
  });

  const invalidExemption = engine.evaluate({
    confirmedExemption: "FREE_TEXT_NOT_APPROVED",
    unverifiedStatement: "DRIVER is liable",
    noShowEligibility: available(false),
    freeWindow: available({ outcome: "CONTINUE", elapsedSeconds: 121 }),
    cancellationFee,
  });
  assert.deepEqual(invalidExemption, {
    status: "DECIDED",
    selectedCandidate: "PASSENGER_CANCELLATION_FEE",
    charge: 500,
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    ruleVersion: "rules-7",
    feeTrace: feeTrace(500),
  });

  assert.deepEqual(engine.evaluate({
    confirmedExemption: "LEGAL",
    noShowEligibility: unavailable,
    freeWindow: unavailable,
  }), {
    status: "DECIDED",
    selectedCandidate: "STRONG_EXEMPTION",
    confirmedExemption: "LEGAL",
    charge: 0,
    publicReasonCode: "STRONG_EXEMPTION",
  });
});

test("2.3 free-window evaluator uses the inclusive 120-second boundary and explicit unavailability", async () => {
  const { evaluateFreeWindow } = await import("../dist/domain/free-window.js");
  const accepted = "2025-01-01T00:00:00.000Z";

  assert.deepEqual(evaluateFreeWindow({
    driverAcceptedAtUtc: accepted,
    cancellationAtUtc: available("2025-01-01T00:02:00.000Z"),
  }), {
    status: "AVAILABLE",
    outcome: "FREE_CANCELLATION_WINDOW",
    elapsedSeconds: 120,
    charge: 0,
    publicReasonCode: "FREE_CANCELLATION_WINDOW",
  });
  assert.deepEqual(evaluateFreeWindow({
    driverAcceptedAtUtc: accepted,
    cancellationAtUtc: available("2025-01-01T00:02:01.000Z"),
  }), {
    status: "AVAILABLE",
    outcome: "CONTINUE",
    elapsedSeconds: 121,
  });
  assert.deepEqual(evaluateFreeWindow({ cancellationAtUtc: unavailable }), unavailable);
  assert.deepEqual(evaluateFreeWindow({ cancellationAtUtc: available(accepted) }), unavailable);
});

test("2.4 ArrivalEvaluator uses exactly distance <= 200 and continuous duration >= 30", async () => {
  const { ArrivalEvaluator } = await import("../dist/domain/arrival-evaluator.js");
  const evaluator = new ArrivalEvaluator();

  assert.equal(evaluator.evaluate({
    distanceToPickupMeters: 200,
    continuouslyWithinThresholdSeconds: 30,
    driverClickedArrived: false,
    etaSeconds: 999,
  }), true);
  assert.equal(evaluator.evaluate({
    distanceToPickupMeters: 201,
    continuouslyWithinThresholdSeconds: 30,
    driverClickedArrived: true,
  }), false);
  assert.equal(evaluator.evaluate({
    distanceToPickupMeters: 200,
    continuouslyWithinThresholdSeconds: 29,
    driverClickedArrived: true,
  }), false);
});

test("2.5 NoShowEvaluator requires verified arrival and approved refusal or wait/contact evidence", async () => {
  const { NoShowEvaluator } = await import("../dist/domain/no-show-evaluator.js");
  const evaluator = new NoShowEvaluator();

  assert.deepEqual(evaluator.evaluate(true, available({
    waitedAfterVerifiedArrivalSeconds: 300,
    inPlatformContactAttempts: 1,
    inPlatformExplicitRefusal: false,
  })), available(true));
  assert.deepEqual(evaluator.evaluate(true, available({
    waitedAfterVerifiedArrivalSeconds: 0,
    inPlatformContactAttempts: 0,
    inPlatformExplicitRefusal: true,
  })), available(true));
  assert.deepEqual(evaluator.evaluate(false, available({
    waitedAfterVerifiedArrivalSeconds: 999,
    inPlatformContactAttempts: 9,
    inPlatformExplicitRefusal: true,
  })), available(false));
  assert.deepEqual(evaluator.evaluate(true, unavailable), unavailable);
  assert.deepEqual(evaluator.evaluate(false, unavailable), available(false));
});

test("2.6 CancelInitiatorRegistry retains the atomic first accepted requester and optional UTC time", async () => {
  const { CancelInitiatorRegistry } = await import("../dist/application/cancel-initiator-registry.js");
  const registry = new CancelInitiatorRegistry();

  const [first, second] = await Promise.all([
    Promise.resolve().then(() => registry.createOrGet(
      "order-1",
      "PASSENGER",
      "2025-01-01T00:00:00.000Z",
    )),
    Promise.resolve().then(() => registry.createOrGet(
      "order-1",
      "DRIVER",
      "2025-01-01T00:00:01.000Z",
    )),
  ]);
  const expected = {
    orderId: "order-1",
    cancelInitiator: "PASSENGER",
    acceptedAtUtc: "2025-01-01T00:00:00.000Z",
  };
  assert.deepEqual(first, expected);
  assert.deepEqual(second, expected);
  assert.deepEqual(registry.get("order-1"), expected);
  assert.deepEqual(registry.createOrGet("order-2", "DRIVER"), {
    orderId: "order-2",
    cancelInitiator: "DRIVER",
  });
});

test("2.7 FeeInputSelector performs one exact versioned snapshot lookup and surfaces unavailability", async () => {
  const { FeeInputSelector } = await import("../dist/application/fee-input-selector.js");
  const snapshot = {
    ruleVersion: "rules-exact",
    baseFees: {
      EXPRESS: { CANCELLATION_FEE: moneyMinor(11), NO_SHOW_FEE: moneyMinor(12) },
      PREMIUM: { CANCELLATION_FEE: moneyMinor(21), NO_SHOW_FEE: moneyMinor(22) },
      BUSINESS: { CANCELLATION_FEE: moneyMinor(31), NO_SHOW_FEE: moneyMinor(32) },
    },
  };
  let reads = 0;
  const selector = new FeeInputSelector({
    async getSnapshot() {
      reads += 1;
      return available(snapshot);
    },
  });

  assert.deepEqual(await selector.select("BUSINESS", "NO_SHOW_FEE"), available({
    baseFee: 32,
    ruleVersion: "rules-exact",
  }));
  assert.equal(reads, 1);

  const unavailableSelector = new FeeInputSelector({
    async getSnapshot() {
      return unavailable;
    },
  });
  assert.deepEqual(
    await unavailableSelector.select("EXPRESS", "CANCELLATION_FEE"),
    unavailable,
  );
});

test("2.8 cancellation fee adapter transparently returns the shared calculator charge and trace", async () => {
  const { calculateCancellationFee } = await import("../dist/calculate-cancellation-fee.js");
  const input = {
    baseFee: moneyMinor(500),
    adjustmentBasisPoints: 20_000,
    discount: moneyMinor(0),
    estimatedTripFare: moneyMinor(900),
  };
  const direct = new CappedFeeCalculator().calculate(input);

  assert.deepEqual(calculateCancellationFee(input), {
    status: "CALCULATED",
    charge: direct.charge,
    trace: direct.trace,
  });
});

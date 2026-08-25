import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

const available = (value) => ({ status: "AVAILABLE", value });

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

test("free cancellation is inclusive at 120 seconds", async () => {
  const { evaluateFreeWindow } = await import("../../dist/domain/free-window.js");
  const driverAcceptedAtUtc = "2025-01-01T00:00:00.000Z";

  for (const elapsedSeconds of [119, 120]) {
    assert.deepEqual(evaluateFreeWindow({
      driverAcceptedAtUtc,
      cancellationAtUtc: available(
        new Date(Date.parse(driverAcceptedAtUtc) + elapsedSeconds * 1_000).toISOString(),
      ),
    }), {
      status: "AVAILABLE",
      outcome: "FREE_CANCELLATION_WINDOW",
      elapsedSeconds,
      charge: 0,
      publicReasonCode: "FREE_CANCELLATION_WINDOW",
    });
  }

  assert.deepEqual(evaluateFreeWindow({
    driverAcceptedAtUtc,
    cancellationAtUtc: available("2025-01-01T00:02:01.000Z"),
  }), {
    status: "AVAILABLE",
    outcome: "CONTINUE",
    elapsedSeconds: 121,
  });
});

test("verified arrival requires at most 200 meters continuously for at least 30 seconds", async () => {
  const { ArrivalEvaluator } = await import("../../dist/domain/arrival-evaluator.js");
  const evaluator = new ArrivalEvaluator();

  assert.equal(evaluator.evaluate({
    distanceToPickupMeters: 200,
    continuouslyWithinThresholdSeconds: 30,
  }), true);
  assert.equal(evaluator.evaluate({
    distanceToPickupMeters: 201,
    continuouslyWithinThresholdSeconds: 30,
  }), false);
  assert.equal(evaluator.evaluate({
    distanceToPickupMeters: 200,
    continuouslyWithinThresholdSeconds: 29,
  }), false);
});

test("no-show boundaries require five minutes and contact unless verified refusal exists", async () => {
  const { NoShowEvaluator } = await import("../../dist/domain/no-show-evaluator.js");
  const evaluator = new NoShowEvaluator();

  assert.deepEqual(evaluator.evaluate(true, available({
    waitedAfterVerifiedArrivalSeconds: 299,
    inPlatformContactAttempts: 1,
    inPlatformExplicitRefusal: false,
  })), available(false));
  assert.deepEqual(evaluator.evaluate(true, available({
    waitedAfterVerifiedArrivalSeconds: 300,
    inPlatformContactAttempts: 1,
    inPlatformExplicitRefusal: false,
  })), available(true));
  assert.deepEqual(evaluator.evaluate(true, available({
    waitedAfterVerifiedArrivalSeconds: 300,
    inPlatformContactAttempts: 0,
    inPlatformExplicitRefusal: false,
  })), available(false));
  assert.deepEqual(evaluator.evaluate(true, available({
    waitedAfterVerifiedArrivalSeconds: 0,
    inPlatformContactAttempts: 0,
    inPlatformExplicitRefusal: true,
  })), available(true));
  assert.deepEqual(evaluator.evaluate(false, available({
    waitedAfterVerifiedArrivalSeconds: 300,
    inPlatformContactAttempts: 1,
    inPlatformExplicitRefusal: true,
  })), available(false));
});

test("only the six approved Strong Exemption categories are evidence", async () => {
  const { DecisionEngine } = await import("../../dist/domain/decision-engine.js");
  const engine = new DecisionEngine();
  const approvedExemptions = [
    "LEGAL",
    "SAFETY",
    "ACCESSIBILITY",
    "PLATFORM_FAILURE",
    "CRITICAL_DEPENDENCY_FAILURE",
    "DRIVER_RESPONSIBILITY_CONFIRMED",
  ];
  const cancellationFee = {
    ruleVersion: "workshop-rules-boundary",
    charge: moneyMinor(500),
    trace: feeTrace(500),
  };

  for (const confirmedExemption of approvedExemptions) {
    assert.deepEqual(engine.evaluate({
      confirmedExemption,
      capturedRuleVersion: "workshop-rules-boundary",
      noShowEligibility: available(false),
      freeWindow: available({ outcome: "CONTINUE", elapsedSeconds: 121 }),
      cancellationFee,
    }), {
      status: "DECIDED",
      selectedCandidate: "STRONG_EXEMPTION",
      confirmedExemption,
      charge: 0,
      publicReasonCode: "STRONG_EXEMPTION",
      ruleVersion: "workshop-rules-boundary",
    });
  }

  assert.deepEqual(engine.evaluate({
    confirmedExemption: "UNAPPROVED_CATEGORY",
    unverifiedStatement: "DRIVER_RESPONSIBILITY_CONFIRMED",
    noShowEligibility: available(false),
    freeWindow: available({ outcome: "CONTINUE", elapsedSeconds: 121 }),
    cancellationFee,
  }), {
    status: "DECIDED",
    selectedCandidate: "PASSENGER_CANCELLATION_FEE",
    charge: 500,
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    ruleVersion: "workshop-rules-boundary",
    feeTrace: feeTrace(500),
  });
});

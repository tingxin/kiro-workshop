import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

const available = (value) => Object.freeze({ status: "AVAILABLE", value });
const unavailable = Object.freeze({ status: "UNAVAILABLE" });

const historicalConfiguration = Object.freeze({
  ruleVersion: "rules-history-7",
  baseFees: Object.freeze({
    EXPRESS: Object.freeze({ CANCELLATION_FEE: moneyMinor(500), NO_SHOW_FEE: moneyMinor(800) }),
    PREMIUM: Object.freeze({ CANCELLATION_FEE: moneyMinor(800), NO_SHOW_FEE: moneyMinor(1200) }),
    BUSINESS: Object.freeze({ CANCELLATION_FEE: moneyMinor(800), NO_SHOW_FEE: moneyMinor(1200) }),
  }),
});

const historicalSnapshot = Object.freeze({
  chargeType: "CANCELLATION_FEE",
  serviceType: "EXPRESS",
  cancelInitiator: "PASSENGER",
  confirmedLiableParty: "PASSENGER",
  driverAcceptedAtUtc: "2025-01-01T00:00:00.000Z",
  mapArrivalEvidence: unavailable,
  noShowEvidence: unavailable,
  estimatedTripFare: moneyMinor(900),
  adjustmentBasisPoints: 10_000,
  discount: moneyMinor(0),
});

const persistedDecision = (overrides = {}) => ({
  decisionId: "decision-history-7",
  decisionIdempotencyKey: "order-history-7:CANCELLATION_FEE",
  orderId: "order-history-7",
  chargeType: "CANCELLATION_FEE",
  cancelInitiator: "PASSENGER",
  liableParty: "DRIVER",
  charge: moneyMinor(500),
  publicReasonCode: "PASSENGER_CANCELLATION_FEE",
  processingMode: "NORMAL",
  ruleVersion: "rules-history-7",
  feeTrace: { sensitiveSentinel: "TRACE_SENTINEL_MUST_NOT_LEAK" },
  rawEvidence: {
    phone: "PHONE_SENTINEL_MUST_NOT_LEAK",
    exactCoordinates: "COORDINATE_SENTINEL_MUST_NOT_LEAK",
    safetyNarrative: "SAFETY_SENTINEL_MUST_NOT_LEAK",
  },
  riskScore: "RISK_SENTINEL_MUST_NOT_LEAK",
  paymentCredential: "PAYMENT_SENTINEL_MUST_NOT_LEAK",
  ...overrides,
});

test("7.8 missing explanation inputs never fall back to fee trace or raw evidence", async () => {
  const { ExplanationService } = await import("../../dist/application/explanation-service.js");
  const service = new ExplanationService();
  const forbiddenFallbacks = {
    feeTrace: {
      publicReasonCode: "STRONG_EXEMPTION",
      charge: moneyMinor(0),
      ruleVersion: "trace-version-forbidden",
    },
    rawEvidence: {
      publicReasonCode: "STRONG_EXEMPTION",
      charge: moneyMinor(0),
      ruleVersion: "evidence-version-forbidden",
    },
  };

  for (const input of [
    { charge: moneyMinor(0), ruleVersion: "rules-history-7", ...forbiddenFallbacks },
    { publicReasonCode: "STRONG_EXEMPTION", ruleVersion: "rules-history-7", ...forbiddenFallbacks },
    { publicReasonCode: "STRONG_EXEMPTION", charge: moneyMinor(0), ...forbiddenFallbacks },
  ]) {
    assert.deepEqual(service.explain(input), {
      status: "UNAVAILABLE",
      reason: "MISSING_REQUIRED_INPUT",
    });
  }
});

test("7.8 replay remains not replayable when historical snapshot or exact version is missing", async () => {
  const { ReplayService } = await import("../../dist/application/replay-service.js");
  const service = new ReplayService(Object.freeze({
    nowUtc: () => available("2025-01-01T00:02:01.000Z"),
  }));

  for (const request of [
    { configuration: historicalConfiguration, ruleVersion: historicalConfiguration.ruleVersion },
    { snapshot: historicalSnapshot, configuration: historicalConfiguration },
    { snapshot: historicalSnapshot, ruleVersion: historicalConfiguration.ruleVersion },
    {
      snapshot: historicalSnapshot,
      configuration: historicalConfiguration,
      ruleVersion: "current-rules-v99",
    },
  ]) {
    assert.deepEqual(service.replay(request), { status: "NOT_REPLAYABLE" });
  }
});

test("7.8 current configuration changes cannot rewrite historical replay or explanation", async () => {
  const [{ ReplayService }, { ExplanationService }] = await Promise.all([
    import("../../dist/application/replay-service.js"),
    import("../../dist/application/explanation-service.js"),
  ]);
  const replayService = new ReplayService(Object.freeze({
    nowUtc: () => available("2025-01-01T00:02:01.000Z"),
  }));
  const explanationService = new ExplanationService();
  const replayRequest = {
    snapshot: historicalSnapshot,
    configuration: historicalConfiguration,
    ruleVersion: historicalConfiguration.ruleVersion,
  };
  const firstReplay = replayService.replay(replayRequest);
  const firstExplanation = explanationService.explain(persistedDecision());

  const currentConfiguration = {
    ruleVersion: "current-rules-v99",
    baseFees: { EXPRESS: { CANCELLATION_FEE: moneyMinor(899), NO_SHOW_FEE: moneyMinor(899) } },
  };
  currentConfiguration.ruleVersion = "current-rules-v100";
  currentConfiguration.baseFees.EXPRESS.CANCELLATION_FEE = moneyMinor(1);

  assert.deepEqual(replayService.replay(replayRequest), firstReplay);
  assert.deepEqual(explanationService.explain(persistedDecision()), firstExplanation);
  assert.equal(firstReplay.businessResult.ruleVersion, "rules-history-7");
  assert.equal(firstReplay.businessResult.charge, 500);
  assert.equal(firstExplanation.value.ruleVersion, "rules-history-7");
  assert.equal(
    firstExplanation.value.summary,
    "司机已接单并提供接驾服务，本次按规则收取取消费。",
  );
});

test("7.8 support view handles compensation, omissions, exact summary, and sensitive exclusion", async () => {
  const { SupportViewProjector } = await import(
    "../../dist/application/support-view-projector.js"
  );
  const projector = new SupportViewProjector();
  const withCompensation = projector.project(persistedDecision({
    driverCompensation: moneyMinor(300),
  }));

  assert.deepEqual(withCompensation, {
    decisionId: "decision-history-7",
    orderId: "order-history-7",
    cancelInitiator: "PASSENGER",
    liableParty: "DRIVER",
    chargedAmount: 500,
    driverCompensation: 300,
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    ruleVersion: "rules-history-7",
    summary: "司机已接单并提供接驾服务，本次按规则收取取消费。",
  });
  assert.doesNotMatch(
    JSON.stringify(withCompensation),
    /TRACE_SENTINEL|PHONE_SENTINEL|COORDINATE_SENTINEL|SAFETY_SENTINEL|RISK_SENTINEL|PAYMENT_SENTINEL/,
  );

  const omitted = projector.project(persistedDecision({
    processingMode: "DEGRADED",
    publicReasonCode: "DEGRADED_NO_CHARGE",
    charge: moneyMinor(0),
    ruleVersion: undefined,
    liableParty: undefined,
    driverCompensation: undefined,
  }));
  assert.deepEqual(omitted, {
    decisionId: "decision-history-7",
    orderId: "order-history-7",
    cancelInitiator: "PASSENGER",
    chargedAmount: 0,
    publicReasonCode: "DEGRADED_NO_CHARGE",
  });
  for (const key of ["liableParty", "driverCompensation", "ruleVersion", "summary"]) {
    assert.equal(key in omitted, false);
  }
});

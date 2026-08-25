import assert from "node:assert/strict";
import test from "node:test";

import { moneyMinor } from "@company/cancellation-policy-kit";

const available = (value) => Object.freeze({ status: "AVAILABLE", value });
const unavailable = Object.freeze({ status: "UNAVAILABLE" });

const configuration = Object.freeze({
  ruleVersion: "rules-history-7",
  baseFees: Object.freeze({
    EXPRESS: Object.freeze({ CANCELLATION_FEE: moneyMinor(500), NO_SHOW_FEE: moneyMinor(800) }),
    PREMIUM: Object.freeze({ CANCELLATION_FEE: moneyMinor(800), NO_SHOW_FEE: moneyMinor(1200) }),
    BUSINESS: Object.freeze({ CANCELLATION_FEE: moneyMinor(800), NO_SHOW_FEE: moneyMinor(1200) }),
  }),
});

const fixedClock = Object.freeze({
  nowUtc: () => available("2025-01-01T00:02:01.000Z"),
});

const ordinarySnapshot = Object.freeze({
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

test("6.3 replays a complete immutable snapshot with exact historical config and fixed Clock", async () => {
  const { ReplayService } = await import("../dist/application/replay-service.js");
  const service = new ReplayService(fixedClock);

  const first = service.replay({
    snapshot: ordinarySnapshot,
    configuration,
    ruleVersion: "rules-history-7",
  });
  const second = service.replay({
    snapshot: ordinarySnapshot,
    configuration,
    ruleVersion: "rules-history-7",
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    status: "REPLAYED",
    businessResult: {
      chargeType: "CANCELLATION_FEE",
      cancelInitiator: "PASSENGER",
      liableParty: "PASSENGER",
      charge: 500,
      publicReasonCode: "PASSENGER_CANCELLATION_FEE",
      ruleVersion: "rules-history-7",
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
    },
  });
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.businessResult), true);
});

test("6.3 reuses arrival and no-show evaluators and exposes only approved comparison fields", async () => {
  const { ReplayService } = await import("../dist/application/replay-service.js");
  const service = new ReplayService(fixedClock);
  const result = service.replay({
    configuration,
    ruleVersion: configuration.ruleVersion,
    snapshot: Object.freeze({
      ...ordinarySnapshot,
      chargeType: "NO_SHOW_FEE",
      mapArrivalEvidence: available(Object.freeze({
        distanceToPickupMeters: 200,
        continuouslyWithinThresholdSeconds: 30,
      })),
      noShowEvidence: available(Object.freeze({
        waitedAfterVerifiedArrivalSeconds: 300,
        inPlatformContactAttempts: 1,
        inPlatformExplicitRefusal: false,
      })),
    }),
  });

  assert.equal(result.status, "REPLAYED");
  assert.deepEqual(Object.keys(result.businessResult).sort(), [
    "cancelInitiator",
    "charge",
    "chargeType",
    "feeTrace",
    "liableParty",
    "processingMode",
    "publicReasonCode",
    "ruleVersion",
  ]);
  assert.equal(result.businessResult.charge, 800);
  assert.equal(result.businessResult.publicReasonCode, "PASSENGER_NO_SHOW_FEE");
});

test("6.3 returns explicit NOT_REPLAYABLE when snapshot, historical config, or exact version is missing", async () => {
  const { ReplayService } = await import("../dist/application/replay-service.js");
  const service = new ReplayService(fixedClock);

  assert.deepEqual(service.replay({ configuration, ruleVersion: configuration.ruleVersion }), {
    status: "NOT_REPLAYABLE",
  });
  assert.deepEqual(service.replay({ snapshot: ordinarySnapshot, ruleVersion: configuration.ruleVersion }), {
    status: "NOT_REPLAYABLE",
  });
  assert.deepEqual(service.replay({ snapshot: ordinarySnapshot, configuration }), {
    status: "NOT_REPLAYABLE",
  });
  assert.deepEqual(service.replay({
    snapshot: ordinarySnapshot,
    configuration,
    ruleVersion: "different-version",
  }), { status: "NOT_REPLAYABLE" });

  const unavailableClockService = new ReplayService(Object.freeze({ nowUtc: () => unavailable }));
  assert.deepEqual(unavailableClockService.replay({
    snapshot: ordinarySnapshot,
    configuration,
    ruleVersion: configuration.ruleVersion,
  }), { status: "NOT_REPLAYABLE" });
});

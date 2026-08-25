import assert from "node:assert/strict";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const available = (value) => ({ status: "AVAILABLE", value });

const random = createSeededRandom(0x06f2_0120);
const elapsedBoundarySeconds = [119, 120, 121];
const cases = generatePropertyCases((index) => {
  const acceptedAtMilliseconds = Date.UTC(
    2025,
    random.nextInt(0, 11),
    random.nextInt(1, 28),
    random.nextInt(0, 23),
    random.nextInt(0, 59),
    random.nextInt(0, 59),
  );
  const elapsedSeconds = index < elapsedBoundarySeconds.length
    ? elapsedBoundarySeconds[index]
    : random.nextInt(0, 7_200);

  return Object.freeze({
    driverAcceptedAtUtc: new Date(acceptedAtMilliseconds).toISOString(),
    cancellationAtUtc: new Date(
      acceptedAtMilliseconds + elapsedSeconds * 1_000,
    ).toISOString(),
    elapsedSeconds,
  });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-005.1, REQ-005.2, REQ-005.3, REQ-005.4, REQ-005.5**
propertyTest(
  6,
  "Free-window classification uses an inclusive 120-second boundary",
  async () => {
    const { evaluateFreeWindow } = await import("../../dist/domain/free-window.js");

    assert.equal(cases.length, PROPERTY_CASE_COUNT);

    for (const testCase of cases) {
      const input = {
        driverAcceptedAtUtc: testCase.driverAcceptedAtUtc,
        cancellationAtUtc: available(testCase.cancellationAtUtc),
      };
      const first = evaluateFreeWindow(input);
      const repeated = evaluateFreeWindow(input);

      assert.deepEqual(repeated, first);

      if (testCase.elapsedSeconds <= 120) {
        assert.deepEqual(first, {
          status: "AVAILABLE",
          outcome: "FREE_CANCELLATION_WINDOW",
          elapsedSeconds: testCase.elapsedSeconds,
          charge: 0,
          publicReasonCode: "FREE_CANCELLATION_WINDOW",
        });
      } else {
        assert.deepEqual(first, {
          status: "AVAILABLE",
          outcome: "CONTINUE",
          elapsedSeconds: testCase.elapsedSeconds,
        });
      }
    }
  },
);

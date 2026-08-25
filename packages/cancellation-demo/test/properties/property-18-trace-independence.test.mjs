import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
  sensitiveSentinels,
} from "../support/deterministic-generators.mjs";

const fixedFeeInput = Object.freeze({
  baseFee: moneyMinor(1_200),
  estimatedTripFare: moneyMinor(1_500),
  adjustmentBasisPoints: 12_500,
  discount: moneyMinor(125),
});

const cases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x18_013_005 + caseNumber);
  const sentinels = sensitiveSentinels(caseNumber);

  return Object.freeze({
    evidence: Object.freeze({
      [sentinels.safetyNarrative]: random.boolean(),
      [sentinels.accessibilityDetails]: random.nextInt(0, 10_000),
      [sentinels.phoneContent]: Object.freeze([
        sentinels.phoneContent,
        random.nextInt(0, 1_000),
      ]),
      [sentinels.exactCoordinates]: Object.freeze({
        value: sentinels.exactCoordinates,
      }),
      [sentinels.riskScore]: sentinels.riskScore,
      [sentinels.riskThreshold]: sentinels.riskThreshold,
      [sentinels.paymentCredential]: sentinels.paymentCredential,
    }),
    sentinelKeys: Object.freeze([
      sentinels.phoneContent,
      sentinels.exactCoordinates,
      sentinels.safetyNarrative,
      sentinels.accessibilityDetails,
      sentinels.riskScore,
      sentinels.riskThreshold,
      sentinels.paymentCredential,
    ]),
    sentinelValues: Object.freeze(Object.values(sentinels)),
  });
}, 128);

function collectKeysAndValues(value, keys = [], values = []) {
  if (value === null || typeof value !== "object") {
    values.push(value);
    return { keys, values };
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    keys.push(key);
    collectKeysAndValues(nestedValue, keys, values);
  }
  return { keys, values };
}

// **Validates: Requirements REQ-013.5, REQ-016.4**
propertyTest(18, "Fee Trace is evidence-independent", async () => {
  const { calculateCancellationFee } = await import(
    "../../dist/calculate-cancellation-fee.js"
  );
  const baselineTrace = calculateCancellationFee(fixedFeeInput).trace;

  assert.equal(cases.length, 128);
  assert.ok(cases.length >= 100);

  for (const testCase of cases) {
    assert.ok(Object.keys(testCase.evidence).length > 0);

    const trace = calculateCancellationFee(fixedFeeInput).trace;
    assert.deepEqual(
      trace,
      baselineTrace,
      "varying sensitive evidence must not affect trace for fixed fee inputs",
    );

    const traceContent = collectKeysAndValues(trace);
    for (const sentinelKey of testCase.sentinelKeys) {
      assert.equal(
        traceContent.keys.includes(sentinelKey),
        false,
        `trace must not contain sensitive sentinel key ${sentinelKey}`,
      );
    }
    for (const sentinelValue of testCase.sentinelValues) {
      assert.equal(
        traceContent.values.includes(sentinelValue),
        false,
        `trace must not contain sensitive sentinel value ${sentinelValue}`,
      );
    }
  }
});

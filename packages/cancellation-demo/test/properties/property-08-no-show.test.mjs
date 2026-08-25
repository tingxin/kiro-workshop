import assert from "node:assert/strict";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const PROPERTY_TITLE = "No-show eligibility is exactly the approved conjunction";
const available = (value) => ({ status: "AVAILABLE", value });

const boundaryCases = Object.freeze([
  Object.freeze({
    verifiedArrival: true,
    inPlatformExplicitRefusal: false,
    waitedAfterVerifiedArrivalSeconds: 300,
    inPlatformContactAttempts: 1,
  }),
  Object.freeze({
    verifiedArrival: true,
    inPlatformExplicitRefusal: false,
    waitedAfterVerifiedArrivalSeconds: 299,
    inPlatformContactAttempts: 1,
  }),
  Object.freeze({
    verifiedArrival: true,
    inPlatformExplicitRefusal: false,
    waitedAfterVerifiedArrivalSeconds: 300,
    inPlatformContactAttempts: 0,
  }),
  Object.freeze({
    verifiedArrival: true,
    inPlatformExplicitRefusal: true,
    waitedAfterVerifiedArrivalSeconds: 0,
    inPlatformContactAttempts: 0,
  }),
  Object.freeze({
    verifiedArrival: false,
    inPlatformExplicitRefusal: true,
    waitedAfterVerifiedArrivalSeconds: 600,
    inPlatformContactAttempts: 3,
  }),
  Object.freeze({
    verifiedArrival: false,
    inPlatformExplicitRefusal: false,
    waitedAfterVerifiedArrivalSeconds: 300,
    inPlatformContactAttempts: 1,
  }),
]);

// **Validates: Requirements REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5, REQ-007.6, REQ-007.7**
propertyTest(8, PROPERTY_TITLE, async () => {
  const { NoShowEvaluator } = await import("../../dist/domain/no-show-evaluator.js");
  const evaluator = new NoShowEvaluator();
  const random = createSeededRandom(0x08_300_001);
  const cases = generatePropertyCases((index) => {
    if (index < boundaryCases.length) {
      return boundaryCases[index];
    }

    return Object.freeze({
      verifiedArrival: random.boolean(),
      inPlatformExplicitRefusal: random.boolean(),
      waitedAfterVerifiedArrivalSeconds: random.nextInt(0, 600),
      inPlatformContactAttempts: random.nextInt(0, 3),
    });
  }, PROPERTY_CASE_COUNT);

  assert.equal(cases.length, PROPERTY_CASE_COUNT);

  for (const testCase of cases) {
    const evidence = available(Object.freeze({
      waitedAfterVerifiedArrivalSeconds: testCase.waitedAfterVerifiedArrivalSeconds,
      inPlatformContactAttempts: testCase.inPlatformContactAttempts,
      inPlatformExplicitRefusal: testCase.inPlatformExplicitRefusal,
    }));
    const expectedEligibility = testCase.verifiedArrival
      && (
        testCase.inPlatformExplicitRefusal
        || (
          testCase.waitedAfterVerifiedArrivalSeconds >= 300
          && testCase.inPlatformContactAttempts >= 1
        )
      );
    const expected = available(expectedEligibility);

    const first = evaluator.evaluate(testCase.verifiedArrival, evidence);
    const repeated = evaluator.evaluate(testCase.verifiedArrival, evidence);
    const clonedInputResult = evaluator.evaluate(
      testCase.verifiedArrival,
      available({ ...evidence.value }),
    );

    assert.deepEqual(first, expected);
    assert.deepEqual(repeated, first);
    assert.deepEqual(clonedInputResult, first);
  }
});

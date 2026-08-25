import assert from "node:assert/strict";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
  sensitiveSentinels,
} from "../support/deterministic-generators.mjs";

const PROPERTY_TITLE = "Verified arrival is exactly the approved Map predicate";

const boundaryCases = Object.freeze([
  Object.freeze({ distanceToPickupMeters: 200, continuouslyWithinThresholdSeconds: 30 }),
  Object.freeze({ distanceToPickupMeters: 201, continuouslyWithinThresholdSeconds: 30 }),
  Object.freeze({ distanceToPickupMeters: 200, continuouslyWithinThresholdSeconds: 29 }),
  Object.freeze({ distanceToPickupMeters: 0, continuouslyWithinThresholdSeconds: 0 }),
]);

// **Validates: Requirements REQ-006.1, REQ-006.2, REQ-006.3, REQ-006.4, REQ-006.5, REQ-006.6**
propertyTest(7, PROPERTY_TITLE, async () => {
  const { ArrivalEvaluator } = await import("../../dist/domain/arrival-evaluator.js");
  const evaluator = new ArrivalEvaluator();
  const random = createSeededRandom(0x07a771a1);
  const cases = generatePropertyCases((index) => {
    if (index < boundaryCases.length) {
      return boundaryCases[index];
    }

    return Object.freeze({
      distanceToPickupMeters: random.nextInt(0, 400),
      continuouslyWithinThresholdSeconds: random.nextInt(0, 90),
    });
  }, PROPERTY_CASE_COUNT);

  for (const [index, evidence] of cases.entries()) {
    const expected = evidence.distanceToPickupMeters <= 200
      && evidence.continuouslyWithinThresholdSeconds >= 30;
    const sentinels = sensitiveSentinels(index);
    const unrelatedVariantA = {
      ...evidence,
      driverClickedArrived: false,
      etaSeconds: index,
      routeDirection: `UNRELATED_DIRECTION_A_${index}`,
      ...sentinels,
    };
    const unrelatedVariantB = {
      ...evidence,
      driverClickedArrived: true,
      etaSeconds: PROPERTY_CASE_COUNT - index,
      routeDirection: `UNRELATED_DIRECTION_B_${index}`,
      phoneContent: `${sentinels.phoneContent}_CHANGED`,
      exactCoordinates: `${sentinels.exactCoordinates}_CHANGED`,
      safetyNarrative: `${sentinels.safetyNarrative}_CHANGED`,
      accessibilityDetails: `${sentinels.accessibilityDetails}_CHANGED`,
      riskScore: `${sentinels.riskScore}_CHANGED`,
      riskThreshold: `${sentinels.riskThreshold}_CHANGED`,
      paymentCredential: `${sentinels.paymentCredential}_CHANGED`,
    };

    assert.equal(evaluator.evaluate(evidence), expected);
    assert.equal(evaluator.evaluate({ ...evidence }), expected);
    assert.equal(evaluator.evaluate(unrelatedVariantA), expected);
    assert.equal(evaluator.evaluate(unrelatedVariantB), expected);
  }
});

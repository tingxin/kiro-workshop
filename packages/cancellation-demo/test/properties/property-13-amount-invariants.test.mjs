import assert from "node:assert/strict";

import {
  CappedFeeCalculator,
  moneyMinor,
} from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const cases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x13_010_008 + caseNumber);
  const overEstimateBaseFee = random.nextInt(1, 100_000);
  const overEstimateDiscount = random.nextInt(0, overEstimateBaseFee - 1);

  return Object.freeze({
    general: Object.freeze({
      baseFee: moneyMinor(random.nextInt(0, 100_000)),
      estimatedTripFare: moneyMinor(random.nextInt(0, 300_000)),
      adjustmentBasisPoints: random.nextInt(0, 30_000),
      discount: moneyMinor(random.nextInt(0, 300_000)),
    }),
    overDiscount: Object.freeze({
      baseFee: moneyMinor(random.nextInt(0, 100_000)),
      estimatedTripFare: moneyMinor(random.nextInt(0, 300_000)),
      adjustmentBasisPoints: random.nextInt(0, 30_000),
      discount: moneyMinor(300_001),
    }),
    overEstimate: Object.freeze({
      baseFee: moneyMinor(overEstimateBaseFee),
      estimatedTripFare: moneyMinor(
        random.nextInt(0, overEstimateBaseFee - overEstimateDiscount - 1),
      ),
      adjustmentBasisPoints: random.nextInt(10_000, 30_000),
      discount: moneyMinor(overEstimateDiscount),
    }),
    zeroEstimate: Object.freeze({
      baseFee: moneyMinor(random.nextInt(0, 100_000)),
      estimatedTripFare: moneyMinor(0),
      adjustmentBasisPoints: random.nextInt(0, 30_000),
      discount: moneyMinor(random.nextInt(0, 300_000)),
    }),
  });
}, PROPERTY_CASE_COUNT);

function assertAmountInvariants(input, result) {
  assert.equal(Number.isInteger(result.charge), true, "charge must be an integer");
  assert.ok(result.charge >= 0, "charge must be non-negative");
  assert.ok(
    result.charge <= input.estimatedTripFare,
    "charge must not exceed the estimated trip fare",
  );
  assert.equal(result.trace.finalFeeMinor, result.charge);
}

// **Validates: Requirements REQ-010.5, REQ-010.6, REQ-010.7, REQ-010.8**
propertyTest(13, "Calculated charge obeys shared amount invariants", () => {
  const calculator = new CappedFeeCalculator();

  assert.equal(cases.length, PROPERTY_CASE_COUNT);
  assert.ok(cases.length >= 100);

  for (const testCase of cases) {
    const generalResult = calculator.calculate(testCase.general);
    assertAmountInvariants(testCase.general, generalResult);

    const overDiscountResult = calculator.calculate(testCase.overDiscount);
    assertAmountInvariants(testCase.overDiscount, overDiscountResult);
    assert.ok(
      testCase.overDiscount.discount > overDiscountResult.trace.adjustedFeeMinor,
      "generated discount must exceed the adjusted amount",
    );
    assert.equal(overDiscountResult.charge, moneyMinor(0));

    const overEstimateResult = calculator.calculate(testCase.overEstimate);
    assertAmountInvariants(testCase.overEstimate, overEstimateResult);
    assert.ok(
      overEstimateResult.trace.afterDiscountMinor
        > testCase.overEstimate.estimatedTripFare,
      "generated post-discount amount must exceed the estimate",
    );
    assert.equal(
      overEstimateResult.charge,
      testCase.overEstimate.estimatedTripFare,
    );
    assert.equal(overEstimateResult.trace.capped, true);

    const zeroEstimateResult = calculator.calculate(testCase.zeroEstimate);
    assertAmountInvariants(testCase.zeroEstimate, zeroEstimateResult);
    assert.equal(zeroEstimateResult.charge, moneyMinor(0));
  }
});

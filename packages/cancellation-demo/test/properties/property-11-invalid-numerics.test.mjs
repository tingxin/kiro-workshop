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

const INVALID_CATEGORIES = Object.freeze([
  "NEGATIVE",
  "FRACTIONAL",
  "NON_FINITE",
  "UNSAFE_INTEGER",
]);

function invalidNumber(category, random) {
  switch (category) {
    case "NEGATIVE":
      return -random.nextInt(1, 1_000_000);
    case "FRACTIONAL":
      return random.nextInt(0, 1_000_000) + 0.5;
    case "NON_FINITE":
      return random.pick([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]);
    case "UNSAFE_INTEGER":
      return Number.MAX_SAFE_INTEGER + random.nextInt(1, 1_000_000);
    default:
      assert.fail(`unsupported invalid numeric category: ${category}`);
  }
}

const cases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x11_009_010 + caseNumber);
  const moneyCategory = INVALID_CATEGORIES[caseNumber % INVALID_CATEGORIES.length];
  const basisPointsCategory = INVALID_CATEGORIES[
    (caseNumber * 3 + 1) % INVALID_CATEGORIES.length
  ];

  return Object.freeze({
    moneyCategory,
    invalidMoney: invalidNumber(moneyCategory, random),
    basisPointsCategory,
    invalidBasisPoints: invalidNumber(basisPointsCategory, random),
  });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-009.6, REQ-010.9**
propertyTest(11, "Invalid numeric policy inputs are rejected", () => {
  const calculator = new CappedFeeCalculator();
  const observedMoneyCategories = new Set();
  const observedBasisPointsCategories = new Set();

  assert.equal(cases.length, PROPERTY_CASE_COUNT);

  for (const testCase of cases) {
    observedMoneyCategories.add(testCase.moneyCategory);
    observedBasisPointsCategories.add(testCase.basisPointsCategory);

    assert.throws(
      () => moneyMinor(testCase.invalidMoney),
      RangeError,
      `${testCase.moneyCategory} money must be rejected rather than coerced`,
    );

    assert.throws(
      () => calculator.calculate({
        baseFee: moneyMinor(500),
        estimatedTripFare: moneyMinor(900),
        adjustmentBasisPoints: testCase.invalidBasisPoints,
        discount: moneyMinor(0),
      }),
      RangeError,
      `${testCase.basisPointsCategory} basis points must be rejected rather than coerced`,
    );
  }

  assert.deepEqual(observedMoneyCategories, new Set(INVALID_CATEGORIES));
  assert.deepEqual(observedBasisPointsCategories, new Set(INVALID_CATEGORIES));
});

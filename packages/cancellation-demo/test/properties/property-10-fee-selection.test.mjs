import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const serviceTypes = Object.freeze(["EXPRESS", "PREMIUM", "BUSINESS"]);
const chargeTypes = Object.freeze(["CANCELLATION_FEE", "NO_SHOW_FEE"]);
const approvedCombinations = Object.freeze(
  serviceTypes.flatMap((serviceType) => (
    chargeTypes.map((chargeType) => Object.freeze({ serviceType, chargeType }))
  )),
);

const random = createSeededRandom(0x10fe_e510);
const cases = generatePropertyCases((index) => {
  const combination = index < approvedCombinations.length
    ? approvedCombinations[index]
    : random.pick(approvedCombinations);
  const amountBase = random.nextInt(1, 1_000_000);
  const snapshot = Object.freeze({
    ruleVersion: `workshop-property-10-v${index}-${random.nextUint32()}`,
    baseFees: Object.freeze({
      EXPRESS: Object.freeze({
        CANCELLATION_FEE: moneyMinor(amountBase),
        NO_SHOW_FEE: moneyMinor(amountBase + 1),
      }),
      PREMIUM: Object.freeze({
        CANCELLATION_FEE: moneyMinor(amountBase + 2),
        NO_SHOW_FEE: moneyMinor(amountBase + 3),
      }),
      BUSINESS: Object.freeze({
        CANCELLATION_FEE: moneyMinor(amountBase + 4),
        NO_SHOW_FEE: moneyMinor(amountBase + 5),
      }),
    }),
  });

  return Object.freeze({ ...combination, snapshot });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-009.1, REQ-009.2, REQ-009.3, REQ-009.4, REQ-009.5**
propertyTest(
  10,
  "Fee selection is a deterministic snapshot lookup",
  async () => {
    const { FeeInputSelector } = await import(
      "../../dist/application/fee-input-selector.js"
    );
    const observedCombinations = new Set();

    assert.equal(cases.length, PROPERTY_CASE_COUNT);

    for (const testCase of cases) {
      const selector = new FeeInputSelector({
        async getSnapshot() {
          return { status: "AVAILABLE", value: testCase.snapshot };
        },
      });
      const expected = {
        status: "AVAILABLE",
        value: {
          baseFee:
            testCase.snapshot.baseFees[testCase.serviceType][testCase.chargeType],
          ruleVersion: testCase.snapshot.ruleVersion,
        },
      };

      const first = await selector.select(
        testCase.serviceType,
        testCase.chargeType,
      );
      const repeated = await selector.select(
        testCase.serviceType,
        testCase.chargeType,
      );

      assert.deepEqual(first, expected);
      assert.deepEqual(repeated, expected);
      assert.equal(first.value.ruleVersion, testCase.snapshot.ruleVersion);
      observedCombinations.add(
        `${testCase.serviceType}:${testCase.chargeType}`,
      );
    }

    assert.deepEqual(
      observedCombinations,
      new Set(approvedCombinations.map(
        ({ serviceType, chargeType }) => `${serviceType}:${chargeType}`,
      )),
    );
  },
);

import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
  sensitiveSentinels,
} from "../support/deterministic-generators.mjs";

const available = (value) => Object.freeze({ status: "AVAILABLE", value });

function feeTrace(finalFeeMinor) {
  return Object.freeze({
    baseFeeMinor: finalFeeMinor,
    adjustmentBasisPoints: 10_000,
    adjustedFeeMinor: finalFeeMinor,
    discountMinor: 0,
    afterDiscountMinor: finalFeeMinor,
    estimatedTripFareMinor: finalFeeMinor,
    capped: false,
    finalFeeMinor,
  });
}

function selectedFee(ruleVersion, amount) {
  return Object.freeze({
    ruleVersion,
    charge: moneyMinor(amount),
    trace: feeTrace(amount),
  });
}

const random = createSeededRandom(0x04e1d3c3);
const cases = generatePropertyCases((caseNumber) => {
  const ordinaryPath = random.pick([
    "PASSENGER_NO_SHOW_FEE",
    "FREE_CANCELLATION_WINDOW",
    "PASSENGER_CANCELLATION_FEE",
  ]);
  const ruleVersion = `workshop-property-04-v${caseNumber}`;
  const noShowAmount = random.nextInt(1, 2_000);
  const cancellationAmount = random.nextInt(1, 2_000);
  const sentinels = sensitiveSentinels(caseNumber);

  return Object.freeze({
    ordinaryPath,
    invalidExemption: `UNAPPROVED_EXEMPTION_${caseNumber}_${random.nextUint32()}`,
    unverifiedStatement: `${sentinels.safetyNarrative}_UNVERIFIED_${random.nextUint32()}`,
    input: Object.freeze({
      capturedRuleVersion: ruleVersion,
      noShowEligibility: available(ordinaryPath === "PASSENGER_NO_SHOW_FEE"),
      noShowFee: selectedFee(ruleVersion, noShowAmount),
      freeWindow: ordinaryPath === "FREE_CANCELLATION_WINDOW"
        ? Object.freeze({
            status: "AVAILABLE",
            outcome: "FREE_CANCELLATION_WINDOW",
            elapsedSeconds: random.nextInt(0, 120),
            charge: moneyMinor(0),
            publicReasonCode: "FREE_CANCELLATION_WINDOW",
          })
        : Object.freeze({
            status: "AVAILABLE",
            outcome: "CONTINUE",
            elapsedSeconds: random.nextInt(121, 10_000),
          }),
      cancellationFee: selectedFee(ruleVersion, cancellationAmount),
    }),
  });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-002.8, REQ-004.2, REQ-004.4, REQ-004.5, REQ-008.6**
propertyTest(4, "Unapproved exemption values and unverified statements are non-influential", async () => {
  const { DecisionEngine } = await import("../../dist/domain/decision-engine.js");
  const engine = new DecisionEngine();
  const invalidExemptions = new Set();
  const unverifiedStatements = new Set();

  for (const testCase of cases) {
    invalidExemptions.add(testCase.invalidExemption);
    unverifiedStatements.add(testCase.unverifiedStatement);

    const baseline = engine.evaluate(testCase.input);
    const invalidExemptionOnly = engine.evaluate({
      ...testCase.input,
      confirmedExemption: testCase.invalidExemption,
    });
    const unverifiedStatementOnly = engine.evaluate({
      ...testCase.input,
      unverifiedStatement: testCase.unverifiedStatement,
    });
    const combinedUntrustedInputs = engine.evaluate({
      ...testCase.input,
      confirmedExemption: testCase.invalidExemption,
      unverifiedStatement: testCase.unverifiedStatement,
    });

    assert.deepEqual(invalidExemptionOnly, baseline);
    assert.deepEqual(unverifiedStatementOnly, baseline);
    assert.deepEqual(combinedUntrustedInputs, baseline);
    assert.equal(baseline.status, "DECIDED");
    assert.equal(baseline.selectedCandidate, testCase.ordinaryPath);
    assert.notEqual(baseline.publicReasonCode, "STRONG_EXEMPTION");
    assert.equal(Object.hasOwn(baseline, "confirmedExemption"), false);
    assert.equal(Object.hasOwn(baseline, "liableParty"), false);

    const serializedResult = JSON.stringify(combinedUntrustedInputs);
    assert.equal(serializedResult.includes(testCase.invalidExemption), false);
    assert.equal(serializedResult.includes(testCase.unverifiedStatement), false);
  }

  assert.equal(invalidExemptions.size, PROPERTY_CASE_COUNT);
  assert.equal(unverifiedStatements.size, PROPERTY_CASE_COUNT);
});

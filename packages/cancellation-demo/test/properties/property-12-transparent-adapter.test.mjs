import assert from "node:assert/strict";

import {
  CappedFeeCalculator,
  moneyMinor,
} from "@company/cancellation-policy-kit";

import {
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const generatedCases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x12_010_004 + caseNumber);

  return Object.freeze({
    baseFee: moneyMinor(random.nextInt(0, 100_000)),
    estimatedTripFare: moneyMinor(random.nextInt(0, 500_000)),
    adjustmentBasisPoints: random.nextInt(0, 50_000),
    discount: moneyMinor(random.nextInt(0, 500_000)),
  });
}, 128);

// **Validates: Requirements REQ-010.1, REQ-010.2, REQ-010.3, REQ-010.4**
propertyTest(12, "Fee adapter is transparent", async () => {
  const { calculateCancellationFee } = await import(
    "../../dist/calculate-cancellation-fee.js"
  );
  const calculator = new CappedFeeCalculator();

  assert.equal(generatedCases.length, 128);

  for (const input of generatedCases) {
    const inputBeforeCalculation = { ...input };
    const directResult = calculator.calculate(input);
    const adapterResult = calculateCancellationFee(input);

    assert.deepEqual(
      {
        charge: adapterResult.charge,
        trace: adapterResult.trace,
      },
      directResult,
      "the adapter must return the package-root calculator charge and trace unchanged",
    );
    assert.deepEqual(
      adapterResult,
      {
        status: "CALCULATED",
        charge: directResult.charge,
        trace: directResult.trace,
      },
      "the adapter must add only its calculation status to the direct result",
    );
    assert.deepEqual(
      input,
      inputBeforeCalculation,
      "the adapter and calculator must not mutate the supplied fee tuple",
    );
  }
});

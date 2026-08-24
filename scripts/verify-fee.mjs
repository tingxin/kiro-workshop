import assert from "node:assert/strict";
import {
  CappedFeeCalculator,
  moneyMinor,
} from "../packages/company-policy-kit/dist/index.js";

const calculator = new CappedFeeCalculator();
const regression = calculator.calculate({
  baseFee: moneyMinor(500),
  estimatedTripFare: moneyMinor(900),
  adjustmentBasisPoints: 20_000,
  discount: moneyMinor(0),
});
assert.equal(regression.charge, 900);

for (let base = 0; base <= 2_000; base += 125) {
  for (let estimate = 0; estimate <= 2_000; estimate += 100) {
    for (const basisPoints of [0, 5_000, 10_000, 20_000, 35_000]) {
      for (const discount of [0, 100, 500, 2_500]) {
        const result = calculator.calculate({
          baseFee: moneyMinor(base),
          estimatedTripFare: moneyMinor(estimate),
          adjustmentBasisPoints: basisPoints,
          discount: moneyMinor(discount),
        });
        assert.ok(result.charge >= 0);
        assert.ok(result.charge <= estimate);
      }
    }
  }
}

console.log("fee verification passed: fixed regression and deterministic property cases");

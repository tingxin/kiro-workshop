import assert from "node:assert/strict";
import { moneyMinor } from "../packages/company-policy-kit/dist/index.js";
import { calculateCancellationFee } from "../packages/cancellation-demo/dist/calculate-cancellation-fee.js";

const result = calculateCancellationFee({
  baseFee: moneyMinor(500),
  estimatedTripFare: moneyMinor(900),
  adjustmentBasisPoints: 20_000,
  discount: moneyMinor(0),
});

assert.equal(
  result.status,
  "CALCULATED",
  "expected CALCULATED; complete the Workshop adapter TODO",
);
assert.equal(result.charge, 900);
assert.ok("trace" in result, "calculated quote must include trace");
if ("trace" in result) {
  assert.equal(result.trace.adjustedFeeMinor, 1_000);
  assert.equal(result.trace.finalFeeMinor, 900);
  assert.equal(result.trace.capped, true);
}

console.log("cancellation fee adapter verification passed: CALCULATED, 900, trace");
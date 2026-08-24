import { moneyMinor } from "@company/cancellation-policy-kit";
import { calculateCancellationFee } from "./calculate-cancellation-fee.js";

const result = calculateCancellationFee({
  baseFee: moneyMinor(500),
  estimatedTripFare: moneyMinor(900),
  adjustmentBasisPoints: 20_000,
  discount: moneyMinor(0),
});

console.log(
  JSON.stringify(
    {
      workshopState: result.status === "CALCULATED" ? "IMPLEMENTED" : "STARTER",
      feeResult: result,
      expectedAfterLiveImplementation: {
        status: "CALCULATED",
        chargeMinor: 900,
        note: "500 base × 2.0 adjustment is capped by the 900 estimated fare",
      },
    },
    null,
    2,
  ),
);

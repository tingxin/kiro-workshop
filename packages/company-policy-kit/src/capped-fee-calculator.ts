import { moneyMinor, type MoneyMinor } from "./money.js";

export interface CappedFeeInput {
  readonly baseFee: MoneyMinor;
  readonly estimatedTripFare: MoneyMinor;
  /** 10_000 basis points equals 1.0x. */
  readonly adjustmentBasisPoints: number;
  readonly discount: MoneyMinor;
}

export interface FeeCalculationTrace {
  readonly baseFeeMinor: number;
  readonly adjustmentBasisPoints: number;
  readonly adjustedFeeMinor: number;
  readonly discountMinor: number;
  readonly afterDiscountMinor: number;
  readonly estimatedTripFareMinor: number;
  readonly capped: boolean;
  readonly finalFeeMinor: number;
}

export interface CappedFeeResult {
  readonly charge: MoneyMinor;
  readonly trace: FeeCalculationTrace;
}

/**
 * Company-owned monetary policy primitive.
 * Product code selects policy inputs but must not duplicate this algorithm.
 */
export class CappedFeeCalculator {
  calculate(input: CappedFeeInput): CappedFeeResult {
    if (!Number.isSafeInteger(input.adjustmentBasisPoints) || input.adjustmentBasisPoints < 0) {
      throw new RangeError("adjustmentBasisPoints must be a non-negative safe integer");
    }

    const adjustedFeeMinor = Math.round(
      (input.baseFee * input.adjustmentBasisPoints) / 10_000,
    );
    const afterDiscountMinor = Math.max(0, adjustedFeeMinor - input.discount);
    const finalFeeMinor = Math.min(afterDiscountMinor, input.estimatedTripFare);

    return {
      charge: moneyMinor(finalFeeMinor),
      trace: {
        baseFeeMinor: input.baseFee,
        adjustmentBasisPoints: input.adjustmentBasisPoints,
        adjustedFeeMinor,
        discountMinor: input.discount,
        afterDiscountMinor,
        estimatedTripFareMinor: input.estimatedTripFare,
        capped: afterDiscountMinor > input.estimatedTripFare,
        finalFeeMinor,
      },
    };
  }
}

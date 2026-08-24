import {
  ZERO_MONEY,
  type CappedFeeInput,
  type FeeCalculationTrace,
  type MoneyMinor,
} from "@company/cancellation-policy-kit";

export type CancellationFeeInput = CappedFeeInput;

export type CancellationFeeQuote =
  | {
      readonly status: "NOT_IMPLEMENTED";
      readonly charge: MoneyMinor;
    }
  | {
      readonly status: "CALCULATED";
      readonly charge: MoneyMinor;
      readonly trace: FeeCalculationTrace;
    };

/**
 * Safe Workshop starter. Use /custom-find-skill before implementing this adapter.
 */
export function calculateCancellationFee(
  _input: CancellationFeeInput,
): CancellationFeeQuote {
  return {
    status: "NOT_IMPLEMENTED",
    charge: ZERO_MONEY,
  };
}

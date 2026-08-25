import {
  type CappedFeeInput,
  type FeeCalculationTrace,
  type MoneyMinor,
  ZERO_MONEY,
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

export function calculateCancellationFee(
  _input: CancellationFeeInput,
): CancellationFeeQuote {
  // TODO(KIRO-LAB): use the approved company fee calculator here.
  return {
    status: "NOT_IMPLEMENTED",
    charge: ZERO_MONEY,
  };
}

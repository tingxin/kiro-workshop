import {
  CappedFeeCalculator,
  type CappedFeeInput,
  type FeeCalculationTrace,
  type MoneyMinor,
} from "@company/cancellation-policy-kit";

export type CancellationFeeInput = CappedFeeInput;
export interface CancellationFeeQuote {
  readonly status: "CALCULATED";
  readonly charge: MoneyMinor;
  readonly trace: FeeCalculationTrace;
}

const calculator = new CappedFeeCalculator();

export function calculateCancellationFee(
  input: CancellationFeeInput,
): CancellationFeeQuote {
  const result = calculator.calculate(input);
  return {
    status: "CALCULATED",
    charge: result.charge,
    trace: result.trace,
  };
}

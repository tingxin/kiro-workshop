import type { MoneyMinor } from "./money.js";

export type PublicReasonCode =
  | "STRONG_EXEMPTION"
  | "FREE_CANCELLATION_WINDOW"
  | "PASSENGER_CANCELLATION_FEE"
  | "PASSENGER_NO_SHOW_FEE"
  | "DEGRADED_NO_CHARGE"
  | "LEGACY_FLOW";

export interface ExplanationInput {
  readonly reasonCode: PublicReasonCode;
  readonly charge: MoneyMinor;
  readonly ruleVersion: string;
}

export interface SupportExplanation {
  readonly reasonCode: PublicReasonCode;
  readonly summary: string;
  readonly chargedAmountMinor: number;
  readonly ruleVersion: string;
}

const SUMMARIES: Readonly<Record<PublicReasonCode, string>> = {
  STRONG_EXEMPTION: "本次取消符合免责条件，未向乘客收取费用。",
  FREE_CANCELLATION_WINDOW: "本次取消发生在免费取消时段内。",
  PASSENGER_CANCELLATION_FEE: "司机已接单并提供接驾服务，本次按规则收取取消费。",
  PASSENGER_NO_SHOW_FEE: "司机已到达并完成必要等待与联系，本次按规则收取爽约费。",
  DEGRADED_NO_CHARGE: "判定依赖暂时不可用，本次取消成功且未向乘客收费。",
  LEGACY_FLOW: "该订单类型继续使用原有取消规则。",
};

/** Builds support-safe text and deliberately accepts no raw evidence or PII. */
export class DecisionExplanationBuilder {
  build(input: ExplanationInput): SupportExplanation {
    if (input.ruleVersion.trim().length === 0) {
      throw new TypeError("ruleVersion must not be empty");
    }

    return {
      reasonCode: input.reasonCode,
      summary: SUMMARIES[input.reasonCode],
      chargedAmountMinor: input.charge,
      ruleVersion: input.ruleVersion,
    };
  }
}

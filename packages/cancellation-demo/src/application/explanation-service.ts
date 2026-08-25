import {
  DecisionExplanationBuilder,
  type MoneyMinor,
  type PublicReasonCode,
} from "@company/cancellation-policy-kit";
import type { PublicExplanation } from "../domain/types.js";

export interface ExplanationRequest {
  readonly publicReasonCode?: PublicReasonCode;
  readonly charge?: MoneyMinor;
  readonly ruleVersion?: string;
}

export type ExplanationResult =
  | { readonly status: "AVAILABLE"; readonly value: PublicExplanation }
  | {
      readonly status: "UNAVAILABLE";
      readonly reason: "MISSING_REQUIRED_INPUT" | "INVALID_REQUIRED_INPUT";
    };

export class ExplanationService {
  readonly #builder = new DecisionExplanationBuilder();

  explain(input: ExplanationRequest): ExplanationResult {
    if (
      input.publicReasonCode === undefined ||
      input.charge === undefined ||
      input.ruleVersion === undefined
    ) {
      return {
        status: "UNAVAILABLE",
        reason: "MISSING_REQUIRED_INPUT",
      };
    }

    if (input.ruleVersion.trim().length === 0) {
      return {
        status: "UNAVAILABLE",
        reason: "INVALID_REQUIRED_INPUT",
      };
    }

    const built = this.#builder.build({
      reasonCode: input.publicReasonCode,
      charge: input.charge,
      ruleVersion: input.ruleVersion,
    });

    return {
      status: "AVAILABLE",
      value: {
        publicReasonCode: built.reasonCode,
        charge: built.chargedAmountMinor as MoneyMinor,
        ruleVersion: built.ruleVersion,
        summary: built.summary,
      },
    };
  }
}

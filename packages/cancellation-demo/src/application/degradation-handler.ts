import {
  moneyMinor,
  type MoneyMinor,
  type PublicReasonCode,
} from "@company/cancellation-policy-kit";

export type CriticalUnavailabilityCause =
  | "RULE_CONFIGURATION_UNAVAILABLE"
  | "MAP_EVIDENCE_UNAVAILABLE"
  | "NO_SHOW_EVIDENCE_UNAVAILABLE"
  | "DRIVER_ACCEPTANCE_UNAVAILABLE"
  | "CLOCK_UNAVAILABLE";

export interface DegradationInput {
  readonly cause: CriticalUnavailabilityCause;
  readonly capturedRuleVersion?: string;
}

export interface DegradedDecisionDraft {
  readonly cancellationSucceeded: true;
  readonly charge: MoneyMinor;
  readonly publicReasonCode: PublicReasonCode;
  readonly processingMode: "DEGRADED";
  readonly ruleVersion?: string;
}

export class DegradationHandler {
  createDraft(input: DegradationInput): DegradedDecisionDraft {
    return Object.freeze({
      cancellationSucceeded: true as const,
      charge: moneyMinor(0),
      publicReasonCode: "DEGRADED_NO_CHARGE" as const,
      processingMode: "DEGRADED" as const,
      ...(input.capturedRuleVersion === undefined
        ? {}
        : { ruleVersion: input.capturedRuleVersion }),
    });
  }
}

import {
  moneyMinor,
  type FeeCalculationTrace,
  type MoneyMinor,
  type PublicReasonCode,
} from "@company/cancellation-policy-kit";

import type {
  Availability,
  ConfirmedExemption,
  Party,
} from "./types.js";
import type { FreeWindowEvaluation } from "./free-window.js";

const APPROVED_EXEMPTION_RANKS: Readonly<Record<ConfirmedExemption, number>> = {
  LEGAL: 1,
  SAFETY: 2,
  ACCESSIBILITY: 3,
  PLATFORM_FAILURE: 4,
  CRITICAL_DEPENDENCY_FAILURE: 4,
  DRIVER_RESPONSIBILITY_CONFIRMED: 5,
};

const APPROVED_EXEMPTIONS: ReadonlySet<string> = new Set(
  Object.keys(APPROVED_EXEMPTION_RANKS),
);

export interface SelectedCalculatedFee {
  readonly ruleVersion: string;
  readonly charge: MoneyMinor;
  readonly trace: FeeCalculationTrace;
}

export type DecisionCandidate =
  | {
      readonly kind: "STRONG_EXEMPTION";
      readonly confirmedExemption: ConfirmedExemption;
      readonly ruleVersion?: string;
    }
  | {
      readonly kind: "PASSENGER_NO_SHOW_FEE";
      readonly fee: SelectedCalculatedFee;
    }
  | {
      readonly kind: "FREE_CANCELLATION_WINDOW";
      readonly ruleVersion?: string;
    }
  | {
      readonly kind: "PASSENGER_CANCELLATION_FEE";
      readonly fee: SelectedCalculatedFee;
    };

export interface DecisionEngineInput {
  readonly confirmedExemption?: string;
  readonly unverifiedStatement?: string;
  readonly confirmedLiableParty?: Party;
  readonly capturedRuleVersion?: string;
  readonly noShowEligibility: Availability<boolean>;
  readonly noShowFee?: SelectedCalculatedFee;
  readonly freeWindow: FreeWindowEvaluation;
  readonly cancellationFee?: SelectedCalculatedFee;
}

export interface DecisionEngineDecision {
  readonly status: "DECIDED";
  readonly selectedCandidate:
    | "STRONG_EXEMPTION"
    | "PASSENGER_NO_SHOW_FEE"
    | "FREE_CANCELLATION_WINDOW"
    | "PASSENGER_CANCELLATION_FEE";
  readonly confirmedExemption?: ConfirmedExemption;
  readonly liableParty?: Party;
  readonly charge: MoneyMinor;
  readonly publicReasonCode: PublicReasonCode;
  readonly ruleVersion?: string;
  readonly feeTrace?: FeeCalculationTrace;
}

export interface DecisionEngineUnavailable {
  readonly status: "UNAVAILABLE";
  readonly liableParty?: Party;
  readonly ruleVersion?: string;
}

export type DecisionEngineResult =
  | DecisionEngineDecision
  | DecisionEngineUnavailable;

function isApprovedExemption(value: string): value is ConfirmedExemption {
  return APPROVED_EXEMPTIONS.has(value);
}

function candidateRank(candidate: DecisionCandidate): number {
  if (candidate.kind === "STRONG_EXEMPTION") {
    return APPROVED_EXEMPTION_RANKS[candidate.confirmedExemption];
  }
  if (candidate.kind === "PASSENGER_NO_SHOW_FEE") {
    return 6;
  }
  return 7;
}

function deterministicCandidateKey(candidate: DecisionCandidate): string {
  return candidate.kind === "STRONG_EXEMPTION"
    ? `${candidate.kind}:${candidate.confirmedExemption}`
    : candidate.kind;
}

export function selectHighestPriorityCandidate(
  candidates: readonly DecisionCandidate[],
): DecisionCandidate {
  if (candidates.length === 0) {
    throw new RangeError("at least one approved decision candidate is required");
  }

  return candidates.reduce((selected, candidate) => {
    const selectedRank = candidateRank(selected);
    const nextRank = candidateRank(candidate);
    if (nextRank < selectedRank) {
      return candidate;
    }
    if (nextRank > selectedRank) {
      return selected;
    }
    return deterministicCandidateKey(candidate)
      < deterministicCandidateKey(selected)
      ? candidate
      : selected;
  });
}

function unavailableResult(
  liableParty: Party | undefined,
  ruleVersion: string | undefined,
): DecisionEngineUnavailable {
  return Object.freeze({
    status: "UNAVAILABLE" as const,
    ...(liableParty === undefined ? {} : { liableParty }),
    ...(ruleVersion === undefined ? {} : { ruleVersion }),
  });
}

function decisionFromCandidate(
  candidate: DecisionCandidate,
  liableParty: Party | undefined,
): DecisionEngineDecision {
  const liability = liableParty === undefined ? {} : { liableParty };

  if (candidate.kind === "STRONG_EXEMPTION") {
    return Object.freeze({
      status: "DECIDED" as const,
      selectedCandidate: candidate.kind,
      confirmedExemption: candidate.confirmedExemption,
      ...liability,
      charge: moneyMinor(0),
      publicReasonCode: "STRONG_EXEMPTION" as const,
      ...(candidate.ruleVersion === undefined
        ? {}
        : { ruleVersion: candidate.ruleVersion }),
    });
  }

  if (candidate.kind === "FREE_CANCELLATION_WINDOW") {
    return Object.freeze({
      status: "DECIDED" as const,
      selectedCandidate: candidate.kind,
      ...liability,
      charge: moneyMinor(0),
      publicReasonCode: "FREE_CANCELLATION_WINDOW" as const,
      ...(candidate.ruleVersion === undefined
        ? {}
        : { ruleVersion: candidate.ruleVersion }),
    });
  }

  const publicReasonCode = candidate.kind === "PASSENGER_NO_SHOW_FEE"
    ? "PASSENGER_NO_SHOW_FEE"
    : "PASSENGER_CANCELLATION_FEE";
  return Object.freeze({
    status: "DECIDED" as const,
    selectedCandidate: candidate.kind,
    ...liability,
    charge: candidate.fee.charge,
    publicReasonCode,
    ruleVersion: candidate.fee.ruleVersion,
    feeTrace: candidate.fee.trace,
  });
}

export class DecisionEngine {
  evaluate(input: DecisionEngineInput): DecisionEngineResult {
    if (
      input.confirmedExemption !== undefined
      && isApprovedExemption(input.confirmedExemption)
    ) {
      return decisionFromCandidate({
        kind: "STRONG_EXEMPTION",
        confirmedExemption: input.confirmedExemption,
        ...(input.capturedRuleVersion === undefined
          ? {}
          : { ruleVersion: input.capturedRuleVersion }),
      }, input.confirmedLiableParty);
    }

    if (input.noShowEligibility.status === "UNAVAILABLE") {
      return unavailableResult(
        input.confirmedLiableParty,
        input.capturedRuleVersion,
      );
    }

    let candidate: DecisionCandidate;
    if (input.noShowEligibility.value) {
      if (input.noShowFee === undefined) {
        return unavailableResult(
          input.confirmedLiableParty,
          input.capturedRuleVersion,
        );
      }
      candidate = {
        kind: "PASSENGER_NO_SHOW_FEE",
        fee: input.noShowFee,
      };
    } else if (input.freeWindow.status === "UNAVAILABLE") {
      return unavailableResult(
        input.confirmedLiableParty,
        input.capturedRuleVersion,
      );
    } else if (input.freeWindow.outcome === "FREE_CANCELLATION_WINDOW") {
      candidate = {
        kind: "FREE_CANCELLATION_WINDOW",
        ...(input.capturedRuleVersion === undefined
          ? {}
          : { ruleVersion: input.capturedRuleVersion }),
      };
    } else {
      if (input.cancellationFee === undefined) {
        return unavailableResult(
          input.confirmedLiableParty,
          input.capturedRuleVersion,
        );
      }
      candidate = {
        kind: "PASSENGER_CANCELLATION_FEE",
        fee: input.cancellationFee,
      };
    }

    return decisionFromCandidate(
      selectHighestPriorityCandidate([candidate]),
      input.confirmedLiableParty,
    );
  }
}

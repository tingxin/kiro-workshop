import {
  moneyMinor,
  type ChargeType,
  type MoneyMinor,
} from "@company/cancellation-policy-kit";

import { calculateCancellationFee } from "../calculate-cancellation-fee.js";
import { ArrivalEvaluator } from "../domain/arrival-evaluator.js";
import { DecisionEngine } from "../domain/decision-engine.js";
import { evaluateFreeWindow } from "../domain/free-window.js";
import { NoShowEvaluator } from "../domain/no-show-evaluator.js";
import type {
  Availability,
  ConfirmedExemption,
  MapArrivalEvidence,
  NoShowEvidence,
  Party,
  ReplayBusinessResult,
  ReplayResult,
  RuleConfigurationSnapshot,
  ServiceType,
} from "../domain/types.js";
import type { Clock } from "../ports.js";

export interface ReplayEvaluationSnapshot {
  readonly chargeType: ChargeType;
  readonly serviceType: ServiceType;
  readonly cancelInitiator: Party;
  readonly confirmedLiableParty?: Party;
  readonly confirmedExemption?: ConfirmedExemption;
  readonly driverAcceptedAtUtc?: string;
  readonly mapArrivalEvidence: Availability<MapArrivalEvidence>;
  readonly noShowEvidence: Availability<NoShowEvidence>;
  readonly estimatedTripFare: MoneyMinor;
  readonly adjustmentBasisPoints: number;
  readonly discount: MoneyMinor;
}

export interface ReplayRequest {
  readonly snapshot?: ReplayEvaluationSnapshot;
  readonly configuration?: RuleConfigurationSnapshot;
  readonly ruleVersion?: string;
}

const NOT_REPLAYABLE = Object.freeze({ status: "NOT_REPLAYABLE" as const });

function replayed(businessResult: ReplayBusinessResult): ReplayResult {
  return Object.freeze({
    status: "REPLAYED" as const,
    businessResult: Object.freeze(businessResult),
  });
}

function degradedResult(
  snapshot: ReplayEvaluationSnapshot,
  ruleVersion: string,
): ReplayResult {
  return replayed({
    chargeType: snapshot.chargeType,
    cancelInitiator: snapshot.cancelInitiator,
    ...(snapshot.confirmedLiableParty === undefined
      ? {}
      : { liableParty: snapshot.confirmedLiableParty }),
    charge: moneyMinor(0),
    publicReasonCode: "DEGRADED_NO_CHARGE",
    ruleVersion,
    processingMode: "DEGRADED",
  });
}

export class ReplayService {
  readonly #clock: Clock;
  readonly #arrivalEvaluator: ArrivalEvaluator;
  readonly #noShowEvaluator: NoShowEvaluator;
  readonly #decisionEngine: DecisionEngine;

  constructor(
    clock: Clock,
    arrivalEvaluator = new ArrivalEvaluator(),
    noShowEvaluator = new NoShowEvaluator(),
    decisionEngine = new DecisionEngine(),
  ) {
    this.#clock = clock;
    this.#arrivalEvaluator = arrivalEvaluator;
    this.#noShowEvaluator = noShowEvaluator;
    this.#decisionEngine = decisionEngine;
  }

  replay(request: ReplayRequest): ReplayResult {
    const { snapshot, configuration, ruleVersion } = request;
    if (
      snapshot === undefined
      || configuration === undefined
      || ruleVersion === undefined
      || configuration.ruleVersion !== ruleVersion
    ) {
      return NOT_REPLAYABLE;
    }

    const cancellationAtUtc = this.#clock.nowUtc();
    if (cancellationAtUtc.status === "UNAVAILABLE") {
      return NOT_REPLAYABLE;
    }

    let noShowEligibility: Availability<boolean> = Object.freeze({
      status: "AVAILABLE" as const,
      value: false,
    });
    if (snapshot.chargeType === "NO_SHOW_FEE") {
      if (snapshot.mapArrivalEvidence.status === "UNAVAILABLE") {
        return degradedResult(snapshot, ruleVersion);
      }
      const verifiedArrival = this.#arrivalEvaluator.evaluate(
        snapshot.mapArrivalEvidence.value,
      );
      noShowEligibility = this.#noShowEvaluator.evaluate(
        verifiedArrival,
        snapshot.noShowEvidence,
      );
      if (noShowEligibility.status === "UNAVAILABLE") {
        return degradedResult(snapshot, ruleVersion);
      }
    }

    const freeWindow = evaluateFreeWindow({
      driverAcceptedAtUtc: snapshot.driverAcceptedAtUtc,
      cancellationAtUtc,
    });
    if (freeWindow.status === "UNAVAILABLE") {
      return degradedResult(snapshot, ruleVersion);
    }

    const feeInput = {
      estimatedTripFare: snapshot.estimatedTripFare,
      adjustmentBasisPoints: snapshot.adjustmentBasisPoints,
      discount: snapshot.discount,
    };
    const cancellationQuote = calculateCancellationFee({
      ...feeInput,
      baseFee: configuration.baseFees[snapshot.serviceType].CANCELLATION_FEE,
    });
    const noShowQuote = calculateCancellationFee({
      ...feeInput,
      baseFee: configuration.baseFees[snapshot.serviceType].NO_SHOW_FEE,
    });

    const decision = this.#decisionEngine.evaluate({
      ...(snapshot.confirmedExemption === undefined
        ? {}
        : { confirmedExemption: snapshot.confirmedExemption }),
      ...(snapshot.confirmedLiableParty === undefined
        ? {}
        : { confirmedLiableParty: snapshot.confirmedLiableParty }),
      capturedRuleVersion: ruleVersion,
      noShowEligibility,
      noShowFee: {
        ruleVersion,
        charge: noShowQuote.charge,
        trace: noShowQuote.trace,
      },
      freeWindow,
      cancellationFee: {
        ruleVersion,
        charge: cancellationQuote.charge,
        trace: cancellationQuote.trace,
      },
    });

    if (decision.status === "UNAVAILABLE" || decision.ruleVersion === undefined) {
      return degradedResult(snapshot, ruleVersion);
    }

    return replayed({
      chargeType: snapshot.chargeType,
      cancelInitiator: snapshot.cancelInitiator,
      ...(decision.liableParty === undefined
        ? {}
        : { liableParty: decision.liableParty }),
      charge: decision.charge,
      publicReasonCode: decision.publicReasonCode,
      ruleVersion: decision.ruleVersion,
      ...(decision.feeTrace === undefined ? {} : { feeTrace: decision.feeTrace }),
      processingMode: "NORMAL",
    });
  }
}

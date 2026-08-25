import {
  buildDecisionIdempotencyKey,
  type ChargeType,
  type MoneyMinor,
} from "@company/cancellation-policy-kit";

import type { DecisionIdSource } from "../adapters/in-memory-fakes.js";
import { calculateCancellationFee } from "../calculate-cancellation-fee.js";
import type { ArrivalEvaluator } from "../domain/arrival-evaluator.js";
import type { DecisionEngine, SelectedCalculatedFee } from "../domain/decision-engine.js";
import { evaluateFreeWindow } from "../domain/free-window.js";
import type { NoShowEvaluator } from "../domain/no-show-evaluator.js";
import type {
  Availability,
  CancellationCommand,
  ConfirmedExemption,
  Decision,
  NoShowEvidence,
  Party,
  RuleConfigurationSnapshot,
  ServiceType,
} from "../domain/types.js";
import { isWorkshopV1ServiceType, type V1Router } from "../domain/v1-router.js";
import type {
  Clock,
  LegacyResult,
  MapPort,
  RuleRepositoryConfigurationPort,
} from "../ports.js";
import type { CancelInitiatorRegistry } from "./cancel-initiator-registry.js";
import type { DecisionCommitCoordinator } from "./decision-commit-coordinator.js";
import type {
  CriticalUnavailabilityCause,
  DegradationHandler,
} from "./degradation-handler.js";

const CHARGE_TYPES: ReadonlySet<string> = new Set([
  "CANCELLATION_FEE",
  "NO_SHOW_FEE",
]);
const PARTIES: ReadonlySet<string> = new Set(["PASSENGER", "DRIVER"]);
const CONFIRMED_EXEMPTIONS: ReadonlySet<string> = new Set([
  "LEGAL",
  "SAFETY",
  "ACCESSIBILITY",
  "PLATFORM_FAILURE",
  "CRITICAL_DEPENDENCY_FAILURE",
  "DRIVER_RESPONSIBILITY_CONFIRMED",
]);

export interface DecisionServiceDependencies {
  readonly router: V1Router;
  readonly clock: Clock;
  readonly initiatorRegistry: CancelInitiatorRegistry;
  readonly ruleRepository: RuleRepositoryConfigurationPort;
  readonly mapPort: MapPort;
  readonly arrivalEvaluator: ArrivalEvaluator;
  readonly noShowEvaluator: NoShowEvaluator;
  readonly decisionEngine: DecisionEngine;
  readonly degradationHandler: DegradationHandler;
  readonly commitCoordinator: DecisionCommitCoordinator;
  readonly decisionIdSource: DecisionIdSource;
}

export type DecisionServiceResult =
  | {
      readonly target: "LEGACY_FAKE";
      readonly legacyResult: LegacyResult;
    }
  | {
      readonly target: "WORKSHOP_V1";
      readonly decision: Decision;
      readonly created: boolean;
    };

function validUtcInstant(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function assertOptionalMoney(value: MoneyMinor | undefined, name: string): void {
  if (
    value !== undefined
    && (!Number.isSafeInteger(value) || value < 0)
  ) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

function assertNoShowEvidence(evidence: Availability<NoShowEvidence>): void {
  if (evidence.status === "UNAVAILABLE") {
    return;
  }
  const value = evidence.value;
  if (
    !Number.isSafeInteger(value.waitedAfterVerifiedArrivalSeconds)
    || value.waitedAfterVerifiedArrivalSeconds < 0
    || !Number.isSafeInteger(value.inPlatformContactAttempts)
    || value.inPlatformContactAttempts < 0
    || typeof value.inPlatformExplicitRefusal !== "boolean"
  ) {
    throw new TypeError("noShowEvidence must contain valid structural fields");
  }
}

function validateCommand(command: CancellationCommand): void {
  if (typeof command.orderId !== "string" || command.orderId.length === 0) {
    throw new TypeError("orderId must be a non-empty string");
  }
  if (!CHARGE_TYPES.has(command.chargeType)) {
    throw new TypeError("chargeType must be an approved charge type");
  }
  if (!PARTIES.has(command.requester)) {
    throw new TypeError("requester must be an approved party");
  }
  if (!validUtcInstant(command.requestedAtUtc)) {
    throw new TypeError("requestedAtUtc must be a valid UTC instant");
  }
  if (typeof command.isRealtime !== "boolean") {
    throw new TypeError("isRealtime must be boolean");
  }
  if (typeof command.serviceType !== "string" || command.serviceType.length === 0) {
    throw new TypeError("serviceType must be a non-empty string");
  }
  if (
    command.driverAcceptedAtUtc !== undefined
    && !validUtcInstant(command.driverAcceptedAtUtc)
  ) {
    throw new TypeError("driverAcceptedAtUtc must be a valid UTC instant");
  }
  if (
    command.confirmedLiableParty !== undefined
    && !PARTIES.has(command.confirmedLiableParty)
  ) {
    throw new TypeError("confirmedLiableParty must be an approved party");
  }
  assertOptionalMoney(command.estimatedTripFare, "estimatedTripFare");
  assertOptionalMoney(command.discount, "discount");
  if (
    command.adjustmentBasisPoints !== undefined
    && (
      !Number.isSafeInteger(command.adjustmentBasisPoints)
      || command.adjustmentBasisPoints < 0
    )
  ) {
    throw new RangeError(
      "adjustmentBasisPoints must be a non-negative safe integer",
    );
  }
  if (command.noShowEvidence !== undefined) {
    assertNoShowEvidence(command.noShowEvidence);
  }
}

function isConfirmedExemption(value: string | undefined): value is ConfirmedExemption {
  return value !== undefined && CONFIRMED_EXEMPTIONS.has(value);
}

function requireFeeCalculationInputs(command: CancellationCommand): {
  readonly estimatedTripFare: MoneyMinor;
  readonly adjustmentBasisPoints: number;
  readonly discount: MoneyMinor;
} {
  if (
    command.estimatedTripFare === undefined
    || command.adjustmentBasisPoints === undefined
    || command.discount === undefined
  ) {
    throw new TypeError(
      "estimatedTripFare, adjustmentBasisPoints, and discount are required for fee calculation",
    );
  }
  return {
    estimatedTripFare: command.estimatedTripFare,
    adjustmentBasisPoints: command.adjustmentBasisPoints,
    discount: command.discount,
  };
}

function calculateSelectedFee(
  snapshot: RuleConfigurationSnapshot,
  serviceType: ServiceType,
  chargeType: ChargeType,
  command: CancellationCommand,
): SelectedCalculatedFee {
  const inputs = requireFeeCalculationInputs(command);
  const calculated = calculateCancellationFee({
    baseFee: snapshot.baseFees[serviceType][chargeType],
    estimatedTripFare: inputs.estimatedTripFare,
    adjustmentBasisPoints: inputs.adjustmentBasisPoints,
    discount: inputs.discount,
  });
  return Object.freeze({
    ruleVersion: snapshot.ruleVersion,
    charge: calculated.charge,
    trace: Object.freeze(calculated.trace),
  });
}

export class DecisionService {
  readonly #dependencies: DecisionServiceDependencies;

  constructor(dependencies: DecisionServiceDependencies) {
    this.#dependencies = dependencies;
  }

  async execute(command: CancellationCommand): Promise<DecisionServiceResult> {
    validateCommand(command);

    const routing = await this.#dependencies.router.route(command);
    if (routing.target === "LEGACY_FAKE") {
      return Object.freeze({
        target: "LEGACY_FAKE" as const,
        legacyResult: routing.legacyResult,
      });
    }

    if (!isWorkshopV1ServiceType(command.serviceType)) {
      throw new Error("router returned WORKSHOP_V1 for an unsupported service type");
    }
    const serviceType = command.serviceType;

    const acceptedAt = this.#dependencies.clock.nowUtc();
    if (
      acceptedAt.status === "AVAILABLE"
      && !validUtcInstant(acceptedAt.value)
    ) {
      throw new TypeError("Clock must return a valid UTC instant");
    }
    const initiator = this.#dependencies.initiatorRegistry.createOrGet(
      command.orderId,
      command.requester,
      acceptedAt.status === "AVAILABLE" ? acceptedAt.value : undefined,
    );
    const decisionIdempotencyKey = buildDecisionIdempotencyKey(
      command.orderId,
      command.chargeType,
    );

    const committed = await this.#dependencies.commitCoordinator.commit({
      decisionIdempotencyKey,
      createDecision: async () => this.#createDecision(
        command,
        serviceType,
        decisionIdempotencyKey,
        initiator.cancelInitiator,
        acceptedAt,
      ),
      requestedAtUtc: command.requestedAtUtc,
      ...(initiator.acceptedAtUtc === undefined
        ? {}
        : { acceptedAtUtc: initiator.acceptedAtUtc }),
      ...(isConfirmedExemption(command.confirmedExemption)
        ? { confirmedExemption: command.confirmedExemption }
        : {}),
    });

    return Object.freeze({
      target: "WORKSHOP_V1" as const,
      decision: committed.decision,
      created: committed.created,
    });
  }

  async #createDecision(
    command: CancellationCommand,
    serviceType: ServiceType,
    decisionIdempotencyKey: string,
    cancelInitiator: Party,
    acceptedAt: Availability<string>,
  ): Promise<Decision> {
    if (acceptedAt.status === "UNAVAILABLE") {
      return this.#createDegradedDecision(
        command,
        decisionIdempotencyKey,
        cancelInitiator,
        "CLOCK_UNAVAILABLE",
      );
    }
    if (command.driverAcceptedAtUtc === undefined) {
      return this.#createDegradedDecision(
        command,
        decisionIdempotencyKey,
        cancelInitiator,
        "DRIVER_ACCEPTANCE_UNAVAILABLE",
      );
    }

    const configuration = await this.#dependencies.ruleRepository.getSnapshot();
    if (configuration.status === "UNAVAILABLE") {
      return this.#createDegradedDecision(
        command,
        decisionIdempotencyKey,
        cancelInitiator,
        "RULE_CONFIGURATION_UNAVAILABLE",
      );
    }
    const snapshot = configuration.value;

    let noShowEligibility: Availability<boolean> = Object.freeze({
      status: "AVAILABLE" as const,
      value: false,
    });
    if (command.chargeType === "NO_SHOW_FEE") {
      const mapEvidence = await this.#dependencies.mapPort.getArrivalEvidence(
        command.orderId,
      );
      if (mapEvidence.status === "UNAVAILABLE") {
        return this.#createDegradedDecision(
          command,
          decisionIdempotencyKey,
          cancelInitiator,
          "MAP_EVIDENCE_UNAVAILABLE",
          snapshot.ruleVersion,
        );
      }
      if (command.noShowEvidence === undefined) {
        return this.#createDegradedDecision(
          command,
          decisionIdempotencyKey,
          cancelInitiator,
          "NO_SHOW_EVIDENCE_UNAVAILABLE",
          snapshot.ruleVersion,
        );
      }
      const verifiedArrival = this.#dependencies.arrivalEvaluator.evaluate(
        mapEvidence.value,
      );
      noShowEligibility = this.#dependencies.noShowEvaluator.evaluate(
        verifiedArrival,
        command.noShowEvidence,
      );
      if (noShowEligibility.status === "UNAVAILABLE") {
        return this.#createDegradedDecision(
          command,
          decisionIdempotencyKey,
          cancelInitiator,
          "NO_SHOW_EVIDENCE_UNAVAILABLE",
          snapshot.ruleVersion,
        );
      }
    }

    const freeWindow = evaluateFreeWindow({
      driverAcceptedAtUtc: command.driverAcceptedAtUtc,
      cancellationAtUtc: acceptedAt,
    });
    const calculationInputsRequired = !isConfirmedExemption(
      command.confirmedExemption,
    ) && !(
      noShowEligibility.status === "AVAILABLE"
      && !noShowEligibility.value
      && freeWindow.status === "AVAILABLE"
      && freeWindow.outcome === "FREE_CANCELLATION_WINDOW"
    );
    const noShowFee = calculationInputsRequired && command.chargeType === "NO_SHOW_FEE"
      ? calculateSelectedFee(snapshot, serviceType, "NO_SHOW_FEE", command)
      : undefined;
    const cancellationFee = calculationInputsRequired
      ? calculateSelectedFee(snapshot, serviceType, "CANCELLATION_FEE", command)
      : undefined;

    const evaluated = this.#dependencies.decisionEngine.evaluate({
      confirmedExemption: command.confirmedExemption,
      unverifiedStatement: command.unverifiedStatement,
      confirmedLiableParty: command.confirmedLiableParty,
      capturedRuleVersion: snapshot.ruleVersion,
      noShowEligibility,
      ...(noShowFee === undefined ? {} : { noShowFee }),
      freeWindow,
      ...(cancellationFee === undefined ? {} : { cancellationFee }),
    });
    if (evaluated.status === "UNAVAILABLE") {
      return this.#createDegradedDecision(
        command,
        decisionIdempotencyKey,
        cancelInitiator,
        "NO_SHOW_EVIDENCE_UNAVAILABLE",
        evaluated.ruleVersion,
      );
    }
    if (evaluated.ruleVersion === undefined) {
      throw new Error("normal Decision requires a captured Rule Version");
    }

    return Object.freeze({
      decisionId: this.#dependencies.decisionIdSource.nextDecisionId(),
      decisionIdempotencyKey,
      orderId: command.orderId,
      chargeType: command.chargeType,
      cancelInitiator,
      ...(evaluated.liableParty === undefined
        ? {}
        : { liableParty: evaluated.liableParty }),
      charge: evaluated.charge,
      publicReasonCode: evaluated.publicReasonCode,
      ...(evaluated.feeTrace === undefined
        ? {}
        : { feeTrace: Object.freeze(evaluated.feeTrace) }),
      processingMode: "NORMAL" as const,
      ruleVersion: evaluated.ruleVersion,
    });
  }

  #createDegradedDecision(
    command: CancellationCommand,
    decisionIdempotencyKey: string,
    cancelInitiator: Party,
    cause: CriticalUnavailabilityCause,
    capturedRuleVersion?: string,
  ): Decision {
    const draft = this.#dependencies.degradationHandler.createDraft({
      cause,
      ...(capturedRuleVersion === undefined ? {} : { capturedRuleVersion }),
    });
    return Object.freeze({
      decisionId: this.#dependencies.decisionIdSource.nextDecisionId(),
      decisionIdempotencyKey,
      orderId: command.orderId,
      chargeType: command.chargeType,
      cancelInitiator,
      ...(command.confirmedLiableParty === undefined
        ? {}
        : { liableParty: command.confirmedLiableParty }),
      charge: draft.charge,
      publicReasonCode: draft.publicReasonCode,
      processingMode: draft.processingMode,
      ...(draft.ruleVersion === undefined
        ? {}
        : { ruleVersion: draft.ruleVersion }),
    });
  }
}

import { moneyMinor } from "@company/cancellation-policy-kit";

import type {
  Availability,
  CancellationCommand,
  MapArrivalEvidence,
  RuleConfigurationSnapshot,
  SupportView,
} from "../domain/types.js";
import type {
  Clock,
  CompensationSettlementPort,
  LegacyPort,
  LegacyResult,
  MapPort,
  NotificationPort,
  PaymentChargePort,
  RiskPort,
  RuleRepositoryConfigurationPort,
  SupportPort,
  SyntheticActionInput,
  SyntheticActionResult,
} from "../ports.js";

const UNAVAILABLE = Object.freeze({ status: "UNAVAILABLE" } as const);

function unavailable<T>(): Availability<T> {
  return UNAVAILABLE;
}

function available<T>(value: T): Availability<T> {
  return Object.freeze({ status: "AVAILABLE" as const, value });
}

function freezeMapEvidence(evidence: MapArrivalEvidence): MapArrivalEvidence {
  return Object.freeze({
    distanceToPickupMeters: evidence.distanceToPickupMeters,
    continuouslyWithinThresholdSeconds: evidence.continuouslyWithinThresholdSeconds,
  });
}

function freezeMapResult(
  result: Availability<MapArrivalEvidence>,
): Availability<MapArrivalEvidence> {
  return result.status === "AVAILABLE"
    ? available(freezeMapEvidence(result.value))
    : unavailable();
}

function freezeRuleSnapshot(
  snapshot: RuleConfigurationSnapshot,
): RuleConfigurationSnapshot {
  return Object.freeze({
    ruleVersion: snapshot.ruleVersion,
    baseFees: Object.freeze({
      EXPRESS: Object.freeze({
        CANCELLATION_FEE: snapshot.baseFees.EXPRESS.CANCELLATION_FEE,
        NO_SHOW_FEE: snapshot.baseFees.EXPRESS.NO_SHOW_FEE,
      }),
      PREMIUM: Object.freeze({
        CANCELLATION_FEE: snapshot.baseFees.PREMIUM.CANCELLATION_FEE,
        NO_SHOW_FEE: snapshot.baseFees.PREMIUM.NO_SHOW_FEE,
      }),
      BUSINESS: Object.freeze({
        CANCELLATION_FEE: snapshot.baseFees.BUSINESS.CANCELLATION_FEE,
        NO_SHOW_FEE: snapshot.baseFees.BUSINESS.NO_SHOW_FEE,
      }),
    }),
  });
}

function freezeRuleResult(
  result: Availability<RuleConfigurationSnapshot>,
): Availability<RuleConfigurationSnapshot> {
  return result.status === "AVAILABLE"
    ? available(freezeRuleSnapshot(result.value))
    : unavailable();
}

function freezeActionInput(input: SyntheticActionInput): SyntheticActionInput {
  return Object.freeze({
    decisionIdempotencyKey: input.decisionIdempotencyKey,
    decisionId: input.decisionId,
    amount: input.amount,
  });
}

export const WORKSHOP_RULE_VERSION = "workshop-fee-v1";

export function createWorkshopRuleConfigurationSnapshot(): RuleConfigurationSnapshot {
  return freezeRuleSnapshot({
    ruleVersion: WORKSHOP_RULE_VERSION,
    baseFees: {
      EXPRESS: {
        CANCELLATION_FEE: moneyMinor(500),
        NO_SHOW_FEE: moneyMinor(800),
      },
      PREMIUM: {
        CANCELLATION_FEE: moneyMinor(800),
        NO_SHOW_FEE: moneyMinor(1_200),
      },
      BUSINESS: {
        CANCELLATION_FEE: moneyMinor(800),
        NO_SHOW_FEE: moneyMinor(1_200),
      },
    },
  });
}

export class InMemoryMapFake implements MapPort {
  readonly adapterKind = "IN_MEMORY_FAKE" as const;
  #result: Availability<MapArrivalEvidence>;

  constructor(result: Availability<MapArrivalEvidence> = unavailable()) {
    this.#result = freezeMapResult(result);
  }

  setResult(result: Availability<MapArrivalEvidence>): void {
    this.#result = freezeMapResult(result);
  }

  async getArrivalEvidence(_orderId: string): Promise<Availability<MapArrivalEvidence>> {
    return this.#result;
  }
}

abstract class SyntheticActionFake {
  readonly adapterKind = "IN_MEMORY_FAKE" as const;
  #status: SyntheticActionResult["status"];
  #records: SyntheticActionInput[] = [];

  protected constructor(status: SyntheticActionResult["status"] = "SYNTHETIC_SUCCESS") {
    this.#status = status;
  }

  get records(): readonly SyntheticActionInput[] {
    return Object.freeze(this.#records.slice());
  }

  setStatus(status: SyntheticActionResult["status"]): void {
    this.#status = status;
  }

  reset(): void {
    this.#records = [];
  }

  protected record(input: SyntheticActionInput): SyntheticActionResult {
    if (this.#status === "UNAVAILABLE") {
      return UNAVAILABLE;
    }
    this.#records.push(freezeActionInput(input));
    return Object.freeze({ status: "SYNTHETIC_SUCCESS" as const });
  }
}

export class InMemoryPaymentChargeFake
  extends SyntheticActionFake
  implements PaymentChargePort
{
  constructor(status: SyntheticActionResult["status"] = "SYNTHETIC_SUCCESS") {
    super(status);
  }

  async recordSyntheticCharge(
    input: SyntheticActionInput,
  ): Promise<SyntheticActionResult> {
    return this.record(input);
  }
}

export class InMemoryCompensationSettlementFake
  extends SyntheticActionFake
  implements CompensationSettlementPort
{
  constructor(status: SyntheticActionResult["status"] = "SYNTHETIC_SUCCESS") {
    super(status);
  }

  async recordSyntheticCompensation(
    input: SyntheticActionInput,
  ): Promise<SyntheticActionResult> {
    return this.record(input);
  }
}

export class InMemoryNotificationFake implements NotificationPort {
  readonly adapterKind = "IN_MEMORY_FAKE" as const;
}

export class InMemoryRiskFake implements RiskPort {
  readonly adapterKind = "IN_MEMORY_FAKE" as const;
}

export class InMemoryRuleRepositoryConfigurationFake
  implements RuleRepositoryConfigurationPort
{
  readonly adapterKind = "IN_MEMORY_FAKE" as const;
  #result: Availability<RuleConfigurationSnapshot>;

  constructor(
    result: Availability<RuleConfigurationSnapshot> = available(
      createWorkshopRuleConfigurationSnapshot(),
    ),
  ) {
    this.#result = freezeRuleResult(result);
  }

  setResult(result: Availability<RuleConfigurationSnapshot>): void {
    this.#result = freezeRuleResult(result);
  }

  async getSnapshot(): Promise<Availability<RuleConfigurationSnapshot>> {
    return this.#result;
  }
}

export class InMemoryLegacyFake implements LegacyPort {
  readonly adapterKind = "IN_MEMORY_FAKE" as const;

  async route(_command: CancellationCommand): Promise<LegacyResult> {
    return Object.freeze({
      publicReasonCode: "LEGACY_FLOW",
      compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
    });
  }
}

export class InMemorySupportFake implements SupportPort {
  readonly adapterKind = "IN_MEMORY_FAKE" as const;
  #views = new Map<string, SupportView>();

  constructor(views: readonly SupportView[] = []) {
    for (const view of views) {
      this.setDecisionView(view);
    }
  }

  setDecisionView(view: SupportView): void {
    this.#views.set(view.decisionId, Object.freeze(view));
  }

  removeDecisionView(decisionId: string): void {
    this.#views.delete(decisionId);
  }

  reset(): void {
    this.#views.clear();
  }

  async getDecisionView(decisionId: string): Promise<SupportView | undefined> {
    return this.#views.get(decisionId);
  }
}

export class FixedClock implements Clock {
  readonly #fixedUtc: string;

  constructor(fixedUtc: string) {
    this.#fixedUtc = fixedUtc;
  }

  nowUtc(): Availability<string> {
    return available(this.#fixedUtc);
  }
}

export class UnavailableClock implements Clock {
  nowUtc(): Availability<string> {
    return unavailable();
  }
}

export interface DecisionIdSource {
  nextDecisionId(): string;
}

export class DeterministicDecisionIdSource implements DecisionIdSource {
  readonly #prefix: string;
  #next: number;

  constructor(prefix: string, startAt: number) {
    if (prefix.length === 0) {
      throw new TypeError("decision ID prefix must not be empty");
    }
    if (!Number.isSafeInteger(startAt) || startAt < 0) {
      throw new RangeError("decision ID start must be a non-negative safe integer");
    }
    this.#prefix = prefix;
    this.#next = startAt;
  }

  nextDecisionId(): string {
    if (!Number.isSafeInteger(this.#next)) {
      throw new RangeError("deterministic decision ID sequence exhausted");
    }
    const decisionId = `${this.#prefix}-${this.#next}`;
    this.#next += 1;
    return decisionId;
  }
}

export function createDeterministicDecisionIdSource(
  prefix = "decision-synthetic",
  startAt = 1,
): DecisionIdSource {
  return new DeterministicDecisionIdSource(prefix, startAt);
}

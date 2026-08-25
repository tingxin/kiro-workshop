import type { MoneyMinor } from "@company/cancellation-policy-kit";

import type {
  Availability,
  CancellationCommand,
  Decision,
  MapArrivalEvidence,
  RuleConfigurationSnapshot,
  SupportView,
} from "./domain/types.js";

export interface MapPort {
  getArrivalEvidence(orderId: string): Promise<Availability<MapArrivalEvidence>>;
}

export interface SyntheticActionInput {
  readonly decisionIdempotencyKey: string;
  readonly decisionId: string;
  readonly amount: MoneyMinor;
}

export type SyntheticActionResult =
  | { readonly status: "SYNTHETIC_SUCCESS" }
  | { readonly status: "UNAVAILABLE" };

export interface PaymentChargePort {
  recordSyntheticCharge(input: SyntheticActionInput): Promise<SyntheticActionResult>;
}

export interface CompensationSettlementPort {
  recordSyntheticCompensation(input: SyntheticActionInput): Promise<SyntheticActionResult>;
}

export interface NotificationPort {
  readonly adapterKind: "IN_MEMORY_FAKE";
}

export interface SupportPort {
  getDecisionView(decisionId: string): Promise<SupportView | undefined>;
}

export interface RiskPort {
  readonly adapterKind: "IN_MEMORY_FAKE";
}

export interface RuleRepositoryConfigurationPort {
  getSnapshot(): Promise<Availability<RuleConfigurationSnapshot>>;
}

export interface LegacyResult {
  readonly publicReasonCode: "LEGACY_FLOW";
  readonly compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY";
}

export interface LegacyPort {
  route(command: CancellationCommand): Promise<LegacyResult>;
}

export interface DecisionStore {
  createOrGet(
    key: string,
    create: () => Promise<Decision>,
  ): Promise<{ readonly decision: Decision; readonly created: boolean }>;
}

export interface Clock {
  nowUtc(): Availability<string>;
}

import type {
  ChargeType,
  FeeCalculationTrace,
  MoneyMinor,
  PublicReasonCode,
} from "@company/cancellation-policy-kit";

export type ServiceType = "EXPRESS" | "PREMIUM" | "BUSINESS";
export type RouteTarget = "WORKSHOP_V1" | "LEGACY_FAKE";
export type Party = "PASSENGER" | "DRIVER";

export type ConfirmedExemption =
  | "LEGAL"
  | "SAFETY"
  | "ACCESSIBILITY"
  | "PLATFORM_FAILURE"
  | "CRITICAL_DEPENDENCY_FAILURE"
  | "DRIVER_RESPONSIBILITY_CONFIRMED";

export type Availability<T> =
  | { readonly status: "AVAILABLE"; readonly value: T }
  | { readonly status: "UNAVAILABLE" };

export interface NoShowEvidence {
  readonly waitedAfterVerifiedArrivalSeconds: number;
  readonly inPlatformContactAttempts: number;
  readonly inPlatformExplicitRefusal: boolean;
}

export interface MapArrivalEvidence {
  readonly distanceToPickupMeters: number;
  readonly continuouslyWithinThresholdSeconds: number;
}

export interface CancellationCommand {
  readonly orderId: string;
  readonly chargeType: ChargeType;
  readonly requester: Party;
  readonly requestedAtUtc: string;
  readonly isRealtime: boolean;
  readonly serviceType: string;
  readonly driverAcceptedAtUtc?: string;
  readonly confirmedExemption?: ConfirmedExemption;
  readonly unverifiedStatement?: string;
  readonly confirmedLiableParty?: Party;
  readonly estimatedTripFare?: MoneyMinor;
  readonly adjustmentBasisPoints?: number;
  readonly discount?: MoneyMinor;
  readonly noShowEvidence?: Availability<NoShowEvidence>;
}

export interface RuleConfigurationSnapshot {
  readonly ruleVersion: string;
  readonly baseFees: Readonly<{
    EXPRESS: Readonly<{
      CANCELLATION_FEE: MoneyMinor;
      NO_SHOW_FEE: MoneyMinor;
    }>;
    PREMIUM: Readonly<{
      CANCELLATION_FEE: MoneyMinor;
      NO_SHOW_FEE: MoneyMinor;
    }>;
    BUSINESS: Readonly<{
      CANCELLATION_FEE: MoneyMinor;
      NO_SHOW_FEE: MoneyMinor;
    }>;
  }>;
}

export interface DecisionBase {
  readonly decisionId: string;
  readonly decisionIdempotencyKey: string;
  readonly orderId: string;
  readonly chargeType: ChargeType;
  readonly cancelInitiator: Party;
  readonly liableParty?: Party;
  readonly charge: MoneyMinor;
  readonly driverCompensation?: MoneyMinor;
  readonly publicReasonCode: PublicReasonCode;
  readonly feeTrace?: FeeCalculationTrace;
}

export interface NormalDecision extends DecisionBase {
  readonly processingMode: "NORMAL";
  readonly ruleVersion: string;
}

export interface DegradedDecision extends DecisionBase {
  readonly processingMode: "DEGRADED";
  readonly ruleVersion?: string;
}

export type Decision = NormalDecision | DegradedDecision;

export interface DecisionAuditEvent {
  readonly decisionId: string;
  readonly decisionIdempotencyKey: string;
  readonly orderId: string;
  readonly ruleVersion?: string;
  readonly requestedAtUtc: string;
  readonly acceptedAtUtc?: string;
  readonly confirmedExemption?: ConfirmedExemption;
  readonly feeTrace?: FeeCalculationTrace;
  readonly publicReasonCode: PublicReasonCode;
  readonly finalAmount: MoneyMinor;
  readonly processingMode: "NORMAL" | "DEGRADED";
}

export interface PublicExplanation {
  readonly publicReasonCode: PublicReasonCode;
  readonly charge: MoneyMinor;
  readonly ruleVersion: string;
  readonly summary: string;
}

export interface SupportView {
  readonly decisionId: string;
  readonly orderId: string;
  readonly cancelInitiator: Party;
  readonly liableParty?: Party;
  readonly chargedAmount: MoneyMinor;
  readonly driverCompensation?: MoneyMinor;
  readonly publicReasonCode: PublicReasonCode;
  readonly ruleVersion?: string;
  readonly summary?: string;
}

export interface ReplayBusinessResult {
  readonly chargeType: ChargeType;
  readonly cancelInitiator: Party;
  readonly liableParty?: Party;
  readonly charge: MoneyMinor;
  readonly publicReasonCode: PublicReasonCode;
  readonly ruleVersion: string;
  readonly feeTrace?: FeeCalculationTrace;
  readonly processingMode: "NORMAL" | "DEGRADED";
}

export type ReplayResult =
  | {
      readonly status: "REPLAYED";
      readonly businessResult: ReplayBusinessResult;
    }
  | { readonly status: "NOT_REPLAYABLE" };

export type AcceptancePassCategory =
  | "ORDER_SCOPE"
  | "FREE_WINDOW"
  | "STRONG_EXEMPTION"
  | "VERIFIED_ARRIVAL"
  | "NO_SHOW_ELIGIBILITY"
  | "FEE_INVARIANT"
  | "IDEMPOTENCY"
  | "DEGRADATION"
  | "EXPLANATION"
  | "AUDIT";

export interface AcceptancePassItem {
  readonly category: AcceptancePassCategory;
  readonly requirementId: `REQ-${string}`;
  readonly decisionId: `DEC-${string}`;
  readonly resultKind: "WORKSHOP_SYNTHETIC_NON_PRODUCTION";
}

export type ExternalDependencyName =
  | "Map"
  | "Payment/Charge"
  | "Compensation/Settlement"
  | "Notification"
  | "Support"
  | "Risk"
  | "RuleRepository/Configuration"
  | "Legacy";

export interface AcceptanceDependency {
  readonly name: ExternalDependencyName;
  readonly binding: "PORT_AND_IN_MEMORY_FAKE";
}

export interface AcceptanceFakeSuccess {
  readonly dependency: ExternalDependencyName;
  readonly resultKind: "SYNTHETIC_NON_PRODUCTION";
}

export interface AcceptanceBoundary {
  readonly id: `BLK-${string}` | `OOS-${string}`;
  readonly status: "NON_IMPLEMENTATION_BOUNDARY";
}

export type UnacceptedScope =
  | "PRODUCTION_GOALS"
  | "REAL_EXTERNAL_INTEGRATIONS"
  | "ALL_EDGE_CASES"
  | "PRODUCTION_PERFORMANCE"
  | "PRODUCTION_COMPLIANCE";

export interface AcceptanceReport {
  readonly header: "Workshop synthetic/non-production";
  readonly passItems: readonly AcceptancePassItem[];
  readonly dependencies: readonly AcceptanceDependency[];
  readonly fakeSuccesses: readonly AcceptanceFakeSuccess[];
  readonly unacceptedScope: readonly UnacceptedScope[];
  readonly boundaries: readonly AcceptanceBoundary[];
}

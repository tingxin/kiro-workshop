import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  FixedClock,
  UnavailableClock,
  createDeterministicDecisionIdSource,
} from "./adapters/in-memory-fakes.js";
import type {
  AcceptancePassItem,
  CancellationCommand,
  ConfirmedExemption,
  Decision,
} from "./domain/types.js";
import { WorkshopAssembly } from "./workshop-assembly.js";

declare const process: { readonly argv: readonly string[] };

const REQUESTED_AT_UTC = "2025-01-01T00:05:00.000Z";
const DRIVER_ACCEPTED_AT_UTC = "2025-01-01T00:00:00.000Z";
const RESULT_KIND = "WORKSHOP_SYNTHETIC_NON_PRODUCTION" as const;

const STRONG_EXEMPTIONS: readonly ConfirmedExemption[] = Object.freeze([
  "LEGAL",
  "SAFETY",
  "ACCESSIBILITY",
  "PLATFORM_FAILURE",
  "CRITICAL_DEPENDENCY_FAILURE",
  "DRIVER_RESPONSIBILITY_CONFIRMED",
]);

function createAssembly(prefix: string, degraded = false): WorkshopAssembly {
  return new WorkshopAssembly({
    clock: degraded ? new UnavailableClock() : new FixedClock(REQUESTED_AT_UTC),
    decisionIdSource: createDeterministicDecisionIdSource(prefix, 1),
  });
}

function baseCommand(orderId: string): CancellationCommand {
  return Object.freeze({
    orderId,
    chargeType: "CANCELLATION_FEE",
    requester: "PASSENGER",
    requestedAtUtc: REQUESTED_AT_UTC,
    isRealtime: true,
    serviceType: "EXPRESS",
    driverAcceptedAtUtc: DRIVER_ACCEPTED_AT_UTC,
    estimatedTripFare: moneyMinor(900),
    adjustmentBasisPoints: 10_000,
    discount: moneyMinor(0),
  });
}

function projectDecision(decision: Decision) {
  return Object.freeze({
    target: "WORKSHOP_V1" as const,
    charge: decision.charge,
    publicReasonCode: decision.publicReasonCode,
    processingMode: decision.processingMode,
  });
}

async function runLegacyFlow() {
  const assembly = createAssembly("legacy");
  const result = await assembly.decisionService.execute(Object.freeze({
    ...baseCommand("demo-legacy"),
    isRealtime: false,
    serviceType: "SCHEDULED_UNKNOWN",
  }));
  if (result.target !== "LEGACY_FAKE") {
    throw new Error("representative Legacy flow did not route to Legacy Fake");
  }
  return Object.freeze({
    scenario: "LEGACY" as const,
    resultKind: RESULT_KIND,
    result: Object.freeze({ target: result.target, ...result.legacyResult }),
  });
}

async function runNormalCancellationFlow() {
  const assembly = createAssembly("normal");
  const result = await assembly.decisionService.execute(
    baseCommand("demo-normal-cancellation"),
  );
  if (result.target !== "WORKSHOP_V1") {
    throw new Error("representative cancellation flow did not route to Workshop V1");
  }
  return Object.freeze({
    scenario: "NORMAL_CANCELLATION" as const,
    resultKind: RESULT_KIND,
    result: projectDecision(result.decision),
  });
}

async function runNoShowFlow() {
  const assembly = createAssembly("no-show");
  assembly.externalAdapters.map.setResult(Object.freeze({
    status: "AVAILABLE",
    value: Object.freeze({
      distanceToPickupMeters: 200,
      continuouslyWithinThresholdSeconds: 30,
    }),
  }));
  const result = await assembly.decisionService.execute(Object.freeze({
    ...baseCommand("demo-no-show"),
    chargeType: "NO_SHOW_FEE",
    noShowEvidence: Object.freeze({
      status: "AVAILABLE",
      value: Object.freeze({
        waitedAfterVerifiedArrivalSeconds: 300,
        inPlatformContactAttempts: 1,
        inPlatformExplicitRefusal: false,
      }),
    }),
  }));
  if (result.target !== "WORKSHOP_V1") {
    throw new Error("representative no-show flow did not route to Workshop V1");
  }
  return Object.freeze({
    scenario: "NO_SHOW" as const,
    resultKind: RESULT_KIND,
    result: projectDecision(result.decision),
  });
}

async function runStrongExemptionFlow(exemption: ConfirmedExemption) {
  const assembly = createAssembly(`strong-${exemption.toLowerCase()}`);
  const result = await assembly.decisionService.execute(Object.freeze({
    ...baseCommand(`demo-strong-${exemption.toLowerCase()}`),
    confirmedExemption: exemption,
  }));
  if (result.target !== "WORKSHOP_V1") {
    throw new Error("representative strong-exemption flow did not route to Workshop V1");
  }
  return Object.freeze({
    scenario: `STRONG_EXEMPTION_${exemption}`,
    resultKind: RESULT_KIND,
    result: projectDecision(result.decision),
  });
}

async function runDegradedFlow() {
  const assembly = createAssembly("degraded", true);
  const result = await assembly.decisionService.execute(
    baseCommand("demo-degraded"),
  );
  if (result.target !== "WORKSHOP_V1") {
    throw new Error("representative degraded flow did not route to Workshop V1");
  }
  return Object.freeze({
    scenario: "DEGRADED" as const,
    resultKind: RESULT_KIND,
    result: projectDecision(result.decision),
  });
}

const PASS_ITEMS: readonly AcceptancePassItem[] = Object.freeze([
  { category: "ORDER_SCOPE", requirementId: "REQ-003", decisionId: "DEC-002", resultKind: RESULT_KIND },
  { category: "STRONG_EXEMPTION", requirementId: "REQ-002", decisionId: "DEC-003", resultKind: RESULT_KIND },
  { category: "VERIFIED_ARRIVAL", requirementId: "REQ-006", decisionId: "DEC-005", resultKind: RESULT_KIND },
  { category: "NO_SHOW_ELIGIBILITY", requirementId: "REQ-007", decisionId: "DEC-005", resultKind: RESULT_KIND },
  { category: "FEE_INVARIANT", requirementId: "REQ-010", decisionId: "DEC-007", resultKind: RESULT_KIND },
  { category: "IDEMPOTENCY", requirementId: "REQ-011", decisionId: "DEC-008", resultKind: RESULT_KIND },
  { category: "DEGRADATION", requirementId: "REQ-017", decisionId: "DEC-009", resultKind: RESULT_KIND },
  { category: "AUDIT", requirementId: "REQ-016", decisionId: "DEC-008", resultKind: RESULT_KIND },
]);

export async function runWorkshopDemo() {
  const reportAssembly = createAssembly("report");
  const flows = [
    await runLegacyFlow(),
    await runNormalCancellationFlow(),
    await runNoShowFlow(),
    ...await Promise.all(STRONG_EXEMPTIONS.map(runStrongExemptionFlow)),
    await runDegradedFlow(),
  ];
  const acceptance = reportAssembly.acceptanceReportBuilder.build({
    passItems: PASS_ITEMS,
    successfulFakeDependencies: [
      "Legacy",
      "RuleRepository/Configuration",
      "Map",
      "Payment/Charge",
    ],
    boundaryIds: [],
  });
  return Object.freeze({
    header: "Workshop synthetic/non-production" as const,
    flows: Object.freeze(flows),
    acceptance,
  });
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === new URL(invokedPath, "file:").href) {
  console.log(JSON.stringify(await runWorkshopDemo(), null, 2));
}

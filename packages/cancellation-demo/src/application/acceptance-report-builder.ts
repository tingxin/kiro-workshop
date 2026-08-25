import type {
  AcceptanceBoundary,
  AcceptanceDependency,
  AcceptanceFakeSuccess,
  AcceptancePassCategory,
  AcceptancePassItem,
  AcceptanceReport,
  ExternalDependencyName,
  UnacceptedScope,
} from "../domain/types.js";

const PASS_CATEGORIES: readonly AcceptancePassCategory[] = Object.freeze([
  "ORDER_SCOPE",
  "FREE_WINDOW",
  "STRONG_EXEMPTION",
  "VERIFIED_ARRIVAL",
  "NO_SHOW_ELIGIBILITY",
  "FEE_INVARIANT",
  "IDEMPOTENCY",
  "DEGRADATION",
  "EXPLANATION",
  "AUDIT",
]);

const DEPENDENCY_NAMES: readonly ExternalDependencyName[] = Object.freeze([
  "Map",
  "Payment/Charge",
  "Compensation/Settlement",
  "Notification",
  "Support",
  "Risk",
  "RuleRepository/Configuration",
  "Legacy",
]);

const UNACCEPTED_SCOPE: readonly UnacceptedScope[] = Object.freeze([
  "PRODUCTION_GOALS",
  "REAL_EXTERNAL_INTEGRATIONS",
  "ALL_EDGE_CASES",
  "PRODUCTION_PERFORMANCE",
  "PRODUCTION_COMPLIANCE",
]);

export interface AcceptanceReportInput {
  readonly passItems: readonly AcceptancePassItem[];
  readonly successfulFakeDependencies: readonly ExternalDependencyName[];
  readonly boundaryIds: readonly (`BLK-${string}` | `OOS-${string}`)[];
}

function isPassCategory(value: string): value is AcceptancePassCategory {
  return (PASS_CATEGORIES as readonly string[]).includes(value);
}

function isDependencyName(value: string): value is ExternalDependencyName {
  return (DEPENDENCY_NAMES as readonly string[]).includes(value);
}

export class AcceptanceReportBuilder {
  build(input: AcceptanceReportInput): AcceptanceReport {
    const passItems = input.passItems.map((item) => {
      if (!isPassCategory(item.category)) {
        throw new TypeError(`Unapproved acceptance category: ${item.category}`);
      }
      if (!/^REQ-\d{3}$/.test(item.requirementId)) {
        throw new TypeError(`Invalid Requirement ID: ${item.requirementId}`);
      }
      if (!/^DEC-\d{3}$/.test(item.decisionId)) {
        throw new TypeError(`Invalid Decision ID: ${item.decisionId}`);
      }

      return Object.freeze({
        category: item.category,
        requirementId: item.requirementId,
        decisionId: item.decisionId,
        resultKind: "WORKSHOP_SYNTHETIC_NON_PRODUCTION" as const,
      });
    });

    const fakeSuccesses = input.successfulFakeDependencies.map((dependency) => {
      if (!isDependencyName(dependency)) {
        throw new TypeError(`Unapproved external dependency: ${dependency}`);
      }
      return Object.freeze({
        dependency,
        resultKind: "SYNTHETIC_NON_PRODUCTION" as const,
      });
    });

    const boundaries = input.boundaryIds.map((id) => {
      if (!/^(?:BLK|OOS)-\d{3}$/.test(id)) {
        throw new TypeError(`Invalid non-implementation boundary: ${id}`);
      }
      return Object.freeze({
        id,
        status: "NON_IMPLEMENTATION_BOUNDARY" as const,
      });
    });

    const dependencies: AcceptanceDependency[] = DEPENDENCY_NAMES.map((name) =>
      Object.freeze({ name, binding: "PORT_AND_IN_MEMORY_FAKE" as const }),
    );

    return Object.freeze({
      header: "Workshop synthetic/non-production",
      passItems: Object.freeze(passItems),
      dependencies: Object.freeze(dependencies),
      fakeSuccesses: Object.freeze(fakeSuccesses) as readonly AcceptanceFakeSuccess[],
      unacceptedScope: UNACCEPTED_SCOPE,
      boundaries: Object.freeze(boundaries) as readonly AcceptanceBoundary[],
    });
  }
}

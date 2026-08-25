import assert from "node:assert/strict";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const PASS_ITEMS = Object.freeze([
  ["ORDER_SCOPE", "REQ-001", "DEC-001"],
  ["FREE_WINDOW", "REQ-005", "DEC-004"],
  ["STRONG_EXEMPTION", "REQ-002", "DEC-003"],
  ["VERIFIED_ARRIVAL", "REQ-006", "DEC-005"],
  ["NO_SHOW_ELIGIBILITY", "REQ-007", "DEC-005"],
  ["FEE_INVARIANT", "REQ-010", "DEC-007"],
  ["IDEMPOTENCY", "REQ-011", "DEC-008"],
  ["DEGRADATION", "REQ-017", "DEC-009"],
  ["EXPLANATION", "REQ-014", "DEC-010"],
  ["AUDIT", "REQ-016", "DEC-008"],
].map(([category, requirementId, decisionId]) => Object.freeze({
  category,
  requirementId,
  decisionId,
  resultKind: "WORKSHOP_SYNTHETIC_NON_PRODUCTION",
})));

const PASS_CATEGORIES = new Set(PASS_ITEMS.map(({ category }) => category));
const DEPENDENCIES = Object.freeze([
  "Map",
  "Payment/Charge",
  "Compensation/Settlement",
  "Notification",
  "Support",
  "Risk",
  "RuleRepository/Configuration",
  "Legacy",
]);
const UNACCEPTED_SCOPE = Object.freeze([
  "PRODUCTION_GOALS",
  "REAL_EXTERNAL_INTEGRATIONS",
  "ALL_EDGE_CASES",
  "PRODUCTION_PERFORMANCE",
  "PRODUCTION_COMPLIANCE",
]);

const random = createSeededRandom(0x23ac_ce57);
const cases = generatePropertyCases((index) => {
  const passItemCount = random.nextInt(1, PASS_ITEMS.length);
  const passItems = Array.from(
    { length: passItemCount },
    () => random.pick(PASS_ITEMS),
  );
  const successfulFakeDependencies = DEPENDENCIES.filter(() => random.boolean());
  const boundaryIds = Array.from(
    { length: random.nextInt(1, 6) },
    (_, boundaryIndex) => {
      const prefix = random.boolean() ? "BLK" : "OOS";
      const number = ((index * 7 + boundaryIndex) % 999) + 1;
      return `${prefix}-${String(number).padStart(3, "0")}`;
    },
  );

  return Object.freeze({
    passItems: Object.freeze(passItems),
    successfulFakeDependencies: Object.freeze(successfulFakeDependencies),
    boundaryIds: Object.freeze(boundaryIds),
  });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-001.4, REQ-003.7, REQ-009.7, REQ-011.9, REQ-015.6, REQ-018.1, REQ-018.2, REQ-018.3, REQ-018.4, REQ-018.5, REQ-018.6, REQ-018.7**
propertyTest(
  23,
  "Acceptance reports preserve scope and traceability",
  async () => {
    const { AcceptanceReportBuilder } = await import(
      "../../dist/application/acceptance-report-builder.js"
    );
    const builder = new AcceptanceReportBuilder();
    const observedCategories = new Set();

    assert.equal(cases.length, PROPERTY_CASE_COUNT);

    for (const testCase of cases) {
      const report = builder.build(testCase);

      assert.equal(report.header, "Workshop synthetic/non-production");
      assert.deepEqual(report.dependencies, DEPENDENCIES.map((name) => ({
        name,
        binding: "PORT_AND_IN_MEMORY_FAKE",
      })));
      assert.deepEqual(report.unacceptedScope, UNACCEPTED_SCOPE);

      for (const item of report.passItems) {
        assert.equal(PASS_CATEGORIES.has(item.category), true);
        assert.match(item.requirementId, /^REQ-\d{3}$/);
        assert.match(item.decisionId, /^DEC-\d{3}$/);
        assert.equal(item.resultKind, "WORKSHOP_SYNTHETIC_NON_PRODUCTION");
        observedCategories.add(item.category);
      }

      assert.deepEqual(
        report.fakeSuccesses,
        testCase.successfulFakeDependencies.map((dependency) => ({
          dependency,
          resultKind: "SYNTHETIC_NON_PRODUCTION",
        })),
      );
      assert.deepEqual(
        report.boundaries,
        testCase.boundaryIds.map((id) => ({
          id,
          status: "NON_IMPLEMENTATION_BOUNDARY",
        })),
      );

      for (const boundary of report.boundaries) {
        assert.match(boundary.id, /^(?:BLK|OOS)-\d{3}$/);
        assert.equal(boundary.status, "NON_IMPLEMENTATION_BOUNDARY");
        assert.equal(Object.hasOwn(boundary, "implemented"), false);
        assert.equal(Object.hasOwn(boundary, "accepted"), false);
        assert.equal(
          report.passItems.some(({ requirementId }) => requirementId === boundary.id),
          false,
        );
      }
    }

    assert.deepEqual(observedCategories, PASS_CATEGORIES);
  },
);

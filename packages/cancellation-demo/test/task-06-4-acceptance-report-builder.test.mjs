import assert from "node:assert/strict";
import test from "node:test";

const PASS_ITEMS = [
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
].map(([category, requirementId, decisionId]) => ({
  category,
  requirementId,
  decisionId,
  resultKind: "WORKSHOP_SYNTHETIC_NON_PRODUCTION",
}));

const DEPENDENCY_NAMES = [
  "Map",
  "Payment/Charge",
  "Compensation/Settlement",
  "Notification",
  "Support",
  "Risk",
  "RuleRepository/Configuration",
  "Legacy",
];

const UNACCEPTED_SCOPE = [
  "PRODUCTION_GOALS",
  "REAL_EXTERNAL_INTEGRATIONS",
  "ALL_EDGE_CASES",
  "PRODUCTION_PERFORMANCE",
  "PRODUCTION_COMPLIANCE",
];

test("6.4 AcceptanceReportBuilder produces the exact scoped synthetic report", async () => {
  const { AcceptanceReportBuilder } = await import(
    "../dist/application/acceptance-report-builder.js"
  );
  const builder = new AcceptanceReportBuilder();
  const report = builder.build({
    passItems: PASS_ITEMS,
    successfulFakeDependencies: ["Map", "Legacy"],
    boundaryIds: ["BLK-001", "OOS-005"],
  });

  assert.equal(report.header, "Workshop synthetic/non-production");
  assert.deepEqual(report.passItems, PASS_ITEMS);
  assert.deepEqual(report.dependencies, DEPENDENCY_NAMES.map((name) => ({
    name,
    binding: "PORT_AND_IN_MEMORY_FAKE",
  })));
  assert.deepEqual(report.fakeSuccesses, ["Map", "Legacy"].map((dependency) => ({
    dependency,
    resultKind: "SYNTHETIC_NON_PRODUCTION",
  })));
  assert.deepEqual(report.unacceptedScope, UNACCEPTED_SCOPE);
  assert.deepEqual(report.boundaries, ["BLK-001", "OOS-005"].map((id) => ({
    id,
    status: "NON_IMPLEMENTATION_BOUNDARY",
  })));
  assert.equal(Object.isFrozen(report), true);
});

test("6.4 AcceptanceReportBuilder rejects categories, trace IDs, dependencies, and boundaries outside the allowlists", async () => {
  const { AcceptanceReportBuilder } = await import(
    "../dist/application/acceptance-report-builder.js"
  );
  const builder = new AcceptanceReportBuilder();
  const valid = {
    passItems: PASS_ITEMS,
    successfulFakeDependencies: [],
    boundaryIds: [],
  };

  assert.throws(() => builder.build({ ...valid, passItems: [{
    ...PASS_ITEMS[0], category: "PRODUCTION_READY",
  }] }), /category/i);
  assert.throws(() => builder.build({ ...valid, passItems: [{
    ...PASS_ITEMS[0], requirementId: "R-001",
  }] }), /Requirement ID/i);
  assert.throws(() => builder.build({ ...valid, passItems: [{
    ...PASS_ITEMS[0], decisionId: "D-001",
  }] }), /Decision ID/i);
  assert.throws(() => builder.build({
    ...valid, successfulFakeDependencies: ["ProductionPayment"],
  }), /dependency/i);
  assert.throws(() => builder.build({
    ...valid, boundaryIds: ["REQ-001"],
  }), /boundary/i);
});

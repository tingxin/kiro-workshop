import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const DEPENDENCIES = [
  "Map",
  "Payment/Charge",
  "Compensation/Settlement",
  "Notification",
  "Support",
  "Risk",
  "RuleRepository/Configuration",
  "Legacy",
];

const ADAPTER_KEYS = [
  "map",
  "paymentCharge",
  "compensationSettlement",
  "notification",
  "support",
  "risk",
  "ruleRepositoryConfiguration",
  "legacy",
];

const BOUNDARY_IDS = [
  ...Array.from({ length: 15 }, (_, index) => `BLK-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 5 }, (_, index) => `OOS-${String(index + 1).padStart(3, "0")}`),
];

async function createAssembly() {
  const [{ WorkshopAssembly }, { FixedClock, createDeterministicDecisionIdSource }] =
    await Promise.all([
      import("../../dist/workshop-assembly.js"),
      import("../../dist/adapters/in-memory-fakes.js"),
    ]);

  return new WorkshopAssembly({
    clock: new FixedClock("2025-01-01T00:00:00.000Z"),
    decisionIdSource: createDeterministicDecisionIdSource("assembly-report", 1),
  });
}

test("7.9 assembly exposes eight in-memory-only ports and the unverified Legacy marker", async () => {
  const assembly = await createAssembly();

  assert.deepEqual(Object.keys(assembly.externalAdapters), ADAPTER_KEYS);
  for (const adapter of Object.values(assembly.externalAdapters)) {
    assert.equal(adapter.adapterKind, "IN_MEMORY_FAKE");
  }

  assert.deepEqual(await assembly.externalAdapters.legacy.route({ orderId: "legacy-only" }), {
    publicReasonCode: "LEGACY_FLOW",
    compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
  });

  const source = await readFile(
    new URL("../../src/workshop-assembly.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/u);
  assert.doesNotMatch(source, /\b(?:https?|net|tls|dgram|dns|undici|axios|got)\b/u);
  assert.doesNotMatch(source, /\b(?:networkAdapter|productionStore|credential|secret|apiKey)\b/iu);
});

test("7.9 report uses exact approved header, categories, dependency bindings, and Fake-success labels", async () => {
  const assembly = await createAssembly();
  const report = assembly.acceptanceReportBuilder.build({
    passItems: PASS_ITEMS,
    successfulFakeDependencies: DEPENDENCIES,
    boundaryIds: BOUNDARY_IDS,
  });

  assert.equal(report.header, "Workshop synthetic/non-production");
  assert.deepEqual(report.passItems, PASS_ITEMS);
  assert.deepEqual(report.dependencies, DEPENDENCIES.map((name) => ({
    name,
    binding: "PORT_AND_IN_MEMORY_FAKE",
  })));
  assert.deepEqual(report.fakeSuccesses, DEPENDENCIES.map((dependency) => ({
    dependency,
    resultKind: "SYNTHETIC_NON_PRODUCTION",
  })));
});

test("7.9 BLK and OOS identifiers occur only as non-implementation boundaries", async () => {
  const assembly = await createAssembly();
  const report = assembly.acceptanceReportBuilder.build({
    passItems: PASS_ITEMS,
    successfulFakeDependencies: DEPENDENCIES,
    boundaryIds: BOUNDARY_IDS,
  });

  assert.deepEqual(report.boundaries, BOUNDARY_IDS.map((id) => ({
    id,
    status: "NON_IMPLEMENTATION_BOUNDARY",
  })));

  const nonBoundarySections = JSON.stringify({
    header: report.header,
    passItems: report.passItems,
    dependencies: report.dependencies,
    fakeSuccesses: report.fakeSuccesses,
    unacceptedScope: report.unacceptedScope,
  });
  assert.doesNotMatch(nonBoundarySections, /\b(?:BLK|OOS)-\d{3}\b/u);
  assert.equal(
    JSON.stringify(report).match(/\b(?:BLK|OOS)-\d{3}\b/gu)?.length,
    BOUNDARY_IDS.length,
  );
});

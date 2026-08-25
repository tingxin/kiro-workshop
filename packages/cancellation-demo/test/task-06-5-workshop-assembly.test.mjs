import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MODULE_URL = new URL("../dist/workshop-assembly.js", import.meta.url);

async function loadAssemblyDependencies() {
  const [{ WorkshopAssembly }, { FixedClock, createDeterministicDecisionIdSource }] =
    await Promise.all([
      import(MODULE_URL.href),
      import(new URL("../dist/adapters/in-memory-fakes.js", import.meta.url).href),
    ]);
  return { WorkshopAssembly, FixedClock, createDeterministicDecisionIdSource };
}

test("6.5 WorkshopAssembly binds exactly eight external ports to inspectable in-memory fakes", async () => {
  const { WorkshopAssembly, FixedClock, createDeterministicDecisionIdSource } =
    await loadAssemblyDependencies();
  const clock = new FixedClock("2025-01-01T00:03:00.000Z");
  const decisionIdSource = createDeterministicDecisionIdSource("assembly", 7);
  const assembly = new WorkshopAssembly({ clock, decisionIdSource });

  assert.deepEqual(Object.keys(assembly.externalAdapters).sort(), [
    "compensationSettlement",
    "legacy",
    "map",
    "notification",
    "paymentCharge",
    "risk",
    "ruleRepositoryConfiguration",
    "support",
  ]);
  for (const adapter of Object.values(assembly.externalAdapters)) {
    assert.equal(adapter.adapterKind, "IN_MEMORY_FAKE");
  }
  assert.equal(assembly.clock, clock);
  assert.equal(assembly.decisionIdSource, decisionIdSource);
  assert.ok(assembly.decisionStore);
  assert.ok(assembly.cancelInitiatorRegistry);
  assert.ok(assembly.auditRecorder);
});

test("6.5 WorkshopAssembly wires the runnable services to the same fakes and infrastructure", async () => {
  const { WorkshopAssembly, FixedClock, createDeterministicDecisionIdSource } =
    await loadAssemblyDependencies();
  const assembly = new WorkshopAssembly({
    clock: new FixedClock("2025-01-01T00:03:00.000Z"),
    decisionIdSource: createDeterministicDecisionIdSource("assembly", 1),
  });

  const result = await assembly.decisionService.execute({
    orderId: "assembly-order",
    chargeType: "CANCELLATION_FEE",
    requester: "PASSENGER",
    requestedAtUtc: "2025-01-01T00:03:00.000Z",
    isRealtime: true,
    serviceType: "EXPRESS",
    driverAcceptedAtUtc: "2025-01-01T00:00:00.000Z",
    estimatedTripFare: 900,
    adjustmentBasisPoints: 10_000,
    discount: 0,
  });

  assert.equal(result.target, "WORKSHOP_V1");
  assert.equal(result.created, true);
  assert.equal(result.decision.decisionId, "assembly-1");
  assert.equal(assembly.decisionStore.inspectAll().length, 1);
  assert.equal(assembly.auditRecorder.list().length, 1);
  assert.equal(assembly.externalAdapters.paymentCharge.records.length, 1);
  assert.equal(assembly.cancelInitiatorRegistry.get("assembly-order")?.cancelInitiator, "PASSENGER");

  const explanation = assembly.explanationService.explain({
    publicReasonCode: result.decision.publicReasonCode,
    charge: result.decision.charge,
    ruleVersion: result.decision.ruleVersion,
  });
  assert.equal(explanation.status, "AVAILABLE");
  assert.equal(assembly.supportViewProjector.project(result.decision).decisionId, "assembly-1");
  assert.ok(assembly.replayService);
  assert.ok(assembly.acceptanceReportBuilder);
  assert.ok(assembly.feeInputSelector);
});

test("6.5 WorkshopAssembly source contains no network, production, credential, or deep-kit wiring", async () => {
  const source = await readFile(
    new URL("../src/workshop-assembly.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /@company\/cancellation-policy-kit\//u);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/u);
  assert.doesNotMatch(source, /\b(?:credential|secret|apiKey|productionStore|networkAdapter)\b/iu);
});

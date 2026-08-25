import assert from "node:assert/strict";
import test from "node:test";

const APPROVED_CRITICAL_UNAVAILABILITY_CAUSES = [
  "RULE_CONFIGURATION_UNAVAILABLE",
  "MAP_EVIDENCE_UNAVAILABLE",
  "NO_SHOW_EVIDENCE_UNAVAILABLE",
  "DRIVER_ACCEPTANCE_UNAVAILABLE",
  "CLOCK_UNAVAILABLE",
];

test("4.3 DegradationHandler builds the same successful zero-charge degraded draft for every approved critical unavailability", async () => {
  const { DegradationHandler } = await import(
    "../dist/application/degradation-handler.js"
  );
  const handler = new DegradationHandler();

  for (const cause of APPROVED_CRITICAL_UNAVAILABILITY_CAUSES) {
    const first = handler.createDraft({ cause });
    const second = handler.createDraft({ cause });

    assert.deepEqual(first, {
      cancellationSucceeded: true,
      charge: 0,
      publicReasonCode: "DEGRADED_NO_CHARGE",
      processingMode: "DEGRADED",
    });
    assert.deepEqual(second, first);
    assert.equal(Object.isFrozen(first), true);
    assert.equal("ruleVersion" in first, false);
    assert.equal("feeTrace" in first, false);
  }
});

test("4.3 DegradationHandler preserves only an already-captured rule version", async () => {
  const { DegradationHandler } = await import(
    "../dist/application/degradation-handler.js"
  );
  const handler = new DegradationHandler();

  assert.deepEqual(handler.createDraft({
    cause: "MAP_EVIDENCE_UNAVAILABLE",
    capturedRuleVersion: "workshop-rules-v7",
  }), {
    cancellationSucceeded: true,
    charge: 0,
    publicReasonCode: "DEGRADED_NO_CHARGE",
    processingMode: "DEGRADED",
    ruleVersion: "workshop-rules-v7",
  });

  assert.deepEqual(handler.createDraft({
    cause: "RULE_CONFIGURATION_UNAVAILABLE",
  }), {
    cancellationSucceeded: true,
    charge: 0,
    publicReasonCode: "DEGRADED_NO_CHARGE",
    processingMode: "DEGRADED",
  });
});

import assert from "node:assert/strict";
import test from "node:test";

const loadService = async () => {
  const { ExplanationService } = await import(
    "../dist/application/explanation-service.js"
  );
  return new ExplanationService();
};

test("6.1 ExplanationService maps the shared safe explanation field-by-field", async () => {
  const service = await loadService();
  const result = service.explain({
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    charge: 500,
    ruleVersion: "workshop-rules-v7",
    feeTrace: { sensitiveSentinel: "must-not-be-read" },
    rawEvidence: { exactCoordinates: "must-not-be-read" },
  });

  assert.deepEqual(result, {
    status: "AVAILABLE",
    value: {
      publicReasonCode: "PASSENGER_CANCELLATION_FEE",
      charge: 500,
      ruleVersion: "workshop-rules-v7",
      summary: "司机已接单并提供接驾服务，本次按规则收取取消费。",
    },
  });
  assert.deepEqual(Object.keys(result.value).sort(), [
    "charge",
    "publicReasonCode",
    "ruleVersion",
    "summary",
  ]);
});

test("6.1 ExplanationService returns explicit unavailable status for every missing required input", async () => {
  const service = await loadService();

  for (const input of [
    { charge: 0, ruleVersion: "workshop-rules-v7" },
    { publicReasonCode: "STRONG_EXEMPTION", ruleVersion: "workshop-rules-v7" },
    { publicReasonCode: "STRONG_EXEMPTION", charge: 0 },
  ]) {
    assert.deepEqual(service.explain(input), {
      status: "UNAVAILABLE",
      reason: "MISSING_REQUIRED_INPUT",
    });
  }
});

test("6.1 ExplanationService validates persisted rule version without trace or evidence fallback", async () => {
  const service = await loadService();

  for (const ruleVersion of ["", "   "]) {
    assert.deepEqual(service.explain({
      publicReasonCode: "DEGRADED_NO_CHARGE",
      charge: 0,
      ruleVersion,
      feeTrace: { ruleVersion: "trace-fallback-forbidden" },
      rawEvidence: { ruleVersion: "evidence-fallback-forbidden" },
    }), {
      status: "UNAVAILABLE",
      reason: "INVALID_REQUIRED_INPUT",
    });
  }
});

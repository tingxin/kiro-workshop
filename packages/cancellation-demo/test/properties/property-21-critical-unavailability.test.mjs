import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const APPROVED_CRITICAL_UNAVAILABILITY_CAUSES = Object.freeze([
  "RULE_CONFIGURATION_UNAVAILABLE",
  "MAP_EVIDENCE_UNAVAILABLE",
  "NO_SHOW_EVIDENCE_UNAVAILABLE",
  "DRIVER_ACCEPTANCE_UNAVAILABLE",
  "CLOCK_UNAVAILABLE",
]);

const random = createSeededRandom(0x21c017);
const cases = generatePropertyCases((index) => {
  const cause = APPROVED_CRITICAL_UNAVAILABILITY_CAUSES[
    index % APPROVED_CRITICAL_UNAVAILABILITY_CAUSES.length
  ];
  const mayHaveCapturedVersion = cause !== "RULE_CONFIGURATION_UNAVAILABLE";

  return Object.freeze({
    index,
    cause,
    capturedRuleVersion: mayHaveCapturedVersion && random.boolean()
      ? `workshop-rules-${random.nextInt(1, 50)}`
      : undefined,
    chargeType: random.boolean() ? "CANCELLATION_FEE" : "NO_SHOW_FEE",
    requester: random.boolean() ? "PASSENGER" : "DRIVER",
  });
}, 125);

propertyTest(
  21,
  "Critical unavailability has one stable no-charge outcome",
  async () => {
    const [{ DegradationHandler }, { AuditRecorder }] = await Promise.all([
      import("../../dist/application/degradation-handler.js"),
      import("../../dist/application/audit-recorder.js"),
    ]);
    const handler = new DegradationHandler();

    for (const generated of cases) {
      const input = Object.freeze({
        cause: generated.cause,
        ...(generated.capturedRuleVersion === undefined
          ? {}
          : { capturedRuleVersion: generated.capturedRuleVersion }),
      });
      const first = handler.createDraft(input);
      const repeated = handler.createDraft(input);

      assert.deepEqual(repeated, first, `case ${generated.index}: conclusion must be deterministic`);
      assert.equal(first.cancellationSucceeded, true);
      assert.equal(first.charge, moneyMinor(0));
      assert.equal(first.publicReasonCode, "DEGRADED_NO_CHARGE");
      assert.equal(first.processingMode, "DEGRADED");
      assert.equal(first.ruleVersion, generated.capturedRuleVersion);

      const decision = Object.freeze({
        decisionId: `degraded-decision-${generated.index}`,
        decisionIdempotencyKey: `order-${generated.index}:${generated.chargeType}`,
        orderId: `order-${generated.index}`,
        chargeType: generated.chargeType,
        cancelInitiator: generated.requester,
        charge: first.charge,
        publicReasonCode: first.publicReasonCode,
        processingMode: first.processingMode,
        ...(first.ruleVersion === undefined ? {} : { ruleVersion: first.ruleVersion }),
      });
      const recorder = new AuditRecorder();
      const event = recorder.record({
        decision,
        requestedAtUtc: `2025-01-01T00:${String(generated.index % 60).padStart(2, "0")}:00.000Z`,
      });

      assert.equal(event.finalAmount, moneyMinor(0));
      assert.equal(event.publicReasonCode, "DEGRADED_NO_CHARGE");
      assert.equal(event.processingMode, "DEGRADED");
      assert.equal(recorder.list().length, 1);
      assert.throws(
        () => recorder.record({ decision, requestedAtUtc: event.requestedAtUtc }),
        /audit event already exists/i,
      );
      assert.equal(recorder.list().length, 1);
    }
  },
);

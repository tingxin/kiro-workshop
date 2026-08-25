import assert from "node:assert/strict";

import { moneyMinor } from "@company/cancellation-policy-kit";

import {
  PROPERTY_CASE_COUNT,
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
  sensitiveSentinels,
} from "../support/deterministic-generators.mjs";

const ALLOWED_SUPPORT_KEYS = new Set([
  "decisionId",
  "orderId",
  "cancelInitiator",
  "liableParty",
  "chargedAmount",
  "driverCompensation",
  "publicReasonCode",
  "ruleVersion",
  "summary",
]);

const random = createSeededRandom(0x19a11e57);
const cases = generatePropertyCases((caseNumber) => {
  const hasRuleVersion = caseNumber % 3 !== 0;
  const hasLiableParty = caseNumber % 2 === 0;
  const hasDriverCompensation = caseNumber % 4 < 2;
  const sentinels = sensitiveSentinels(caseNumber);
  const charge = moneyMinor(random.nextInt(0, 2_000));
  const decision = {
    decisionId: `decision-property-19-${caseNumber}`,
    decisionIdempotencyKey: `order-property-19-${caseNumber}:CANCELLATION_FEE`,
    orderId: `order-property-19-${caseNumber}`,
    chargeType: "CANCELLATION_FEE",
    cancelInitiator: random.pick(["PASSENGER", "DRIVER"]),
    charge,
    publicReasonCode: random.pick([
      "FREE_CANCELLATION_WINDOW",
      "PASSENGER_CANCELLATION_FEE",
      "PASSENGER_NO_SHOW_FEE",
      "STRONG_EXEMPTION",
      "DEGRADED_NO_CHARGE",
    ]),
    processingMode: hasRuleVersion ? "NORMAL" : "DEGRADED",
    feeTrace: {
      phoneContent: sentinels.phoneContent,
      exactCoordinates: sentinels.exactCoordinates,
      safetyNarrative: sentinels.safetyNarrative,
    },
    rawEvidence: {
      accessibilityDetails: sentinels.accessibilityDetails,
      riskScore: sentinels.riskScore,
      riskThreshold: sentinels.riskThreshold,
      paymentCredential: sentinels.paymentCredential,
    },
  };

  if (hasRuleVersion) {
    decision.ruleVersion = `workshop-property-19-v${caseNumber}`;
  }
  if (hasLiableParty) {
    decision.liableParty = random.pick(["PASSENGER", "DRIVER"]);
  }
  if (hasDriverCompensation) {
    decision.driverCompensation = moneyMinor(random.nextInt(0, 1_000));
  }

  return Object.freeze({
    decision: Object.freeze(decision),
    hasRuleVersion,
    hasLiableParty,
    hasDriverCompensation,
    sentinels,
  });
}, PROPERTY_CASE_COUNT);

// **Validates: Requirements REQ-015.1, REQ-015.2, REQ-015.3, REQ-015.4, REQ-015.5**
propertyTest(19, "Support View is an allowlisted safe projection", async () => {
  const [{ SupportViewProjector }, { ExplanationService }] = await Promise.all([
    import("../../dist/application/support-view-projector.js"),
    import("../../dist/application/explanation-service.js"),
  ]);
  const projector = new SupportViewProjector();
  const explanationService = new ExplanationService();

  for (const testCase of cases) {
    const view = projector.project(testCase.decision);

    assert.ok(Object.keys(view).every((key) => ALLOWED_SUPPORT_KEYS.has(key)));
    assert.equal(view.decisionId, testCase.decision.decisionId);
    assert.equal(view.orderId, testCase.decision.orderId);
    assert.equal(view.cancelInitiator, testCase.decision.cancelInitiator);
    assert.equal(view.chargedAmount, testCase.decision.charge);
    assert.equal(view.publicReasonCode, testCase.decision.publicReasonCode);

    assert.equal(Object.hasOwn(view, "liableParty"), testCase.hasLiableParty);
    assert.equal(Object.hasOwn(view, "driverCompensation"), testCase.hasDriverCompensation);
    if (testCase.hasLiableParty) {
      assert.equal(view.liableParty, testCase.decision.liableParty);
    }
    if (testCase.hasDriverCompensation) {
      assert.equal(view.driverCompensation, testCase.decision.driverCompensation);
    }

    const explanation = explanationService.explain({
      publicReasonCode: testCase.decision.publicReasonCode,
      charge: testCase.decision.charge,
      ruleVersion: testCase.decision.ruleVersion,
    });
    if (testCase.hasRuleVersion) {
      assert.equal(explanation.status, "AVAILABLE");
      assert.equal(view.ruleVersion, testCase.decision.ruleVersion);
      assert.equal(view.summary, explanation.value.summary);
    } else {
      assert.equal(explanation.status, "UNAVAILABLE");
      assert.equal(Object.hasOwn(view, "ruleVersion"), false);
      assert.equal(Object.hasOwn(view, "summary"), false);
    }

    const serializedView = JSON.stringify(view);
    for (const sentinel of Object.values(testCase.sentinels)) {
      assert.equal(serializedView.includes(sentinel), false);
    }
    for (const forbiddenKey of [
      "feeTrace",
      "rawEvidence",
      "phoneContent",
      "exactCoordinates",
      "safetyNarrative",
      "accessibilityDetails",
      "riskScore",
      "riskThreshold",
      "paymentCredential",
    ]) {
      assert.equal(Object.hasOwn(view, forbiddenKey), false);
    }
  }
});

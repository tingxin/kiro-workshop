import assert from "node:assert/strict";
import test from "node:test";

const loadSubject = async () => {
  const [{ SupportViewProjector, wireSupportFakeQuery }, { InMemorySupportFake }] =
    await Promise.all([
      import("../dist/application/support-view-projector.js"),
      import("../dist/adapters/in-memory-fakes.js"),
    ]);
  return { projector: new SupportViewProjector(), wireSupportFakeQuery, InMemorySupportFake };
};

const decision = (overrides = {}) => ({
  decisionId: "decision-62",
  decisionIdempotencyKey: "order-62:CANCELLATION_FEE",
  orderId: "order-62",
  chargeType: "CANCELLATION_FEE",
  cancelInitiator: "PASSENGER",
  liableParty: "DRIVER",
  charge: 500,
  driverCompensation: 300,
  publicReasonCode: "PASSENGER_CANCELLATION_FEE",
  processingMode: "NORMAL",
  ruleVersion: "workshop-rules-v7",
  feeTrace: { sensitiveSentinel: "trace-must-not-leak" },
  rawEvidence: { exactCoordinates: "coordinates-must-not-leak" },
  riskScore: "risk-must-not-leak",
  paymentCredential: "payment-must-not-leak",
  ...overrides,
});

test("6.2 SupportViewProjector builds the safe persisted Decision projection field-by-field", async () => {
  const { projector } = await loadSubject();

  const view = projector.project(decision());

  assert.deepEqual(view, {
    decisionId: "decision-62",
    orderId: "order-62",
    cancelInitiator: "PASSENGER",
    liableParty: "DRIVER",
    chargedAmount: 500,
    driverCompensation: 300,
    publicReasonCode: "PASSENGER_CANCELLATION_FEE",
    ruleVersion: "workshop-rules-v7",
    summary: "司机已接单并提供接驾服务，本次按规则收取取消费。",
  });
  assert.deepEqual(Object.keys(view).sort(), [
    "cancelInitiator",
    "chargedAmount",
    "decisionId",
    "driverCompensation",
    "liableParty",
    "orderId",
    "publicReasonCode",
    "ruleVersion",
    "summary",
  ]);
  assert.doesNotMatch(JSON.stringify(view), /trace-must-not-leak|coordinates-must-not-leak|risk-must-not-leak|payment-must-not-leak/);
});

test("6.2 SupportViewProjector omits unavailable explanation and optional values", async () => {
  const { projector } = await loadSubject();
  const input = decision({
    processingMode: "DEGRADED",
    publicReasonCode: "DEGRADED_NO_CHARGE",
    charge: 0,
    ruleVersion: undefined,
    liableParty: undefined,
    driverCompensation: undefined,
  });

  const view = projector.project(input);

  assert.deepEqual(view, {
    decisionId: "decision-62",
    orderId: "order-62",
    cancelInitiator: "PASSENGER",
    chargedAmount: 0,
    publicReasonCode: "DEGRADED_NO_CHARGE",
  });
  assert.equal("ruleVersion" in view, false);
  assert.equal("summary" in view, false);
  assert.equal("driverCompensation" in view, false);
  assert.equal("liableParty" in view, false);
});

test("6.2 Support Fake query is wired from a projected persisted Decision", async () => {
  const { projector, wireSupportFakeQuery, InMemorySupportFake } = await loadSubject();
  const supportFake = new InMemorySupportFake();
  const persistedDecision = decision();

  wireSupportFakeQuery(supportFake, persistedDecision, projector);

  assert.deepEqual(
    await supportFake.getDecisionView(persistedDecision.decisionId),
    projector.project(persistedDecision),
  );
  assert.equal(await supportFake.getDecisionView("missing"), undefined);
});

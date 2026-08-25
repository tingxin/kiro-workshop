import assert from "node:assert/strict";

import {
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const PARTIES = Object.freeze(["PASSENGER", "DRIVER"]);
const available = (value) => Object.freeze({ status: "AVAILABLE", value });

function oppositeParty(party) {
  return party === "PASSENGER" ? "DRIVER" : "PASSENGER";
}

const random = createSeededRandom(0x09a11ce5);
const cases = generatePropertyCases((caseNumber) => {
  const requesterCount = random.nextInt(1, 12);
  const requesters = Object.freeze(Array.from(
    { length: requesterCount },
    () => random.pick(PARTIES),
  ));
  const acceptedAtUtc = Object.freeze(Array.from(
    { length: requesterCount },
    (_, requestIndex) => new Date(
      Date.UTC(2025, 0, 1, 0, caseNumber, requestIndex),
    ).toISOString(),
  ));
  const firstRequester = requesters[0];

  return Object.freeze({
    orderId: `property-09-order-${caseNumber}`,
    requesters,
    acceptedAtUtc,
    liabilityChanges: Object.freeze([
      firstRequester,
      oppositeParty(firstRequester),
      firstRequester,
    ]),
  });
}, 128);

// **Validates: Requirements REQ-008.1, REQ-008.2, REQ-008.4, REQ-008.5**
propertyTest(9, "Initiator is first-accepted and independent from liability", async () => {
  const [{ CancelInitiatorRegistry }, { DecisionEngine }] = await Promise.all([
    import("../../dist/application/cancel-initiator-registry.js"),
    import("../../dist/domain/decision-engine.js"),
  ]);

  for (const [caseNumber, generatedCase] of cases.entries()) {
    assert.ok(generatedCase.requesters.length > 0, `case ${caseNumber} must be nonempty`);
    const registry = new CancelInitiatorRegistry();
    const expected = Object.freeze({
      orderId: generatedCase.orderId,
      cancelInitiator: generatedCase.requesters[0],
      acceptedAtUtc: generatedCase.acceptedAtUtc[0],
    });

    for (const [requestIndex, requester] of generatedCase.requesters.entries()) {
      const result = registry.createOrGet(
        generatedCase.orderId,
        requester,
        generatedCase.acceptedAtUtc[requestIndex],
      );
      assert.deepEqual(
        result,
        expected,
        `case ${caseNumber} request ${requestIndex} must retain the first accepted requester`,
      );
    }

    const engine = new DecisionEngine();
    for (const liableParty of generatedCase.liabilityChanges) {
      const decision = engine.evaluate({
        confirmedLiableParty: liableParty,
        capturedRuleVersion: `property-09-rules-${caseNumber}`,
        noShowEligibility: available(false),
        freeWindow: Object.freeze({
          status: "AVAILABLE",
          outcome: "FREE_CANCELLATION_WINDOW",
          elapsedSeconds: 0,
          charge: 0,
          publicReasonCode: "FREE_CANCELLATION_WINDOW",
        }),
      });

      assert.equal(decision.status, "DECIDED");
      assert.equal(
        decision.liableParty,
        liableParty,
        `case ${caseNumber} must project each independently confirmed liability`,
      );
      assert.deepEqual(
        registry.get(generatedCase.orderId),
        expected,
        `case ${caseNumber} liability changes must not alter the initiator`,
      );
    }

    assert.notEqual(
      generatedCase.liabilityChanges[1],
      expected.cancelInitiator,
      `case ${caseNumber} must cover liability differing from initiator`,
    );
    assert.deepEqual(registry.get(generatedCase.orderId), expected);
  }
});

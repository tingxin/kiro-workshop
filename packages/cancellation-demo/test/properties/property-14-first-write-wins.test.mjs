import assert from "node:assert/strict";

import {
  buildDecisionIdempotencyKey,
  moneyMinor,
} from "@company/cancellation-policy-kit";

import {
  createSeededRandom,
  generatePropertyCases,
  permutations,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const CHARGE_TYPES = Object.freeze(["CANCELLATION_FEE", "NO_SHOW_FEE"]);

function createDecision(orderId, chargeType, candidateNumber) {
  const decisionIdempotencyKey = buildDecisionIdempotencyKey(orderId, chargeType);
  return Object.freeze({
    decisionId: `decision-${orderId}-${chargeType}-${candidateNumber}`,
    decisionIdempotencyKey,
    orderId,
    chargeType,
    cancelInitiator: candidateNumber % 2 === 0 ? "PASSENGER" : "DRIVER",
    charge: moneyMinor(candidateNumber * 100),
    publicReasonCode: candidateNumber === 0
      ? "FREE_CANCELLATION_WINDOW"
      : "PASSENGER_CANCELLATION_FEE",
    processingMode: "NORMAL",
    ruleVersion: `rules-${candidateNumber}`,
  });
}

const generatedCases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x14_011_005 + caseNumber);
  const orderId = `order-${caseNumber}-${random.nextUint32().toString(16)}`;
  const chargeType = random.pick(CHARGE_TYPES);
  const candidateCount = random.nextInt(2, 4);
  const candidates = Array.from(
    { length: candidateCount },
    (_, candidateNumber) => createDecision(orderId, chargeType, candidateNumber),
  );

  return Object.freeze({
    orderId,
    chargeType,
    candidates: Object.freeze(candidates),
  });
});

// **Validates: Requirements REQ-011.1, REQ-011.2, REQ-011.3, REQ-011.4, REQ-011.5**
propertyTest(14, "Canonical key and first-write-wins are idempotent", async () => {
  const { InMemoryDecisionStore } = await import(
    "../../dist/adapters/in-memory-decision-store.js"
  );

  assert.equal(generatedCases.length, 100);

  for (const { orderId, chargeType, candidates } of generatedCases) {
    const canonicalKey = buildDecisionIdempotencyKey(orderId, chargeType);
    assert.ok(candidates.length >= 2, "candidate sequences must be nonempty");
    assert.ok(
      candidates.every(
        (candidate) => candidate.decisionIdempotencyKey === canonicalKey,
      ),
      "every candidate must use the shared canonical key",
    );

    for (const candidatePermutation of permutations(candidates)) {
      const store = new InMemoryDecisionStore();
      let creationCalls = 0;
      const results = [];

      for (const candidate of candidatePermutation) {
        results.push(await store.createOrGet(canonicalKey, async () => {
          creationCalls += 1;
          return candidate;
        }));
      }

      const winner = candidatePermutation[0];
      assert.equal(creationCalls, 1, "exactly one candidate may be created");
      assert.deepEqual(
        results[0],
        { decision: winner, created: true },
        "the first accepted candidate must win",
      );
      assert.strictEqual(
        store.inspect(canonicalKey),
        winner,
        "the canonical key must store exactly the first winner",
      );
      assert.equal(store.inspectAll().length, 1, "only one Decision may be stored");

      for (const laterResult of results.slice(1)) {
        assert.equal(laterResult.created, false);
        assert.strictEqual(
          laterResult.decision,
          winner,
          "all later results must equal the first-write winner",
        );
      }
    }
  }
});

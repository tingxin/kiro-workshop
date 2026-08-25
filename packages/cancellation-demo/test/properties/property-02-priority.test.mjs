import assert from "node:assert/strict";

import {
  createSeededRandom,
  generatePropertyCases,
  permutations,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const feeTrace = (finalFeeMinor) => Object.freeze({
  baseFeeMinor: finalFeeMinor,
  adjustmentBasisPoints: 10_000,
  adjustedFeeMinor: finalFeeMinor,
  discountMinor: 0,
  afterDiscountMinor: finalFeeMinor,
  estimatedTripFareMinor: finalFeeMinor,
  capped: false,
  finalFeeMinor,
});

const calculatedFee = (ruleVersion, charge) => Object.freeze({
  ruleVersion,
  charge,
  trace: feeTrace(charge),
});

const CANDIDATE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "LEGAL",
    rank: 1,
    candidate: Object.freeze({
      kind: "STRONG_EXEMPTION",
      confirmedExemption: "LEGAL",
      ruleVersion: "workshop-rules-priority",
    }),
  }),
  Object.freeze({
    id: "SAFETY",
    rank: 2,
    candidate: Object.freeze({
      kind: "STRONG_EXEMPTION",
      confirmedExemption: "SAFETY",
      ruleVersion: "workshop-rules-priority",
    }),
  }),
  Object.freeze({
    id: "ACCESSIBILITY",
    rank: 3,
    candidate: Object.freeze({
      kind: "STRONG_EXEMPTION",
      confirmedExemption: "ACCESSIBILITY",
      ruleVersion: "workshop-rules-priority",
    }),
  }),
  Object.freeze({
    id: "PLATFORM_FAILURE",
    rank: 4,
    candidate: Object.freeze({
      kind: "STRONG_EXEMPTION",
      confirmedExemption: "PLATFORM_FAILURE",
      ruleVersion: "workshop-rules-priority",
    }),
  }),
  Object.freeze({
    id: "CRITICAL_DEPENDENCY_FAILURE",
    rank: 4,
    candidate: Object.freeze({
      kind: "STRONG_EXEMPTION",
      confirmedExemption: "CRITICAL_DEPENDENCY_FAILURE",
      ruleVersion: "workshop-rules-priority",
    }),
  }),
  Object.freeze({
    id: "DRIVER_RESPONSIBILITY_CONFIRMED",
    rank: 5,
    candidate: Object.freeze({
      kind: "STRONG_EXEMPTION",
      confirmedExemption: "DRIVER_RESPONSIBILITY_CONFIRMED",
      ruleVersion: "workshop-rules-priority",
    }),
  }),
  Object.freeze({
    id: "PASSENGER_NO_SHOW_FEE",
    rank: 6,
    candidate: Object.freeze({
      kind: "PASSENGER_NO_SHOW_FEE",
      fee: calculatedFee("workshop-rules-priority", 800),
    }),
  }),
  Object.freeze({
    id: "FREE_CANCELLATION_WINDOW",
    rank: 7,
    candidate: Object.freeze({
      kind: "FREE_CANCELLATION_WINDOW",
      ruleVersion: "workshop-rules-priority",
    }),
  }),
  Object.freeze({
    id: "PASSENGER_CANCELLATION_FEE",
    rank: 7,
    candidate: Object.freeze({
      kind: "PASSENGER_CANCELLATION_FEE",
      fee: calculatedFee("workshop-rules-priority", 500),
    }),
  }),
]);

const rankOf = (candidate) => {
  const definition = CANDIDATE_DEFINITIONS.find(
    ({ candidate: knownCandidate }) => knownCandidate === candidate,
  );
  assert.ok(definition, "generated candidate must have an approved priority rank");
  return definition.rank;
};

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.nextInt(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

const generatedCases = generatePropertyCases((caseNumber) => {
  const random = createSeededRandom(0x2_002_003 + caseNumber);
  const possibleWinners = CANDIDATE_DEFINITIONS.filter(({ rank }) => rank < 7);
  const winner = random.pick(possibleWinners);
  const lowerPriority = CANDIDATE_DEFINITIONS.filter(
    ({ rank }) => rank > winner.rank,
  );
  const reservedExtension = random.pick(lowerPriority);
  const eligibleBase = CANDIDATE_DEFINITIONS.filter(
    ({ id, rank }) => id !== reservedExtension.id && rank >= winner.rank,
  );
  const otherBaseCandidates = shuffled(
    eligibleBase.filter(({ id }) => id !== winner.id),
    random,
  );
  const baseSize = random.nextInt(1, Math.min(5, eligibleBase.length));
  const baseDefinitions = shuffled(
    [winner, ...otherBaseCandidates.slice(0, baseSize - 1)],
    random,
  );
  const winnerRank = Math.min(...baseDefinitions.map(({ rank }) => rank));
  const extensionPool = shuffled(
    CANDIDATE_DEFINITIONS.filter(
      ({ id, rank }) => (
        rank > winnerRank
        && !baseDefinitions.some((base) => base.id === id)
      ),
    ),
    random,
  );
  const extensionSize = random.nextInt(1, Math.min(3, extensionPool.length));

  return Object.freeze({
    baseCandidates: Object.freeze(baseDefinitions.map(({ candidate }) => candidate)),
    lowerPriorityExtension: Object.freeze(
      extensionPool.slice(0, extensionSize).map(({ candidate }) => candidate),
    ),
    winnerRank,
  });
});

// **Validates: Requirements REQ-002.1, REQ-002.2, REQ-002.3, REQ-002.4**
propertyTest(2, "Priority selection is deterministic and monotonic", async () => {
  const { selectHighestPriorityCandidate } = await import(
    "../../dist/domain/decision-engine.js"
  );

  assert.equal(generatedCases.length, 100);

  for (const {
    baseCandidates,
    lowerPriorityExtension,
    winnerRank,
  } of generatedCases) {
    assert.ok(baseCandidates.length > 0, "candidate sets must be nonempty");
    assert.ok(
      lowerPriorityExtension.length > 0,
      "every generated set must have a lower-priority extension",
    );
    assert.ok(
      lowerPriorityExtension.every((candidate) => rankOf(candidate) > winnerRank),
      "extensions must contain only strictly lower-priority candidates",
    );

    const selected = selectHighestPriorityCandidate(baseCandidates);
    assert.equal(
      rankOf(selected),
      winnerRank,
      "the selected candidate must have the highest approved priority",
    );
    assert.deepEqual(
      selectHighestPriorityCandidate(baseCandidates),
      selected,
      "repeated selection must be deterministic",
    );

    for (const permutation of permutations(baseCandidates)) {
      assert.deepEqual(
        selectHighestPriorityCandidate(permutation),
        selected,
        "candidate ordering must not change deterministic selection",
      );
    }

    assert.deepEqual(
      selectHighestPriorityCandidate([
        ...baseCandidates,
        ...lowerPriorityExtension,
      ]),
      selected,
      "adding only lower-priority candidates must not replace the winner",
    );
  }
});

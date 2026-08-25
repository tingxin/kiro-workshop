import assert from "node:assert/strict";

import {
  createSeededRandom,
  generatePropertyCases,
  propertyTest,
} from "../support/deterministic-generators.mjs";

const APPROVED_SERVICE_TYPES = Object.freeze([
  "EXPRESS",
  "PREMIUM",
  "BUSINESS",
]);
const APPROVED_SERVICE_TYPE_SET = new Set(APPROVED_SERVICE_TYPES);
const LEGACY_RESULT = Object.freeze({
  target: "LEGACY_FAKE",
  legacyResult: Object.freeze({
    publicReasonCode: "LEGACY_FLOW",
    compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
  }),
});

function arbitraryServiceString(random, caseNumber) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_- ";
  const length = random.nextInt(0, 18);
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += alphabet[random.nextInt(0, alphabet.length - 1)];
  }
  return `UNKNOWN_${caseNumber}_${value}`;
}

// **Validates: Requirements REQ-003.1, REQ-003.2, REQ-003.3, REQ-003.4, REQ-003.5, REQ-003.6**
propertyTest(5, "Routing equals the whitelist predicate", async () => {
  const [{ V1Router }, { InMemoryLegacyFake }] = await Promise.all([
    import("../../dist/domain/v1-router.js"),
    import("../../dist/adapters/in-memory-fakes.js"),
  ]);
  const random = createSeededRandom(0x5a17c0de);
  const cases = generatePropertyCases((caseNumber) => {
    const serviceType = caseNumber % 5 < APPROVED_SERVICE_TYPES.length
      ? APPROVED_SERVICE_TYPES[caseNumber % APPROVED_SERVICE_TYPES.length]
      : arbitraryServiceString(random, caseNumber);

    return Object.freeze({
      isRealtime: random.boolean(),
      serviceType,
    });
  }, 128);
  const router = new V1Router(new InMemoryLegacyFake());

  for (const [caseNumber, generatedCase] of cases.entries()) {
    const expectedWorkshopRoute = generatedCase.isRealtime
      && APPROVED_SERVICE_TYPE_SET.has(generatedCase.serviceType);
    const expected = expectedWorkshopRoute
      ? { target: "WORKSHOP_V1" }
      : LEGACY_RESULT;

    const first = await router.route(generatedCase);
    const repeated = await router.route(generatedCase);

    assert.equal(
      first.target === "WORKSHOP_V1",
      expectedWorkshopRoute,
      `case ${caseNumber} must route to Workshop V1 iff realtime and whitelisted`,
    );
    assert.deepEqual(first, expected, `case ${caseNumber} must return the exact route result`);
    assert.deepEqual(
      repeated,
      expected,
      `case ${caseNumber} must return the same deterministic result when repeated`,
    );
  }
});

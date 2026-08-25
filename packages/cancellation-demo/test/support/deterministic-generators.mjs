import assert from "node:assert/strict";
import test from "node:test";

export const PROPERTY_CASE_COUNT = 100;

export function createSeededRandom(seed) {
  assert.ok(Number.isSafeInteger(seed), "seed must be a safe integer");
  let state = seed >>> 0;

  return Object.freeze({
    nextUint32() {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state;
    },
    nextInt(minimum, maximum) {
      assert.ok(Number.isSafeInteger(minimum), "minimum must be a safe integer");
      assert.ok(Number.isSafeInteger(maximum), "maximum must be a safe integer");
      assert.ok(maximum >= minimum, "maximum must be greater than or equal to minimum");
      const span = maximum - minimum + 1;
      assert.ok(Number.isSafeInteger(span) && span > 0, "integer range must be safe and nonempty");
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return minimum + (state % span);
    },
    boolean() {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return (state & 1) === 1;
    },
    pick(values) {
      assert.ok(Array.isArray(values) && values.length > 0, "values must be nonempty");
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return values[state % values.length];
    },
  });
}

export function generatePropertyCases(generator, count = PROPERTY_CASE_COUNT) {
  assert.equal(typeof generator, "function", "generator must be a function");
  assert.ok(Number.isSafeInteger(count) && count >= PROPERTY_CASE_COUNT, "property tests require at least 100 cases");
  return Object.freeze(Array.from({ length: count }, (_, index) => generator(index)));
}

export function permutations(values) {
  assert.ok(Array.isArray(values), "values must be an array");
  if (values.length === 0) {
    return [[]];
  }

  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    const remaining = values.slice(0, index).concat(values.slice(index + 1));
    for (const suffix of permutations(remaining)) {
      result.push([values[index], ...suffix]);
    }
  }
  return result;
}

export function sequences(values, length) {
  assert.ok(Array.isArray(values), "values must be an array");
  assert.ok(Number.isSafeInteger(length) && length >= 0, "length must be a non-negative safe integer");
  if (length === 0) {
    return [[]];
  }

  const result = [];
  for (const value of values) {
    for (const suffix of sequences(values, length - 1)) {
      result.push([value, ...suffix]);
    }
  }
  return result;
}

export class AsyncRaceBarrier {
  #arrivals = 0;
  #release;
  #released;

  constructor(participantCount) {
    assert.ok(
      Number.isSafeInteger(participantCount) && participantCount > 0,
      "participantCount must be a positive safe integer",
    );
    this.participantCount = participantCount;
    this.#released = new Promise((resolve) => {
      this.#release = resolve;
    });
  }

  async wait() {
    this.#arrivals += 1;
    if (this.#arrivals === this.participantCount) {
      this.#release();
    }
    await this.#released;
  }
}

export function sensitiveSentinels(caseNumber) {
  assert.ok(Number.isSafeInteger(caseNumber) && caseNumber >= 0, "caseNumber must be a non-negative safe integer");
  const marker = `case-${caseNumber}`;
  return Object.freeze({
    phoneContent: `SENSITIVE_PHONE_${marker}`,
    exactCoordinates: `SENSITIVE_COORDINATES_${marker}`,
    safetyNarrative: `SENSITIVE_SAFETY_${marker}`,
    accessibilityDetails: `SENSITIVE_ACCESSIBILITY_${marker}`,
    riskScore: `SENSITIVE_RISK_SCORE_${marker}`,
    riskThreshold: `SENSITIVE_RISK_THRESHOLD_${marker}`,
    paymentCredential: `SENSITIVE_PAYMENT_${marker}`,
  });
}

export function propertyTag(number, title) {
  return `Feature: cancellation-no-show-fee-system, Property ${number}: ${title}`;
}

export function propertyTest(number, title, implementation) {
  return test(propertyTag(number, title), implementation);
}

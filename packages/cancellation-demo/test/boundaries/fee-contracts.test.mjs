import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CappedFeeCalculator,
  moneyMinor,
} from "@company/cancellation-policy-kit";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = join(packageRoot, "src");
const available = (value) => Object.freeze({ status: "AVAILABLE", value });

async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(path);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  }));
  return nestedFiles.flat();
}

test("3.13 selects the exact Workshop fee cells with the captured snapshot version", async () => {
  const {
    InMemoryRuleRepositoryConfigurationFake,
    WORKSHOP_RULE_VERSION,
  } = await import("../../dist/adapters/in-memory-fakes.js");
  const { FeeInputSelector } = await import("../../dist/application/fee-input-selector.js");
  const selector = new FeeInputSelector(new InMemoryRuleRepositoryConfigurationFake());

  const expectedCells = [
    ["EXPRESS", "CANCELLATION_FEE", 500],
    ["EXPRESS", "NO_SHOW_FEE", 800],
    ["PREMIUM", "CANCELLATION_FEE", 800],
    ["PREMIUM", "NO_SHOW_FEE", 1_200],
    ["BUSINESS", "CANCELLATION_FEE", 800],
    ["BUSINESS", "NO_SHOW_FEE", 1_200],
  ];

  for (const [serviceType, chargeType, expectedBaseFee] of expectedCells) {
    assert.deepEqual(await selector.select(serviceType, chargeType), available({
      baseFee: expectedBaseFee,
      ruleVersion: WORKSHOP_RULE_VERSION,
    }));
  }

  let snapshotReads = 0;
  const singleSnapshot = Object.freeze({
    ruleVersion: "same-snapshot-version",
    baseFees: Object.freeze({
      EXPRESS: Object.freeze({ CANCELLATION_FEE: moneyMinor(501), NO_SHOW_FEE: moneyMinor(801) }),
      PREMIUM: Object.freeze({ CANCELLATION_FEE: moneyMinor(802), NO_SHOW_FEE: moneyMinor(1_202) }),
      BUSINESS: Object.freeze({ CANCELLATION_FEE: moneyMinor(803), NO_SHOW_FEE: moneyMinor(1_203) }),
    }),
  });
  const singleReadSelector = new FeeInputSelector({
    async getSnapshot() {
      snapshotReads += 1;
      return available(singleSnapshot);
    },
  });

  assert.deepEqual(
    await singleReadSelector.select("BUSINESS", "NO_SHOW_FEE"),
    available({ baseFee: 1_203, ruleVersion: "same-snapshot-version" }),
  );
  assert.equal(snapshotReads, 1, "base fee and rule version must come from one snapshot read");
});

test("3.13 rejects invalid money and adjustment basis-point inputs", () => {
  const invalidMoneyValues = [
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ];
  for (const value of invalidMoneyValues) {
    assert.throws(() => moneyMinor(value), RangeError, `moneyMinor should reject ${value}`);
  }

  const calculator = new CappedFeeCalculator();
  const validFeeInput = {
    baseFee: moneyMinor(500),
    discount: moneyMinor(0),
    estimatedTripFare: moneyMinor(900),
  };
  const invalidBasisPointValues = [
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ];
  for (const adjustmentBasisPoints of invalidBasisPointValues) {
    assert.throws(
      () => calculator.calculate({ ...validFeeInput, adjustmentBasisPoints }),
      RangeError,
      `calculator should reject adjustmentBasisPoints=${adjustmentBasisPoints}`,
    );
  }
});

test("3.13 delegates the synthetic 500 x 2 example and caps the charge at 900", async () => {
  const { calculateCancellationFee } = await import("../../dist/calculate-cancellation-fee.js");

  assert.deepEqual(calculateCancellationFee({
    baseFee: moneyMinor(500),
    adjustmentBasisPoints: 20_000,
    discount: moneyMinor(0),
    estimatedTripFare: moneyMinor(900),
  }), {
    status: "CALCULATED",
    charge: 900,
    trace: {
      baseFeeMinor: 500,
      adjustmentBasisPoints: 20_000,
      adjustedFeeMinor: 1_000,
      discountMinor: 0,
      afterDiscountMinor: 1_000,
      estimatedTripFareMinor: 900,
      capped: true,
      finalFeeMinor: 900,
    },
  });
});

test("3.13 product source uses package-root imports and contains no copied fee pipeline", async () => {
  const sourceFiles = await listTypeScriptFiles(sourceRoot);
  assert.ok(sourceFiles.length > 0, "expected product TypeScript source files");

  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, "utf8");
    const kitSpecifiers = Array.from(
      source.matchAll(/["'](@company\/cancellation-policy-kit[^"']*)["']/g),
      (match) => match[1],
    );
    for (const specifier of kitSpecifiers) {
      assert.equal(
        specifier,
        "@company/cancellation-policy-kit",
        `${sourceFile} must import shared fee APIs only from the package root`,
      );
    }
  }

  const adapterPath = join(sourceRoot, "calculate-cancellation-fee.ts");
  const adapterSource = await readFile(adapterPath, "utf8");
  assert.match(
    adapterSource,
    /from\s+["']@company\/cancellation-policy-kit["']\s*;/,
    "fee adapter must import the shared calculator from the package root",
  );
  assert.match(
    adapterSource,
    /calculator\.calculate\(input\)/,
    "fee adapter must delegate the complete input to CappedFeeCalculator",
  );

  const forbiddenMathCalls = ["round", "min", "max"];
  for (const method of forbiddenMathCalls) {
    assert.doesNotMatch(
      adapterSource,
      new RegExp(`Math\\s*\\.\\s*${method}\\s*\\(`),
      `fee adapter must not copy Math.${method} fee logic`,
    );
  }

  const copiedArithmeticLine = adapterSource
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .find((line) => (
      /\b(?:baseFee|adjustmentBasisPoints|discount|estimatedTripFare)\b/.test(line)
      && /(?:\+|-|\*|\/|<|>)/.test(line)
    ));
  assert.equal(
    copiedArithmeticLine,
    undefined,
    `fee adapter must not copy multiplication, discount, clamp, cap, or rounding logic: ${copiedArithmeticLine}`,
  );
});

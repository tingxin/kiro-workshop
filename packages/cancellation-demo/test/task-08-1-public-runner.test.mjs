import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const PACKAGE_ROOT = new URL("..", import.meta.url);

const EXPECTED_SCENARIOS = [
  "LEGACY",
  "NORMAL_CANCELLATION",
  "NO_SHOW",
  "STRONG_EXEMPTION_LEGAL",
  "STRONG_EXEMPTION_SAFETY",
  "STRONG_EXEMPTION_ACCESSIBILITY",
  "STRONG_EXEMPTION_PLATFORM_FAILURE",
  "STRONG_EXEMPTION_CRITICAL_DEPENDENCY_FAILURE",
  "STRONG_EXEMPTION_DRIVER_RESPONSIBILITY_CONFIRMED",
  "DEGRADED",
];

test("8.1 package index exposes the intended Workshop entry points", async () => {
  const publicApi = await import(new URL("../dist/index.js", import.meta.url).href);

  assert.equal(typeof publicApi.WorkshopAssembly, "function");
  assert.equal(typeof publicApi.FixedClock, "function");
  assert.equal(typeof publicApi.UnavailableClock, "function");
  assert.equal(typeof publicApi.createDeterministicDecisionIdSource, "function");
  assert.equal(typeof publicApi.runWorkshopDemo, "function");
});

test("8.1 demo runs all representative flows through WorkshopAssembly with safe synthetic labels", async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["dist/demo.js"],
    { cwd: PACKAGE_ROOT },
  );
  assert.equal(stderr, "");

  const output = JSON.parse(stdout);
  assert.equal(output.header, "Workshop synthetic/non-production");
  assert.deepEqual(output.flows.map(({ scenario }) => scenario), EXPECTED_SCENARIOS);
  assert.ok(output.flows.every(({ resultKind }) => resultKind === "WORKSHOP_SYNTHETIC_NON_PRODUCTION"));

  const legacy = output.flows[0];
  assert.deepEqual(legacy.result, {
    target: "LEGACY_FAKE",
    publicReasonCode: "LEGACY_FLOW",
    compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY",
  });

  const decisions = output.flows.slice(1).map(({ result }) => result);
  assert.equal(decisions[0].publicReasonCode, "PASSENGER_CANCELLATION_FEE");
  assert.equal(decisions[1].publicReasonCode, "PASSENGER_NO_SHOW_FEE");
  assert.ok(decisions.slice(2, 8).every(({ publicReasonCode, charge }) =>
    publicReasonCode === "STRONG_EXEMPTION" && charge === 0));
  assert.deepEqual(
    decisions[8],
    {
      target: "WORKSHOP_V1",
      charge: 0,
      publicReasonCode: "DEGRADED_NO_CHARGE",
      processingMode: "DEGRADED",
    },
  );

  assert.equal(output.acceptance.header, "Workshop synthetic/non-production");
  assert.ok(output.acceptance.passItems.every(({ resultKind }) =>
    resultKind === "WORKSHOP_SYNTHETIC_NON_PRODUCTION"));
  assert.ok(output.acceptance.dependencies.every(({ binding }) =>
    binding === "PORT_AND_IN_MEMORY_FAKE"));
  assert.ok(output.acceptance.fakeSuccesses.every(({ resultKind }) =>
    resultKind === "SYNTHETIC_NON_PRODUCTION"));

  const serialized = JSON.stringify(output);
  assert.doesNotMatch(serialized, /phone|latitude|longitude|credential|apiKey|feeTrace/iu);
  assert.doesNotMatch(serialized, /production[-_ ]ready|real[-_ ]integration/iu);
});

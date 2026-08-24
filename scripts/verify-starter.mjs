import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const targetPath = "packages/cancellation-demo/src/calculate-cancellation-fee.ts";
const decisionLogPath = "docs/decision-log/cancellation-no-show-fee-v1.md";
const featureSpecPath = ".kiro/specs/cancellation-no-show-fee-v1";

assert.equal(existsSync(targetPath), true, `missing starter target: ${targetPath}`);
const target = readFileSync(targetPath, "utf8");
assert.match(target, /status:\s*"NOT_IMPLEMENTED"/);
assert.match(target, /charge:\s*ZERO_MONEY/);
assert.equal(
  existsSync(decisionLogPath),
  false,
  `starter must not include learner Decision Log: ${decisionLogPath}`,
);
assert.equal(
  existsSync(featureSpecPath),
  false,
  `starter must not include learner Feature Spec: ${featureSpecPath}`,
);

console.log("starter verification passed: learner outputs are intentionally absent");
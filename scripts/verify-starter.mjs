import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const targetPath = "packages/cancellation-demo/src/calculate-cancellation-fee.ts";
const target = readFileSync(targetPath, "utf8");
const packageJson = readFileSync("package.json", "utf8");

assert.match(target, /TODO\(KIRO-LAB\)/, "starter TODO must remain");
assert.match(target, /status:\s*["']NOT_IMPLEMENTED["']/);
assert.match(target, /charge:\s*ZERO_MONEY/);
assert.doesNotMatch(target, /new\s+CappedFeeCalculator|\.calculate\s*\(/);

const learnerOutputs = [
  "workshop-output/01-requirements-analysis.md",
  "workshop-output/02-approved-decisions.md",
  "workshop-output/03-requirements-baseline.md",
  "workshop-output/04-traceability-matrix.md",
  "workshop-output/05-acceptance-report.md",
  ".kiro/specs/cancellation-no-show-fee-system",
  ".kiro/steering/cancellation-system.md",
  ".kiro/hooks/cancellation-system-guard.kiro.hook",
];
for (const output of learnerOutputs) {
  assert.equal(existsSync(output), false, `starter must not include learner output: ${output}`);
}

const enterpriseAssets = [
  ".kiro/skills/custom-find-skill",
  "enterprise-knowledge-base/business/fee-calculation-policy.md",
  "packages/company-policy-kit/src/capped-fee-calculator.ts",
  "packages/company-policy-kit/src/money.ts",
  "team-templates/cancellation-fee/calculate-cancellation-fee.ts.template",
];
for (const asset of enterpriseAssets) {
  assert.equal(existsSync(asset), true, `required enterprise asset is missing: ${asset}`);
}

assert.doesNotMatch(packageJson, /"test:system"\s*:/);
console.log("starter verification passed: safe adapter, enterprise assets present, learner outputs absent");
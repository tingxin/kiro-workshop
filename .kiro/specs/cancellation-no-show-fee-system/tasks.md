# Implementation Plan: Cancellation and No-Show Fee System

## Overview

Implement the approved TypeScript ESM Workshop V1 slice only in `packages/cancellation-demo`. Reuse `MoneyMinor`, `moneyMinor`, `CappedFeeCalculator`, `buildDecisionIdempotencyKey`, and `DecisionExplanationBuilder` exclusively from the `@company/cancellation-policy-kit` package root. All external capabilities remain deterministic in-memory fakes; no task modifies the shared kit, team templates, approved knowledge, requirements, or design.

## Tasks

## Execution Protocol

- **Run all Tasks** executes only incomplete required tasks. Parent task status must match its children, and all core implementation and test tasks must remain required.
- Every implementation task is one Red/Green unit: first add or update a focused test in `packages/cancellation-demo/test/`, run it and confirm it fails because the behavior is missing; then make the smallest production change and rerun the focused test.
- Each task may modify only the production file named by that task, its paired focused test, and package-local test support when explicitly required. `requirements.md`, `design.md`, shared kit code, templates, and enterprise knowledge remain read-only.
- After each task, run its focused non-watch test and `npm run check`. Do not install dependencies, access the network, or call production services.

- [x] 1. Establish package contracts, ports, and deterministic test infrastructure
  - [x] 1.1 Create immutable domain and application contracts in `packages/cancellation-demo/src/domain/types.ts`
    - Define the approved command, availability, service, exemption, evidence, versioned configuration, decision, audit, public explanation, support view, replay result, and acceptance-report types from the design.
    - Keep unknown service type as `string` at the input boundary; use explicit normal/degraded decision variants and exact allowlisted fields without generic metadata bags.
    - Import shared money, charge, trace, and reason types only from the `@company/cancellation-policy-kit` package root.
    - _Requirements: REQ-001.1, REQ-001.3, REQ-004.6, REQ-009.1, REQ-012.1, REQ-015.1, REQ-016.3, REQ-018.1_

  - [x] 1.2 Define the approved application ports in `packages/cancellation-demo/src/ports.ts`
    - Add exact interfaces for Map, Payment/Charge, Compensation/Settlement, Notification, Support, Risk, RuleRepository/Configuration, Legacy, DecisionStore, and Clock.
    - Model explicit `AVAILABLE`/`UNAVAILABLE` results and synthetic-only action results; expose no network client, credential, production persistence, or unapproved behavior.
    - _Requirements: REQ-001.2, REQ-001.5, REQ-003.4, REQ-006.7, REQ-009.8, REQ-015.1, REQ-017.1_

  - [x] 1.3 Add non-watch test scripts and deterministic generator support under `packages/cancellation-demo/test/support/`
    - Update only `packages/cancellation-demo/package.json` with a non-watch `node --test` script that runs against built ESM output; do not add a test dependency.
    - Implement seeded deterministic generators, permutation/sequence generators, async race barriers, and sensitive sentinel generators for at least 100 cases per property using `node:test` and `node:assert`.
    - Provide a shared helper that embeds the exact tag `Feature: cancellation-no-show-fee-system, Property {number}: {property title}` in every property test.
    - _Requirements: REQ-001.3, REQ-011.4, REQ-012.5, REQ-016.5, REQ-018.1_

  - [x] 1.4 Implement all in-memory adapters in `packages/cancellation-demo/src/adapters/in-memory-fakes.ts`
    - Bind the eight named external ports to configurable `IN_MEMORY_FAKE` adapters with deterministic success/unavailable behavior and inspectable synthetic action records.
    - Add injected fixed/unavailable Clock and deterministic Decision ID source helpers; keep all values synthetic and make network access impossible by construction.
    - Seed the Rule Configuration Fake with `moneyMinor` values 500/800 for EXPRESS and 800/1200 for PREMIUM/BUSINESS plus an explicit Workshop rule version.
    - _Requirements: REQ-001.2, REQ-001.4, REQ-001.5, REQ-003.7, REQ-009.1, REQ-009.2, REQ-009.3, REQ-009.4, REQ-011.6, REQ-011.7, REQ-015.6, REQ-018.4, REQ-018.5_

- [x] 2. Implement pure routing, rule evaluation, and approved fee reuse
  - [x] 2.1 Implement `V1Router` in `packages/cancellation-demo/src/domain/v1-router.ts`
    - Route only realtime `EXPRESS`, `PREMIUM`, and `BUSINESS` commands to `WORKSHOP_V1`; route every other or unknown service type to the Legacy Fake without invoking V1 evaluation.
    - Return the exact legacy compatibility marker required by the design and keep routing deterministic.
    - _Requirements: REQ-003.1, REQ-003.2, REQ-003.3, REQ-003.4, REQ-003.5, REQ-003.6, REQ-003.7_

  - [x] 2.2 Implement ranked `DecisionEngine` candidate selection in `packages/cancellation-demo/src/domain/decision-engine.ts`
    - Encode the approved priority ranks, strong-exemption short circuit, no-show and ordinary-cancellation candidates, and independent confirmed liable party.
    - Accept immutable evaluator inputs and selected fee results; never persist, emit effects, read current time, or treat unverified statements/unapproved exemption strings as evidence.
    - Preserve Rule Version when available and omit rather than invent it when unavailable before a zero/degraded outcome.
    - _Requirements: REQ-002.1, REQ-002.2, REQ-002.3, REQ-002.4, REQ-002.5, REQ-002.6, REQ-002.7, REQ-002.8, REQ-004.1, REQ-004.2, REQ-004.3, REQ-004.4, REQ-004.5, REQ-008.4, REQ-013.1, REQ-013.2, REQ-013.3_

  - [x] 2.3 Implement the inclusive free-window evaluator in `packages/cancellation-demo/src/domain/free-window.ts`
    - Compare supplied valid UTC instants deterministically: elapsed seconds `<= 120` yields zero and `FREE_CANCELLATION_WINDOW`; values above 120 continue lower-priority evaluation.
    - Return explicit unavailable status for missing driver acceptance or Clock data so orchestration can degrade without guessing.
    - _Requirements: REQ-005.1, REQ-005.2, REQ-005.3, REQ-005.4, REQ-005.5, REQ-005.6_

  - [x] 2.4 Implement `ArrivalEvaluator` in `packages/cancellation-demo/src/domain/arrival-evaluator.ts`
    - Return true exactly when distance is `<= 200` meters and continuous qualifying time is `>= 30` seconds.
    - Consume only the two approved Map evidence fields; exclude driver-click and unrelated routing/ETA/direction data.
    - _Requirements: REQ-006.1, REQ-006.2, REQ-006.3, REQ-006.4, REQ-006.5, REQ-006.6_

  - [x] 2.5 Implement `NoShowEvaluator` in `packages/cancellation-demo/src/domain/no-show-evaluator.ts`
    - Require verified arrival and either explicit in-platform refusal or at least 300 seconds of waiting plus one contact attempt.
    - Keep missing wait/contact evidence explicit so required unavailability routes to degradation instead of becoming false evidence.
    - _Requirements: REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5, REQ-007.6, REQ-007.7, REQ-007.8_

  - [x] 2.6 Implement `CancelInitiatorRegistry` in `packages/cancellation-demo/src/application/cancel-initiator-registry.ts`
    - Provide per-order atomic first-accepted requester storage with optional accepted UTC time and deterministic retention across later/concurrent requests.
    - Keep initiator independent from confirmed liability updates and ignore unverified statements.
    - _Requirements: REQ-008.1, REQ-008.2, REQ-008.3, REQ-008.4, REQ-008.5, REQ-008.6_

  - [x] 2.7 Implement `FeeInputSelector` in `packages/cancellation-demo/src/application/fee-input-selector.ts`
    - Read exactly one available configuration snapshot and return its exact `(serviceType, chargeType)` table cell with the same `ruleVersion`.
    - Construct Fake configuration money with package-root `moneyMinor`; define no fallback constants and surface unavailable configuration for degradation.
    - _Requirements: REQ-009.1, REQ-009.2, REQ-009.3, REQ-009.4, REQ-009.5, REQ-009.6, REQ-009.7, REQ-009.8_

  - [x] 2.8 Replace the starter in `packages/cancellation-demo/src/calculate-cancellation-fee.ts` with the transparent fee adapter
    - Import `CappedFeeCalculator`, `CappedFeeInput`, `FeeCalculationTrace`, and `MoneyMinor` only from the package root.
    - Delegate the complete adjustment, rounding, discount, non-negative clamp, and estimated-fare cap pipeline once; return the shared `charge` and `trace` unchanged.
    - Remove `NOT_IMPLEMENTED`/`ZERO_MONEY` behavior and add no local money type, multiplication, rounding, `Math.min`, or `Math.max` calculation.
    - _Requirements: REQ-010.1, REQ-010.2, REQ-010.3, REQ-010.4, REQ-010.5, REQ-010.6, REQ-010.7, REQ-010.8, REQ-010.9, REQ-010.10_

- [ ] 3. Verify pure rules and fee contracts with deterministic automated tests
  - [x] 3.1 Add `test/properties/property-02-priority.test.mjs`
    - **Property 2: Priority selection is deterministic and monotonic**
    - Run at least 100 generated nonempty candidate sets and lower-priority extensions against the built engine.
    - **Validates: Requirements REQ-002.1, REQ-002.2, REQ-002.3, REQ-002.4**
    - _Requirements: REQ-002.1, REQ-002.2, REQ-002.3, REQ-002.4_

  - [-] 3.2 Add `test/properties/property-04-evidence-noninfluence.test.mjs`
    - **Property 4: Unapproved exemption values and unverified statements are non-influential**
    - Generate invalid exemption values and unique unverified sentinels; assert no exemption, eligibility, liability, or ordinary-output influence.
    - **Validates: Requirements REQ-002.8, REQ-004.2, REQ-004.4, REQ-004.5, REQ-008.6**
    - _Requirements: REQ-002.8, REQ-004.2, REQ-004.4, REQ-004.5, REQ-008.6_

  - [x] 3.3 Add `test/properties/property-05-routing.test.mjs`
    - **Property 5: Routing equals the whitelist predicate**
    - Generate realtime flags and arbitrary service strings; assert iff whitelist routing and deterministic Legacy Fake results.
    - **Validates: Requirements REQ-003.1, REQ-003.2, REQ-003.3, REQ-003.4, REQ-003.5, REQ-003.6**
    - _Requirements: REQ-003.1, REQ-003.2, REQ-003.3, REQ-003.4, REQ-003.5, REQ-003.6_

  - [x] 3.4 Add `test/properties/property-06-free-window.test.mjs`
    - **Property 6: Free-window classification uses an inclusive 120-second boundary**
    - Generate valid UTC acceptance/cancellation pairs and assert deterministic classification at/below versus above 120 seconds.
    - **Validates: Requirements REQ-005.1, REQ-005.2, REQ-005.3, REQ-005.4, REQ-005.5**
    - _Requirements: REQ-005.1, REQ-005.2, REQ-005.3, REQ-005.4, REQ-005.5_

  - [x] 3.5 Add `test/properties/property-07-arrival.test.mjs`
    - **Property 7: Verified arrival is exactly the approved Map predicate**
    - Generate distance/duration and unrelated sentinels; assert exact predicate, determinism, and non-influence.
    - **Validates: Requirements REQ-006.1, REQ-006.2, REQ-006.3, REQ-006.4, REQ-006.5, REQ-006.6**
    - _Requirements: REQ-006.1, REQ-006.2, REQ-006.3, REQ-006.4, REQ-006.5, REQ-006.6_

  - [~] 3.6 Add `test/properties/property-08-no-show.test.mjs`
    - **Property 8: No-show eligibility is exactly the approved conjunction**
    - Generate verified-arrival, refusal, wait, and contact tuples; assert the exact conjunction and deterministic result.
    - **Validates: Requirements REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5, REQ-007.6, REQ-007.7**
    - _Requirements: REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5, REQ-007.6, REQ-007.7_

  - [~] 3.7 Add `test/properties/property-09-initiator.test.mjs`
    - **Property 9: Initiator is first-accepted and independent from liability**
    - Generate nonempty requester sequences and liability changes; assert first acceptance remains fixed.
    - **Validates: Requirements REQ-008.1, REQ-008.2, REQ-008.4, REQ-008.5**
    - _Requirements: REQ-008.1, REQ-008.2, REQ-008.4, REQ-008.5_

  - [~] 3.8 Add `test/properties/property-10-fee-selection.test.mjs`
    - **Property 10: Fee selection is a deterministic snapshot lookup**
    - Generate every approved service/charge combination across versioned snapshots and assert exact cell/version pairing.
    - **Validates: Requirements REQ-009.1, REQ-009.2, REQ-009.3, REQ-009.4, REQ-009.5**
    - _Requirements: REQ-009.1, REQ-009.2, REQ-009.3, REQ-009.4, REQ-009.5_

  - [~] 3.9 Add `test/properties/property-11-invalid-numerics.test.mjs`
    - **Property 11: Invalid numeric policy inputs are rejected**
    - Generate negative, fractional, non-finite, and unsafe money values plus invalid basis points; assert package APIs reject rather than coerce.
    - **Validates: Requirements REQ-009.6, REQ-010.9**
    - _Requirements: REQ-009.6, REQ-010.9_

  - [~] 3.10 Add `test/properties/property-12-transparent-adapter.test.mjs`
    - **Property 12: Fee adapter is transparent**
    - Generate valid fee tuples and compare the adapter result deeply with direct package-root calculator output.
    - **Validates: Requirements REQ-010.1, REQ-010.2, REQ-010.3, REQ-010.4**
    - _Requirements: REQ-010.1, REQ-010.2, REQ-010.3, REQ-010.4_

  - [~] 3.11 Add `test/properties/property-13-amount-invariants.test.mjs`
    - **Property 13: Calculated charge obeys shared amount invariants**
    - Generate valid calculator inputs and assert integer money, non-negative/cap bounds, over-discount zero, over-estimate cap, and zero-estimate zero.
    - **Validates: Requirements REQ-010.5, REQ-010.6, REQ-010.7, REQ-010.8**
    - _Requirements: REQ-010.5, REQ-010.6, REQ-010.7, REQ-010.8_

  - [~] 3.12 Add focused rule boundary tests in `test/boundaries/rule-boundaries.test.mjs`
    - Cover 119/120/121 seconds; 200/201 meters; 29/30 seconds; 4m59s/5m; absent contact; and explicit refusal with and without verified arrival.
    - Cover all six approved Strong Exemption categories and reject an invalid category without treating free text as evidence.
    - _Requirements: REQ-002.5, REQ-004.1, REQ-004.2, REQ-005.1, REQ-005.2, REQ-005.3, REQ-006.1, REQ-006.2, REQ-006.3, REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5_

  - [~] 3.13 Add focused fee contract tests in `test/boundaries/fee-contracts.test.mjs`
    - Assert exact 500/800/800/1200 table values, same-snapshot version capture, invalid money/basis-point rejection, and the synthetic 500×2 capped-at-900 example.
    - Scan package source imports to reject deep `@company/cancellation-policy-kit/*` imports and copied multiplication/clamp/cap/rounding logic in product fee code.
    - _Requirements: REQ-009.1, REQ-009.2, REQ-009.3, REQ-009.4, REQ-009.6, REQ-009.7, REQ-010.4, REQ-010.10_

- [ ] 4. Implement first-write-wins persistence, degradation, audit, and orchestration
  - [x] 4.1 Implement atomic in-memory `DecisionStore` in `packages/cancellation-demo/src/adapters/in-memory-decision-store.ts`
    - Serialize each canonical key with a pending promise/gate so exactly one creation callback runs and all waiters receive the same stored Decision plus `created=false`.
    - Avoid check-then-unconditional-insert and expose deterministic inspection/reset helpers only for tests.
    - _Requirements: REQ-011.2, REQ-011.3, REQ-011.4, REQ-011.5_

  - [x] 4.2 Implement `AuditRecorder` in `packages/cancellation-demo/src/application/audit-recorder.ts`
    - Write one event per first-created Decision using exactly the REQ-016 allowlist and frozen request/Decision data.
    - Omit unavailable version/time/trace fields, reject duplicate event creation, and never accept generic metadata or raw evidence.
    - _Requirements: REQ-016.1, REQ-016.2, REQ-016.3, REQ-016.4, REQ-016.5_

  - [x] 4.3 Implement `DegradationHandler` in `packages/cancellation-demo/src/application/degradation-handler.ts`
    - Build a successful zero-charge `DEGRADED_NO_CHARGE` Decision draft for approved rule, map, wait/contact, driver-acceptance, or Clock unavailability.
    - Preserve Rule Version only if already captured; define no retries, fallback fee constants, later charge, or other dependency behavior.
    - _Requirements: REQ-005.6, REQ-006.7, REQ-007.8, REQ-009.8, REQ-017.1, REQ-017.2, REQ-017.3, REQ-017.4, REQ-017.6_

  - [~] 4.4 Implement `DecisionCommitCoordinator` in `packages/cancellation-demo/src/application/decision-commit-coordinator.ts`
    - Under the per-key gate, call `createOrGet`; only the `created=true` caller may append one audit event and record at most one applicable synthetic charge and compensation action.
    - Record no passenger charge for zero/degraded Decisions and release the gate only after allowed first-creation effects complete.
    - _Requirements: REQ-002.7, REQ-011.2, REQ-011.3, REQ-011.4, REQ-011.5, REQ-011.6, REQ-011.7, REQ-011.8, REQ-016.1, REQ-016.2, REQ-016.5, REQ-017.5, REQ-017.8_

  - [~] 4.5 Implement `DecisionService` in `packages/cancellation-demo/src/application/decision-service.ts`
    - Validate structural command fields, obtain acceptance from the injected Clock, register first initiator, and build the only key via package-root `buildDecisionIdempotencyKey(orderId, chargeType)`.
    - Route before V1 evaluation, capture each required configuration/evidence source once into an immutable snapshot, evaluate normal/degraded drafts, and commit through the coordinator.
    - Return an existing winner without current-config re-evaluation, new audit, or synthetic effects.
    - _Requirements: REQ-001.1, REQ-003.4, REQ-008.1, REQ-008.2, REQ-008.3, REQ-011.1, REQ-011.2, REQ-011.3, REQ-011.4, REQ-011.5, REQ-011.6, REQ-011.7, REQ-011.8, REQ-012.1, REQ-012.2, REQ-012.3, REQ-012.4, REQ-017.7, REQ-017.8_

- [ ] 5. Verify complete Decision creation, concurrency, and degradation
  - [~] 5.1 Add `test/properties/property-03-strong-exemption.test.mjs`
    - **Property 3: Strong exemptions short-circuit to a complete zero Decision**
    - Generate every approved exemption with arbitrary lower-priority charging inputs; assert zero/versioned reason, no fee eligibility, and one audit for the winner.
    - **Validates: Requirements REQ-002.5, REQ-002.6, REQ-002.7, REQ-004.1, REQ-004.3, REQ-013.1, REQ-013.2, REQ-013.3**
    - _Requirements: REQ-002.5, REQ-002.6, REQ-002.7, REQ-004.1, REQ-004.3, REQ-013.1, REQ-013.2, REQ-013.3_

  - [~] 5.2 Add `test/properties/property-14-first-write-wins.test.mjs`
    - **Property 14: Canonical key and first-write-wins are idempotent**
    - Generate order IDs, charge types, candidate sequences, and permutations; assert the shared canonical key, one winner, and winner equality for all later results.
    - **Validates: Requirements REQ-011.1, REQ-011.2, REQ-011.3, REQ-011.4, REQ-011.5**
    - _Requirements: REQ-011.1, REQ-011.2, REQ-011.3, REQ-011.4, REQ-011.5_

  - [~] 5.3 Add `test/properties/property-15-creation-effects.test.mjs`
    - **Property 15: Creation effects occur at most once**
    - Generate repeated, concurrent, and out-of-order same-key request collections; assert at-most-one charge/compensation and exactly one audit.
    - **Validates: Requirements REQ-011.6, REQ-011.7, REQ-011.8, REQ-016.1, REQ-016.2, REQ-016.5**
    - _Requirements: REQ-011.6, REQ-011.7, REQ-011.8, REQ-016.1, REQ-016.2, REQ-016.5_

  - [~] 5.4 Add `test/properties/property-21-critical-unavailability.test.mjs`
    - **Property 21: Critical unavailability has one stable no-charge outcome**
    - Generate approved critical configuration/evidence unavailability snapshots; assert successful cancellation, zero degraded reason/mode, deterministic conclusion, and one audit.
    - **Validates: Requirements REQ-005.6, REQ-006.7, REQ-007.8, REQ-009.8, REQ-017.1, REQ-017.2, REQ-017.3, REQ-017.4, REQ-017.5, REQ-017.6**
    - _Requirements: REQ-005.6, REQ-006.7, REQ-007.8, REQ-009.8, REQ-017.1, REQ-017.2, REQ-017.3, REQ-017.4, REQ-017.5, REQ-017.6_

  - [~] 5.5 Add `test/properties/property-22-degraded-winner.test.mjs`
    - **Property 22: A degraded winner cannot become a later charge**
    - Generate degraded winners and arbitrary dependency-recovery retries; assert the same Decision remains and no passenger charge is recorded.
    - **Validates: Requirements REQ-017.7, REQ-017.8**
    - _Requirements: REQ-017.7, REQ-017.8_

  - [~] 5.6 Add degradation boundary tests in `test/boundaries/degradation.test.mjs`
    - Test unavailable Clock, driver acceptance, Map evidence, no-show evidence, and rule configuration; assert zero degraded Decisions and missing Rule Version/accepted time remain absent where appropriate.
    - Test normal zero and degraded Decisions never invoke Payment Fake and first-created degraded Decisions emit exactly one degraded audit.
    - _Requirements: REQ-005.6, REQ-006.7, REQ-007.8, REQ-009.8, REQ-016.2, REQ-017.1, REQ-017.2, REQ-017.3, REQ-017.4, REQ-017.5_

  - [~] 5.7 Add forced-race integration tests in `test/integration/same-key-race.test.mjs`
    - Coordinate promises/barriers to force same-key concurrent and out-of-order arrivals; assert one creation callback, one Decision, one audit, and at-most-one applicable charge/compensation.
    - Include competing initiators and later differing liability evidence; assert the server-first accepted initiator remains fixed independently.
    - _Requirements: REQ-008.2, REQ-008.3, REQ-008.4, REQ-008.5, REQ-011.3, REQ-011.4, REQ-011.5, REQ-011.6, REQ-011.7, REQ-011.8_

  - [~] 5.8 Add dependency-recovery integration tests in `test/integration/degraded-recovery.test.mjs`
    - Disable Map and Rule Configuration Fakes in separate cases, persist the degraded winner, restore dependencies, and retry the same canonical key.
    - Assert no re-evaluation, unchanged Decision, unchanged single audit, and no later charge.
    - _Requirements: REQ-006.7, REQ-009.8, REQ-017.1, REQ-017.2, REQ-017.5, REQ-017.7, REQ-017.8_

- [ ] 6. Implement historical replay, safe projections, reporting, and assembly
  - [~] 6.1 Implement `ExplanationService` in `packages/cancellation-demo/src/application/explanation-service.ts`
    - Call package-root `DecisionExplanationBuilder` with exactly reason, charge, and persisted Rule Version; map output field-by-field to the approved public shape.
    - Return explicit unavailable/validation status when any required input is missing and never read Fee Trace or raw evidence as fallback.
    - _Requirements: REQ-012.6, REQ-013.4, REQ-014.1, REQ-014.2, REQ-014.3, REQ-014.4, REQ-014.5_

  - [~] 6.2 Implement `SupportViewProjector` and Support Fake query wiring in `packages/cancellation-demo/src/application/support-view-projector.ts`
    - Construct the support view field-by-field from persisted Decision values and shared safe explanation; omit unavailable Rule Version/summary and optional compensation rather than infer them.
    - Exclude raw evidence, internal trace, risk/payment details, and object spreading from internal structures.
    - _Requirements: REQ-015.1, REQ-015.2, REQ-015.3, REQ-015.4, REQ-015.5, REQ-015.6_

  - [~] 6.3 Implement side-effect-free `ReplayService` in `packages/cancellation-demo/src/application/replay-service.ts`
    - Accept a caller-supplied complete immutable snapshot, exact configuration/version, and fixed Clock; reuse pure evaluators without writes, audit, synthetic actions, or current-config reads.
    - Compare only approved business-result fields and return explicit not-replayable status when historical input/version is missing.
    - _Requirements: REQ-012.5, REQ-012.6, REQ-012.7, REQ-012.8_

  - [~] 6.4 Implement `AcceptanceReportBuilder` in `packages/cancellation-demo/src/application/acceptance-report-builder.ts`
    - Allow only the ten approved pass categories, attach Requirement and Decision IDs, and use the exact header `Workshop synthetic/non-production`.
    - Label all eight external dependencies as Port + In-Memory Fake and every Fake success as synthetic/non-production; represent production goals, real integrations, complete edge coverage, performance/compliance, BLOCKED, and OUT_OF_SCOPE only as unaccepted/non-implementation boundaries.
    - _Requirements: REQ-001.4, REQ-003.7, REQ-009.7, REQ-011.9, REQ-015.6, REQ-018.1, REQ-018.2, REQ-018.3, REQ-018.4, REQ-018.5, REQ-018.6, REQ-018.7_

  - [~] 6.5 Implement `WorkshopAssembly` in `packages/cancellation-demo/src/workshop-assembly.ts`
    - Instantiate and wire all domain/application services with the eight in-memory external adapters, in-memory store/registry/audit, injected Clock, deterministic ID source, and package-root shared APIs.
    - Expose a testable assembly surface that cannot resolve network adapters, production stores, credentials, or deep shared-kit imports.
    - _Requirements: REQ-001.1, REQ-001.2, REQ-001.5, REQ-003.4, REQ-011.6, REQ-011.7, REQ-015.6, REQ-018.4_

- [ ] 7. Verify safe history, projections, audit, reporting, and assembly
  - [~] 7.1 Add `test/properties/property-01-output-allowlist.test.mjs`
    - **Property 1: Observable outputs are allowlisted**
    - Generate valid V1 executions and assert every ordinary observable key belongs to the approved decision/fee/explanation/idempotency/audit allowlists.
    - **Validates: Requirements REQ-001.3, REQ-004.6**
    - _Requirements: REQ-001.3, REQ-004.6_

  - [~] 7.2 Add `test/properties/property-16-replay-stability.test.mjs`
    - **Property 16: Decision snapshots and replay are stable**
    - Generate complete snapshots with fixed version/Clock, mutate current Fake configuration after persistence, and assert replay/business history and explanation remain unchanged.
    - **Validates: Requirements REQ-012.1, REQ-012.2, REQ-012.3, REQ-012.4, REQ-012.5, REQ-012.6, REQ-012.7**
    - _Requirements: REQ-012.1, REQ-012.2, REQ-012.3, REQ-012.4, REQ-012.5, REQ-012.6, REQ-012.7_

  - [~] 7.3 Add `test/properties/property-17-safe-explanations.test.mjs`
    - **Property 17: Public explanations are deterministic safe projections**
    - Generate persisted Decisions and unique sensitive sentinels; assert exact builder input/output fields, deterministic summary, and no trace/evidence leakage.
    - **Validates: Requirements REQ-013.4, REQ-014.1, REQ-014.2, REQ-014.3, REQ-014.4**
    - _Requirements: REQ-013.4, REQ-014.1, REQ-014.2, REQ-014.3, REQ-014.4_

  - [~] 7.4 Add `test/properties/property-18-trace-independence.test.mjs`
    - **Property 18: Fee Trace is evidence-independent**
    - Vary safety, accessibility, contact, location, risk, and payment sentinels while holding fee inputs fixed; assert identical trace and no sentinel keys/values.
    - **Validates: Requirements REQ-013.5, REQ-016.4**
    - _Requirements: REQ-013.5, REQ-016.4_

  - [~] 7.5 Add `test/properties/property-19-support-view.test.mjs`
    - **Property 19: Support View is an allowlisted safe projection**
    - Generate persisted Decisions with arbitrary internal evidence; assert key subset, omission semantics, shared summary, optional compensation handling, and no forbidden data.
    - **Validates: Requirements REQ-015.1, REQ-015.2, REQ-015.3, REQ-015.4, REQ-015.5**
    - _Requirements: REQ-015.1, REQ-015.2, REQ-015.3, REQ-015.4, REQ-015.5_

  - [~] 7.6 Add `test/properties/property-20-audit.test.mjs`
    - **Property 20: Audit Event is complete, minimal and unique**
    - Generate first-created normal/degraded Decisions plus retries; assert one exact-allowlist event, frozen matching values, absence semantics, and no sensitive trace data.
    - **Validates: Requirements REQ-016.1, REQ-016.2, REQ-016.3, REQ-016.4, REQ-016.5**
    - _Requirements: REQ-016.1, REQ-016.2, REQ-016.3, REQ-016.4, REQ-016.5_

  - [~] 7.7 Add `test/properties/property-23-acceptance-report.test.mjs`
    - **Property 23: Acceptance reports preserve scope and traceability**
    - Generate report items and boundaries; assert approved category allowlist, Requirement/Decision references, exact synthetic labels, and no boundary represented as implemented/accepted.
    - **Validates: Requirements REQ-001.4, REQ-003.7, REQ-009.7, REQ-011.9, REQ-015.6, REQ-018.1, REQ-018.2, REQ-018.3, REQ-018.4, REQ-018.5, REQ-018.6, REQ-018.7**
    - _Requirements: REQ-001.4, REQ-003.7, REQ-009.7, REQ-011.9, REQ-015.6, REQ-018.1, REQ-018.2, REQ-018.3, REQ-018.4, REQ-018.5, REQ-018.6, REQ-018.7_

  - [~] 7.8 Add focused projection/history tests in `test/boundaries/projection-history.test.mjs`
    - Assert missing reason/amount/version never falls back to trace; missing historical snapshot/version remains not replayable; current config never rewrites history.
    - Assert Support View behavior with driver compensation present and absent, omitted allowed fields, exact safe summary, and sensitive sentinel exclusion.
    - _Requirements: REQ-012.6, REQ-012.7, REQ-012.8, REQ-014.4, REQ-014.5, REQ-015.1, REQ-015.2, REQ-015.3, REQ-015.4, REQ-015.5_

  - [~] 7.9 Add assembly/report integration tests in `test/integration/assembly-report.test.mjs`
    - Assert all eight external ports report `IN_MEMORY_FAKE`, no network adapter is reachable, and Legacy results carry the unverified compatibility marker.
    - Assert exact report header/category/dependency/Fake-success labels and verify BLOCKED/OUT_OF_SCOPE identifiers appear only in the non-implementation boundary collection.
    - _Requirements: REQ-001.2, REQ-001.4, REQ-003.4, REQ-003.7, REQ-015.6, REQ-018.1, REQ-018.2, REQ-018.3, REQ-018.4, REQ-018.5, REQ-018.6, REQ-018.7_

- [ ] 8. Wire the runnable slice and complete non-watch validation
  - [~] 8.1 Add package exports and update `packages/cancellation-demo/src/demo.ts`
    - Create `src/index.ts` with the intended Workshop public surface and update the synthetic runner to execute representative Legacy, normal cancellation, no-show, strong-exemption, and degraded flows through `WorkshopAssembly`.
    - Emit only allowlisted synthetic/non-production results and acceptance labels; do not add production integrations or claims.
    - _Requirements: REQ-001.1, REQ-001.3, REQ-003.4, REQ-009.7, REQ-011.9, REQ-017.1, REQ-018.3, REQ-018.5, REQ-018.6_

  - [~] 8.2 Add end-to-end in-memory integration tests in `test/integration/workshop-flows.test.mjs`
    - Exercise routed Legacy, free-window cancellation, paid cancellation, verified no-show, all strong exemptions, and degraded cancellation through the assembled package.
    - Assert persisted Decision/history, safe explanation/support, one audit, applicable synthetic effects, deterministic replay, report traceability, and no external I/O for each representative flow.
    - _Requirements: REQ-001.1, REQ-001.2, REQ-002.5, REQ-003.4, REQ-005.2, REQ-006.1, REQ-007.1, REQ-009.1, REQ-010.8, REQ-011.8, REQ-012.5, REQ-014.2, REQ-015.1, REQ-016.1, REQ-017.2, REQ-018.2_

  - [~] 8.3 Run final non-watch workspace validation and resolve only in-scope failures
    - Run `npm run build && npm run test --workspace @workshop/cancellation-demo && npm run check` from the workspace root.
    - Confirm all 23 tagged property tests execute at least 100 deterministic cases, all focused boundary/integration tests pass, TypeScript emits no errors, and no test dependency or deep shared-kit import was added.
    - _Requirements: REQ-001.1, REQ-001.2, REQ-001.3, REQ-001.4, REQ-001.5, REQ-002.1, REQ-003.1, REQ-004.1, REQ-005.1, REQ-006.1, REQ-007.1, REQ-008.1, REQ-009.1, REQ-010.1, REQ-011.1, REQ-012.1, REQ-013.1, REQ-014.1, REQ-015.1, REQ-016.1, REQ-017.1, REQ-018.1_

## Notes

- All implementation and automated test tasks are required. Automated tests use only built-in `node:test`/`node:assert` plus repository deterministic generators.
- Implementation is confined to `packages/cancellation-demo`; `packages/company-policy-kit`, `team-templates`, enterprise knowledge, `requirements.md`, and `design.md` remain read-only.
- Package-root shared APIs own money construction/calculation, canonical key construction, and explanation text. Product code must not recreate those capabilities.
- BLOCKED (`BLK-001`–`BLK-015`) and OUT_OF_SCOPE (`OOS-001`–`OOS-005`) items authorize no implementation, integration, default, threshold, acceptance claim, or test beyond verifying their exclusion from accepted scope.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "4.1", "4.2", "4.3"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12", "3.13", "4.4"] },
    { "id": 5, "tasks": ["4.5"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "6.1", "6.3", "6.4"] },
    { "id": 7, "tasks": ["6.2"] },
    { "id": 8, "tasks": ["6.5"] },
    { "id": 9, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9"] },
    { "id": 10, "tasks": ["8.1"] },
    { "id": 11, "tasks": ["8.2"] },
    { "id": 12, "tasks": ["8.3"] }
  ]
}
```

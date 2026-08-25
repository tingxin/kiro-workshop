# Technical Design Document

> **材料类型：Workshop 固定输入，学员无需重新生成**  
> **状态：Workshop synthetic/non-production**  
> **Feature:** `cancellation-no-show-fee-system`  
> **Workflow:** 预置 Requirements + Design；Tasks 由学员生成  
> **实现范围：**仅以 `requirements.md` 的 REQ-001 至 REQ-018 为实现授权。本文不把任何 BLOCKED 或 OUT_OF_SCOPE 条目转换为组件行为、默认值、阈值、外部集成或生产承诺。

## Overview

本设计采用 TypeScript ESM 和六边形架构，在 `packages/cancellation-demo` 内实现一个纯内存 Workshop V1 教学切片。应用核心负责路由、规则判定、版本化费用输入选择、Decision 固化、幂等、解释和审计；所有外部能力仅通过 Port 表达，并且 Workshop 装配只能使用 In-Memory Fake。

设计的核心约束是：

1. 只处理实时 `EXPRESS`、`PREMIUM`、`BUSINESS`；其他订单交给 `LegacyPort` 的 Fake，不能推断真实 legacy 行为。
2. 所有规则都从一个不可变输入快照计算；相同快照、规则版本和 Clock 产生相同业务结果。
3. 同一 `(orderId, chargeType)` 只能通过共享 `buildDecisionIdempotencyKey` 生成规范键，并通过原子 first-write-wins 形成一个 Decision。
4. 金额、幂等键和公开解释的共享逻辑只能从 `@company/cancellation-policy-kit` 包根复用，不在应用侧复制。
5. 规则配置或关键证据不可用时，取消仍成功，固化零费用 `DEGRADED_NO_CHARGE` Decision；依赖恢复不得追扣。
6. 所有普通输出均由显式字段 allowlist 投影，不允许把内部 trace 或原始敏感证据回退为解释。

## 2. Goals and Non-Goals

### 2.1 Goals

- 精确实现已批准的路由、优先级、免费窗口、验证到达、爽约和费用选择规则。
- 通过纯函数/无副作用领域组件使规则可确定性重放和属性测试。
- 通过 per-key 串行化和 Decision Store 原子 first-write-wins 处理重复、并发和乱序请求。
- 对正常和降级 Decision 各只记录一条最小、安全的审计事件。
- 为用户/普通客服生成稳定、脱敏、版本化解释，并提供严格字段受限的 Support View。
- 生成明确标注合成、非生产、Fake 结果和未验收边界的 Acceptance Report。

### 2.2 Non-Goals

- 不连接真实地图、支付、收费、补偿、结算、通知、客服、风控、配置或 legacy 系统。
- 不实现真实退款、追偿、到账、通知送达、RBAC、风控、运营后台、生产 UI、部署、灰度或迁移。
- 不补充生产金额、地区法律、外部契约、SLA、性能指标、容量、合规或未批准责任映射。
- 不为历史缺失数据推断规则版本、输入快照或解释。
- 不修改 `@company/cancellation-policy-kit`，不复制其算法。

## Architecture

```mermaid
flowchart LR
    Caller[Workshop caller] --> Router[V1Router]
    Router -->|eligible| Service[DecisionService]
    Router -->|not eligible / unknown| Legacy[LegacyPort InMemoryFake]

    Service --> Gate[Per-key Decision Gate]
    Gate --> Store[DecisionStore InMemory First-Write-Wins]
    Gate --> Engine[DecisionEngine]
    Engine --> Arrival[ArrivalEvaluator]
    Engine --> NoShow[NoShowEvaluator]
    Engine --> FeeSelector[FeeInputSelector]
    Engine --> FeeAdapter[FeeCalculatorAdapter]
    Engine --> Degrade[DegradationHandler]

    Arrival --> Map[MapPort InMemoryFake]
    FeeSelector --> Rules[RuleRepositoryConfigurationPort InMemoryFake]
    FeeAdapter --> Kit[@company/cancellation-policy-kit]

    Gate --> Audit[AuditRecorder InMemory]
    Gate --> Payment[PaymentChargePort InMemoryFake]
    Gate --> Compensation[CompensationSettlementPort InMemoryFake]

    Store --> Explanation[ExplanationService]
    Explanation --> Kit
    Store --> Support[SupportPort InMemoryFake]
    Support --> Explanation
    Store --> Report[AcceptanceReportBuilder]

    Service -. declared boundary only .-> Notification[NotificationPort InMemoryFake]
    Service -. declared boundary only .-> Risk[RiskPort InMemoryFake]
```

### 3.1 Layering

| Layer | Responsibility | Dependency rule |
|---|---|---|
| Domain | Immutable inputs/results; priority, arrival, no-show and routing predicates | No adapters, no I/O, no current time reads |
| Application | Decision orchestration, idempotency gate, degradation, replay, projections | Depends on domain and Port interfaces |
| Ports | Required external capability contracts and in-memory persistence contracts | No concrete adapter references |
| Adapters | In-memory Fakes, injectable Clock, deterministic ID source | Workshop assembly selects only these adapters |
| Shared kit | Money, calculator, canonical key and explanation builder | Imported only from package root |

### 3.2 Component Responsibilities

| Component | Responsibility | Must not do |
|---|---|---|
| `WorkshopAssembly` | Construct all services and bind every declared Port to an In-Memory Fake | Resolve network clients, credentials, production stores or deep kit imports |
| `V1Router` | Route only realtime whitelisted service types to V1; all others to Legacy Fake | Infer fees or real legacy behavior |
| `DecisionService` | Validate command shape, record server acceptance, build canonical key, serialize same-key work, return winner | Implement fee arithmetic or explanation text |
| `CancelInitiatorRegistry` | First-write-wins per `orderId` for first server-accepted requester and accepted UTC time | Infer liability |
| `DecisionEngine` | Apply candidate priority and produce a normal decision draft from an immutable snapshot | Persist, call payment, or expose raw evidence |
| `ArrivalEvaluator` | Return true iff Map Fake evidence is `distance <= 200m` continuously for `>= 30s` | Use driver-click, route, ETA, direction or unstated map fields |
| `NoShowEvaluator` | Require verified arrival and either explicit refusal, or wait `>= 5min` plus contact attempt | Bypass verified arrival |
| `FeeInputSelector` | Read one versioned config result and select the approved table entry plus that same `ruleVersion` | Hard-code a use-case fallback or calculate final fee |
| `FeeCalculatorAdapter` | Pass approved inputs unchanged to `CappedFeeCalculator` and return charge/trace unchanged | Reimplement multiplication, rounding, discount, clamp or cap |
| `DegradationHandler` | Build cancellation-success, zero-charge, `DEGRADED_NO_CHARGE` draft on approved critical dependency/evidence failure | Retry into a later charge or invent other fallbacks |
| `DecisionStore` | Atomic first-write-wins `createOrGet`; return `{decision, created}` | Use check-then-unconditional-insert |
| `DecisionCommitCoordinator` | Under a per-key gate: create/get Decision, and only for `created=true` emit one audit and at most one applicable fake action | Emit effects for duplicate callers |
| `AuditRecorder` | Store exactly the approved audit fields once per Decision | Store forbidden evidence or audit duplicate reads |
| `ExplanationService` | Pass only reason, amount and version to `DecisionExplanationBuilder`; return allowed fields | Use Fee Trace or raw evidence as fallback text |
| `SupportViewProjector` | Produce an allowlisted ordinary-support projection and shared safe summary | Implement RBAC or expose forbidden data |
| `ReplayService` | Re-evaluate a caller-supplied complete snapshot with fixed Clock/config version, without side effects | Read current config to fill historical gaps |
| `AcceptanceReportBuilder` | Report approved categories, trace IDs and synthetic/Fake limitations | Claim production acceptance or convert boundaries to pass items |

## 4. Approved Shared API Reuse

All imports use the package root. Application code must not deep-import kit modules or define substitutes for these capabilities.

```ts
import {
  CappedFeeCalculator,
  DecisionExplanationBuilder,
  buildDecisionIdempotencyKey,
  moneyMinor,
  type ChargeType,
  type FeeCalculationTrace,
  type MoneyMinor,
  type PublicReasonCode,
} from "@company/cancellation-policy-kit";
```

Usage rules:

- `moneyMinor(value)` is the only constructor for application Money values; negative, fractional, `NaN`, infinite and unsafe integer values are rejected.
- `CappedFeeCalculator.calculate(input)` owns basis-point adjustment, integer rounding, discount, non-negative clamp and estimated-fare cap. `FeeCalculatorAdapter` is transparent delegation.
- `buildDecisionIdempotencyKey(orderId, chargeType)` is the only key builder. Application code never formats or normalizes the key independently.
- `DecisionExplanationBuilder.build({ reasonCode, charge, ruleVersion })` is the only summary builder. Raw evidence and Fee Trace cannot enter its input type.

## Data Models

The following signatures are design contracts. Naming may be split across source files during implementation, but semantics and allowlists are fixed.

### 5.1 Domain Types

```ts
import type {
  ChargeType,
  FeeCalculationTrace,
  MoneyMinor,
  PublicReasonCode,
} from "@company/cancellation-policy-kit";

type ServiceType = "EXPRESS" | "PREMIUM" | "BUSINESS";
type RouteTarget = "WORKSHOP_V1" | "LEGACY_FAKE";
type Party = "PASSENGER" | "DRIVER";

type ConfirmedExemption =
  | "LEGAL"
  | "SAFETY"
  | "ACCESSIBILITY"
  | "PLATFORM_FAILURE"
  | "CRITICAL_DEPENDENCY_FAILURE"
  | "DRIVER_RESPONSIBILITY_CONFIRMED";

type Availability<T> =
  | { readonly status: "AVAILABLE"; readonly value: T }
  | { readonly status: "UNAVAILABLE" };

interface CancellationCommand {
  readonly orderId: string;
  readonly chargeType: ChargeType;
  readonly requester: Party;
  readonly requestedAtUtc: string;
  readonly isRealtime: boolean;
  readonly serviceType: string;
  readonly driverAcceptedAtUtc?: string;
  readonly confirmedExemption?: ConfirmedExemption;
  readonly unverifiedStatement?: string;
  readonly confirmedLiableParty?: Party;
  readonly estimatedTripFare?: MoneyMinor;
  readonly adjustmentBasisPoints?: number;
  readonly discount?: MoneyMinor;
  readonly noShowEvidence?: Availability<NoShowEvidence>;
}

interface NoShowEvidence {
  readonly waitedAfterVerifiedArrivalSeconds: number;
  readonly inPlatformContactAttempts: number;
  readonly inPlatformExplicitRefusal: boolean;
}

interface MapArrivalEvidence {
  readonly distanceToPickupMeters: number;
  readonly continuouslyWithinThresholdSeconds: number;
}

interface RuleConfigurationSnapshot {
  readonly ruleVersion: string;
  readonly baseFees: Readonly<{
    EXPRESS: Readonly<{ CANCELLATION_FEE: MoneyMinor; NO_SHOW_FEE: MoneyMinor }>;
    PREMIUM: Readonly<{ CANCELLATION_FEE: MoneyMinor; NO_SHOW_FEE: MoneyMinor }>;
    BUSINESS: Readonly<{ CANCELLATION_FEE: MoneyMinor; NO_SHOW_FEE: MoneyMinor }>;
  }>;
}
```

`serviceType` remains a string at the input boundary so unknown values can deterministically route to Legacy Fake; it is narrowed to `ServiceType` only after whitelist validation. The approved Fake configuration contains 500/800 for EXPRESS and 800/1200 for PREMIUM/BUSINESS, with all values constructed by `moneyMinor`.

### 5.2 Decision and Audit

```ts
interface DecisionBase {
  readonly decisionId: string;
  readonly decisionIdempotencyKey: string;
  readonly orderId: string;
  readonly chargeType: ChargeType;
  readonly cancelInitiator: Party;
  readonly liableParty?: Party;
  readonly charge: MoneyMinor;
  readonly driverCompensation?: MoneyMinor;
  readonly publicReasonCode: PublicReasonCode;
  readonly feeTrace?: FeeCalculationTrace;
}

type Decision = DecisionBase &
  (
    | { readonly processingMode: "NORMAL"; readonly ruleVersion: string }
    | { readonly processingMode: "DEGRADED"; readonly ruleVersion?: string }
  );

interface DecisionAuditEvent {
  readonly decisionId: string;
  readonly decisionIdempotencyKey: string;
  readonly orderId: string;
  readonly ruleVersion?: string;
  readonly requestedAtUtc: string;
  readonly acceptedAtUtc?: string;
  readonly confirmedExemption?: ConfirmedExemption;
  readonly feeTrace?: FeeCalculationTrace;
  readonly publicReasonCode: PublicReasonCode;
  readonly finalAmount: MoneyMinor;
  readonly processingMode: "NORMAL" | "DEGRADED";
}
```

`Decision` does not persist raw evidence. A normal Decision always freezes the selected Rule Version. A degraded Decision freezes it when it was available before the failure; if Rule Configuration itself is unavailable, the field remains absent rather than inventing a fallback version, and explanation/replay follows the required unavailable path. `DecisionAuditEvent` has exactly the REQ-016 allowlist; no generic metadata bag is allowed. `FeeCalculationTrace` is the shared non-sensitive trace and cannot be extended with phone, location, safety, risk or payment evidence.

### 5.3 Public and Support Projections

```ts
interface PublicExplanation {
  readonly publicReasonCode: PublicReasonCode;
  readonly charge: MoneyMinor;
  readonly ruleVersion: string;
  readonly summary: string;
}

interface SupportView {
  readonly decisionId: string;
  readonly orderId: string;
  readonly cancelInitiator: Party;
  readonly liableParty?: Party;
  readonly chargedAmount: MoneyMinor;
  readonly driverCompensation?: MoneyMinor;
  readonly publicReasonCode: PublicReasonCode;
  readonly ruleVersion?: string;
  readonly summary?: string;
}
```

A successful `PublicExplanation` exists only when reason, charge and Rule Version are all present. `SupportView` omits unavailable Rule Version and summary together; it never substitutes internal data. Projection construction is explicit; object spreading from command, evidence, Decision internals or audit records is prohibited.

## Components and Interfaces

The Port interfaces below preserve the component boundaries defined in the architecture and have only In-Memory Fake implementations in Workshop V1.

```ts
interface MapPort {
  getArrivalEvidence(orderId: string): Promise<Availability<MapArrivalEvidence>>;
}

interface PaymentChargePort {
  recordSyntheticCharge(input: {
    decisionIdempotencyKey: string;
    decisionId: string;
    amount: MoneyMinor;
  }): Promise<{ readonly status: "SYNTHETIC_SUCCESS" | "UNAVAILABLE" }>;
}

interface CompensationSettlementPort {
  recordSyntheticCompensation(input: {
    decisionIdempotencyKey: string;
    decisionId: string;
    amount: MoneyMinor;
  }): Promise<{ readonly status: "SYNTHETIC_SUCCESS" | "UNAVAILABLE" }>;
}

interface NotificationPort {
  readonly adapterKind: "IN_MEMORY_FAKE";
}

interface RiskPort {
  readonly adapterKind: "IN_MEMORY_FAKE";
}

interface RuleRepositoryConfigurationPort {
  getSnapshot(): Promise<Availability<RuleConfigurationSnapshot>>;
}

interface LegacyPort {
  route(command: CancellationCommand): Promise<{
    readonly publicReasonCode: "LEGACY_FLOW";
    readonly compatibility: "UNVERIFIED_REAL_LEGACY_COMPATIBILITY";
  }>;
}

interface SupportPort {
  getDecisionView(decisionId: string): Promise<SupportView | undefined>;
}

interface DecisionStore {
  createOrGet(
    key: string,
    create: () => Promise<Decision>,
  ): Promise<{ readonly decision: Decision; readonly created: boolean }>;
}

interface Clock {
  nowUtc(): Availability<string>;
}
```

All eight named external ports are bound to In-Memory Fakes. `DecisionStore`, `CancelInitiatorRegistry`, `AuditRecorder`, Clock and ID source are also in-memory/injectable Workshop infrastructure; they introduce no real persistence or external integration.

## 6. Decision and Routing Flow

### 6.1 Entry Routing

```text
if isRealtime AND serviceType in {EXPRESS, PREMIUM, BUSINESS}
  -> WORKSHOP_V1
else
  -> LegacyPort InMemoryFake
```

Unknown service types follow the `else` branch. Legacy output is labeled `LEGACY_FLOW` and `UNVERIFIED_REAL_LEGACY_COMPATIBILITY`; no V1 fee evaluation occurs.

### 6.2 V1 Processing Sequence

1. Validate structural command fields and narrow approved enums. Unknown service type has already routed to Legacy; invalid Money/BPS values are rejected, never coerced.
2. Read `acceptedAtUtc` from the injected Clock. If the Clock is unavailable, continue through the approved degraded path without inventing an acceptance timestamp; `CancelInitiatorRegistry.createOrGet(orderId, requester, acceptedAtUtc?)` still fixes the first accepted requester independently from liability.
3. Build the only Decision key with `buildDecisionIdempotencyKey(orderId, chargeType)`.
4. Enter a per-key asynchronous gate. Call `DecisionStore.createOrGet(key, create)`; there is no check-then-insert path.
5. If an existing Decision wins, return it without re-evaluating current configuration, writing audit, or recording charge/compensation actions.
6. For a new Decision, capture required evidence/config once. The resulting immutable evaluation snapshot is not refreshed midway through evaluation.
7. If approved critical configuration/evidence is unavailable, use `DegradationHandler`; otherwise apply the rule priority and fee path.
8. Freeze `ruleVersion`, public reason, final amount and safe Fee Trace into the Decision.
9. Only the caller receiving `created=true` records exactly one audit event and at most one applicable synthetic payment/compensation action before releasing the per-key gate.
10. Build public/support outputs from the persisted Decision, never from current configuration or raw command evidence.

The in-memory gate and atomic store model correctness under Workshop concurrency; they do not claim production distributed transaction or durability semantics.

### 6.3 Rule Priority

`DecisionEngine` models candidates with an explicit rank; selection is the candidate with the smallest rank. Adding a lower-priority candidate cannot change an already selected higher-priority result.

| Rank | Candidate | Outcome |
|---:|---|---|
| 1 | Confirmed `LEGAL` | zero / `STRONG_EXEMPTION` |
| 2 | Confirmed `SAFETY` | zero / `STRONG_EXEMPTION` |
| 3 | Confirmed `ACCESSIBILITY` | zero / `STRONG_EXEMPTION` |
| 4 | Confirmed `PLATFORM_FAILURE` or `CRITICAL_DEPENDENCY_FAILURE`; or approved critical dependency unavailable | confirmed category: strong exemption; unavailable dependency: degraded zero charge |
| 5 | Confirmed `DRIVER_RESPONSIBILITY_CONFIRMED` | zero / `STRONG_EXEMPTION` |
| 6 | Verified passenger no-show | versioned no-show fee / `PASSENGER_NO_SHOW_FEE` |
| 7 | Ordinary passenger cancellation | free-window result or versioned cancellation fee |
| 8 | Approved basis-point adjustment and discount | amount inputs only; cannot create eligibility |
| 9 | Non-negative and estimated-fare cap | delegated to shared calculator |

Strong exemption selection ends fee eligibility evaluation but still creates a versioned, explainable and audited Decision. An `unverifiedStatement` is carried only as untrusted command context; it cannot create a candidate, establish liability, enter a projection, or enter audit.

### 6.4 Free Cancellation

The engine compares server UTC instants using the injected Clock/input snapshot. For valid cancellation times at or after driver acceptance:

```text
elapsedSeconds <= 120 -> charge 0, FREE_CANCELLATION_WINDOW
elapsedSeconds > 120  -> continue approved ordinary-cancellation evaluation
```

The boundary is inclusive: 119 and 120 seconds are free; 121 seconds is not automatically free. Missing driver acceptance time or Clock availability invokes approved degradation rather than guessing time.

### 6.5 Verified Arrival and No-Show

```text
verifiedArrival =
  distanceToPickupMeters <= 200
  AND continuouslyWithinThresholdSeconds >= 30

passengerNoShowEligible =
  verifiedArrival
  AND noShowEvidence.status == AVAILABLE
  AND (
    noShowEvidence.value.inPlatformExplicitRefusal
    OR (
      noShowEvidence.value.waitedAfterVerifiedArrivalSeconds >= 300
      AND noShowEvidence.value.inPlatformContactAttempts >= 1
    )
  )
```

Only the two Map Fake fields feed `ArrivalEvaluator`; a driver click alone cannot establish arrival. `noShowEvidence` is an immutable snapshot supplied by the approved upstream evidence process, not a passenger or driver free-text claim. Explicit refusal skips remaining wait/contact requirements but never verified arrival. If map or no-show evidence is missing or `UNAVAILABLE` when required, the request follows approved degradation rather than treating missing evidence as false.

### 6.6 Versioned Fee Selection and Calculation

`FeeInputSelector` reads one `RuleConfigurationSnapshot`, then returns its `ruleVersion` with exactly one table cell:

| Service | `CANCELLATION_FEE` | `NO_SHOW_FEE` |
|---|---:|---:|
| EXPRESS | 500 | 800 |
| PREMIUM | 800 | 1200 |
| BUSINESS | 800 | 1200 |

Values are synthetic minor units constructed with `moneyMinor`; the use case has no fallback constants. The adapter delegates unchanged values:

```ts
const result = calculator.calculate({
  baseFee,
  estimatedTripFare,
  adjustmentBasisPoints,
  discount,
});
return result; // charge and trace unchanged
```

This guarantees shared ownership of rounding and `0 <= charge <= estimatedTripFare`.

## 7. Idempotency, Concurrency, and Effects

### 7.1 First-Write-Wins Contract

`DecisionStore.createOrGet` performs one atomic operation per canonical key. The in-memory implementation maintains a per-key pending promise/mutex so only one creation callback can run to completion; waiting calls receive the same stored Decision with `created=false`.

Required invariants for any arrival order or concurrency schedule:

- at most one Decision per canonical key;
- every response for that key returns the winning Decision;
- exactly one audit event for the winning Decision;
- at most one successful synthetic payment action and at most one successful synthetic compensation action;
- duplicate callers never trigger creation effects;
- the first server-accepted cancel initiator remains fixed even when later liability evidence differs.

Payment and compensation are Workshop records only. A zero-charge or degraded Decision records no passenger charge. No real payment/refund/settlement semantics are inferred.

### 7.2 Degraded Winner

A Degraded Decision is a normal first-write-wins value. After a dependency recovers, a retry with the same canonical key returns that existing Decision; it does not re-run fee selection and cannot record a later passenger charge. A different key is a distinct business request only according to the shared `(orderId, chargeType)` contract; no extra key dimensions are introduced.

## 8. Deterministic Replay and Historical Stability

`ReplayService` accepts a complete, caller-supplied immutable evaluation snapshot, exact `RuleConfigurationSnapshot`/`ruleVersion`, and fixed Clock. It invokes the same pure evaluators but performs no store writes, audit, payment, compensation, notification or report mutation.

Replay equality applies to business result fields: charge type, initiator, liable party, charge, public reason, rule version, safe Fee Trace and processing mode. Generated `decisionId` and acceptance-side effects are outside replay comparison.

Historical reads and explanations use only the persisted Decision. Changing the current Rule Fake cannot replace its version, reason, amount or trace. If the historical input snapshot or historical rule version is missing, replay returns an explicit unavailable/not-replayable result; it must not infer data from current configuration.

## Error Handling

| Condition | Handling |
|---|---|
| Rule Configuration Fake unavailable | Cancellation succeeds; persist zero `DEGRADED_NO_CHARGE`, mode `DEGRADED`, one audit |
| Required map/wait/contact/time evidence unavailable | Same approved degraded outcome |
| Same degraded key retried after recovery | Return prior Decision; no re-evaluation and no passenger charge |
| Unknown service type/non-whitelist order | Route to Legacy Fake; do not apply V1 |
| Negative/fractional/non-finite/unsafe Money input | `moneyMinor` rejects; never coerce |
| Negative/non-integer/unsafe basis points | shared calculator rejects; never coerce |
| Missing reason/amount/version for explanation | Return validation/unavailable result; never use Fee Trace fallback |
| Unavailable noncritical/declarative Fake | Mark unavailable and do not assume success or invent behavior; only requirements-approved degradation may run |
| Existing Decision | Return it with no new audit or synthetic action |

Structural request validation happens before a business Decision is accepted when required identity/type fields are malformed. Requirements-defined post-acceptance critical dependency failures use degradation. No retries, timeouts, numeric limits, SLAs or production recovery policy are added by this design.

## 10. Privacy and Security Boundaries

### 10.1 Data Classification

- **Allowed Decision/audit data:** only fields explicitly listed in Sections 5.2 and 5.3.
- **Sensitive evidence:** phone/contact content, exact coordinates, full safety narratives, accessibility-sensitive details, risk scores/thresholds, payment credentials and any other raw evidence not allowed by requirements.
- **Unverified statements:** untrusted, non-evidentiary input; not persisted in Decision/audit or returned in ordinary views.

### 10.2 Enforcement

1. Public and support projections construct new objects field-by-field from persisted Decision values.
2. `DecisionExplanationBuilder` receives exactly `{reasonCode, charge, ruleVersion}`.
3. `FeeCalculationTrace` is used unchanged from the shared calculator and cannot carry domain evidence.
4. No generic `metadata`, `context`, raw command, exception dump or object spread enters Decision, audit, public explanation or Support View.
5. In-Memory Fakes hold synthetic test values only. This design does not claim production authorization, privacy governance or RBAC.

## 11. Audit and Acceptance Reporting

### 11.1 Audit

For the first persisted normal or degraded Decision, `AuditRecorder` writes exactly one `DecisionAuditEvent`. It uses the requested timestamp, the accepted timestamp when Clock supplied one, and frozen Decision values; it never invents a missing timestamp or Rule Version. Duplicate reads/requests do not append events. Audit trace is the shared safe Fee Trace or absent for non-calculated zero outcomes; it is never synthesized from sensitive evidence.

### 11.2 Acceptance Report

Each pass item is represented as:

```ts
interface AcceptancePassItem {
  readonly category:
    | "ORDER_SCOPE"
    | "FREE_WINDOW"
    | "STRONG_EXEMPTION"
    | "VERIFIED_ARRIVAL"
    | "NO_SHOW_ELIGIBILITY"
    | "FEE_INVARIANT"
    | "IDEMPOTENCY"
    | "DEGRADATION"
    | "EXPLANATION"
    | "AUDIT";
  readonly requirementId: `REQ-${string}`;
  readonly decisionId: `DEC-${string}`;
  readonly resultKind: "WORKSHOP_SYNTHETIC_NON_PRODUCTION";
}
```

The report header contains the exact marker `Workshop synthetic/non-production`. It identifies Map, Payment/Charge, Compensation/Settlement, Notification, Support, Risk, RuleRepository/Configuration and Legacy as Port + In-Memory Fake. Every successful Fake result is labeled synthetic/non-production. Production goals, real integrations, all edge cases, production performance and production compliance remain unaccepted. BLOCKED and OUT_OF_SCOPE entries are listed only as non-implementation boundaries.

## Correctness Properties

*A property is a behavior that must hold for all valid generated inputs. The properties below consolidate overlapping acceptance criteria so each remaining property adds unique validation value. UI, fixed wiring, external-Fake behavior and named boundary examples remain smoke, example or integration tests rather than artificial PBT properties.*

### Property 1: Observable outputs are allowlisted

For all valid V1 executions, every ordinary observable output field belongs to the approved decision, versioned fee input, fee result, public explanation, idempotency status or audit result allowlist, and no other internal field is exposed.

**Validates: Requirements 001.3, 004.6**

### Property 2: Priority selection is deterministic and monotonic

For any nonempty set of approved rule candidates, the engine selects the candidate with the highest approved priority; repeated evaluation selects the same result, and adding only lower-priority candidates does not change it.

**Validates: Requirements 002.1, 002.2, 002.3, 002.4**

### Property 3: Strong exemptions short-circuit to a complete zero Decision

For all approved Strong Exemption categories and any lower-priority charging inputs, evaluation produces a zero-charge versioned Decision with `STRONG_EXEMPTION`, does not evaluate fee eligibility, and the first persisted Decision has one audit event.

**Validates: Requirements 002.5, 002.6, 002.7, 004.1, 004.3, 013.1, 013.2, 013.3**

### Property 4: Unapproved exemption values and unverified statements are non-influential

For any exemption value outside the approved Strong Exemption set and any unverified statement text, a request without matching confirmed evidence does not create a Strong Exemption, change charge eligibility, establish Liable Party, or alter ordinary output.

**Validates: Requirements 002.8, 004.2, 004.4, 004.5, 008.6**

### Property 5: Routing equals the whitelist predicate

For all order attributes and service-type strings, routing selects Workshop V1 if and only if the order is realtime and the service type is `EXPRESS`, `PREMIUM` or `BUSINESS`; otherwise it selects Legacy Fake, and identical inputs always select the same target.

**Validates: Requirements 003.1, 003.2, 003.3, 003.4, 003.5, 003.6**

### Property 6: Free-window classification uses an inclusive 120-second boundary

For any valid server UTC acceptance/cancellation pair with nonnegative elapsed time, elapsed time at or below 120 seconds produces zero charge with `FREE_CANCELLATION_WINDOW`, while elapsed time above 120 seconds excludes that reason and continues approved lower-priority evaluation; identical times give identical results.

**Validates: Requirements 005.1, 005.2, 005.3, 005.4, 005.5**

### Property 7: Verified arrival is exactly the approved Map predicate

For all available Map evidence, Verified Arrival is true if and only if distance is no more than 200 meters and continuous qualifying duration is at least 30 seconds; unrelated input and driver-click state cannot change the result, and repeated evaluation is deterministic.

**Validates: Requirements 006.1, 006.2, 006.3, 006.4, 006.5, 006.6**

### Property 8: No-show eligibility is exactly the approved conjunction

For all available no-show evidence, eligibility is true if and only if arrival is verified and either an in-platform explicit refusal exists or waiting is at least 300 seconds with at least one in-platform contact attempt; explicit refusal cannot bypass verified arrival, and repeated evaluation is deterministic.

**Validates: Requirements 007.1, 007.2, 007.3, 007.4, 007.5, 007.6, 007.7**

### Property 9: Initiator is first-accepted and independent from liability

For any nonempty sequence of accepted cancellation requests for an order, Cancel Initiator equals the server-first accepted requester and remains unchanged when requests are appended or confirmed liability evidence changes; Liable Party may independently differ.

**Validates: Requirements 008.1, 008.2, 008.4, 008.5**

### Property 10: Fee selection is a deterministic snapshot lookup

For all approved Service Type and Charge Type combinations in a valid configuration snapshot, selection returns exactly that snapshot's approved table cell and the same snapshot's Rule Version; identical snapshot inputs return identical output.

**Validates: Requirements 009.1, 009.2, 009.3, 009.4, 009.5**

### Property 11: Invalid numeric policy inputs are rejected

For any number that is negative, fractional, non-finite or not a safe integer, `moneyMinor` rejects it as Money; for any negative, fractional or unsafe basis-point value, `CappedFeeCalculator` rejects it rather than coercing it.

**Validates: Requirements 009.6, 010.9**

### Property 12: Fee adapter is transparent

For all valid fee input tuples and calculator results, `FeeCalculatorAdapter` passes base fee, adjustment, discount and estimate unchanged to `CappedFeeCalculator` and returns its charge and Fee Trace unchanged.

**Validates: Requirements 010.1, 010.2, 010.3, 010.4**

### Property 13: Calculated charge obeys shared amount invariants

For all valid calculator inputs, final charge is an integer MoneyMinor satisfying `0 <= charge <= estimatedTripFare`; if the post-discount amount exceeds the estimate it equals the estimate, if discount exceeds adjusted amount it is zero, and if estimate is zero it is zero.

**Validates: Requirements 010.5, 010.6, 010.7, 010.8**

### Property 14: Canonical key and first-write-wins are idempotent

For any valid Order ID, Charge Type and nonempty sequence or permutation of candidate Decisions, the service key equals `buildDecisionIdempotencyKey(orderId, chargeType)`, exactly one first-accepted Decision is stored, and every later result for the key equals that winner.

**Validates: Requirements 011.1, 011.2, 011.3, 011.4, 011.5**

### Property 15: Creation effects occur at most once

For any repeated, concurrent or out-of-order request collection sharing a canonical key, the In-Memory Payment Fake and Compensation Fake each record at most one applicable successful synthetic action, and Audit Recorder contains exactly one event for the winning Decision.

**Validates: Requirements 011.6, 011.7, 011.8, 016.1, 016.2, 016.5**

### Property 16: Decision snapshots and replay are stable

For all complete valid input snapshots, fixed Rule Version and fixed Clock, a new Decision freezes Rule Version, reason, amount and safe Fee Trace; replay produces the same business result, and arbitrary current-config changes cannot mutate the historical Decision or explanation.

**Validates: Requirements 012.1, 012.2, 012.3, 012.4, 012.5, 012.6, 012.7**

### Property 17: Public explanations are deterministic safe projections

For all valid persisted Decisions and arbitrary internal sensitive evidence, Explanation Service passes exactly reason, charge and version to the shared builder; output has exactly reason, charge, version and summary, identical inputs give identical summaries, and no sensitive evidence or Fee Trace appears.

**Validates: Requirements 013.4, 014.1, 014.2, 014.3, 014.4**

### Property 18: Fee Trace is evidence-independent

For all valid fee calculations and arbitrary safety, accessibility, contact, location, risk or payment evidence, the returned Fee Trace depends only on calculator fee inputs and contains none of that evidence.

**Validates: Requirements 013.5, 016.4**

### Property 19: Support View is an allowlisted safe projection

For all persisted Decisions and arbitrary internal evidence, Support View keys are a subset of the approved allowlist, absent allowed values remain absent rather than inferred, the summary comes from the shared explanation builder, and no forbidden evidence appears.

**Validates: Requirements 015.1, 015.2, 015.3, 015.4, 015.5**

### Property 20: Audit Event is complete, minimal and unique

For all first-created normal or degraded Decisions, exactly one audit event exists, every audit key belongs to the REQ-016 allowlist, every available value matches the frozen request/Decision data, and its trace contains no forbidden sensitive evidence; retries do not change the count.

**Validates: Requirements 016.1, 016.2, 016.3, 016.4, 016.5**

### Property 21: Critical unavailability has one stable no-charge outcome

For any approved critical configuration/evidence unavailability snapshot, cancellation succeeds and produces zero charge, `DEGRADED_NO_CHARGE`, mode `DEGRADED` and one audit event; repeated evaluation of the same snapshot gives the same conclusion.

**Validates: Requirements 005.6, 006.7, 007.8, 009.8, 017.1, 017.2, 017.3, 017.4, 017.5, 017.6**

### Property 22: A degraded winner cannot become a later charge

For any canonical key whose first-write-wins value is degraded, restoring every dependency and retrying any number of times returns that same Decision and records no passenger charge.

**Validates: Requirements 017.7, 017.8**

### Property 23: Acceptance reports preserve scope and traceability

For all generated Acceptance Reports, every pass category belongs to the approved category allowlist and carries Requirement/Decision references; every successful Fake result is marked synthetic/non-production, and no boundary item is represented as implemented or accepted.

**Validates: Requirements 001.4, 003.7, 009.7, 011.9, 015.6, 018.1, 018.2, 018.3, 018.4, 018.5, 018.6, 018.7**

## Testing Strategy

### 13.1 Property-Based Tests

Use Node's built-in `node:test`/`node:assert` with deterministic generators implemented in this repository; do not add a testing dependency. Each property runs at least 100 generated cases. Tests include this exact tag format:

```text
Feature: cancellation-no-show-fee-system, Property {number}: {property title}
```

Generators must produce only valid inputs unless the property explicitly tests rejection. Stateful/model-based generators cover first-write-wins sequences, permutations and dependency recovery. Sensitive-data generators use unique sentinel strings so leakage checks can assert both forbidden keys and forbidden values.

### 13.2 Unit and Edge Tests

Example/edge tests focus on named acceptance boundaries rather than duplicating generated coverage:

- 119, 120 and 121 seconds;
- 200/201 meters and 29/30 seconds;
- 4m59s/5m, missing contact, explicit refusal with/without verified arrival;
- all six approved Strong Exemption categories and invalid category rejection;
- exact 500/800/800/1200 fee table;
- missing explanation fields do not read trace;
- historical snapshot/version missing remains not replayable;
- optional driver compensation present/absent;
- exact report labels and package-root imports.

### 13.3 Integration and Concurrency Tests

In-memory integration tests coordinate promises/barriers to force same-key races and verify a single winner, one audit and at-most-once synthetic actions. Separate tests disable Map and Rule Configuration Fakes, then restore them and retry the same key to verify no later charge. Assembly smoke tests assert all eight external ports use `IN_MEMORY_FAKE` adapters and no network adapter is reachable.

No test result is evidence of real payment, settlement, support authorization, map contract, risk behavior, notification delivery or legacy compatibility.

## 14. Requirement Traceability

| Requirement | Primary design elements | Verification |
|---|---|---|
| REQ-001 | WorkshopAssembly, Ports/Fakes, output/report allowlists | Properties 1, 23; assembly smoke/integration |
| REQ-002 | DecisionEngine priority, strong-exemption short circuit | Properties 2–4 |
| REQ-003 | V1Router, Legacy Fake | Properties 5, 23; route examples |
| REQ-004 | ConfirmedExemption enum, statement noninterference, safe projections | Properties 3, 4, 17–19 |
| REQ-005 | Clock, inclusive free-window evaluator, degradation | Properties 6, 21; 119/120/121 edge tests |
| REQ-006 | MapPort Fake, ArrivalEvaluator | Properties 7, 21; boundary/integration tests |
| REQ-007 | NoShowEvaluator, evidence availability | Properties 8, 21; boundary tests |
| REQ-008 | CancelInitiatorRegistry, independent liability | Properties 4, 9; concurrency test |
| REQ-009 | RuleConfigurationSnapshot, FeeInputSelector, moneyMinor | Properties 10, 11, 21, 23 |
| REQ-010 | FeeCalculatorAdapter, CappedFeeCalculator package-root reuse | Properties 11–13; import smoke test |
| REQ-011 | canonical key, per-key gate, first-write-wins store/effects | Properties 14, 15, 23; race tests |
| REQ-012 | frozen Decision, ReplayService, historical reads | Property 16; missing-history edge tests |
| REQ-013 | strong exemptions, safe explanation/trace | Properties 3, 17, 18 |
| REQ-014 | ExplanationService and explicit public projection | Property 17; missing-input edge tests |
| REQ-015 | SupportPort Fake and SupportViewProjector | Properties 19, 23 |
| REQ-016 | AuditRecorder and exact audit schema | Properties 15, 18, 20 |
| REQ-017 | DegradationHandler, degraded first-write-wins | Properties 21, 22; recovery integration |
| REQ-018 | AcceptanceReportBuilder and boundary registry | Property 23; report smoke tests |

## 15. Explicit Non-Implementation Boundaries

These entries are preserved from `requirements.md` only to prevent scope expansion. They do not authorize design components, integrations, defaults, behavior or tests beyond confirming their exclusion.

### 15.1 BLOCKED

| ID | Boundary retained as non-implementation |
|---|---|
| BLK-001 | 线上旧规则权威版本、行为基线及“不合理场景—现状—期望”清单 |
| BLK-002 | 投诉率、司机满意度、转化、报表口径、目标、观察期及经营目标优先级 |
| BLK-003 | 开放式免责理由、提前结束等待及完整司机取消原因的责任和证据映射 |
| BLK-004 | 真实地区法律清单、维护责任和地区映射 |
| BLK-005 | 真实地图字段、精度、新鲜度及其他外部服务契约 |
| BLK-006 | 完整司机取消责任规则、可采信证据及驾驶安全验收标准 |
| BLK-007 | 生产金额、配置上下限、估价时点、用户分类、事件定义和倍率、跨端精度及生产发布审批 |
| BLK-008 | 真实服务费和费用分配、退款、司机补偿到账、追偿及客服财务权限 |
| BLK-009 | 完整 RBAC、无障碍标签治理、隐私依据、安全规范、日志保留、导出权限及非 Decision 审计 |
| BLK-010 | 取消前金额展示语义、乘客/司机跨端一致字段及真实通知送达语义 |
| BLK-011 | 生产风控行为定义、阈值、处罚、解除、申诉、数据清单及真实风控契约 |
| BLK-012 | 生产性能、容量、可用性、错误预算和完整异常状态要求 |
| BLK-013 | 灰度城市、比例、观察期、双跑口径、扩量、回滚、决策人和在途订单影响 |
| BLK-014 | 历史订单迁移、缺失数据展示及 legacy 历史解释策略 |
| BLK-015 | 完整生产场景矩阵、指标、合规签署、兼容基线及边缘场景兜底 |

### 15.2 OUT_OF_SCOPE

| ID | Boundary retained as non-implementation |
|---|---|
| OOS-001 | 预约、出租车、顺风车和企业用车规则迁移；仅保留 Legacy Port 路由边界 |
| OOS-002 | 路线/方向/ETA 推断及真实地图、支付、结算、通知、客服、风控集成 |
| OOS-003 | 生产运营后台、真实退款、司机追偿及相关审批和后台体验 |
| OOS-004 | 风控识别、用户限制、设备关联、真实移交和机器学习模型 |
| OOS-005 | 多币种、跨境法规、生产 UI 和生产部署 |

## 16. Design Validation Checklist

- [x] 设计范围只来自 REQ-001 至 REQ-018。
- [x] `.config.kiro` 和 `requirements.md` 不需要修改。
- [x] 所有八个外部系统仅为 Port + In-Memory Fake。
- [x] 共享 Money、calculator、key builder、explanation builder 均从包根复用。
- [x] 120 秒、200 米/30 秒、5 分钟/联系/拒乘和费用表边界保持不变。
- [x] first-write-wins、确定性重放、降级不追扣、隐私 allowlist 和单条审计均有明确设计。
- [x] 没有新增生产指标、RBAC、SLA、发布阈值、真实退款/legacy/risk 行为或额外持久化字段。
- [x] 所有 BLOCKED 与 OUT_OF_SCOPE 条目保持非实现边界。

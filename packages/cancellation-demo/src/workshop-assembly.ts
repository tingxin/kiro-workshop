import { InMemoryDecisionStore } from "./adapters/in-memory-decision-store.js";
import {
  InMemoryCompensationSettlementFake,
  InMemoryLegacyFake,
  InMemoryMapFake,
  InMemoryNotificationFake,
  InMemoryPaymentChargeFake,
  InMemoryRiskFake,
  InMemoryRuleRepositoryConfigurationFake,
  InMemorySupportFake,
  type DecisionIdSource,
} from "./adapters/in-memory-fakes.js";
import { AcceptanceReportBuilder } from "./application/acceptance-report-builder.js";
import { AuditRecorder } from "./application/audit-recorder.js";
import { CancelInitiatorRegistry } from "./application/cancel-initiator-registry.js";
import { DecisionCommitCoordinator } from "./application/decision-commit-coordinator.js";
import { DecisionService } from "./application/decision-service.js";
import { DegradationHandler } from "./application/degradation-handler.js";
import { ExplanationService } from "./application/explanation-service.js";
import { FeeInputSelector } from "./application/fee-input-selector.js";
import { ReplayService } from "./application/replay-service.js";
import { SupportViewProjector } from "./application/support-view-projector.js";
import { ArrivalEvaluator } from "./domain/arrival-evaluator.js";
import { DecisionEngine } from "./domain/decision-engine.js";
import { NoShowEvaluator } from "./domain/no-show-evaluator.js";
import { V1Router } from "./domain/v1-router.js";
import type { Clock } from "./ports.js";

export interface WorkshopAssemblyDependencies {
  readonly clock: Clock;
  readonly decisionIdSource: DecisionIdSource;
}

export class WorkshopAssembly {
  readonly externalAdapters: Readonly<{
    map: InMemoryMapFake;
    paymentCharge: InMemoryPaymentChargeFake;
    compensationSettlement: InMemoryCompensationSettlementFake;
    notification: InMemoryNotificationFake;
    support: InMemorySupportFake;
    risk: InMemoryRiskFake;
    ruleRepositoryConfiguration: InMemoryRuleRepositoryConfigurationFake;
    legacy: InMemoryLegacyFake;
  }>;

  readonly clock: Clock;
  readonly decisionIdSource: DecisionIdSource;
  readonly decisionStore: InMemoryDecisionStore;
  readonly cancelInitiatorRegistry: CancelInitiatorRegistry;
  readonly auditRecorder: AuditRecorder;
  readonly router: V1Router;
  readonly arrivalEvaluator: ArrivalEvaluator;
  readonly noShowEvaluator: NoShowEvaluator;
  readonly decisionEngine: DecisionEngine;
  readonly feeInputSelector: FeeInputSelector;
  readonly degradationHandler: DegradationHandler;
  readonly decisionCommitCoordinator: DecisionCommitCoordinator;
  readonly decisionService: DecisionService;
  readonly explanationService: ExplanationService;
  readonly supportViewProjector: SupportViewProjector;
  readonly replayService: ReplayService;
  readonly acceptanceReportBuilder: AcceptanceReportBuilder;

  constructor(dependencies: WorkshopAssemblyDependencies) {
    this.clock = dependencies.clock;
    this.decisionIdSource = dependencies.decisionIdSource;

    const map = new InMemoryMapFake();
    const paymentCharge = new InMemoryPaymentChargeFake();
    const compensationSettlement = new InMemoryCompensationSettlementFake();
    const notification = new InMemoryNotificationFake();
    const support = new InMemorySupportFake();
    const risk = new InMemoryRiskFake();
    const ruleRepositoryConfiguration =
      new InMemoryRuleRepositoryConfigurationFake();
    const legacy = new InMemoryLegacyFake();

    this.externalAdapters = Object.freeze({
      map,
      paymentCharge,
      compensationSettlement,
      notification,
      support,
      risk,
      ruleRepositoryConfiguration,
      legacy,
    });

    this.decisionStore = new InMemoryDecisionStore();
    this.cancelInitiatorRegistry = new CancelInitiatorRegistry();
    this.auditRecorder = new AuditRecorder();
    this.router = new V1Router(legacy);
    this.arrivalEvaluator = new ArrivalEvaluator();
    this.noShowEvaluator = new NoShowEvaluator();
    this.decisionEngine = new DecisionEngine();
    this.feeInputSelector = new FeeInputSelector(ruleRepositoryConfiguration);
    this.degradationHandler = new DegradationHandler();
    this.decisionCommitCoordinator = new DecisionCommitCoordinator(
      this.decisionStore,
      this.auditRecorder,
      paymentCharge,
      compensationSettlement,
    );
    this.decisionService = new DecisionService({
      router: this.router,
      clock: this.clock,
      initiatorRegistry: this.cancelInitiatorRegistry,
      ruleRepository: ruleRepositoryConfiguration,
      mapPort: map,
      arrivalEvaluator: this.arrivalEvaluator,
      noShowEvaluator: this.noShowEvaluator,
      decisionEngine: this.decisionEngine,
      degradationHandler: this.degradationHandler,
      commitCoordinator: this.decisionCommitCoordinator,
      decisionIdSource: this.decisionIdSource,
    });
    this.explanationService = new ExplanationService();
    this.supportViewProjector = new SupportViewProjector(this.explanationService);
    this.replayService = new ReplayService(
      this.clock,
      this.arrivalEvaluator,
      this.noShowEvaluator,
      this.decisionEngine,
    );
    this.acceptanceReportBuilder = new AcceptanceReportBuilder();
  }
}

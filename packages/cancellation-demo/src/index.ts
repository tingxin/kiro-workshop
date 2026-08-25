export {
  FixedClock,
  UnavailableClock,
  WORKSHOP_RULE_VERSION,
  createDeterministicDecisionIdSource,
  createWorkshopRuleConfigurationSnapshot,
} from "./adapters/in-memory-fakes.js";
export { AcceptanceReportBuilder } from "./application/acceptance-report-builder.js";
export { ExplanationService } from "./application/explanation-service.js";
export { ReplayService } from "./application/replay-service.js";
export { SupportViewProjector } from "./application/support-view-projector.js";
export { runWorkshopDemo } from "./demo.js";
export type {
  AcceptanceReportInput,
} from "./application/acceptance-report-builder.js";
export type {
  AcceptanceReport,
  CancellationCommand,
  ConfirmedExemption,
  Decision,
  DecisionAuditEvent,
  PublicExplanation,
  ReplayResult,
  SupportView,
} from "./domain/types.js";
export type { Clock } from "./ports.js";
export {
  WorkshopAssembly,
  type WorkshopAssemblyDependencies,
} from "./workshop-assembly.js";

import type { Decision, Party, SupportView } from "../domain/types.js";
import { ExplanationService } from "./explanation-service.js";
import type { MoneyMinor, PublicReasonCode } from "@company/cancellation-policy-kit";

interface MutableSupportView {
  decisionId: string;
  orderId: string;
  cancelInitiator: Party;
  liableParty?: Party;
  chargedAmount: MoneyMinor;
  driverCompensation?: MoneyMinor;
  publicReasonCode: PublicReasonCode;
  ruleVersion?: string;
  summary?: string;
}

export interface SupportFakeViewWriter {
  setDecisionView(view: SupportView): void;
}

export class SupportViewProjector {
  readonly #explanationService: ExplanationService;

  constructor(explanationService = new ExplanationService()) {
    this.#explanationService = explanationService;
  }

  project(decision: Decision): SupportView {
    const view: MutableSupportView = {
      decisionId: decision.decisionId,
      orderId: decision.orderId,
      cancelInitiator: decision.cancelInitiator,
      chargedAmount: decision.charge,
      publicReasonCode: decision.publicReasonCode,
    };

    if (decision.liableParty !== undefined) {
      view.liableParty = decision.liableParty;
    }
    if (decision.driverCompensation !== undefined) {
      view.driverCompensation = decision.driverCompensation;
    }

    const explanation = this.#explanationService.explain({
      publicReasonCode: decision.publicReasonCode,
      charge: decision.charge,
      ruleVersion: decision.ruleVersion,
    });
    if (explanation.status === "AVAILABLE") {
      view.ruleVersion = explanation.value.ruleVersion;
      view.summary = explanation.value.summary;
    }

    return Object.freeze(view);
  }
}

export function wireSupportFakeQuery(
  supportFake: SupportFakeViewWriter,
  persistedDecision: Decision,
  projector = new SupportViewProjector(),
): void {
  supportFake.setDecisionView(projector.project(persistedDecision));
}

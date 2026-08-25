import type { FeeCalculationTrace } from "@company/cancellation-policy-kit";

import type {
  ConfirmedExemption,
  Decision,
  DecisionAuditEvent,
} from "../domain/types.js";

export interface RecordDecisionAuditInput {
  readonly decision: Decision;
  readonly requestedAtUtc: string;
  readonly acceptedAtUtc?: string;
  readonly confirmedExemption?: ConfirmedExemption;
}

function freezeFeeTrace(trace: FeeCalculationTrace): FeeCalculationTrace {
  return Object.freeze({
    baseFeeMinor: trace.baseFeeMinor,
    adjustmentBasisPoints: trace.adjustmentBasisPoints,
    adjustedFeeMinor: trace.adjustedFeeMinor,
    discountMinor: trace.discountMinor,
    afterDiscountMinor: trace.afterDiscountMinor,
    estimatedTripFareMinor: trace.estimatedTripFareMinor,
    capped: trace.capped,
    finalFeeMinor: trace.finalFeeMinor,
  });
}

export class AuditRecorder {
  readonly #eventsByDecisionId = new Map<string, DecisionAuditEvent>();

  record(input: RecordDecisionAuditInput): DecisionAuditEvent {
    const { decision } = input;
    if (this.#eventsByDecisionId.has(decision.decisionId)) {
      throw new Error(`Audit event already exists for Decision ${decision.decisionId}`);
    }

    const event: DecisionAuditEvent = Object.freeze({
      decisionId: decision.decisionId,
      decisionIdempotencyKey: decision.decisionIdempotencyKey,
      orderId: decision.orderId,
      ...(decision.ruleVersion === undefined
        ? {}
        : { ruleVersion: decision.ruleVersion }),
      requestedAtUtc: input.requestedAtUtc,
      ...(input.acceptedAtUtc === undefined
        ? {}
        : { acceptedAtUtc: input.acceptedAtUtc }),
      ...(input.confirmedExemption === undefined
        ? {}
        : { confirmedExemption: input.confirmedExemption }),
      ...(decision.feeTrace === undefined
        ? {}
        : { feeTrace: freezeFeeTrace(decision.feeTrace) }),
      publicReasonCode: decision.publicReasonCode,
      finalAmount: decision.charge,
      processingMode: decision.processingMode,
    });

    this.#eventsByDecisionId.set(decision.decisionId, event);
    return event;
  }

  get(decisionId: string): DecisionAuditEvent | undefined {
    return this.#eventsByDecisionId.get(decisionId);
  }

  list(): readonly DecisionAuditEvent[] {
    return Object.freeze([...this.#eventsByDecisionId.values()]);
  }
}

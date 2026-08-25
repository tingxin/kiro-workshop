import type {
  ConfirmedExemption,
  Decision,
} from "../domain/types.js";
import type {
  CompensationSettlementPort,
  DecisionStore,
  PaymentChargePort,
  SyntheticActionInput,
} from "../ports.js";
import type { AuditRecorder } from "./audit-recorder.js";

export interface CommitDecisionInput {
  readonly decisionIdempotencyKey: string;
  readonly createDecision: () => Promise<Decision>;
  readonly requestedAtUtc: string;
  readonly acceptedAtUtc?: string;
  readonly confirmedExemption?: ConfirmedExemption;
}

export interface CommitDecisionResult {
  readonly decision: Decision;
  readonly created: boolean;
}

export class DecisionCommitCoordinator {
  readonly #pending = new Map<string, Promise<CommitDecisionResult>>();
  readonly #store: DecisionStore;
  readonly #auditRecorder: AuditRecorder;
  readonly #paymentPort: PaymentChargePort;
  readonly #compensationPort: CompensationSettlementPort;

  constructor(
    store: DecisionStore,
    auditRecorder: AuditRecorder,
    paymentPort: PaymentChargePort,
    compensationPort: CompensationSettlementPort,
  ) {
    this.#store = store;
    this.#auditRecorder = auditRecorder;
    this.#paymentPort = paymentPort;
    this.#compensationPort = compensationPort;
  }

  async commit(input: CommitDecisionInput): Promise<CommitDecisionResult> {
    const pending = this.#pending.get(input.decisionIdempotencyKey);
    if (pending !== undefined) {
      const result = await pending;
      return Object.freeze({ decision: result.decision, created: false });
    }

    const operation = this.#commitAndFinishEffects(input);
    this.#pending.set(input.decisionIdempotencyKey, operation);

    try {
      return await operation;
    } finally {
      if (this.#pending.get(input.decisionIdempotencyKey) === operation) {
        this.#pending.delete(input.decisionIdempotencyKey);
      }
    }
  }

  async #commitAndFinishEffects(
    input: CommitDecisionInput,
  ): Promise<CommitDecisionResult> {
    const result = await this.#store.createOrGet(
      input.decisionIdempotencyKey,
      input.createDecision,
    );

    if (!result.created) {
      return Object.freeze(result);
    }

    this.#auditRecorder.record({
      decision: result.decision,
      requestedAtUtc: input.requestedAtUtc,
      ...(input.acceptedAtUtc === undefined
        ? {}
        : { acceptedAtUtc: input.acceptedAtUtc }),
      ...(input.confirmedExemption === undefined
        ? {}
        : { confirmedExemption: input.confirmedExemption }),
    });

    const actionInput = (amount: Decision["charge"]): SyntheticActionInput => ({
      decisionIdempotencyKey: result.decision.decisionIdempotencyKey,
      decisionId: result.decision.decisionId,
      amount,
    });
    const effects: Promise<unknown>[] = [];

    if (result.decision.processingMode === "NORMAL" && result.decision.charge > 0) {
      effects.push(
        this.#paymentPort.recordSyntheticCharge(actionInput(result.decision.charge)),
      );
    }
    if (
      result.decision.driverCompensation !== undefined &&
      result.decision.driverCompensation > 0
    ) {
      effects.push(
        this.#compensationPort.recordSyntheticCompensation(
          actionInput(result.decision.driverCompensation),
        ),
      );
    }

    await Promise.all(effects);
    return Object.freeze(result);
  }
}

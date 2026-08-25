import type { Party } from "../domain/types.js";

export interface CancelInitiatorRecord {
  readonly orderId: string;
  readonly cancelInitiator: Party;
  readonly acceptedAtUtc?: string;
}

function freezeRecord(
  orderId: string,
  cancelInitiator: Party,
  acceptedAtUtc?: string,
): CancelInitiatorRecord {
  return acceptedAtUtc === undefined
    ? Object.freeze({ orderId, cancelInitiator })
    : Object.freeze({ orderId, cancelInitiator, acceptedAtUtc });
}

export class CancelInitiatorRegistry {
  readonly #records = new Map<string, CancelInitiatorRecord>();

  createOrGet(
    orderId: string,
    requester: Party,
    acceptedAtUtc?: string,
  ): CancelInitiatorRecord {
    const existing = this.#records.get(orderId);
    if (existing !== undefined) {
      return existing;
    }

    const record = freezeRecord(orderId, requester, acceptedAtUtc);
    this.#records.set(orderId, record);
    return record;
  }

  get(orderId: string): CancelInitiatorRecord | undefined {
    return this.#records.get(orderId);
  }
}

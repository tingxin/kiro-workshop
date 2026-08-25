import {
  moneyMinor,
  type MoneyMinor,
} from "@company/cancellation-policy-kit";

import type { Availability } from "./types.js";

const FREE_CANCELLATION_WINDOW_SECONDS = 120;

export interface FreeWindowInput {
  readonly driverAcceptedAtUtc?: string;
  readonly cancellationAtUtc: Availability<string>;
}

export type FreeWindowEvaluation =
  | {
      readonly status: "AVAILABLE";
      readonly outcome: "FREE_CANCELLATION_WINDOW";
      readonly elapsedSeconds: number;
      readonly charge: MoneyMinor;
      readonly publicReasonCode: "FREE_CANCELLATION_WINDOW";
    }
  | {
      readonly status: "AVAILABLE";
      readonly outcome: "CONTINUE";
      readonly elapsedSeconds: number;
    }
  | { readonly status: "UNAVAILABLE" };

const UNAVAILABLE = Object.freeze({ status: "UNAVAILABLE" as const });

function parseUtcInstant(value: string, fieldName: string): number {
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) {
    throw new TypeError(`${fieldName} must be a valid UTC instant`);
  }
  return instant;
}

export function evaluateFreeWindow(input: FreeWindowInput): FreeWindowEvaluation {
  if (
    input.driverAcceptedAtUtc === undefined
    || input.cancellationAtUtc.status === "UNAVAILABLE"
  ) {
    return UNAVAILABLE;
  }

  const acceptedAt = parseUtcInstant(
    input.driverAcceptedAtUtc,
    "driverAcceptedAtUtc",
  );
  const cancelledAt = parseUtcInstant(
    input.cancellationAtUtc.value,
    "cancellationAtUtc",
  );
  const elapsedSeconds = (cancelledAt - acceptedAt) / 1_000;

  if (elapsedSeconds < 0) {
    throw new RangeError("cancellationAtUtc must not precede driverAcceptedAtUtc");
  }

  if (elapsedSeconds <= FREE_CANCELLATION_WINDOW_SECONDS) {
    return Object.freeze({
      status: "AVAILABLE" as const,
      outcome: "FREE_CANCELLATION_WINDOW" as const,
      elapsedSeconds,
      charge: moneyMinor(0),
      publicReasonCode: "FREE_CANCELLATION_WINDOW" as const,
    });
  }

  return Object.freeze({
    status: "AVAILABLE" as const,
    outcome: "CONTINUE" as const,
    elapsedSeconds,
  });
}

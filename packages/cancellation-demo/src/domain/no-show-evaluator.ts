import type { Availability, NoShowEvidence } from "./types.js";

const MINIMUM_NO_SHOW_WAIT_SECONDS = 300;
const MINIMUM_CONTACT_ATTEMPTS = 1;
const UNAVAILABLE = Object.freeze({ status: "UNAVAILABLE" as const });
const ELIGIBLE = Object.freeze({ status: "AVAILABLE" as const, value: true });
const NOT_ELIGIBLE = Object.freeze({ status: "AVAILABLE" as const, value: false });

export class NoShowEvaluator {
  evaluate(
    verifiedArrival: boolean,
    evidence: Availability<NoShowEvidence>,
  ): Availability<boolean> {
    if (!verifiedArrival) {
      return NOT_ELIGIBLE;
    }

    if (evidence.status === "UNAVAILABLE") {
      return UNAVAILABLE;
    }

    const eligible = evidence.value.inPlatformExplicitRefusal
      || (
        evidence.value.waitedAfterVerifiedArrivalSeconds
          >= MINIMUM_NO_SHOW_WAIT_SECONDS
        && evidence.value.inPlatformContactAttempts >= MINIMUM_CONTACT_ATTEMPTS
      );

    return eligible ? ELIGIBLE : NOT_ELIGIBLE;
  }
}

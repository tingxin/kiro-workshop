import type { MapArrivalEvidence } from "./types.js";

const MAXIMUM_ARRIVAL_DISTANCE_METERS = 200;
const MINIMUM_CONTINUOUS_ARRIVAL_SECONDS = 30;

export class ArrivalEvaluator {
  evaluate(evidence: MapArrivalEvidence): boolean {
    return evidence.distanceToPickupMeters <= MAXIMUM_ARRIVAL_DISTANCE_METERS
      && evidence.continuouslyWithinThresholdSeconds
        >= MINIMUM_CONTINUOUS_ARRIVAL_SECONDS;
  }
}

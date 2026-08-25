import type { CancellationCommand, ServiceType } from "./types.js";
import type { LegacyPort, LegacyResult } from "../ports.js";

const WORKSHOP_V1_SERVICE_TYPES: ReadonlySet<string> = new Set([
  "EXPRESS",
  "PREMIUM",
  "BUSINESS",
]);

export type V1RoutingResult =
  | { readonly target: "WORKSHOP_V1" }
  | {
      readonly target: "LEGACY_FAKE";
      readonly legacyResult: LegacyResult;
    };

export function isWorkshopV1ServiceType(
  serviceType: string,
): serviceType is ServiceType {
  return WORKSHOP_V1_SERVICE_TYPES.has(serviceType);
}

export class V1Router {
  readonly #legacyPort: LegacyPort;

  constructor(legacyPort: LegacyPort) {
    this.#legacyPort = legacyPort;
  }

  async route(command: CancellationCommand): Promise<V1RoutingResult> {
    if (command.isRealtime && isWorkshopV1ServiceType(command.serviceType)) {
      return Object.freeze({ target: "WORKSHOP_V1" as const });
    }

    const legacyResult = await this.#legacyPort.route(command);
    return Object.freeze({
      target: "LEGACY_FAKE" as const,
      legacyResult,
    });
  }
}

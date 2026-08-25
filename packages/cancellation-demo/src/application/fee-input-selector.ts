import type {
  ChargeType,
  MoneyMinor,
} from "@company/cancellation-policy-kit";

import type { Availability, ServiceType } from "../domain/types.js";
import type { RuleRepositoryConfigurationPort } from "../ports.js";

export interface SelectedFeeInput {
  readonly baseFee: MoneyMinor;
  readonly ruleVersion: string;
}

const UNAVAILABLE = Object.freeze({ status: "UNAVAILABLE" as const });

export class FeeInputSelector {
  readonly #ruleRepository: RuleRepositoryConfigurationPort;

  constructor(ruleRepository: RuleRepositoryConfigurationPort) {
    this.#ruleRepository = ruleRepository;
  }

  async select(
    serviceType: ServiceType,
    chargeType: ChargeType,
  ): Promise<Availability<SelectedFeeInput>> {
    const snapshotResult = await this.#ruleRepository.getSnapshot();
    if (snapshotResult.status === "UNAVAILABLE") {
      return UNAVAILABLE;
    }

    const snapshot = snapshotResult.value;
    return Object.freeze({
      status: "AVAILABLE" as const,
      value: Object.freeze({
        baseFee: snapshot.baseFees[serviceType][chargeType],
        ruleVersion: snapshot.ruleVersion,
      }),
    });
  }
}

import type { Decision } from "../domain/types.js";
import type { DecisionStore } from "../ports.js";

export class InMemoryDecisionStore implements DecisionStore {
  readonly #decisions = new Map<string, Decision>();
  readonly #pending = new Map<string, Promise<Decision>>();

  async createOrGet(
    key: string,
    create: () => Promise<Decision>,
  ): Promise<{ readonly decision: Decision; readonly created: boolean }> {
    const stored = this.#decisions.get(key);
    if (stored !== undefined) {
      return { decision: stored, created: false };
    }

    const pending = this.#pending.get(key);
    if (pending !== undefined) {
      return { decision: await pending, created: false };
    }

    const creation = Promise.resolve().then(create);
    this.#pending.set(key, creation);

    try {
      const decision = await creation;
      this.#decisions.set(key, decision);
      return { decision, created: true };
    } finally {
      if (this.#pending.get(key) === creation) {
        this.#pending.delete(key);
      }
    }
  }

  inspect(key: string): Decision | undefined {
    return this.#decisions.get(key);
  }

  inspectAll(): readonly (readonly [string, Decision])[] {
    const entries = [...this.#decisions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, decision]) => Object.freeze([key, decision] as const));
    return Object.freeze(entries);
  }

  reset(): void {
    if (this.#pending.size > 0) {
      throw new Error("cannot reset DecisionStore while creation is pending");
    }
    this.#decisions.clear();
  }
}

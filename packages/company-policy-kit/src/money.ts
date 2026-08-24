declare const moneyMinorBrand: unique symbol;

/** Non-negative integer amount in the currency's minor unit. */
export type MoneyMinor = number & { readonly [moneyMinorBrand]: "MoneyMinor" };

export function moneyMinor(value: number): MoneyMinor {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`MoneyMinor must be a non-negative safe integer; received ${value}`);
  }

  return value as MoneyMinor;
}

export const ZERO_MONEY = moneyMinor(0);

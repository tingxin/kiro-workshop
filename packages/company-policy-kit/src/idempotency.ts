export type ChargeType = "CANCELLATION_FEE" | "NO_SHOW_FEE";

/** Canonical key shared by decision, charge, compensation, and audit workflows. */
export function buildDecisionIdempotencyKey(
  orderId: string,
  chargeType: ChargeType,
): string {
  const normalizedOrderId = orderId.trim();
  if (normalizedOrderId.length === 0) {
    throw new TypeError("orderId must not be empty");
  }

  return `cancellation-decision:v1:${chargeType}:${encodeURIComponent(normalizedOrderId)}`;
}

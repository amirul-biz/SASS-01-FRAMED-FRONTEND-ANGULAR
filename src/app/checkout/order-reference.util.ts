const ORDER_REFERENCE_LENGTH = 8;

export function getOrderReference(orderId: string): string {
  return orderId.slice(0, ORDER_REFERENCE_LENGTH).toUpperCase();
}

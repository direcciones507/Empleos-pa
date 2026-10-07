export const candidatePricing = Object.freeze({currency: 'USD', normal_unit_price: 4.99, discount_percent: 50, unit_price: 2.50, unit: 'candidate_requested'});
export const PROMOTION_VERSION = 'LAUNCH_50_250_V1';
export function candidateQuote(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 40) throw new Error('INVALID_CANDIDATE_QUANTITY');
  return {quantity, total: quantity * 250 / 100};
}

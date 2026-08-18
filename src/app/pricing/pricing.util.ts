export type VoucherDiscountType = 'flat-tier' | 'percent-tier';

export interface IVoucherCondition {
  minPhotos: number;
  maxPhotos: number | null;
  value: number;
}

export interface IVoucherLike {
  discountType: VoucherDiscountType;
  conditions: IVoucherCondition[];
}

export interface IEventPricing {
  basePrice: number;
  vouchers: IVoucherLike[];
  fullGalleryEnabled: boolean;
  fullGalleryPrice: number;
}

export interface QualifyingMatch {
  voucher: IVoucherLike;
  condition: IVoucherCondition;
}

export interface PricingBreakdown {
  photoCount: number;
  pricePerPhoto: number;
  bundleApplied: boolean;
  subtotal: number;
  bundleDiscount: number;
  total: number;
}

function zeroBreakdown(photoCount: number): PricingBreakdown {
  return {
    photoCount,
    pricePerPhoto: 0,
    bundleApplied: false,
    subtotal: 0,
    bundleDiscount: 0,
    total: 0,
  };
}

function matches(photoCount: number, condition: IVoucherCondition): boolean {
  if (photoCount < condition.minPhotos) return false;
  return condition.maxPhotos === null || photoCount <= condition.maxPhotos;
}

/** At most one matching condition per voucher (ranges within a voucher don't overlap by construction). */
export function qualifyingConditions(photoCount: number, pricing: IEventPricing | undefined): QualifyingMatch[] {
  if (!pricing) {
    return [];
  }
  const result: QualifyingMatch[] = [];
  for (const voucher of pricing.vouchers) {
    const condition = voucher.conditions.find((c) => matches(photoCount, c));
    if (condition) {
      result.push({ voucher, condition });
    }
  }
  return result;
}

function subtotalFor(photosTotal: number, photoCount: number, match: QualifyingMatch): number {
  if (match.voucher.discountType === 'flat-tier') {
    return photoCount * (match.condition.value / match.condition.minPhotos);
  }
  return photosTotal * (1 - match.condition.value / 100);
}

function bestMatch(photosTotal: number, photoCount: number, pricing: IEventPricing): QualifyingMatch | undefined {
  const matches = qualifyingConditions(photoCount, pricing);
  if (matches.length === 0) {
    return undefined;
  }
  return matches
    .map((match) => ({ match, subtotal: subtotalFor(photosTotal, photoCount, match) }))
    .reduce((best, cur) => (cur.subtotal < best.subtotal ? cur : best)).match;
}

/**
 * `photosTotal` is the source-of-truth price — the sum of whatever each selected photo actually
 * costs (driven by the pricing option/format the rider chose for it). A voucher condition is a
 * discount layered on top of that real total, not a price of its own:
 * - flat-tier unlocks a per-photo rate (condition.value / condition.minPhotos) applied across the
 *   count, independent of the individual photos' prices (a flat bulk rate).
 * - percent-tier takes a percentage off the real `photosTotal`.
 */
export function calculatePricing(
  photosTotal: number,
  photoCount: number,
  pricing: IEventPricing | undefined,
  forcedMatch?: QualifyingMatch | null,
): PricingBreakdown {
  if (!pricing || photoCount === 0) {
    return zeroBreakdown(photoCount);
  }

  // undefined -> auto-pick the best qualifying match; null -> explicitly no discount; object -> force that match.
  const match = forcedMatch === undefined ? bestMatch(photosTotal, photoCount, pricing) : (forcedMatch ?? undefined);

  const subtotal = match ? subtotalFor(photosTotal, photoCount, match) : photosTotal;
  const bundleDiscount = photosTotal - subtotal;

  return {
    photoCount,
    pricePerPhoto: photoCount > 0 ? subtotal / photoCount : 0,
    bundleApplied: !!match,
    subtotal,
    bundleDiscount,
    total: subtotal,
  };
}

export type BundleModel = 'flat-tier' | 'percent-tier' | 'none';

export interface IBundleTier {
  minQuantity: number;
  /** flat-tier: RM price for the whole tier. percent-tier: percent off (0-100). */
  value: number;
}

export interface IEventPricing {
  basePrice: number;
  bundleModel: BundleModel;
  bundleTiers: IBundleTier[];
  fullGalleryEnabled: boolean;
  fullGalleryPrice: number;
}

export const PLATFORM_FEE = 2;

export interface PricingBreakdown {
  photoCount: number;
  pricePerPhoto: number;
  bundleApplied: boolean;
  subtotal: number;
  bundleDiscount: number;
  platformFee: number;
  total: number;
}

function zeroBreakdown(photoCount: number): PricingBreakdown {
  return {
    photoCount,
    pricePerPhoto: 0,
    bundleApplied: false,
    subtotal: 0,
    bundleDiscount: 0,
    platformFee: 0,
    total: 0,
  };
}

function bestQualifyingTier(photoCount: number, pricing: IEventPricing): IBundleTier | undefined {
  if (pricing.bundleModel === 'none') {
    return undefined;
  }
  return [...pricing.bundleTiers].filter((t) => photoCount >= t.minQuantity).sort((a, b) => b.minQuantity - a.minQuantity)[0];
}

export function qualifyingTiers(photoCount: number, pricing: IEventPricing | undefined): IBundleTier[] {
  if (!pricing || pricing.bundleModel === 'none') {
    return [];
  }
  return [...pricing.bundleTiers].filter((t) => photoCount >= t.minQuantity).sort((a, b) => a.minQuantity - b.minQuantity);
}

/**
 * `photosTotal` is the source-of-truth price — the sum of whatever each selected photo actually
 * costs (driven by the pricing option/format the rider chose for it). The voucher (bundleModel/
 * bundleTiers) is a discount layered on top of that real total, not a price of its own:
 * - flat-tier unlocks a per-photo rate (tier.value / tier.minQuantity) applied across the count,
 *   independent of the individual photos' prices (a flat bulk rate).
 * - percent-tier takes a percentage off the real `photosTotal`.
 */
/**
 * Picks whichever of several assigned vouchers (each auto-picking its own best qualifying tier)
 * gives the lowest total for the current cart — used when an event has more than one voucher.
 */
export function bestPricingAcrossBundles(
  photosTotal: number,
  photoCount: number,
  bundles: IEventPricing[],
): PricingBreakdown {
  if (bundles.length === 0) {
    return calculatePricing(photosTotal, photoCount, undefined);
  }
  return bundles
    .map((bundle) => calculatePricing(photosTotal, photoCount, bundle))
    .reduce((best, candidate) => (candidate.total < best.total ? candidate : best));
}

export function calculatePricing(
  photosTotal: number,
  photoCount: number,
  pricing: IEventPricing | undefined,
  forcedTier?: IBundleTier | null,
): PricingBreakdown {
  if (!pricing || photoCount === 0) {
    return zeroBreakdown(photoCount);
  }

  // undefined -> auto-pick the best qualifying tier; null -> explicitly no tier; object -> force that tier.
  const tier = forcedTier === undefined ? bestQualifyingTier(photoCount, pricing) : (forcedTier ?? undefined);

  let subtotal = photosTotal;
  if (tier && pricing.bundleModel === 'flat-tier') {
    subtotal = photoCount * (tier.value / tier.minQuantity);
  } else if (tier && pricing.bundleModel === 'percent-tier') {
    subtotal = photosTotal * (1 - tier.value / 100);
  }

  const bundleDiscount = photosTotal - subtotal;

  return {
    photoCount,
    pricePerPhoto: photoCount > 0 ? subtotal / photoCount : 0,
    bundleApplied: !!tier,
    subtotal,
    bundleDiscount,
    platformFee: PLATFORM_FEE,
    total: subtotal + PLATFORM_FEE,
  };
}

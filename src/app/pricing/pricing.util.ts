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

function zeroBreakdown(photoCount: number, basePrice: number): PricingBreakdown {
  return {
    photoCount,
    pricePerPhoto: basePrice,
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

export function calculatePricing(
  photoCount: number,
  pricing: IEventPricing | undefined,
  forcedTier?: IBundleTier | null,
): PricingBreakdown {
  if (!pricing || photoCount === 0) {
    return zeroBreakdown(photoCount, pricing?.basePrice ?? 0);
  }

  // undefined -> auto-pick the best qualifying tier; null -> explicitly no tier; object -> force that tier.
  const tier = forcedTier === undefined ? bestQualifyingTier(photoCount, pricing) : (forcedTier ?? undefined);

  let pricePerPhoto = pricing.basePrice;
  if (tier && pricing.bundleModel === 'flat-tier') {
    pricePerPhoto = tier.value / tier.minQuantity;
  } else if (tier && pricing.bundleModel === 'percent-tier') {
    pricePerPhoto = pricing.basePrice * (1 - tier.value / 100);
  }

  const subtotal = photoCount * pricePerPhoto;
  const bundleDiscount = photoCount * pricing.basePrice - subtotal;

  return {
    photoCount,
    pricePerPhoto,
    bundleApplied: !!tier,
    subtotal,
    bundleDiscount,
    platformFee: PLATFORM_FEE,
    total: subtotal + PLATFORM_FEE,
  };
}

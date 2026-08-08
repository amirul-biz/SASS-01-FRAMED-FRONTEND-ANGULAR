import { IEventPricing, calculatePricing, qualifyingTiers } from './pricing.util';

const flatTierPricing: IEventPricing = {
  basePrice: 15,
  bundleModel: 'flat-tier',
  bundleTiers: [
    { minQuantity: 5, value: 30 },
    { minQuantity: 10, value: 50 },
  ],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
};

const percentTierPricing: IEventPricing = {
  basePrice: 15,
  bundleModel: 'percent-tier',
  bundleTiers: [{ minQuantity: 5, value: 15 }],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
};

const noBundlePricing: IEventPricing = {
  basePrice: 15,
  bundleModel: 'none',
  bundleTiers: [],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
};

describe('calculatePricing', () => {
  it('returns a zeroed breakdown for 0 photos', () => {
    expect(calculatePricing(0, flatTierPricing)).toEqual({
      photoCount: 0,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 0,
      bundleDiscount: 0,
      platformFee: 0,
      total: 0,
    });
  });

  it('returns a zeroed breakdown when pricing is undefined', () => {
    expect(calculatePricing(3, undefined)).toEqual({
      photoCount: 3,
      pricePerPhoto: 0,
      bundleApplied: false,
      subtotal: 0,
      bundleDiscount: 0,
      platformFee: 0,
      total: 0,
    });
  });

  it('charges base price below the lowest tier threshold', () => {
    expect(calculatePricing(4, flatTierPricing)).toEqual({
      photoCount: 4,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 60,
      bundleDiscount: 0,
      platformFee: 2,
      total: 62,
    });
  });

  it('applies a flat-tier rate once its threshold is met', () => {
    // tier: 5+ -> RM30 flat => RM6/photo
    expect(calculatePricing(5, flatTierPricing)).toEqual({
      photoCount: 5,
      pricePerPhoto: 6,
      bundleApplied: true,
      subtotal: 30,
      bundleDiscount: 45,
      platformFee: 2,
      total: 32,
    });
  });

  it('selects the best (highest-threshold) qualifying flat tier', () => {
    // tier: 10+ -> RM50 flat => RM5/photo
    expect(calculatePricing(10, flatTierPricing)).toEqual({
      photoCount: 10,
      pricePerPhoto: 5,
      bundleApplied: true,
      subtotal: 50,
      bundleDiscount: 100,
      platformFee: 2,
      total: 52,
    });
  });

  it('applies a percent-tier discount once its threshold is met', () => {
    // tier: 5+ -> 15% off RM15 => RM12.75/photo
    const result = calculatePricing(5, percentTierPricing);
    expect(result.bundleApplied).toBe(true);
    expect(result.pricePerPhoto).toBeCloseTo(12.75);
    expect(result.subtotal).toBeCloseTo(63.75);
    expect(result.bundleDiscount).toBeCloseTo(11.25);
    expect(result.total).toBeCloseTo(65.75);
  });

  it('never applies a bundle when bundleModel is none', () => {
    expect(calculatePricing(20, noBundlePricing)).toEqual({
      photoCount: 20,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 300,
      bundleDiscount: 0,
      platformFee: 2,
      total: 302,
    });
  });

  it('applies a caller-forced tier instead of auto-picking the best one', () => {
    // forced to the 5+ tier (RM6/photo) even though 10 photos also qualify for the better 10+ tier
    const result = calculatePricing(10, flatTierPricing, flatTierPricing.bundleTiers[0]);
    expect(result.pricePerPhoto).toBe(6);
    expect(result.subtotal).toBe(60);
    expect(result.bundleApplied).toBe(true);
    expect(result.total).toBe(62);
  });

  it('forces no discount at all when forcedTier is explicitly null, even if tiers would qualify', () => {
    const result = calculatePricing(10, flatTierPricing, null);
    expect(result.pricePerPhoto).toBe(15);
    expect(result.bundleApplied).toBe(false);
    expect(result.subtotal).toBe(150);
    expect(result.bundleDiscount).toBe(0);
    expect(result.total).toBe(152);
  });
});

describe('qualifyingTiers', () => {
  it('returns an empty list when bundleModel is none', () => {
    expect(qualifyingTiers(20, noBundlePricing)).toEqual([]);
  });

  it('returns an empty list when pricing is undefined', () => {
    expect(qualifyingTiers(20, undefined)).toEqual([]);
  });

  it('returns an empty list when the count is below every tier threshold', () => {
    expect(qualifyingTiers(4, flatTierPricing)).toEqual([]);
  });

  it('returns every qualifying tier sorted ascending by threshold', () => {
    expect(qualifyingTiers(10, flatTierPricing)).toEqual([
      { minQuantity: 5, value: 30 },
      { minQuantity: 10, value: 50 },
    ]);
  });

  it('returns only the tiers actually met when count is between thresholds', () => {
    expect(qualifyingTiers(7, flatTierPricing)).toEqual([{ minQuantity: 5, value: 30 }]);
  });
});

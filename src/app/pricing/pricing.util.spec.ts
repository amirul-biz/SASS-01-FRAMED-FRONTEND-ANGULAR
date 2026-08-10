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
    expect(calculatePricing(0, 0, flatTierPricing)).toEqual({
      photoCount: 0,
      pricePerPhoto: 0,
      bundleApplied: false,
      subtotal: 0,
      bundleDiscount: 0,
      total: 0,
    });
  });

  it('returns a zeroed breakdown when pricing is undefined', () => {
    expect(calculatePricing(0, 3, undefined)).toEqual({
      photoCount: 3,
      pricePerPhoto: 0,
      bundleApplied: false,
      subtotal: 0,
      bundleDiscount: 0,
      total: 0,
    });
  });

  it('charges the real photos total below the lowest tier threshold', () => {
    // 4 photos totalling RM60 (e.g. RM15/photo)
    expect(calculatePricing(60, 4, flatTierPricing)).toEqual({
      photoCount: 4,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 60,
      bundleDiscount: 0,
      total: 60,
    });
  });

  it('applies a flat-tier rate once its threshold is met', () => {
    // tier: 5+ -> RM30 flat => RM6/photo, independent of the real photos total (RM75 here)
    expect(calculatePricing(75, 5, flatTierPricing)).toEqual({
      photoCount: 5,
      pricePerPhoto: 6,
      bundleApplied: true,
      subtotal: 30,
      bundleDiscount: 45,
      total: 30,
    });
  });

  it('selects the best (highest-threshold) qualifying flat tier', () => {
    // tier: 10+ -> RM50 flat => RM5/photo
    expect(calculatePricing(150, 10, flatTierPricing)).toEqual({
      photoCount: 10,
      pricePerPhoto: 5,
      bundleApplied: true,
      subtotal: 50,
      bundleDiscount: 100,
      total: 50,
    });
  });

  it('applies a percent-tier discount off the real photos total once its threshold is met', () => {
    // tier: 5+ -> 15% off a RM75 total => RM63.75
    const result = calculatePricing(75, 5, percentTierPricing);
    expect(result.bundleApplied).toBe(true);
    expect(result.pricePerPhoto).toBeCloseTo(12.75);
    expect(result.subtotal).toBeCloseTo(63.75);
    expect(result.bundleDiscount).toBeCloseTo(11.25);
    expect(result.total).toBeCloseTo(63.75);
  });

  it('never applies a bundle when bundleModel is none', () => {
    expect(calculatePricing(300, 20, noBundlePricing)).toEqual({
      photoCount: 20,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 300,
      bundleDiscount: 0,
      total: 300,
    });
  });

  it('applies a caller-forced tier instead of auto-picking the best one', () => {
    // forced to the 5+ tier (RM6/photo) even though 10 photos also qualify for the better 10+ tier
    const result = calculatePricing(150, 10, flatTierPricing, flatTierPricing.bundleTiers[0]);
    expect(result.pricePerPhoto).toBe(6);
    expect(result.subtotal).toBe(60);
    expect(result.bundleApplied).toBe(true);
    expect(result.total).toBe(60);
  });

  it('forces no discount at all when forcedTier is explicitly null, even if tiers would qualify', () => {
    const result = calculatePricing(150, 10, flatTierPricing, null);
    expect(result.pricePerPhoto).toBe(15);
    expect(result.bundleApplied).toBe(false);
    expect(result.subtotal).toBe(150);
    expect(result.bundleDiscount).toBe(0);
    expect(result.total).toBe(150);
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

import { IEventPricing, calculatePricing, findVoucherRangeClashes, qualifyingConditions } from './pricing.util';

const flatVoucher = {
  discountType: 'flat-tier' as const,
  conditions: [
    { minPhotos: 5, maxPhotos: 9, value: 30 },
    { minPhotos: 10, maxPhotos: null, value: 50 },
  ],
};

const percentVoucher = {
  discountType: 'percent-tier' as const,
  conditions: [{ minPhotos: 5, maxPhotos: null, value: 15 }],
};

// Bounded tier used to exercise the overflow split: photos beyond maxPhotos are billed at their
// own price on top of the tier price, rather than disqualifying the whole order.
const allInFlatVoucher = {
  discountType: 'flat-tier' as const,
  conditions: [{ minPhotos: 4, maxPhotos: 5, value: 30 }],
};

const allInPercentVoucher = {
  discountType: 'percent-tier' as const,
  conditions: [{ minPhotos: 4, maxPhotos: 5, value: 20 }],
};

const flatTierPricing: IEventPricing = {
  vouchers: [flatVoucher],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
};

const percentTierPricing: IEventPricing = {
  vouchers: [percentVoucher],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
};

const noVoucherPricing: IEventPricing = {
  vouchers: [],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
};

function prices(count: number, price: number): number[] {
  return Array(count).fill(price);
}

describe('calculatePricing', () => {
  it('returns a zeroed breakdown for 0 photos', () => {
    expect(calculatePricing([], flatTierPricing)).toEqual({
      photoCount: 0,
      pricePerPhoto: 0,
      bundleApplied: false,
      subtotal: 0,
      bundleDiscount: 0,
      total: 0,
      coveredCount: 0,
      extraCount: 0,
      extraTotal: 0,
    });
  });

  it('returns a zeroed breakdown when pricing is undefined', () => {
    expect(calculatePricing(prices(3, 15), undefined)).toEqual({
      photoCount: 3,
      pricePerPhoto: 0,
      bundleApplied: false,
      subtotal: 0,
      bundleDiscount: 0,
      total: 0,
      coveredCount: 0,
      extraCount: 0,
      extraTotal: 0,
    });
  });

  it('charges the real photos total below the lowest range', () => {
    expect(calculatePricing(prices(4, 15), flatTierPricing)).toEqual({
      photoCount: 4,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 60,
      bundleDiscount: 0,
      total: 60,
      coveredCount: 0,
      extraCount: 0,
      extraTotal: 0,
    });
  });

  it('falls back to a lower eligible tier in a range gap and bills the remainder as extra', () => {
    // 3-5 @ 50% off, 10+ @ 40% off. 7 photos is eligible for 3-5 (not 10+), so it covers the
    // priciest 5 and bills the other 2 at their own price rather than charging full price for all 7.
    const gapped: IEventPricing = {
      vouchers: [{ discountType: 'percent-tier', conditions: [{ minPhotos: 3, maxPhotos: 5, value: 50 }, { minPhotos: 10, maxPhotos: null, value: 40 }] }],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    };
    const result = calculatePricing(prices(7, 15), gapped);
    expect(result.bundleApplied).toBe(true);
    expect(result.coveredCount).toBe(5);
    expect(result.extraCount).toBe(2);
    expect(result.extraTotal).toBe(30);
    expect(result.total).toBe(37.5 + 30);
  });

  it('applies a flat-tier rate once its range is met', () => {
    // range: 5-9 -> RM30 flat => RM6/photo, independent of the real photos total (RM75 here)
    expect(calculatePricing(prices(5, 15), flatTierPricing)).toEqual({
      photoCount: 5,
      pricePerPhoto: 6,
      bundleApplied: true,
      subtotal: 30,
      bundleDiscount: 45,
      total: 30,
      coveredCount: 5,
      extraCount: 0,
      extraTotal: 0,
    });
  });

  it('charges the same flat total for any count inside a flat-tier range, not just the minimum', () => {
    // range: 5-9 -> RM30 flat, regardless of whether it's 5, 7, or 9 photos
    const at7 = calculatePricing(prices(7, 15), flatTierPricing);
    expect(at7.subtotal).toBe(30);
    expect(at7.total).toBe(30);
    expect(at7.pricePerPhoto).toBeCloseTo(30 / 7);
    expect(at7.extraCount).toBe(0);
  });

  it('applies the unbounded top range, covering every photo with no overflow', () => {
    // range: 10+ -> RM50 flat => RM5/photo
    expect(calculatePricing(prices(10, 15), flatTierPricing)).toEqual({
      photoCount: 10,
      pricePerPhoto: 5,
      bundleApplied: true,
      subtotal: 50,
      bundleDiscount: 100,
      total: 50,
      coveredCount: 10,
      extraCount: 0,
      extraTotal: 0,
    });
  });

  it('applies a percent-tier discount off the real photos total once its range is met', () => {
    const result = calculatePricing(prices(5, 15), percentTierPricing);
    expect(result.bundleApplied).toBe(true);
    expect(result.pricePerPhoto).toBeCloseTo(12.75);
    expect(result.subtotal).toBeCloseTo(63.75);
    expect(result.bundleDiscount).toBeCloseTo(11.25);
    expect(result.total).toBeCloseTo(63.75);
    expect(result.extraCount).toBe(0);
  });

  it('never applies a discount when there are no attached vouchers', () => {
    expect(calculatePricing(prices(20, 15), noVoucherPricing)).toEqual({
      photoCount: 20,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 300,
      bundleDiscount: 0,
      total: 300,
      coveredCount: 0,
      extraCount: 0,
      extraTotal: 0,
    });
  });

  it('picks whichever attached voucher condition gives the lowest total when several match', () => {
    const twoVouchers: IEventPricing = {
      vouchers: [
        { discountType: 'flat-tier', conditions: [{ minPhotos: 5, maxPhotos: null, value: 40 }] }, // RM8/photo
        { discountType: 'percent-tier', conditions: [{ minPhotos: 5, maxPhotos: null, value: 50 }] }, // 50% off RM75 = RM37.50
      ],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    };
    const result = calculatePricing(prices(5, 15), twoVouchers);
    expect(result.total).toBe(37.5);
  });

  it('applies a caller-forced condition instead of auto-picking the best one, billing photos beyond it as extra', () => {
    // Forcing the 5-9/RM30 condition through for 10 photos covers the priciest 9 for a flat RM30
    // and bills the 10th (also RM15 here, since all photos are equal) on top — RM45 total, not a
    // rate scaled by the forced-through count and not RM30 flat for all 10.
    const forced = { voucher: flatVoucher, condition: flatVoucher.conditions[0] };
    const result = calculatePricing(prices(10, 15), flatTierPricing, forced);
    expect(result.coveredCount).toBe(9);
    expect(result.extraCount).toBe(1);
    expect(result.extraTotal).toBe(15);
    expect(result.subtotal).toBe(45);
    expect(result.pricePerPhoto).toBe(4.5);
    expect(result.bundleApplied).toBe(true);
  });

  it('forces no discount at all when forcedCondition is explicitly null', () => {
    const result = calculatePricing(prices(10, 15), flatTierPricing, null);
    expect(result.pricePerPhoto).toBe(15);
    expect(result.bundleApplied).toBe(false);
    expect(result.subtotal).toBe(150);
    expect(result.total).toBe(150);
    expect(result.extraCount).toBe(0);
  });

  it('still requires the minimum photo count — a bounded tier never applies below it', () => {
    const result = calculatePricing(prices(3, 12), { vouchers: [allInFlatVoucher], fullGalleryEnabled: false, fullGalleryPrice: 0 });
    expect(result.bundleApplied).toBe(false);
    expect(result.total).toBe(36);
  });

  it('bills photos beyond a bounded flat-tier cap at their own price instead of disqualifying the order', () => {
    // "4-5 photos for RM30" with 6 photos selected: RM30 covers 5, the 6th is billed at RM12.
    const result = calculatePricing(prices(6, 12), { vouchers: [allInFlatVoucher], fullGalleryEnabled: false, fullGalleryPrice: 0 });
    expect(result.bundleApplied).toBe(true);
    expect(result.coveredCount).toBe(5);
    expect(result.extraCount).toBe(1);
    expect(result.extraTotal).toBe(12);
    expect(result.total).toBe(42);
  });

  it('bills photos beyond a bounded percent-tier cap at their own price too', () => {
    // "4-5 photos for 20% off" with 6 photos: 20% off the covered 5 (RM60 -> RM48), plus the 6th
    // at full price (RM12) = RM60.
    const result = calculatePricing(prices(6, 12), { vouchers: [allInPercentVoucher], fullGalleryEnabled: false, fullGalleryPrice: 0 });
    expect(result.bundleApplied).toBe(true);
    expect(result.coveredCount).toBe(5);
    expect(result.extraCount).toBe(1);
    expect(result.extraTotal).toBe(12);
    expect(result.total).toBe(60);
  });

  it('fills the voucher with the priciest photos and spills the cheapest over, minimising the total', () => {
    const result = calculatePricing([25, 25, 12, 12, 12, 12], {
      vouchers: [allInFlatVoucher],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    });
    // Covered: 25, 25, 12, 12, 12 (flat RM30). Extra: the remaining 12.
    expect(result.coveredCount).toBe(5);
    expect(result.extraCount).toBe(1);
    expect(result.extraTotal).toBe(12);
    expect(result.total).toBe(42);
  });
});

describe('qualifyingConditions', () => {
  it('returns an empty list when there are no attached vouchers', () => {
    expect(qualifyingConditions(20, noVoucherPricing)).toEqual([]);
  });

  it('returns an empty list when pricing is undefined', () => {
    expect(qualifyingConditions(20, undefined)).toEqual([]);
  });

  it('returns an empty list when the count is below every range', () => {
    expect(qualifyingConditions(4, flatTierPricing)).toEqual([]);
  });

  it('returns the one matching range per voucher', () => {
    expect(qualifyingConditions(7, flatTierPricing)).toEqual([
      { voucher: flatVoucher, condition: flatVoucher.conditions[0] },
    ]);
  });

  it('returns matches across every attached voucher', () => {
    const twoVouchers: IEventPricing = {
      vouchers: [flatVoucher, percentVoucher],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    };
    expect(qualifyingConditions(7, twoVouchers)).toEqual([
      { voucher: flatVoucher, condition: flatVoucher.conditions[0] },
      { voucher: percentVoucher, condition: percentVoucher.conditions[0] },
    ]);
  });

  it('picks the deepest eligible condition when a photo count clears more than one tier of the same voucher', () => {
    // 12 photos is eligible for both "5-9" and "10+" now that maxPhotos no longer disqualifies —
    // the deepest tier reached (highest minPhotos) is the intended one.
    expect(qualifyingConditions(12, flatTierPricing)).toEqual([
      { voucher: flatVoucher, condition: flatVoucher.conditions[1] },
    ]);
  });
});

describe('findVoucherRangeClashes', () => {
  it('returns no clashes for a single voucher', () => {
    const vouchers = [{ id: 'v1', name: 'Group Discount', conditions: flatVoucher.conditions }];
    expect(findVoucherRangeClashes(vouchers)).toEqual([]);
  });

  it('returns no clashes when ranges across vouchers do not overlap', () => {
    const vouchers = [
      { id: 'v1', name: 'Early Bundle', conditions: [{ minPhotos: 1, maxPhotos: 4, value: 10 }] },
      { id: 'v2', name: 'Late Bundle', conditions: [{ minPhotos: 5, maxPhotos: 9, value: 20 }] },
    ];
    expect(findVoucherRangeClashes(vouchers)).toEqual([]);
  });

  it('detects a clash between a bounded range and an overlapping unbounded range', () => {
    const vouchers = [
      { id: 'v1', name: 'Group Discount', conditions: [{ minPhotos: 5, maxPhotos: 10, value: 20 }] },
      { id: 'v2', name: 'Early Bird Flat Rate', conditions: [{ minPhotos: 5, maxPhotos: null, value: 30 }] },
    ];
    const clashes = findVoucherRangeClashes(vouchers);
    expect(clashes).toEqual([
      {
        a: { id: 'v1', name: 'Group Discount', condition: vouchers[0].conditions[0] },
        b: { id: 'v2', name: 'Early Bird Flat Rate', condition: vouchers[1].conditions[0] },
      },
    ]);
  });

  it('does not compare a voucher against its own conditions', () => {
    const vouchers = [{ id: 'v1', name: 'Tiered', conditions: flatVoucher.conditions }]; // 5-9 and 10+, adjacent not overlapping
    expect(findVoucherRangeClashes(vouchers)).toEqual([]);
  });

  it('detects every overlapping pair across three or more vouchers', () => {
    const vouchers = [
      { id: 'v1', name: 'A', conditions: [{ minPhotos: 5, maxPhotos: 10, value: 20 }] },
      { id: 'v2', name: 'B', conditions: [{ minPhotos: 8, maxPhotos: 12, value: 25 }] },
      { id: 'v3', name: 'C', conditions: [{ minPhotos: 20, maxPhotos: null, value: 40 }] },
    ];
    const clashes = findVoucherRangeClashes(vouchers);
    expect(clashes).toEqual([
      { a: { id: 'v1', name: 'A', condition: vouchers[0].conditions[0] }, b: { id: 'v2', name: 'B', condition: vouchers[1].conditions[0] } },
    ]);
  });
});

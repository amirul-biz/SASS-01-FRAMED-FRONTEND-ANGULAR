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

  it('charges the real photos total below the lowest range', () => {
    expect(calculatePricing(60, 4, flatTierPricing)).toEqual({
      photoCount: 4,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 60,
      bundleDiscount: 0,
      total: 60,
    });
  });

  it('charges the real photos total when the count falls in a gap between ranges', () => {
    const gapped: IEventPricing = {
      vouchers: [{ discountType: 'percent-tier', conditions: [{ minPhotos: 3, maxPhotos: 5, value: 50 }, { minPhotos: 10, maxPhotos: null, value: 40 }] }],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    };
    // 7 photos: matches neither 3-5 nor 10+
    const result = calculatePricing(105, 7, gapped);
    expect(result.bundleApplied).toBe(false);
    expect(result.total).toBe(105);
  });

  it('applies a flat-tier rate once its range is met', () => {
    // range: 5-9 -> RM30 flat => RM6/photo, independent of the real photos total (RM75 here)
    expect(calculatePricing(75, 5, flatTierPricing)).toEqual({
      photoCount: 5,
      pricePerPhoto: 6,
      bundleApplied: true,
      subtotal: 30,
      bundleDiscount: 45,
      total: 30,
    });
  });

  it('applies the unbounded top range', () => {
    // range: 10+ -> RM50 flat => RM5/photo
    expect(calculatePricing(150, 10, flatTierPricing)).toEqual({
      photoCount: 10,
      pricePerPhoto: 5,
      bundleApplied: true,
      subtotal: 50,
      bundleDiscount: 100,
      total: 50,
    });
  });

  it('applies a percent-tier discount off the real photos total once its range is met', () => {
    const result = calculatePricing(75, 5, percentTierPricing);
    expect(result.bundleApplied).toBe(true);
    expect(result.pricePerPhoto).toBeCloseTo(12.75);
    expect(result.subtotal).toBeCloseTo(63.75);
    expect(result.bundleDiscount).toBeCloseTo(11.25);
    expect(result.total).toBeCloseTo(63.75);
  });

  it('never applies a discount when there are no attached vouchers', () => {
    expect(calculatePricing(300, 20, noVoucherPricing)).toEqual({
      photoCount: 20,
      pricePerPhoto: 15,
      bundleApplied: false,
      subtotal: 300,
      bundleDiscount: 0,
      total: 300,
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
    const result = calculatePricing(75, 5, twoVouchers);
    expect(result.total).toBe(37.5);
  });

  it('applies a caller-forced condition instead of auto-picking the best one', () => {
    const forced = { voucher: flatVoucher, condition: flatVoucher.conditions[0] };
    const result = calculatePricing(150, 10, flatTierPricing, forced);
    expect(result.pricePerPhoto).toBe(6);
    expect(result.subtotal).toBe(60);
    expect(result.bundleApplied).toBe(true);
  });

  it('forces no discount at all when forcedCondition is explicitly null', () => {
    const result = calculatePricing(150, 10, flatTierPricing, null);
    expect(result.pricePerPhoto).toBe(15);
    expect(result.bundleApplied).toBe(false);
    expect(result.subtotal).toBe(150);
    expect(result.total).toBe(150);
  });
});

describe('qualifyingConditions', () => {
  it('returns an empty list when there are no attached vouchers', () => {
    expect(qualifyingConditions(20, noVoucherPricing)).toEqual([]);
  });

  it('returns an empty list when pricing is undefined', () => {
    expect(qualifyingConditions(20, undefined)).toEqual([]);
  });

  it('returns an empty list when the count matches no range', () => {
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

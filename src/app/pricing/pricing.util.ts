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
  coveredCount: number;
  extraCount: number;
  extraTotal: number;
}

function zeroBreakdown(photoCount: number): PricingBreakdown {
  return {
    photoCount,
    pricePerPhoto: 0,
    bundleApplied: false,
    subtotal: 0,
    bundleDiscount: 0,
    total: 0,
    coveredCount: 0,
    extraCount: 0,
    extraTotal: 0,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// A condition's maxPhotos caps how many photos it COVERS, not how many the rider is allowed to
// select — a 6th photo against a "4-5 photos" tier still qualifies, it's just billed separately.
function isEligible(photoCount: number, condition: IVoucherCondition): boolean {
  return photoCount >= condition.minPhotos;
}

function rangesOverlap(a: IVoucherCondition, b: IVoucherCondition): boolean {
  const aStartsBeforeBEnds = b.maxPhotos === null || a.minPhotos <= b.maxPhotos;
  const bStartsBeforeAEnds = a.maxPhotos === null || b.minPhotos <= a.maxPhotos;
  return aStartsBeforeBEnds && bStartsBeforeAEnds;
}

export interface VoucherClashParty {
  id: string;
  name: string;
  condition: IVoucherCondition;
}

export interface VoucherClash {
  a: VoucherClashParty;
  b: VoucherClashParty;
}

/**
 * Two *different* checked vouchers whose photo-count ranges overlap create an ambiguous bundle —
 * a rider in that range would qualify for both, with no clear rule for which one wins. Conditions
 * within a single voucher never clash with each other (they're built non-overlapping), so only
 * cross-voucher pairs are compared.
 */
export function findVoucherRangeClashes(
  vouchers: { id: string; name: string; conditions: IVoucherCondition[] }[],
): VoucherClash[] {
  const clashes: VoucherClash[] = [];
  for (let i = 0; i < vouchers.length; i++) {
    for (let j = i + 1; j < vouchers.length; j++) {
      for (const conditionA of vouchers[i].conditions) {
        for (const conditionB of vouchers[j].conditions) {
          if (rangesOverlap(conditionA, conditionB)) {
            clashes.push({
              a: { id: vouchers[i].id, name: vouchers[i].name, condition: conditionA },
              b: { id: vouchers[j].id, name: vouchers[j].name, condition: conditionB },
            });
          }
        }
      }
    }
  }
  return clashes;
}

/**
 * At most one matching condition per voucher (ranges within a voucher don't overlap by
 * construction). With no upper eligibility bound, several of a voucher's conditions can all be
 * eligible at once (e.g. 12 photos qualifies for both "5-9" and "10+") — the one with the highest
 * `minPhotos` is the deepest tier reached, so that's the one picked.
 */
export function qualifyingConditions(photoCount: number, pricing: IEventPricing | undefined): QualifyingMatch[] {
  if (!pricing) {
    return [];
  }
  const result: QualifyingMatch[] = [];
  for (const voucher of pricing.vouchers) {
    const eligible = voucher.conditions.filter((c) => isEligible(photoCount, c));
    const condition = eligible.reduce<IVoucherCondition | undefined>(
      (deepest, c) => (!deepest || c.minPhotos > deepest.minPhotos ? c : deepest),
      undefined,
    );
    if (condition) {
      result.push({ voucher, condition });
    }
  }
  return result;
}

// A condition's maxPhotos caps how many (highest-priced) photos it covers; anything beyond that is
// billed at its own price. Sorting descending first means the priciest photos always fill the
// voucher — the arrangement that minimises what the rider pays either way (see splitFor callers).
function splitFor(sortedDesc: number[], condition: IVoucherCondition): { inTier: number[]; extra: number[] } {
  const covered = condition.maxPhotos === null ? sortedDesc.length : Math.min(condition.maxPhotos, sortedDesc.length);
  return { inTier: sortedDesc.slice(0, covered), extra: sortedDesc.slice(covered) };
}

function subtotalFor(sortedDesc: number[], match: QualifyingMatch): number {
  const { inTier, extra } = splitFor(sortedDesc, match.condition);
  const inTierTotal = sum(inTier);
  const tierPrice =
    match.voucher.discountType === 'flat-tier' ? match.condition.value : inTierTotal * (1 - match.condition.value / 100);
  return tierPrice + sum(extra);
}

function bestMatch(sortedDesc: number[], pricing: IEventPricing): QualifyingMatch | undefined {
  const matches = qualifyingConditions(sortedDesc.length, pricing);
  if (matches.length === 0) {
    return undefined;
  }
  return matches
    .map((match) => ({ match, subtotal: subtotalFor(sortedDesc, match) }))
    .reduce((best, cur) => (cur.subtotal < best.subtotal ? cur : best)).match;
}

/**
 * `photoPrices` holds what each selected photo actually costs (driven by the pricing
 * option/format the rider chose for it). A voucher condition covers at most `maxPhotos` of those
 * photos — the priciest ones, to minimise the rider's total — and either replaces their combined
 * price outright or discounts it:
 * - flat-tier unlocks one flat price for the covered photos (`condition.value`), independent of
 *   both their individual prices and exactly how many of them there are within the matched range —
 *   "4-5 photos for RM35" costs RM35 whether it's 4 or 5 covered photos.
 * - percent-tier takes a percentage off the covered photos' combined price.
 * Any photo beyond `maxPhotos` is billed at its own price on top of the tier price — a condition
 * caps how many photos it covers, it does not disqualify the whole order for exceeding it.
 */
export function calculatePricing(
  photoPrices: number[],
  pricing: IEventPricing | undefined,
  forcedMatch?: QualifyingMatch | null,
): PricingBreakdown {
  const photoCount = photoPrices.length;
  if (!pricing || photoCount === 0) {
    return zeroBreakdown(photoCount);
  }

  const sortedDesc = [...photoPrices].sort((a, b) => b - a);
  const photosTotal = sum(sortedDesc);

  // undefined -> auto-pick the best qualifying match; null -> explicitly no discount; object -> force that match.
  const match = forcedMatch === undefined ? bestMatch(sortedDesc, pricing) : (forcedMatch ?? undefined);

  const subtotal = match ? subtotalFor(sortedDesc, match) : photosTotal;
  const bundleDiscount = photosTotal - subtotal;
  const { inTier, extra } = match ? splitFor(sortedDesc, match.condition) : { inTier: [], extra: sortedDesc };

  return {
    photoCount,
    pricePerPhoto: photoCount > 0 ? subtotal / photoCount : 0,
    bundleApplied: !!match,
    subtotal,
    bundleDiscount,
    total: subtotal,
    coveredCount: match ? inTier.length : 0,
    extraCount: match ? extra.length : 0,
    extraTotal: match ? sum(extra) : 0,
  };
}

# Pricing Bundle Form: Pricing Options Card — Scoped, In Progress

Status: **Scoped and approved 2026-08-19. Executing inline.**

## Confirmed decisions

1. `basePrice` drops from BE schema + DTO entirely (not just hidden from form).
2. Live Preview on the bundle-form shows **every checked pricing option's price** (list, not one number).
3. The new bundle-level pricing-options picker is **fully independent** from the existing per-event
   picker in `pricing-settings.component.ts` — no filtering/linking between them.
4. Any other screen that shows a single `RM.../photo` number for a bundle (now that `basePrice` is
   gone) uses the **lowest price among the bundle's attached pricing options** (0 if none attached).

## Full scope (BE + FE — bigger than originally captured)

### BE (`C:\projects\picsweep`)

- `prisma/schema.prisma`: drop `basePrice` column from `PricingBundle`; add `BundlePricingOption`
  join model mirroring `BundleVoucher` (composite PK `[pricingBundleId, pricingOptionId]`, cascade
  on bundle FK, restrict on pricing-option FK).
- New hand-written migration (drop column, create join table) applied via `prisma migrate deploy`.
- `src/pricing-bundles/pricing-bundles.dto.ts`: remove `basePrice`, add `pricingOptionIds: string[]`
  to Create/Update DTOs; add `PricingOptionSummaryDto`; response DTO gets
  `pricingOptions: PricingOptionSummaryDto[]`.
- `src/pricing-bundles/pricing-bundles.repository.ts`: mirror the existing voucher include/create/
  update-transaction pattern for the new join.
- `src/pricing-bundles/pricing-bundles.service.ts`: `toResponse()` maps `pricingOptions`.
- Specs updated for all of the above.

### FE (`C:\projects\picsweep-fe`)

- `pricing-bundles.service.ts`: `IPricingBundle` loses `basePrice`, gains
  `pricingOptions: {id,label,price}[]`; `PricingBundleInput`/`Changes` gain `pricingOptionIds`;
  `SEED_BUNDLES` rewritten; add exported `lowestOptionPrice(bundle)` helper.
- `pricing.util.ts` / `.spec.ts`: `IEventPricing` loses `basePrice` (unused internally, fixture-only
  change).
- `pricing-bundle-form.component.ts/html`: remove basePrice field + fullGallery toggle section; add
  "Pricing Options" checkbox card below Vouchers (same pattern as voucher checkboxes); Live Preview
  lists price per checked option.
- `pricing-settings.component.ts` (`previewByBundle`) + `.html`: swap `bundle.basePrice` for
  `lowestOptionPrice(bundle)` — compile-fix only, no picker-linkage change (per decision 3).
- `earnings.component.ts/.html`, `admin/dashboard-overview/admin-dashboard-overview.component.ts`,
  `create-event.component.html`, `pricing-bundles-list.component.html`: swap `bundle.basePrice` →
  `lowestOptionPrice(bundle)`.

## Do not push to GitHub — local commits only, per standing instruction.

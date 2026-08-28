import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IPricingBundle, PricingBundlesService } from '../../../pricing/pricing-bundles.service';
import { IPhotoFormatOption, PricingOptionsService } from '../../../pricing/pricing-options.service';
import { IVoucher, VouchersService } from '../../../pricing/vouchers.service';
import { calculatePricing, findVoucherRangeClashes } from '../../../pricing/pricing.util';
import { formatCurrency } from '../../../pricing/currency.util';

type DraftBundle = Omit<IPricingBundle, 'id' | 'eventsUsingCount' | 'vouchers' | 'pricingOptions'> & {
  voucherIds: string[];
  pricingOptionIds: string[];
};

@Component({
  selector: 'app-pricing-bundle-form',
  imports: [RouterLink],
  templateUrl: './pricing-bundle-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingBundleFormComponent {
  private readonly auth = inject(AuthService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
  private readonly pricingOptionsService = inject(PricingOptionsService);
  private readonly vouchersService = inject(VouchersService);
  private readonly router = inject(Router);

  id = input<string>();

  // Flips once after the initial fetch resolves, so the draft below can re-derive itself from a
  // freshly-populated cache without also reacting to unrelated data mutations later in the session.
  private readonly loaded = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly isEditMode = computed(() => !!this.id());
  readonly existingBundle = computed(() => {
    const id = this.id();
    return id ? this.pricingBundlesService.getBundle(id) : undefined;
  });

  readonly availableVouchers = signal<IVoucher[]>([]);
  readonly availablePricingOptions = signal<IPhotoFormatOption[]>([]);

  // Resets whenever `id` changes or the initial fetch completes, but not on unrelated data mutations
  // elsewhere in the app — the bundle lookup itself is read untracked for that reason (same pattern as
  // event pricing assignment).
  readonly draft = linkedSignal<DraftBundle>(() => {
    this.id();
    this.loaded();
    const blank: DraftBundle = {
      photographerId: this.auth.photographerId()!,
      name: '',
      voucherIds: [],
      pricingOptionIds: [],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    };
    const existing = untracked(() => this.existingBundle());
    if (!existing) {
      return blank;
    }
    return {
      photographerId: existing.photographerId,
      name: existing.name,
      voucherIds: existing.vouchers.map((v) => v.id),
      pricingOptionIds: existing.pricingOptions.map((o) => o.id),
      fullGalleryEnabled: existing.fullGalleryEnabled,
      fullGalleryPrice: existing.fullGalleryPrice,
    };
  });

  // The pricing options the photographer has ticked for this bundle — each shown with its own price
  // in the Live Preview (no single "the" price once a bundle can carry several formats).
  readonly checkedPricingOptions = computed(() => {
    const selected = new Set(this.draft().pricingOptionIds);
    return this.availablePricingOptions().filter((o) => selected.has(o.id));
  });

  readonly checkedVouchers = computed(() => {
    const selected = new Set(this.draft().voucherIds);
    return this.availableVouchers().filter((v) => selected.has(v.id));
  });

  // Two checked vouchers whose ranges overlap create an ambiguous bundle (a rider in that range
  // would qualify for both). Hard-blocks save — see toggleVoucher/save.
  readonly voucherClashes = computed(() => findVoucherRangeClashes(this.checkedVouchers()));
  readonly hasVoucherClash = computed(() => this.voucherClashes().length > 0);

  // For every checked pricing option, show how each checked voucher's conditions discount it —
  // grouped by option so the preview reads as "this format costs X, or Y with a voucher applied".
  readonly previewByOption = computed(() => {
    const vouchers = this.checkedVouchers();
    return this.checkedPricingOptions().map((option) => ({
      option,
      matches: vouchers.flatMap((voucher) =>
        voucher.conditions.map((condition) => ({
          voucher,
          condition,
          preview: calculatePricing(condition.minPhotos * option.price, condition.minPhotos, {
            vouchers: [voucher],
            fullGalleryEnabled: false,
            fullGalleryPrice: 0,
          }),
        })),
      ),
    }));
  });

  constructor() {
    const photographerId = this.auth.photographerId()!;
    this.vouchersService.getVouchers(photographerId).then((vouchers) => this.availableVouchers.set(vouchers));
    this.pricingOptionsService.getOptions(photographerId).then((options) => this.availablePricingOptions.set(options));

    const id = this.id();
    if (id) {
      this.pricingBundlesService.fetchBundle(photographerId, id).then(() => this.loaded.set(true));
    } else {
      this.loaded.set(true);
    }
  }

  setName(value: string): void {
    this.draft.update((d) => ({ ...d, name: value }));
  }

  isVoucherChecked(id: string): boolean {
    return this.draft().voucherIds.includes(id);
  }

  toggleVoucher(id: string): void {
    this.draft.update((d) => ({
      ...d,
      voucherIds: d.voucherIds.includes(id) ? d.voucherIds.filter((v) => v !== id) : [...d.voucherIds, id],
    }));
  }

  isOptionChecked(id: string): boolean {
    return this.draft().pricingOptionIds.includes(id);
  }

  toggleOption(id: string): void {
    this.draft.update((d) => ({
      ...d,
      pricingOptionIds: d.pricingOptionIds.includes(id)
        ? d.pricingOptionIds.filter((o) => o !== id)
        : [...d.pricingOptionIds, id],
    }));
  }

  save(): void {
    if (!this.draft().name.trim() || this.hasVoucherClash()) {
      return;
    }
    const id = this.id();
    const save = id
      ? this.pricingBundlesService.updateBundle(id, this.draft())
      : this.pricingBundlesService.createBundle(this.draft());
    save.then(() => this.router.navigate(['/studio/pricing-bundles']));
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IPricingBundle, PricingBundlesService } from '../../../pricing/pricing-bundles.service';
import { IVoucher, VouchersService } from '../../../pricing/vouchers.service';
import { calculatePricing } from '../../../pricing/pricing.util';
import { formatCurrency } from '../../../pricing/currency.util';

type DraftBundle = Omit<IPricingBundle, 'id' | 'eventsUsingCount' | 'vouchers'> & { voucherIds: string[] };

@Component({
  selector: 'app-pricing-bundle-form',
  imports: [RouterLink],
  templateUrl: './pricing-bundle-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingBundleFormComponent {
  private readonly auth = inject(AuthService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
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

  // Resets whenever `id` changes or the initial fetch completes, but not on unrelated data mutations
  // elsewhere in the app — the bundle lookup itself is read untracked for that reason (same pattern as
  // event pricing assignment).
  readonly draft = linkedSignal<DraftBundle>(() => {
    this.id();
    this.loaded();
    const blank: DraftBundle = {
      photographerId: this.auth.photographerId()!,
      name: '',
      basePrice: 15,
      voucherIds: [],
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
      basePrice: existing.basePrice,
      voucherIds: existing.vouchers.map((v) => v.id),
      fullGalleryEnabled: existing.fullGalleryEnabled,
      fullGalleryPrice: existing.fullGalleryPrice,
    };
  });

  readonly previewMatches = computed(() => {
    const selected = new Set(this.draft().voucherIds);
    const vouchers = this.availableVouchers().filter((v) => selected.has(v.id));
    return vouchers.flatMap((voucher) =>
      voucher.conditions.map((condition) => ({
        voucher,
        condition,
        preview: calculatePricing(condition.minPhotos * this.draft().basePrice, condition.minPhotos, {
          basePrice: this.draft().basePrice,
          vouchers: [voucher],
          fullGalleryEnabled: false,
          fullGalleryPrice: 0,
        }),
      })),
    );
  });

  constructor() {
    const photographerId = this.auth.photographerId()!;
    this.vouchersService.getVouchers(photographerId).then((vouchers) => this.availableVouchers.set(vouchers));

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

  setBasePrice(value: string): void {
    const basePrice = Number(value) || 0;
    this.draft.update((d) => ({ ...d, basePrice }));
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

  toggleFullGallery(): void {
    this.draft.update((d) => ({ ...d, fullGalleryEnabled: !d.fullGalleryEnabled }));
  }

  setFullGalleryPrice(value: string): void {
    const fullGalleryPrice = Number(value) || 0;
    this.draft.update((d) => ({ ...d, fullGalleryPrice }));
  }

  save(): void {
    if (!this.draft().name.trim()) {
      return;
    }
    const id = this.id();
    const save = id
      ? this.pricingBundlesService.updateBundle(id, this.draft())
      : this.pricingBundlesService.createBundle(this.draft());
    save.then(() => this.router.navigate(['/studio/pricing-bundles']));
  }
}

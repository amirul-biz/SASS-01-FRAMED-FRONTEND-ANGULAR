import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IPricingBundle, PricingBundlesService } from '../../../pricing/pricing-bundles.service';
import { BundleModel, IBundleTier, calculatePricing } from '../../../pricing/pricing.util';
import { formatCurrency } from '../../../pricing/currency.util';

type DraftBundle = Omit<IPricingBundle, 'id'>;

@Component({
  selector: 'app-pricing-bundle-form',
  imports: [RouterLink],
  templateUrl: './pricing-bundle-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingBundleFormComponent {
  private readonly auth = inject(AuthService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
  private readonly router = inject(Router);

  id = input<string>();

  readonly formatCurrency = formatCurrency;
  readonly isEditMode = computed(() => !!this.id());
  readonly existingBundle = computed(() => {
    const id = this.id();
    return id ? this.pricingBundlesService.getBundle(id) : undefined;
  });

  // Resets whenever `id` changes, but not on unrelated data mutations elsewhere in the app —
  // the bundle lookup itself is read untracked for that reason (same pattern as event pricing assignment).
  readonly draft = linkedSignal<DraftBundle>(() => {
    this.id();
    const blank: DraftBundle = {
      photographerId: this.auth.demoPhotographerId,
      name: '',
      basePrice: 15,
      bundleModel: 'none',
      bundleTiers: [],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    };
    return structuredClone(untracked(() => this.existingBundle()) ?? blank);
  });

  readonly previewTiers = computed(() =>
    this.draft().bundleTiers.map((tier) => ({
      tier,
      preview: calculatePricing(tier.minQuantity * this.draft().basePrice, tier.minQuantity, this.draft()),
    })),
  );

  setName(value: string): void {
    this.draft.update((d) => ({ ...d, name: value }));
  }

  setBasePrice(value: string): void {
    const basePrice = Number(value) || 0;
    this.draft.update((d) => ({ ...d, basePrice }));
  }

  setBundleModel(model: BundleModel): void {
    this.draft.update((d) => ({ ...d, bundleModel: model }));
  }

  addTier(): void {
    const newTier: IBundleTier = { minQuantity: 5, value: this.draft().bundleModel === 'percent-tier' ? 10 : 30 };
    this.draft.update((d) => ({ ...d, bundleTiers: [...d.bundleTiers, newTier] }));
  }

  removeTier(index: number): void {
    this.draft.update((d) => ({ ...d, bundleTiers: d.bundleTiers.filter((_, i) => i !== index) }));
  }

  updateTierMinQuantity(index: number, value: string): void {
    const minQuantity = Number(value) || 0;
    this.draft.update((d) => ({
      ...d,
      bundleTiers: d.bundleTiers.map((t, i) => (i === index ? { ...t, minQuantity } : t)),
    }));
  }

  updateTierValue(index: number, value: string): void {
    const tierValue = Number(value) || 0;
    this.draft.update((d) => ({
      ...d,
      bundleTiers: d.bundleTiers.map((t, i) => (i === index ? { ...t, value: tierValue } : t)),
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
    if (id) {
      this.pricingBundlesService.updateBundle(id, this.draft());
    } else {
      this.pricingBundlesService.createBundle(this.draft());
    }
    this.router.navigate(['/studio/pricing-bundles']);
  }
}

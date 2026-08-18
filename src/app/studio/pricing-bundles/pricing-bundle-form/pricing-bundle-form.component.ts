import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IPricingBundle, PricingBundlesService } from '../../../pricing/pricing-bundles.service';
import { BundleModel, IBundleTier, calculatePricing } from '../../../pricing/pricing.util';
import { formatCurrency } from '../../../pricing/currency.util';

type DraftBundle = Omit<IPricingBundle, 'id' | 'eventsUsingCount'>;

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

  // Flips once after the initial fetch resolves, so the draft below can re-derive itself from a
  // freshly-populated cache without also reacting to unrelated data mutations later in the session.
  private readonly loaded = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly isEditMode = computed(() => !!this.id());
  readonly existingBundle = computed(() => {
    const id = this.id();
    return id ? this.pricingBundlesService.getBundle(id) : undefined;
  });

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
      bundleModel: 'none',
      bundleTiers: [],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    };
    return structuredClone(untracked(() => this.existingBundle()) ?? blank);
  });

  constructor() {
    const id = this.id();
    if (id) {
      this.pricingBundlesService.fetchBundle(this.auth.photographerId()!, id).then(() => this.loaded.set(true));
    } else {
      this.loaded.set(true);
    }
  }

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
    const save = id
      ? this.pricingBundlesService.updateBundle(id, this.draft())
      : this.pricingBundlesService.createBundle(this.draft());
    save.then(() => this.router.navigate(['/studio/pricing-bundles']));
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { EventsService } from '../events/events.service';
import { IEventPricing } from './pricing.util';

export interface IPricingBundle extends IEventPricing {
  id: string;
  photographerId: string;
  name: string;
}

const INITIAL_BUNDLES: IPricingBundle[] = [
  {
    id: 'alex-standard-bundle',
    photographerId: 'alex-rivers',
    name: 'Standard Bundle',
    basePrice: 15,
    bundleModel: 'flat-tier',
    bundleTiers: [
      { minQuantity: 5, value: 30 },
      { minQuantity: 10, value: 50 },
    ],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
  },
  {
    id: 'alex-budget-mtb-bundle',
    photographerId: 'alex-rivers',
    name: 'Budget MTB Bundle',
    basePrice: 12,
    bundleModel: 'flat-tier',
    bundleTiers: [{ minQuantity: 5, value: 25 }],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
  },
  {
    id: 'alex-premium-percent-bundle',
    photographerId: 'alex-rivers',
    name: 'Premium Percent Bundle',
    basePrice: 18,
    bundleModel: 'percent-tier',
    bundleTiers: [{ minQuantity: 5, value: 15 }],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
  },
  {
    id: 'alex-per-photo-only',
    photographerId: 'alex-rivers',
    name: 'Per-Photo Only',
    basePrice: 15,
    bundleModel: 'none',
    bundleTiers: [],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
  },
  {
    id: 'marcus-standard-bundle',
    photographerId: 'marcus-chen',
    name: 'Standard Bundle',
    basePrice: 15,
    bundleModel: 'flat-tier',
    bundleTiers: [{ minQuantity: 5, value: 30 }],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
  },
  {
    id: 'sarah-per-photo-only',
    photographerId: 'sarah-jenkins',
    name: 'Per-Photo Only',
    basePrice: 15,
    bundleModel: 'none',
    bundleTiers: [],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
  },
  {
    id: 'unknown-per-photo-only',
    photographerId: 'unknown-uploader',
    name: 'Per-Photo Only',
    basePrice: 15,
    bundleModel: 'none',
    bundleTiers: [],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
  },
];

export type PricingBundleInput = Omit<IPricingBundle, 'id'>;
export type PricingBundleChanges = Partial<Omit<IPricingBundle, 'id' | 'photographerId'>>;

@Injectable({ providedIn: 'root' })
export class PricingBundlesService {
  private readonly eventsService = inject(EventsService);
  private readonly bundles = signal<IPricingBundle[]>(INITIAL_BUNDLES);

  getBundles(photographerId: string): IPricingBundle[] {
    return this.bundles().filter((b) => b.photographerId === photographerId);
  }

  getBundle(id: string): IPricingBundle | undefined {
    return this.bundles().find((b) => b.id === id);
  }

  eventCountUsingBundle(id: string): number {
    return this.eventsService.getEvents().filter((e) => e.pricingBundleIds.includes(id)).length;
  }

  createBundle(input: PricingBundleInput): IPricingBundle {
    const id = this.uniqueSlug(input.name);
    const bundle: IPricingBundle = { ...input, id };
    this.bundles.update((list) => [...list, bundle]);
    return bundle;
  }

  updateBundle(id: string, changes: PricingBundleChanges): void {
    this.bundles.update((list) => list.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  }

  deleteBundle(id: string): boolean {
    if (this.eventCountUsingBundle(id) > 0) {
      return false;
    }
    this.bundles.update((list) => list.filter((b) => b.id !== id));
    return true;
  }

  private uniqueSlug(name: string): string {
    const hyphenated = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .split('-')
      .filter(Boolean)
      .join('-');
    const base = hyphenated || 'bundle';

    let slug = base;
    let suffix = 2;
    while (this.getBundle(slug)) {
      slug = `${base}-${suffix}`;
      suffix++;
    }
    return slug;
  }
}

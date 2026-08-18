import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { IEventPricing } from './pricing.util';

export interface IPricingBundle extends IEventPricing {
  id: string;
  photographerId: string;
  name: string;
  eventsUsingCount: number;
}

/** Seed data for consumers that read the cache without ever calling getBundles() themselves (checkout's
 *  selection.service, admin dashboards, earnings, my-events — outside the pricing-bundles CRUD screens' scope).
 *  getBundles()/fetchBundle() below replace a photographer's slice (or a single bundle) with real data once
 *  actually called; until then, or for photographers never fetched, these are what those consumers see.
 *  eventsUsingCount is meaningless for pure-seed entries (no real event tracking backs them), so it's 0. */
const SEED_BUNDLES: IPricingBundle[] = [
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
    eventsUsingCount: 0,
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
    eventsUsingCount: 0,
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
    eventsUsingCount: 0,
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
    eventsUsingCount: 0,
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
    eventsUsingCount: 0,
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
    eventsUsingCount: 0,
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
    eventsUsingCount: 0,
  },
];

export type PricingBundleInput = Omit<IPricingBundle, 'id' | 'eventsUsingCount'>;
export type PricingBundleChanges = Partial<Omit<IPricingBundle, 'id' | 'photographerId' | 'eventsUsingCount'>>;

@Injectable({ providedIn: 'root' })
export class PricingBundlesService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  /** Cache of bundles — seeded with mock data (see SEED_BUNDLES), then replaced photographer-by-photographer
   *  (or bundle-by-bundle via fetchBundle) as real calls are made. Consumers outside the pricing-bundles
   *  screens (checkout, dashboards, selection.service) read getBundle() synchronously, so it stays a cache
   *  read rather than a network call. */
  private readonly cache = signal<IPricingBundle[]>(SEED_BUNDLES);

  async getBundles(photographerId: string): Promise<IPricingBundle[]> {
    const bundles = await firstValueFrom(
      this.http.get<IPricingBundle[]>(`${this.env.apiUrl}/pricing-bundles`, {
        headers: this.headers(photographerId),
      }),
    );
    this.cache.update((all) => [...all.filter((b) => b.photographerId !== photographerId), ...bundles]);
    return bundles;
  }

  getBundle(id: string): IPricingBundle | undefined {
    return this.cache().find((b) => b.id === id);
  }

  async fetchBundle(photographerId: string, id: string): Promise<IPricingBundle> {
    const bundle = await firstValueFrom(
      this.http.get<IPricingBundle>(`${this.env.apiUrl}/pricing-bundles/${id}`, {
        headers: this.headers(photographerId),
      }),
    );
    this.cache.update((all) => [...all.filter((b) => b.id !== id), bundle]);
    return bundle;
  }

  async createBundle(input: PricingBundleInput): Promise<IPricingBundle> {
    const created = await firstValueFrom(
      this.http.post<IPricingBundle>(
        `${this.env.apiUrl}/pricing-bundles`,
        {
          name: input.name,
          basePrice: input.basePrice,
          bundleModel: input.bundleModel,
          bundleTiers: input.bundleTiers,
          fullGalleryEnabled: input.fullGalleryEnabled,
          fullGalleryPrice: input.fullGalleryPrice,
        },
        { headers: this.headers(input.photographerId) },
      ),
    );
    this.cache.update((all) => [...all, created]);
    return created;
  }

  async updateBundle(id: string, changes: PricingBundleChanges): Promise<IPricingBundle> {
    const photographerId = this.requirePhotographerId(id);
    const updated = await firstValueFrom(
      this.http.patch<IPricingBundle>(`${this.env.apiUrl}/pricing-bundles/${id}`, changes, {
        headers: this.headers(photographerId),
      }),
    );
    this.cache.update((all) => all.map((b) => (b.id === id ? updated : b)));
    return updated;
  }

  /** Throws HttpErrorResponse (status 409) if an event still references the bundle — the BE is the source of
   *  truth for that check; the FE only pre-disables the delete button as a hint via eventsUsingCount. */
  async deleteBundle(id: string): Promise<void> {
    const photographerId = this.requirePhotographerId(id);
    await firstValueFrom(
      this.http.delete<void>(`${this.env.apiUrl}/pricing-bundles/${id}`, {
        headers: this.headers(photographerId),
      }),
    );
    this.cache.update((all) => all.filter((b) => b.id !== id));
  }

  private requirePhotographerId(id: string): string {
    const photographerId = this.getBundle(id)?.photographerId;
    if (!photographerId) {
      throw new Error(`Unknown pricing bundle: ${id}`);
    }
    return photographerId;
  }

  private headers(photographerId: string): HttpHeaders {
    return new HttpHeaders({ 'x-photographer-id': photographerId });
  }
}

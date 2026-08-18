import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { EventsService, IPhoto } from '../events/events.service';
import { IPricingBundle, PricingBundlesService } from './pricing-bundles.service';
import { IVoucherLike, QualifyingMatch, calculatePricing, qualifyingConditions } from './pricing.util';
import { PricingOptionsService, STANDARD_FORMAT_OPTION } from './pricing-options.service';

export interface SelectedEntry {
  photo: IPhoto;
  formatId: string;
}

@Injectable({ providedIn: 'root' })
export class SelectionService {
  private readonly eventsService = inject(EventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
  private readonly pricingOptionsService = inject(PricingOptionsService);
  private readonly items = signal<Map<string, SelectedEntry>>(new Map());

  readonly selectedEntries = computed(() =>
    Array.from(this.items().values()).map((entry) => ({
      ...entry,
      formatOption: this.pricingOptionsService.getOption(entry.formatId) ?? STANDARD_FORMAT_OPTION,
    })),
  );
  readonly selectedPhotos = computed(() => Array.from(this.items().values()).map((entry) => entry.photo));
  readonly selectedIds = computed(() => new Set(this.items().keys()));
  readonly selectedCount = computed(() => this.items().size);
  readonly eventId = computed(() => this.selectedPhotos()[0]?.eventId);
  readonly photosTotal = computed(() => this.selectedEntries().reduce((sum, entry) => sum + entry.formatOption.price, 0));

  readonly bundles = computed(() => {
    const event = this.eventsService.getEvent(this.eventId() ?? '');
    return this.bundlesFor(event?.pricingBundleIds ?? []);
  });

  // Every qualifying voucher condition across every bundle assigned to this event, flattened for a
  // radio list. Bundle grouping no longer matters here — vouchers are shared across bundles.
  readonly voucherOffers = computed<QualifyingMatch[]>(() =>
    this.bundles().flatMap((bundle) => qualifyingConditions(this.selectedCount(), bundle)),
  );

  // The voucher/condition pairs above come straight from each bundle's own `vouchers` array (never
  // re-wrapped), so this stays a stable reference across recomputation — required for
  // `selectedTier`'s linkedSignal "stays put once manually picked" behavior below to work.
  private readonly bestMatch = computed<QualifyingMatch | null>(() => {
    const offers = this.voucherOffers();
    if (offers.length === 0) {
      return null;
    }
    const scored = offers.map((offer) => ({
      offer,
      total: calculatePricing(this.photosTotal(), this.selectedCount(), this.selectedBundleFor(offer), offer).total,
    }));
    return scored.reduce((best, cur) => (cur.total < best.total ? cur : best)).offer;
  });

  // Resets to the best qualifying match (across all bundles) whenever the qualifying set changes
  // (a photo is added/removed), but stays put once the rider manually picks a different one.
  // null = the rider explicitly chose "No voucher applied".
  readonly selectedTier = linkedSignal<QualifyingMatch | null>(() => this.bestMatch());

  readonly selectedBundle = computed(() => this.selectedBundleFor(this.selectedTier()));

  readonly pricing = computed(() =>
    calculatePricing(this.photosTotal(), this.selectedCount(), this.selectedBundle(), this.selectedTier()),
  );

  isSelected(photoId: string): boolean {
    return this.items().has(photoId);
  }

  formatIdFor(photoId: string): string | undefined {
    return this.items().get(photoId)?.formatId;
  }

  chooseTier(match: QualifyingMatch | null): void {
    this.selectedTier.set(match);
  }

  tierPricePerPhoto(match: QualifyingMatch | null): number {
    const bundle = this.selectedBundleFor(match);
    return calculatePricing(this.photosTotal(), this.selectedCount(), bundle, match).pricePerPhoto;
  }

  toggle(photo: IPhoto): void {
    const current = this.items();
    const next = new Map(
      current.size > 0 && current.values().next().value?.photo.eventId !== photo.eventId ? [] : current,
    );

    if (next.has(photo.id)) {
      next.delete(photo.id);
    } else {
      next.set(photo.id, { photo, formatId: this.defaultFormatIdFor(photo) });
    }

    this.items.set(next);
  }

  selectWithFormat(photo: IPhoto, formatId: string): void {
    const current = this.items();
    const next = new Map(
      current.size > 0 && current.values().next().value?.photo.eventId !== photo.eventId ? [] : current,
    );
    next.set(photo.id, { photo, formatId });
    this.items.set(next);
  }

  clear(): void {
    this.items.set(new Map());
  }

  private defaultFormatIdFor(photo: IPhoto): string {
    const event = this.eventsService.getEvent(photo.eventId);
    return event?.pricingOptionIds[0] ?? STANDARD_FORMAT_OPTION.id;
  }

  private bundlesFor(pricingBundleIds: string[]): IPricingBundle[] {
    return pricingBundleIds
      .map((id) => this.pricingBundlesService.getBundle(id))
      .filter((bundle): bundle is IPricingBundle => !!bundle);
  }

  private selectedBundleFor(match: QualifyingMatch | null): IPricingBundle | undefined {
    const bundles = this.bundles();
    if (!match) {
      return bundles[0];
    }
    return bundles.find((bundle) => (bundle.vouchers as IVoucherLike[]).includes(match.voucher)) ?? bundles[0];
  }
}

import { Injectable, WritableSignal, computed, effect, linkedSignal, signal } from '@angular/core';
import { IPhoto } from '../events/events.service';
import { IBundlePricingOptionSummary, IPricingBundle } from './pricing-bundles.service';
import { IVoucherLike, QualifyingMatch, calculatePricing, qualifyingConditions } from './pricing.util';
import { loadCarts, saveCarts } from './cart-storage';

export interface SelectedEntry {
  photo: IPhoto;
  formatId: string;
  formatOption: IBundlePricingOptionSummary;
}

// One basket per event a rider has added photos from. Kept separate — see toggle()/selectWithFormat()
// below — so browsing a second event's gallery never wipes the first one's selection.
export interface EventCart {
  eventId: string;
  eventTitle: string;
  coverImageUrl: string;
  items: Map<string, SelectedEntry>;
}

export interface EventCartSummary {
  eventId: string;
  eventTitle: string;
  coverImageUrl: string;
  itemCount: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SelectionService {
  private readonly carts: WritableSignal<Map<string, EventCart>>;
  private readonly activeId: WritableSignal<string | null>;

  // Real pricing-bundle data for each event the rider has viewed, keyed by event id — set by
  // whoever displays that event (event-detail.component.ts, cart.component.ts) via
  // setBundlesForEvent(). Deliberately NOT persisted to localStorage: each SelectedEntry snapshots
  // its own formatOption at add time (see toggle()/selectWithFormat()), so a restored cart already
  // prices correctly without this; bundles themselves are refetched per event instead, so a
  // voucher a photographer later changes can never be baked stale into storage.
  private readonly eventBundles = signal<Map<string, IPricingBundle[]>>(new Map());

  // Display metadata for events the rider has viewed — lets the cart-page switcher label a
  // restored cart, and backfills a cart bucket's title/cover the moment it's first created.
  private readonly eventContexts = signal<Map<string, { title: string; coverImageUrl: string }>>(new Map());

  constructor() {
    const restored = loadCarts();
    this.carts = signal(restored.carts);
    this.activeId = signal(restored.activeId);

    effect(() => saveCarts(this.carts(), this.activeId()));
  }

  setBundlesForEvent(eventId: string, bundles: IPricingBundle[]): void {
    this.eventBundles.update((map) => new Map(map).set(eventId, bundles));
    this.reconcileCartWithPricing(eventId);
  }

  hasBundlesFor(eventId: string): boolean {
    return this.eventBundles().has(eventId);
  }

  setEventContext(eventId: string, context: { title: string; coverImageUrl: string }): void {
    this.eventContexts.update((map) => new Map(map).set(eventId, context));
    // Keep an already-existing cart's display metadata current too (e.g. the rider added a photo
    // before the event's title/cover were known, or the photographer has since changed them).
    const existing = this.carts().get(eventId);
    if (existing) {
      this.carts.update((map) =>
        new Map(map).set(eventId, { ...existing, eventTitle: context.title, coverImageUrl: context.coverImageUrl }),
      );
    }
  }

  setActiveEvent(eventId: string | null): void {
    this.activeId.set(eventId);
  }

  // Every cart the rider currently holds, for the cart page's event switcher.
  readonly eventCarts = computed<EventCartSummary[]>(() => {
    const active = this.activeId();
    return Array.from(this.carts().values()).map((cart) => ({
      eventId: cart.eventId,
      eventTitle: cart.eventTitle,
      coverImageUrl: cart.coverImageUrl,
      itemCount: cart.items.size,
      isActive: cart.eventId === active,
    }));
  });

  readonly totalSelectedCount = computed(() =>
    Array.from(this.carts().values()).reduce((sum, cart) => sum + cart.items.size, 0),
  );

  // Everything below reads/writes the ACTIVE cart only — this is what keeps pricing, checkout, and
  // the selection bar all working unchanged while also enforcing "one event checked out at a time".
  private activeCart(): EventCart | undefined {
    const id = this.activeId();
    return id ? this.carts().get(id) : undefined;
  }

  readonly selectedEntries = computed(() => Array.from(this.activeCart()?.items.values() ?? []));
  readonly selectedPhotos = computed(() => this.selectedEntries().map((entry) => entry.photo));
  readonly selectedIds = computed(() => new Set(this.activeCart()?.items.keys() ?? []));
  readonly selectedCount = computed(() => this.activeCart()?.items.size ?? 0);
  readonly eventId = computed(() => this.activeId() ?? undefined);
  readonly photoPrices = computed(() => this.selectedEntries().map((entry) => entry.formatOption.price));
  readonly photosTotal = computed(() => this.photoPrices().reduce((sum, price) => sum + price, 0));

  readonly bundles = computed(() => this.eventBundles().get(this.eventId() ?? '') ?? []);

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
      total: calculatePricing(this.photoPrices(), this.selectedBundleFor(offer), offer).total,
    }));
    return scored.reduce((best, cur) => (cur.total < best.total ? cur : best)).offer;
  });

  // Resets to the best qualifying match (across all bundles) whenever the qualifying set changes
  // (a photo is added/removed), but stays put once the rider manually picks a different one.
  // null = the rider explicitly chose "No voucher applied".
  readonly selectedTier = linkedSignal<QualifyingMatch | null>(() => this.bestMatch());

  readonly selectedBundle = computed(() => this.selectedBundleFor(this.selectedTier()));

  readonly pricing = computed(() =>
    calculatePricing(this.photoPrices(), this.selectedBundle(), this.selectedTier()),
  );

  isSelected(photoId: string): boolean {
    return this.activeCart()?.items.has(photoId) ?? false;
  }

  formatIdFor(photoId: string): string | undefined {
    return this.activeCart()?.items.get(photoId)?.formatId;
  }

  chooseTier(match: QualifyingMatch | null): void {
    this.selectedTier.set(match);
  }

  tierPricePerPhoto(match: QualifyingMatch | null): number {
    const bundle = this.selectedBundleFor(match);
    return calculatePricing(this.photoPrices(), bundle, match).pricePerPhoto;
  }

  toggle(photo: IPhoto): void {
    const isAlreadySelected = this.isSelectedInEvent(photo);
    if (isAlreadySelected) {
      this.removePhoto(photo);
      return;
    }

    const defaultFormatOption = this.optionsForEvent(photo.eventId)[0];
    if (!defaultFormatOption) {
      return;
    }
    this.selectWithFormat(photo, defaultFormatOption.id);
  }

  selectWithFormat(photo: IPhoto, formatId: string): void {
    const formatOption = this.optionsForEvent(photo.eventId).find((option) => option.id === formatId);
    if (!formatOption) {
      return;
    }

    this.updateCartFor(photo.eventId, (items) => {
      const next = new Map(items);
      next.set(photo.id, { photo, formatId, formatOption });
      return next;
    });
    this.activeId.set(photo.eventId);
  }

  clearEvent(eventId: string): void {
    this.carts.update((map) => {
      if (!map.has(eventId)) {
        return map;
      }
      const next = new Map(map);
      next.delete(eventId);
      return next;
    });
    if (this.activeId() === eventId) {
      this.activeId.set(this.firstRemainingEventId());
    }
  }

  // Clears only the active cart — completing checkout for one event must never touch the others.
  clear(): void {
    const id = this.activeId();
    if (id) {
      this.clearEvent(id);
    }
  }

  private firstRemainingEventId(): string | null {
    return this.carts().keys().next().value ?? null;
  }

  private updateCartFor(
    eventId: string,
    update: (items: Map<string, SelectedEntry>) => Map<string, SelectedEntry>,
  ): void {
    this.carts.update((map) => {
      const existing = map.get(eventId);
      const nextItems = update(existing?.items ?? new Map());
      const next = new Map(map);
      if (nextItems.size === 0) {
        next.delete(eventId);
      } else {
        const context = this.eventContexts().get(eventId);
        next.set(eventId, {
          eventId,
          eventTitle: existing?.eventTitle ?? context?.title ?? '',
          coverImageUrl: existing?.coverImageUrl ?? context?.coverImageUrl ?? '',
          items: nextItems,
        });
      }
      return next;
    });
  }

  private reconcileCartWithPricing(eventId: string): void {
    const cart = this.carts().get(eventId);
    if (!cart) {
      return;
    }

    const options = this.optionsForEvent(eventId);
    const reconciledItems = new Map<string, SelectedEntry>();
    let isCartChanged = false;
    for (const [photoId, entry] of cart.items) {
      const currentOption = this.getCurrentOptionFor(entry, options);
      if (!currentOption) {
        isCartChanged = true;
        continue;
      }
      const isSnapshotCurrent =
        entry.formatId === currentOption.id &&
        entry.formatOption.label === currentOption.label &&
        entry.formatOption.price === currentOption.price;
      isCartChanged = isCartChanged || !isSnapshotCurrent;
      reconciledItems.set(photoId, { ...entry, formatId: currentOption.id, formatOption: currentOption });
    }

    if (!isCartChanged) {
      return;
    }
    this.updateCartFor(eventId, () => reconciledItems);
    const isActiveCartGone = this.activeId() === eventId && !this.carts().has(eventId);
    if (isActiveCartGone) {
      this.activeId.set(this.firstRemainingEventId());
    }
  }

  private getCurrentOptionFor(
    entry: SelectedEntry,
    options: IBundlePricingOptionSummary[],
  ): IBundlePricingOptionSummary | undefined {
    const sameId = options.find((option) => option.id === entry.formatId);
    const sameLabel = options.find((option) => option.label === entry.formatOption.label);
    return sameId ?? sameLabel ?? options[0];
  }

  private isSelectedInEvent(photo: IPhoto): boolean {
    return this.carts().get(photo.eventId)?.items.has(photo.id) ?? false;
  }

  private removePhoto(photo: IPhoto): void {
    this.updateCartFor(photo.eventId, (items) => {
      const next = new Map(items);
      next.delete(photo.id);
      return next;
    });
    // The bucket may have just been deleted (its last photo was removed) — repoint at whatever's
    // left rather than making the now-empty event "active" with nothing to show for it.
    this.activeId.set(this.carts().has(photo.eventId) ? photo.eventId : this.firstRemainingEventId());
  }

  private optionsForEvent(eventId: string): IBundlePricingOptionSummary[] {
    const bundles = this.eventBundles().get(eventId) ?? [];
    return bundles.flatMap((bundle) => bundle.pricingOptions);
  }

  private selectedBundleFor(match: QualifyingMatch | null): IPricingBundle | undefined {
    const bundles = this.bundles();
    if (!match) {
      return bundles[0];
    }
    return bundles.find((bundle) => (bundle.vouchers as IVoucherLike[]).includes(match.voucher)) ?? bundles[0];
  }
}

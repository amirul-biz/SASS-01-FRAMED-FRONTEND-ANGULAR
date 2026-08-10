import { Injectable, computed, inject, signal } from '@angular/core';
import { EventsService, IPhoto } from '../events/events.service';
import { IPricingBundle, PricingBundlesService } from './pricing-bundles.service';
import { bestPricingAcrossBundles } from './pricing.util';
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
  readonly photosTotal = computed(() =>
    this.selectedEntries().reduce((sum, entry) => sum + entry.formatOption.price, 0),
  );
  readonly pricing = computed(() => {
    const event = this.eventsService.getEvent(this.eventId() ?? '');
    const bundles = this.bundlesFor(event?.pricingBundleIds ?? []);
    return bestPricingAcrossBundles(this.photosTotal(), this.selectedCount(), bundles);
  });

  isSelected(photoId: string): boolean {
    return this.items().has(photoId);
  }

  formatIdFor(photoId: string): string | undefined {
    return this.items().get(photoId)?.formatId;
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

  private defaultFormatIdFor(photo: IPhoto): string {
    const event = this.eventsService.getEvent(photo.eventId);
    return event?.pricingOptionIds[0] ?? STANDARD_FORMAT_OPTION.id;
  }

  private bundlesFor(pricingBundleIds: string[]): IPricingBundle[] {
    return pricingBundleIds
      .map((id) => this.pricingBundlesService.getBundle(id))
      .filter((bundle): bundle is IPricingBundle => !!bundle);
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
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { EventsService, IPhoto } from '../events/events.service';
import { PricingBundlesService } from './pricing-bundles.service';
import { calculatePricing } from './pricing.util';
import { DEFAULT_FORMAT_OPTION, getFormatOption } from './photo-format-options';

export interface SelectedEntry {
  photo: IPhoto;
  formatId: string;
}

@Injectable({ providedIn: 'root' })
export class SelectionService {
  private readonly eventsService = inject(EventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
  private readonly items = signal<Map<string, SelectedEntry>>(new Map());

  readonly selectedEntries = computed(() =>
    Array.from(this.items().values()).map((entry) => ({ ...entry, formatOption: getFormatOption(entry.formatId) })),
  );
  readonly selectedPhotos = computed(() => Array.from(this.items().values()).map((entry) => entry.photo));
  readonly selectedIds = computed(() => new Set(this.items().keys()));
  readonly selectedCount = computed(() => this.items().size);
  readonly eventId = computed(() => this.selectedPhotos()[0]?.eventId);
  readonly formatExtrasTotal = computed(() =>
    this.selectedEntries().reduce((sum, entry) => sum + entry.formatOption.extraPrice, 0),
  );
  readonly pricing = computed(() => {
    const event = this.eventsService.getEvent(this.eventId() ?? '');
    const bundle = event ? this.pricingBundlesService.getBundle(event.pricingBundleId) : undefined;
    return calculatePricing(this.selectedCount(), bundle);
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
      next.set(photo.id, { photo, formatId: DEFAULT_FORMAT_OPTION.id });
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
}

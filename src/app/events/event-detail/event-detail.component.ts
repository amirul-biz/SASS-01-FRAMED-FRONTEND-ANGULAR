import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap, catchError, of, forkJoin } from 'rxjs';
import { ClientService } from '../../client/client.service';
import { toEventDetail, toGalleryPhoto, toSelectionBundles } from '../../client/client-event.util';
import { IEvent, IPhoto } from '../events.service';
import { SelectionService } from '../../pricing/selection.service';
import { FindYourPhotosComponent, TimeRange } from './find-your-photos/find-your-photos.component';
import { FilterByAreaComponent } from './filter-by-area/filter-by-area.component';
import { PhotoCardComponent } from './photo-card/photo-card.component';
import { SelectionBarComponent } from './selection-bar/selection-bar.component';
import { PhotoPreviewModalComponent } from './photo-preview-modal/photo-preview-modal.component';
import { IPhotoFormatOption, STANDARD_FORMAT_OPTION } from '../../pricing/pricing-options.service';

const CAPTURED_AT_PATTERN = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i;

function parseCapturedAtMinutes(capturedAt: string): number {
  const match = CAPTURED_AT_PATTERN.exec(capturedAt.trim());
  if (!match) {
    return 0;
  }
  const [, hourStr, minuteStr, meridiem] = match;
  const hour = (Number(hourStr) % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(minuteStr);
}

function parseTimeInputMinutes(value: string): number | null {
  if (!value) {
    return null;
  }
  const [hourStr, minuteStr] = value.split(':');
  return Number(hourStr) * 60 + Number(minuteStr);
}

type EventDetail = IEvent & { description: string | null };

@Component({
  selector: 'app-event-detail',
  imports: [
    RouterLink,
    FindYourPhotosComponent,
    FilterByAreaComponent,
    PhotoCardComponent,
    SelectionBarComponent,
    PhotoPreviewModalComponent,
  ],
  templateUrl: './event-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent {
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);
  readonly selection = inject(SelectionService);

  id = input.required<string>();

  private readonly allPricingOptions = signal<IPhotoFormatOption[]>([]);
  readonly event = signal<EventDetail | null>(null);
  private readonly allPhotos = signal<IPhoto[]>([]);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);

  constructor() {
    toObservable(this.id)
      .pipe(
        switchMap((id) => {
          this.isLoading.set(true);
          this.notFound.set(false);
          return forkJoin({
            event: this.clientService.getEvent(id),
            photos: this.clientService.getEventPhotos(id, { pageNumber: 1, pageSize: 100 }),
          }).pipe(
            catchError(() => {
              this.notFound.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.isLoading.set(false);
        if (!result) {
          this.event.set(null);
          this.allPhotos.set([]);
          this.allPricingOptions.set([]);
          return;
        }

        const eventId = this.id();
        const detail = toEventDetail(result.event);
        this.event.set(detail);
        this.allPhotos.set(result.photos.items.map((photo) => toGalleryPhoto(eventId, photo)));

        const bundles = toSelectionBundles(result.event);
        this.selection.setBundlesForEvent(eventId, bundles);

        const optionsById = new Map<string, IPhotoFormatOption>();
        for (const bundle of bundles) {
          for (const option of bundle.pricingOptions) {
            optionsById.set(option.id, {
              id: option.id,
              photographerId: result.event.photographerId,
              label: option.label,
              price: option.price,
            });
          }
        }
        this.allPricingOptions.set([...optionsById.values()]);
      });
  }

  // Falls back to the standard option when the event has no pricing bundle attached yet,
  // so the format picker and price badges are never left with nothing to show.
  readonly formatOptions = computed(() => {
    const options = this.allPricingOptions();
    return options.length > 0 ? options : [STANDARD_FORMAT_OPTION];
  });

  private readonly timeRange = signal<TimeRange>({ from: '', to: '' });

  readonly photos = computed(() => {
    const all = this.allPhotos();
    const fromMinutes = parseTimeInputMinutes(this.timeRange().from);
    const toMinutes = parseTimeInputMinutes(this.timeRange().to);
    if (fromMinutes === null && toMinutes === null) {
      return all;
    }
    return all.filter((p) => {
      const minutes = parseCapturedAtMinutes(p.capturedAt);
      return (fromMinutes === null || minutes >= fromMinutes) && (toMinutes === null || minutes <= toMinutes);
    });
  });

  readonly areaCounts = computed(() => []);

  onTimeRangeChange(range: TimeRange): void {
    this.timeRange.set(range);
  }

  onTogglePhoto(photo: IPhoto): void {
    this.selection.toggle(photo);
  }

  priceForPhoto(photo: IPhoto): number {
    const formatId = this.selection.formatIdFor(photo.id) ?? this.formatOptions()[0]?.id;
    return this.formatOptions().find((o) => o.id === formatId)?.price ?? STANDARD_FORMAT_OPTION.price;
  }

  readonly previewPhoto = signal<IPhoto | null>(null);

  readonly previewFormatId = computed(
    () =>
      this.selection.formatIdFor(this.previewPhoto()?.id ?? '') ??
      this.formatOptions()[0]?.id ??
      STANDARD_FORMAT_OPTION.id,
  );

  openPreview(photo: IPhoto): void {
    this.previewPhoto.set(photo);
  }

  closePreview(): void {
    this.previewPhoto.set(null);
  }

  onAddToCartFromModal(entry: { photo: IPhoto; formatId: string }): void {
    this.selection.selectWithFormat(entry.photo, entry.formatId);
    this.closePreview();
  }
}

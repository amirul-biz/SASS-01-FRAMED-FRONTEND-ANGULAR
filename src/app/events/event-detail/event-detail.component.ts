import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsService, IPhoto } from '../events.service';
import { SelectionService } from '../../pricing/selection.service';
import { FindYourPhotosComponent, TimeRange } from './find-your-photos/find-your-photos.component';
import { FilterByAreaComponent } from './filter-by-area/filter-by-area.component';
import { PhotoCardComponent } from './photo-card/photo-card.component';
import { SelectionBarComponent } from './selection-bar/selection-bar.component';
import { PhotoPreviewModalComponent } from './photo-preview-modal/photo-preview-modal.component';
import { IPhotoFormatOption, PricingOptionsService, STANDARD_FORMAT_OPTION } from '../../pricing/pricing-options.service';

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
  private readonly eventsService = inject(EventsService);
  private readonly pricingOptionsService = inject(PricingOptionsService);
  readonly selection = inject(SelectionService);

  id = input.required<string>();

  readonly event = computed(() => this.eventsService.getEvent(this.id()));
  readonly areaCounts = computed(() => this.eventsService.getAreaCounts(this.id()));
  readonly formatOptions = computed(() =>
    (this.event()?.pricingOptionIds ?? [])
      .map((id) => this.pricingOptionsService.getOption(id))
      .filter((option): option is IPhotoFormatOption => !!option),
  );

  private readonly plateQuery = signal('');
  private readonly activeAreaIds = signal<Set<string>>(new Set());
  private readonly timeRange = signal<TimeRange>({ from: '', to: '' });

  readonly photos = computed(() => {
    const byPlate = this.plateQuery()
      ? this.eventsService.searchByPlate(this.id(), this.plateQuery())
      : this.eventsService.getPhotos(this.id());

    const areas = this.activeAreaIds();
    const byArea = areas.size === 0 ? byPlate : byPlate.filter((p) => areas.has(p.areaId));

    const fromMinutes = parseTimeInputMinutes(this.timeRange().from);
    const toMinutes = parseTimeInputMinutes(this.timeRange().to);
    if (fromMinutes === null && toMinutes === null) {
      return byArea;
    }
    return byArea.filter((p) => {
      const minutes = parseCapturedAtMinutes(p.capturedAt);
      return (fromMinutes === null || minutes >= fromMinutes) && (toMinutes === null || minutes <= toMinutes);
    });
  });

  onPlateSearch(plate: string): void {
    this.plateQuery.set(plate);
  }

  onAreaFilterChange(areaIds: Set<string>): void {
    this.activeAreaIds.set(areaIds);
  }

  onTimeRangeChange(range: TimeRange): void {
    this.timeRange.set(range);
  }

  onTogglePhoto(photo: IPhoto): void {
    this.selection.toggle(photo);
  }

  priceForPhoto(photo: IPhoto): number {
    const formatId = this.selection.formatIdFor(photo.id) ?? this.formatOptions()[0]?.id;
    return this.pricingOptionsService.getOption(formatId ?? '')?.price ?? STANDARD_FORMAT_OPTION.price;
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

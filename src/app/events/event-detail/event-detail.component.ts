import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, switchMap, catchError, of, finalize } from 'rxjs';
import { PaginatedClientEventPhotoList, ClientService } from '../../client/client.service';
import { toEventDetail, toGalleryPhoto, toSelectionBundles, toUtcTimeOfDay } from '../../client/client-event.util';
import { IEvent, IPhoto } from '../events.service';
import { SelectionService } from '../../pricing/selection.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { CollapsiblePanelComponent } from '../../shared/collapsible-panel/collapsible-panel.component';
import { FindYourPhotosComponent } from './find-your-photos/find-your-photos.component';
import { FilterByTimeComponent, TimeRange } from './filter-by-time/filter-by-time.component';
import { FilterByAreaComponent } from './filter-by-area/filter-by-area.component';
import { PhotoCardComponent } from './photo-card/photo-card.component';
import { SelectionBarComponent } from './selection-bar/selection-bar.component';
import { PhotoPreviewModalComponent } from './photo-preview-modal/photo-preview-modal.component';
import { IPhotoFormatOption, STANDARD_FORMAT_OPTION } from '../../pricing/pricing-options.service';

type EventDetail = IEvent & { description: string | null; albumCoverPhotoUrls: string[] };

const ALBUM_COVER_SLIDE_INTERVAL_MS = 3000;
const PAGE_SIZE_OPTIONS = [30, 50, 100] as const;

@Component({
  selector: 'app-event-detail',
  imports: [
    RouterLink,
    CollapsiblePanelComponent,
    FindYourPhotosComponent,
    FilterByTimeComponent,
    FilterByAreaComponent,
    PhotoCardComponent,
    PaginatorComponent,
    SelectionBarComponent,
    PhotoPreviewModalComponent,
  ],
  templateUrl: './event-detail.component.html',
  styles: [`
    /* Progress ring around the active cover dot, drawn via SVG stroke-dashoffset (pathLength="100"
       makes 0-100 units independent of the circle's actual radius). animation-name below is
       rewritten by Angular's view encapsulation to match this component's scoped @keyframes
       automatically — a dynamic [style.animation] binding in the template can't reference the
       scoped name, so the active state is driven by this class instead, with only the duration
       passed in via a CSS custom property. */
    .cover-ring-circle {
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
    }
    .cover-ring-active {
      animation: cover-ring-progress var(--cover-dot-duration, 3s) linear forwards;
    }
    @keyframes cover-ring-progress {
      from { stroke-dashoffset: 100; }
      to { stroke-dashoffset: 0; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent {
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);
  readonly selection = inject(SelectionService);

  id = input.required<string>();

  private readonly allPricingOptions = signal<IPhotoFormatOption[]>([]);
  readonly event = signal<EventDetail | null>(null);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);

  readonly activeCoverIndex = signal(0);
  private coverTimer?: ReturnType<typeof setInterval>;

  // The hero shows the photographer's chosen album-cover photos when any exist; otherwise it
  // falls back to the event's separately-uploaded coverPhotoUrl, exactly as before this feature.
  readonly heroImageUrls = computed(() => {
    const ev = this.event();
    if (!ev) {
      return [];
    }
    return ev.albumCoverPhotoUrls.length > 0 ? ev.albumCoverPhotoUrls : [ev.coverImageUrl];
  });

  // --- Photo paging/time-filter state -----------------------------------------------------------
  // All server-side now: one request per page instead of fetching every page up front. `loadTrigger$`
  // + switchMap (same idiom as studio/orders/orders-list.component.ts) means a fast page click or
  // filter change cancels the previous in-flight request instead of racing it.
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly pageNumber = signal(1);
  readonly pageSize = signal<number>(PAGE_SIZE_OPTIONS[0]);
  private readonly timeRange = signal<TimeRange>({ from: '', to: '' });
  readonly response = signal<PaginatedClientEventPhotoList | null>(null);
  readonly isLoadingPhotos = signal(true);
  readonly photosError = signal<string | null>(null);

  private readonly loadTrigger$ = new Subject<void>();

  constructor() {
    this.destroyRef.onDestroy(() => clearInterval(this.coverTimer));

    // Event stream — hero, description, bundles, cart wiring. Kept independent of photo paging
    // so a failed or slow photo page never produces the whole-page "Event not found."
    toObservable(this.id)
      .pipe(
        switchMap((id) => {
          this.isLoading.set(true);
          this.notFound.set(false);
          return this.clientService.getEvent(id).pipe(
            catchError(() => {
              this.notFound.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.isLoading.set(false);
        if (!event) {
          this.event.set(null);
          this.startCoverSlideshow(0);
          this.allPricingOptions.set([]);
          return;
        }

        const eventId = this.id();
        const detail = toEventDetail(event);
        this.event.set(detail);
        this.startCoverSlideshow(detail.albumCoverPhotoUrls.length);

        const bundles = toSelectionBundles(event);
        this.selection.setBundlesForEvent(eventId, bundles);
        // Browsing this event's gallery makes its cart the active one — otherwise the selection
        // bar/prices below would keep showing whichever other event's cart was active before.
        this.selection.setEventContext(eventId, { title: detail.title, coverImageUrl: detail.coverImageUrl });
        this.selection.setActiveEvent(eventId);

        const optionsById = new Map<string, IPhotoFormatOption>();
        for (const bundle of bundles) {
          for (const option of bundle.pricingOptions) {
            optionsById.set(option.id, {
              id: option.id,
              photographerId: event.photographerId,
              label: option.label,
              price: option.price,
            });
          }
        }
        this.allPricingOptions.set([...optionsById.values()]);
      });

    // New event id → reset paging/time filter back to defaults, then (re)load page 1.
    toObservable(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(1);
        this.pageSize.set(PAGE_SIZE_OPTIONS[0]);
        this.timeRange.set({ from: '', to: '' });
        this.loadTrigger$.next();
      });

    this.loadTrigger$
      .pipe(
        switchMap(() => {
          this.isLoadingPhotos.set(true);
          this.photosError.set(null);
          const { from, to } = this.timeRange();
          return this.clientService
            .getEventPhotos(this.id(), {
              pageNumber: this.pageNumber(),
              pageSize: this.pageSize(),
              capturedFrom: from ? toUtcTimeOfDay(from) : undefined,
              capturedTo: to ? toUtcTimeOfDay(to) : undefined,
            })
            .pipe(
              catchError(() => {
                this.photosError.set('Failed to load photos. Please try again.');
                return of(null);
              }),
              finalize(() => this.isLoadingPhotos.set(false)),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (response) {
          this.response.set(response);
        }
      });
  }

  readonly coverIntervalSeconds = ALBUM_COVER_SLIDE_INTERVAL_MS / 1000;

  private startCoverSlideshow(count: number): void {
    clearInterval(this.coverTimer);
    this.activeCoverIndex.set(0);
    this.armCoverTimer(count);
  }

  private armCoverTimer(count: number): void {
    if (count > 1) {
      this.coverTimer = setInterval(
        () => this.activeCoverIndex.update((i) => (i + 1) % count),
        ALBUM_COVER_SLIDE_INTERVAL_MS,
      );
    }
  }

  goToCover(index: number): void {
    clearInterval(this.coverTimer);
    this.activeCoverIndex.set(index);
    this.armCoverTimer(this.heroImageUrls().length);
  }

  // Falls back to the standard option when the event has no pricing bundle attached yet,
  // so the format picker and price badges are never left with nothing to show.
  readonly formatOptions = computed(() => {
    const options = this.allPricingOptions();
    return options.length > 0 ? options : [STANDARD_FORMAT_OPTION];
  });

  readonly photos = computed(() => {
    const eventId = this.id();
    return (this.response()?.items ?? []).map((photo) => toGalleryPhoto(eventId, photo));
  });

  readonly areaCounts = computed(() => []);

  // Pre-computes price/selected per photo once here instead of calling methods from inside the
  // template's @for — with paging the worst case is 100 photos instead of 4000, but there's no
  // reason to re-run a method call per photo on every change-detection pass either way.
  readonly photoRows = computed(() => {
    const options = this.formatOptions();
    return this.photos().map((photo) => {
      const formatId = this.selection.formatIdFor(photo.id) ?? options[0]?.id;
      const price = options.find((o) => o.id === formatId)?.price ?? STANDARD_FORMAT_OPTION.price;
      return { photo, price, selected: this.selection.isSelected(photo.id) };
    });
  });

  onTimeRangeChange(range: TimeRange): void {
    this.timeRange.set(range);
    this.pageNumber.set(1);
    this.loadTrigger$.next();
  }

  onPageNumberChange(pageNumber: number): void {
    this.pageNumber.set(pageNumber);
    this.loadTrigger$.next();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageNumber.set(1);
    this.loadTrigger$.next();
  }

  onTogglePhoto(photo: IPhoto): void {
    this.selection.toggle(photo);
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

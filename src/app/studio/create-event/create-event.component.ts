import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { IPricingBundle, PricingBundlesService } from '../../pricing/pricing-bundles.service';
import { IPhotoFormatOption, PricingOptionsService } from '../../pricing/pricing-options.service';
import { EventCategory, StudioEventsService } from '../studio-events.service';

const EVENT_CATEGORIES: EventCategory[] = [
  'CYCLING',
  'RUNNING',
  'SWIMMING',
  'TRIATHLON',
  'MOTORSPORT',
  'OTHER',
];

const ALLOWED_COVER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('eventStartDate')?.value;
  const end = group.get('eventEndDate')?.value;
  if (!start || !end) {
    return null;
  }
  return new Date(end) >= new Date(start) ? null : { dateRangeInvalid: true };
}

@Component({
  selector: 'app-create-event',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEventComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly eventsService = inject(StudioEventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
  private readonly pricingOptionsService = inject(PricingOptionsService);

  readonly categories = EVENT_CATEGORIES;
  readonly availableBundles = signal<IPricingBundle[]>([]);
  readonly availableOptions = signal<IPhotoFormatOption[]>([]);

  readonly eventId = this.route.snapshot.paramMap.get('id');
  readonly isEditMode = this.eventId !== null;

  readonly form = this.fb.nonNullable.group(
    {
      title: ['', Validators.required],
      category: ['' as EventCategory | '', Validators.required],
      location: [''],
      description: [''],
      eventStartDate: ['', Validators.required],
      eventEndDate: ['', Validators.required],
    },
    { validators: dateRangeValidator },
  );

  readonly selectedBundleIds = signal<Set<string>>(new Set());
  readonly selectedOptionIds = signal<Set<string>>(new Set());
  readonly coverPhotoUrl = signal<string | null>(null);
  readonly isUploadingCover = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  constructor() {
    this.pricingBundlesService.getBundles(this.auth.demoPhotographerId).then((bundles) => this.availableBundles.set(bundles));
    this.pricingOptionsService.getOptions(this.auth.demoPhotographerId).then((options) => this.availableOptions.set(options));

    if (this.eventId) {
      this.isLoading.set(true);
      this.eventsService
        .getEvent(this.eventId)
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (event) => {
            this.form.patchValue({
              title: event.title,
              category: event.category,
              location: event.location ?? '',
              description: event.description ?? '',
              eventStartDate: event.eventStartDate.slice(0, 10),
              eventEndDate: event.eventEndDate.slice(0, 10),
            });
            this.coverPhotoUrl.set(event.coverPhotoUrl);
          },
          error: () => this.errorMsg.set('Failed to load this event. Please try again.'),
        });
    }
  }

  isBundleChecked(id: string): boolean {
    return this.selectedBundleIds().has(id);
  }

  toggleBundle(id: string): void {
    const next = new Set(this.selectedBundleIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedBundleIds.set(next);
  }

  isOptionChecked(id: string): boolean {
    return this.selectedOptionIds().has(id);
  }

  toggleOption(id: string): void {
    const next = new Set(this.selectedOptionIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedOptionIds.set(next);
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!ALLOWED_COVER_MIME_TYPES.has(file.type)) {
      this.errorMsg.set('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_COVER_SIZE_BYTES) {
      this.errorMsg.set('Cover photo must be smaller than 5MB.');
      return;
    }

    this.errorMsg.set(null);
    this.isUploadingCover.set(true);
    this.eventsService
      .presignCoverPhoto(file.name, file.type)
      .pipe(
        switchMap(({ uploadUrl, publicUrl }) =>
          this.eventsService
            .uploadToPresignedUrl(uploadUrl, file)
            .pipe(map(() => publicUrl)),
        ),
        finalize(() => this.isUploadingCover.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (publicUrl) => this.coverPhotoUrl.set(publicUrl),
        error: () => this.errorMsg.set('Failed to upload the cover photo. Please try again.'),
      });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { title, category, location, description, eventStartDate, eventEndDate } =
      this.form.getRawValue();
    const payload = {
      title,
      category: category as EventCategory,
      location: location || undefined,
      description: description || undefined,
      eventStartDate,
      eventEndDate,
      coverPhotoUrl: this.coverPhotoUrl() ?? undefined,
    };

    this.errorMsg.set(null);
    this.isSaving.set(true);

    const save$ = this.isEditMode
      ? this.eventsService.updateEvent(this.eventId!, payload)
      : this.eventsService.createEvent(payload);

    save$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.router.navigate(['/studio/events']),
        error: () => this.errorMsg.set('Failed to save the event. Please try again.'),
      });
  }
}

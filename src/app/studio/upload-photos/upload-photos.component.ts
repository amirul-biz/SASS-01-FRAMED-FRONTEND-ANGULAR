import { HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { parse as parseExif } from 'exifr';
import { Observable, Subject, catchError, filter, finalize, from, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { RangePipe } from '../../shared/pipes/range.pipe';
import { Event as StudioEvent, StudioEventsService } from '../studio-events.service';
import { Photo, PresignedPhoto, StudioPhotosService } from '../studio-photos.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const PRESIGN_BATCH_MAX_FILES = 50;
const UPLOAD_CONCURRENCY = 4;
const PHOTOS_PAGE_SIZE_OPTIONS = [100, 200, 500];

interface UploadItem {
  photoId: string;
  fileName: string;
  file: File;
  progress: number;
  previewUrl: string;
  status: 'uploading' | 'failed';
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const hours12 = date.getHours() % 12 || 12;
  const meridiem = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}, ${hours12}:${minutes} ${meridiem}`;
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCategory(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

@Component({
  selector: 'app-upload-photos',
  imports: [RouterLink, RangePipe],
  templateUrl: './upload-photos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadPhotosComponent implements OnInit {
  private readonly eventsService = inject(StudioEventsService);
  private readonly photosService = inject(StudioPhotosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly photosLoadTrigger$ = new Subject<void>();
  private readonly uploadQueue$ = new Subject<{ file: File; photo: PresignedPhoto }>();

  id = input.required<string>();

  readonly event = signal<StudioEvent | null>(null);
  readonly uploadedPhotos = signal<Photo[]>([]);
  readonly uploading = signal<UploadItem[]>([]);
  readonly uploadTotalCount = signal(0);
  readonly uploadCompletedCount = signal(0);
  readonly isDragging = signal(false);
  readonly isLoading = signal(true);
  readonly isTogglingPublish = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly photosPageSizeOptions = PHOTOS_PAGE_SIZE_OPTIONS;
  readonly photosPageNumber = signal(1);
  readonly photosPageSize = signal(PHOTOS_PAGE_SIZE_OPTIONS[0]);
  readonly photosTotalItemCount = signal(0);
  readonly photosTotalPageCount = signal(1);
  readonly isLoadingPhotos = signal(true);

  readonly selectedPhotoIndex = signal<number | null>(null);
  readonly selectedPhoto = computed(() => {
    const index = this.selectedPhotoIndex();
    return index !== null ? (this.uploadedPhotos()[index] ?? null) : null;
  });

  readonly formatDisplayDate = formatDisplayDate;
  readonly formatCategory = formatCategory;

  eventDateRangeLabel(ev: StudioEvent): string {
    const start = formatEventDate(ev.eventStartDate);
    const end = formatEventDate(ev.eventEndDate);
    return start === end ? start : `${start} – ${end}`;
  }

  readonly failedUploads = computed(() => this.uploading().filter((u) => u.status === 'failed'));

  readonly uploadOverallProgress = computed(() => {
    const total = this.uploadTotalCount();
    return total === 0 ? 0 : Math.round((this.uploadCompletedCount() / total) * 100);
  });

  readonly currentUploadPreview = computed(() => {
    const active = this.uploading().filter((u) => u.status === 'uploading');
    return active.length > 0 ? active[active.length - 1].previewUrl : null;
  });

  photoTimestampLabel(photo: Photo): string {
    return photo.capturedAt ? 'Captured' : 'Uploaded';
  }

  photoTimestamp(photo: Photo): string | null {
    return photo.capturedAt ?? photo.uploadedAt;
  }

  ngOnInit(): void {
    this.eventsService
      .getEvent(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.event.set(event);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMsg.set('Failed to load this event.');
        },
      });

    this.photosLoadTrigger$
      .pipe(
        switchMap(() => {
          this.isLoadingPhotos.set(true);
          return this.photosService
            .listPhotos(this.id(), 'UPLOADED', this.photosPageNumber(), this.photosPageSize())
            .pipe(finalize(() => this.isLoadingPhotos.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.uploadedPhotos.set(response.items);
          this.photosTotalItemCount.set(response.totalItemCount);
          this.photosTotalPageCount.set(response.totalPageCount);
        },
        error: () => this.errorMsg.set('Failed to load photos. Please try again.'),
      });

    this.photosLoadTrigger$.next();

    this.uploadQueue$
      .pipe(
        mergeMap(({ file, photo }) => this.performUpload(file, photo), UPLOAD_CONCURRENCY),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  onPhotosPageNumberChange(pageNumber: number): void {
    this.photosPageNumber.set(pageNumber);
    this.photosLoadTrigger$.next();
  }

  onPhotosPageSizeChange(event: globalThis.Event): void {
    this.photosPageSize.set(Number((event.target as HTMLSelectElement).value));
    this.photosPageNumber.set(1);
    this.photosLoadTrigger$.next();
  }

  openPreview(index: number): void {
    this.selectedPhotoIndex.set(index);
  }

  closePreview(): void {
    this.selectedPhotoIndex.set(null);
  }

  previewPrevious(): void {
    const index = this.selectedPhotoIndex();
    if (index !== null && index > 0) {
      this.selectedPhotoIndex.set(index - 1);
    }
  }

  previewNext(): void {
    const index = this.selectedPhotoIndex();
    if (index !== null && index < this.uploadedPhotos().length - 1) {
      this.selectedPhotoIndex.set(index + 1);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onFileInputChange(event: globalThis.Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      this.handleFiles(files);
    }
    (event.target as HTMLInputElement).value = '';
  }

  togglePublish(): void {
    const event = this.event();
    if (!event || this.isTogglingPublish()) {
      return;
    }

    this.isTogglingPublish.set(true);
    this.eventsService
      .updateEvent(event.id, { isPublished: !event.isPublished })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.event.set(updated);
          this.isTogglingPublish.set(false);
        },
        error: () => {
          this.isTogglingPublish.set(false);
          this.errorMsg.set('Failed to update publish state.');
        },
      });
  }

  deletePhoto(photo: Photo): void {
    if (!confirm(`Delete "${photo.originalName}"? This can't be undone.`)) {
      return;
    }

    this.photosService
      .deletePhoto(this.id(), photo.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.handlePhotoDeleted(photo.id),
        error: () => this.errorMsg.set('Failed to delete the photo. Please try again.'),
      });
  }

  private handlePhotoDeleted(photoId: string): void {
    if (this.selectedPhoto()?.id === photoId) {
      this.closePreview();
    }

    const totalItemCount = Math.max(0, this.photosTotalItemCount() - 1);
    this.photosTotalItemCount.set(totalItemCount);
    this.photosTotalPageCount.set(Math.max(1, Math.ceil(totalItemCount / this.photosPageSize())));

    const remaining = this.uploadedPhotos().filter((p) => p.id !== photoId);
    if (remaining.length === 0 && this.photosPageNumber() > 1) {
      this.photosPageNumber.update((page) => page - 1);
      this.photosLoadTrigger$.next();
    } else {
      this.uploadedPhotos.set(remaining);
    }
  }

  cancelUpload(photoId: string): void {
    this.uploading.update((list) => list.filter((u) => u.photoId !== photoId));
    this.uploadTotalCount.update((count) => Math.max(0, count - 1));
    this.resetUploadCountersIfIdle();
    this.photosService.deletePhoto(this.id(), photoId).subscribe();
  }

  retryUpload(item: UploadItem): void {
    this.setItemStatus(item.photoId, 'uploading');
    this.photosService
      .reupload(this.id(), item.photoId, item.fileName, item.file.type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.status === 'UPLOADED' || !result.uploadUrl) {
            this.uploading.update((list) => list.filter((u) => u.photoId !== item.photoId));
            return;
          }
          this.uploadQueue$.next({
            file: item.file,
            photo: { photoId: item.photoId, uploadUrl: result.uploadUrl, key: result.key },
          });
        },
        error: () => this.setItemStatus(item.photoId, 'failed'),
      });
  }

  private handleFiles(files: FileList): void {
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        this.errorMsg.set(`Skipped "${file.name}" — only JPG, PNG, WebP, or HEIC are supported.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        this.errorMsg.set(`Skipped "${file.name}" — must be smaller than 50MB.`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) {
      return;
    }

    this.presignAndUpload(validFiles);
  }

  private presignAndUpload(files: File[]): void {
    const eventId = this.id();

    from(chunk(files, PRESIGN_BATCH_MAX_FILES))
      .pipe(
        mergeMap((fileChunk) =>
          this.photosService.presignBatch(
            eventId,
            fileChunk.map((file) => ({ fileName: file.name, mimeType: file.type, sizeBytes: file.size })),
          ).pipe(map((response) => ({ fileChunk, presigned: response.photos }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ fileChunk, presigned }) => {
          fileChunk.forEach((file, index) => this.queueUpload(file, presigned[index]));
        },
        error: () => this.errorMsg.set('Failed to start upload. Please try again.'),
      });
  }

  private queueUpload(file: File, photo: PresignedPhoto): void {
    this.uploading.update((list) => [
      ...list,
      {
        photoId: photo.photoId,
        fileName: file.name,
        file,
        progress: 0,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
      },
    ]);
    this.uploadTotalCount.update((count) => count + 1);
    this.uploadQueue$.next({ file, photo });
  }

  private resetUploadCountersIfIdle(): void {
    if (this.uploading().length === 0) {
      this.uploadTotalCount.set(0);
      this.uploadCompletedCount.set(0);
    }
  }

  private performUpload(file: File, photo: PresignedPhoto): Observable<unknown> {
    return this.photosService.uploadWithProgress(photo.uploadUrl, file).pipe(
      tap((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.setItemProgress(photo.photoId, Math.round((event.loaded / event.total) * 100));
        }
      }),
      filter((event) => event.type === HttpEventType.Response),
      switchMap(() => this.readFileMetadata(file)),
      switchMap(({ width, height, capturedAt }) =>
        this.photosService.confirmUpload(this.id(), photo.photoId, { width, height, capturedAt }),
      ),
      tap((confirmedPhoto) => this.handlePhotoConfirmed(confirmedPhoto, photo.photoId)),
      catchError(() => {
        this.setItemStatus(photo.photoId, 'failed');
        return of(null);
      }),
    );
  }

  private handlePhotoConfirmed(confirmedPhoto: Photo, photoId: string): void {
    const totalItemCount = this.photosTotalItemCount() + 1;
    this.photosTotalItemCount.set(totalItemCount);
    const totalPageCount = Math.max(1, Math.ceil(totalItemCount / this.photosPageSize()));
    this.photosTotalPageCount.set(totalPageCount);
    if (this.photosPageNumber() === totalPageCount) {
      this.uploadedPhotos.update((list) => [...list, confirmedPhoto]);
    }
    this.uploading.update((list) => list.filter((u) => u.photoId !== photoId));
    this.uploadCompletedCount.update((count) => count + 1);
    this.resetUploadCountersIfIdle();
  }

  private async readFileMetadata(
    file: File,
  ): Promise<{ width?: number; height?: number; capturedAt?: string }> {
    const [dimensions, capturedAt] = await Promise.all([
      this.readImageDimensions(file),
      this.readCapturedAt(file),
    ]);
    return { ...dimensions, ...(capturedAt && { capturedAt }) };
  }

  private readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
    return createImageBitmap(file)
      .then((bitmap) => {
        const dims = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return dims;
      })
      .catch(() => ({}));
  }

  private readCapturedAt(file: File): Promise<string | undefined> {
    return parseExif(file, ['DateTimeOriginal', 'ModifyDate'])
      .then((exif: { DateTimeOriginal?: Date; ModifyDate?: Date } | undefined) => {
        const date = exif?.DateTimeOriginal ?? exif?.ModifyDate;
        return date instanceof Date ? date.toISOString() : undefined;
      })
      .catch(() => undefined);
  }

  private setItemProgress(photoId: string, progress: number): void {
    this.uploading.update((list) =>
      list.map((item) => (item.photoId === photoId ? { ...item, progress } : item)),
    );
  }

  private setItemStatus(photoId: string, status: UploadItem['status']): void {
    this.uploading.update((list) =>
      list.map((item) => (item.photoId === photoId ? { ...item, status, progress: 0 } : item)),
    );
  }
}

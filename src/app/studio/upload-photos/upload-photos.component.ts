import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsService } from '../../events/events.service';

interface UploadItem {
  id: string;
  fileName: string;
  progress: number;
  previewUrl: string;
}

@Component({
  selector: 'app-upload-photos',
  imports: [RouterLink],
  templateUrl: './upload-photos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadPhotosComponent {
  private readonly eventsService = inject(EventsService);

  id = input.required<string>();

  readonly event = computed(() => this.eventsService.getEvent(this.id()));
  readonly recentPhotos = computed(() => this.eventsService.getPhotos(this.id()));

  readonly uploading = signal<UploadItem[]>([]);
  readonly isDragging = signal(false);
  readonly publishGallery = signal(false);

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

  onFileInputChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      this.handleFiles(files);
    }
  }

  togglePublish(): void {
    this.publishGallery.update((v) => !v);
  }

  cancelUpload(uploadId: string): void {
    this.uploading.update((list) => list.filter((u) => u.id !== uploadId));
  }

  private handleFiles(files: FileList): void {
    Array.from(files).forEach((file) => this.simulateUpload(file));
  }

  private simulateUpload(file: File): void {
    const uploadId = `${file.name}-${Date.now()}-${Math.random()}`;
    const previewUrl = URL.createObjectURL(file);
    this.uploading.update((list) => [...list, { id: uploadId, fileName: file.name, progress: 0, previewUrl }]);

    const interval = setInterval(() => {
      this.uploading.update((list) =>
        list.map((u) => (u.id === uploadId ? { ...u, progress: Math.min(100, u.progress + 20) } : u)),
      );
      const current = this.uploading().find((u) => u.id === uploadId);
      if (current && current.progress >= 100) {
        clearInterval(interval);
        this.completeUpload(uploadId, previewUrl);
      }
    }, 300);
  }

  private completeUpload(uploadId: string, previewUrl: string): void {
    this.uploading.update((list) => list.filter((u) => u.id !== uploadId));
    const event = this.event();
    if (!event) {
      return;
    }
    const areaId = event.areas[0]?.id ?? 'general';
    const areaName = event.areas[0]?.name ?? 'General';
    this.eventsService.addPhoto(event.id, {
      imageUrl: previewUrl,
      areaId,
      areaName,
      label: 'New Upload',
      plateNumber: '',
      capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }
}

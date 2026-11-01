import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { IPhoto } from '../../events/events.service';
import { PhotoPreviewModalComponent } from '../../events/event-detail/photo-preview-modal/photo-preview-modal.component';
import { SelectionService } from '../../pricing/selection.service';
import { formatCurrency } from '../../pricing/currency.util';

@Component({
  selector: 'app-order-summary',
  imports: [PhotoPreviewModalComponent],
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSummaryComponent {
  readonly selection = inject(SelectionService);

  /** Shows a remove button on each row — used on the standalone Cart page, not the checkout sidebar. */
  removable = input(false);
  /** Drops the sticky-sidebar sizing so this reads naturally as a full-width page section. */
  fullWidth = input(false);

  /** Clicking a row's thumbnail opens the view-only photo preview — used on the Cart page. */
  previewable = input(false);

  readonly formatCurrency = formatCurrency;

  readonly previewIndex = signal<number | null>(null);
  readonly previewPhoto = computed(() => {
    const index = this.previewIndex();
    return index === null ? null : (this.selection.selectedEntries()[index]?.photo ?? null);
  });

  openPreview(index: number): void {
    this.previewIndex.set(index);
  }

  closePreview(): void {
    this.previewIndex.set(null);
  }

  showPreviewAt(delta: -1 | 1): void {
    const index = this.previewIndex();
    const next = index === null ? null : index + delta;
    if (next !== null && next >= 0 && next < this.selection.selectedEntries().length) {
      this.previewIndex.set(next);
    }
  }

  removePhoto(photo: IPhoto): void {
    this.selection.toggle(photo);
  }
}

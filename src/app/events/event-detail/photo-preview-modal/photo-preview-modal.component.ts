import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { IPhoto } from '../../events.service';
import { IPhotoFormatOption, STANDARD_FORMAT_OPTION } from '../../../pricing/pricing-options.service';
import { formatCurrency } from '../../../pricing/currency.util';

@Component({
  selector: 'app-photo-preview-modal',
  templateUrl: './photo-preview-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPreviewModalComponent {
  photo = input.required<IPhoto>();
  formatOptions = input<IPhotoFormatOption[]>([STANDARD_FORMAT_OPTION]);
  initialFormatId = input<string>(STANDARD_FORMAT_OPTION.id);

  closed = output<void>();
  addToCart = output<{ photo: IPhoto; formatId: string }>();

  readonly formatCurrency = formatCurrency;

  // Matches the image container's aspect ratio to the photo's own dimensions so the modal
  // never letterboxes (white bars). Falls back to 1/1 when the API didn't know the size — the
  // background is dark, so even a mismatch reads like a photo viewer, not an empty area.
  readonly photoAspectRatio = computed(() => {
    const { width, height } = this.photo();
    return width && height ? `${width} / ${height}` : '1 / 1';
  });

  // 5x5 tiled watermark so the brand mark covers ~60% of the photo, matching the thumbnail's
  // diagonal overlay but repeated. A fixed grid fills both the desktop (2/3 of a max-w-5xl modal)
  // and mobile (full-width) image areas without needing the source dimensions.
  readonly watermarkTiles = computed(() => Array.from({ length: 25 }, (_, i) => i));

  // Resets whenever `initialFormatId` changes (modal reopened for a different photo),
  // but stays put once the rider manually picks a different format for this photo.
  readonly selectedFormatId = linkedSignal(() => this.initialFormatId());

  chooseFormat(option: IPhotoFormatOption): void {
    this.selectedFormatId.set(option.id);
  }

  confirmAddToCart(): void {
    this.addToCart.emit({ photo: this.photo(), formatId: this.selectedFormatId() });
  }

  close(): void {
    this.closed.emit();
  }
}

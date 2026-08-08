import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { IPhoto } from '../../events.service';
import { PHOTO_FORMAT_OPTIONS, DEFAULT_FORMAT_OPTION, IPhotoFormatOption } from '../../../pricing/photo-format-options';
import { formatCurrency } from '../../../pricing/currency.util';

@Component({
  selector: 'app-photo-preview-modal',
  templateUrl: './photo-preview-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPreviewModalComponent {
  photo = input.required<IPhoto>();
  basePrice = input.required<number>();
  initialFormatId = input<string>(DEFAULT_FORMAT_OPTION.id);

  closed = output<void>();
  addToCart = output<{ photo: IPhoto; formatId: string }>();

  readonly formatOptions = PHOTO_FORMAT_OPTIONS;
  readonly formatCurrency = formatCurrency;

  // Resets whenever `initialFormatId` changes (modal reopened for a different photo),
  // but stays put once the rider manually picks a different format for this photo.
  readonly selectedFormatId = linkedSignal(() => this.initialFormatId());

  chooseFormat(option: IPhotoFormatOption): void {
    this.selectedFormatId.set(option.id);
  }

  priceFor(option: IPhotoFormatOption): number {
    return this.basePrice() + option.extraPrice;
  }

  confirmAddToCart(): void {
    this.addToCart.emit({ photo: this.photo(), formatId: this.selectedFormatId() });
  }

  close(): void {
    this.closed.emit();
  }
}

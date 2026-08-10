import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
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

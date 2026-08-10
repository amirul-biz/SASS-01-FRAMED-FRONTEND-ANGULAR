import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IPhoto } from '../../events.service';
import { formatCurrency } from '../../../pricing/currency.util';

@Component({
  selector: 'app-photo-card',
  templateUrl: './photo-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoCardComponent {
  photo = input.required<IPhoto>();
  selected = input<boolean>(false);
  price = input.required<number>();
  toggleSelect = output<void>();
  previewPhoto = output<void>();

  readonly formatCurrency = formatCurrency;
}

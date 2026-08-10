import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IPhoto } from '../../events/events.service';
import { SelectionService } from '../../pricing/selection.service';
import { formatCurrency } from '../../pricing/currency.util';

@Component({
  selector: 'app-order-summary',
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

  readonly formatCurrency = formatCurrency;

  removePhoto(photo: IPhoto): void {
    this.selection.toggle(photo);
  }
}

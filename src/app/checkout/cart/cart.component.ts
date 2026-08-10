import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SelectionService } from '../../pricing/selection.service';
import { OrderSummaryComponent } from '../order-summary/order-summary.component';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, OrderSummaryComponent],
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly selection = inject(SelectionService);
}

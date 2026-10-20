import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { OrderCommission } from '../../../../checkout/order.service';
import { formatCurrency } from '../../../../pricing/currency.util';

@Component({
  selector: 'app-amount-per-unit-commission',
  templateUrl: './amount-per-unit-commission.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmountPerUnitCommissionComponent {
  readonly commission = input.required<OrderCommission>();

  readonly formatCurrency = formatCurrency;
}

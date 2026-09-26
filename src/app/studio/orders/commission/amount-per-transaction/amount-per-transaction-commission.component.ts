import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { OrderCommission } from '../../../../checkout/order.service';
import { formatCurrency } from '../../../../pricing/currency.util';

@Component({
  selector: 'app-amount-per-transaction-commission',
  templateUrl: './amount-per-transaction-commission.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmountPerTransactionCommissionComponent {
  readonly commission = input.required<OrderCommission>();

  readonly formatCurrency = formatCurrency;
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { OrderCommission } from '../../../../checkout/order.service';
import { formatCurrency } from '../../../../pricing/currency.util';

@Component({
  selector: 'app-percentage-per-transaction-commission',
  templateUrl: './percentage-per-transaction-commission.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PercentagePerTransactionCommissionComponent {
  readonly commission = input.required<OrderCommission>();

  readonly formatCurrency = formatCurrency;
}

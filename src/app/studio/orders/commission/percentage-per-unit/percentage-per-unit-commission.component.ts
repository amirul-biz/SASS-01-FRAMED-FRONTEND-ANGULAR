import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { OrderCommission } from '../../../../checkout/order.service';
import { formatCurrency } from '../../../../pricing/currency.util';

@Component({
  selector: 'app-percentage-per-unit-commission',
  templateUrl: './percentage-per-unit-commission.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PercentagePerUnitCommissionComponent {
  readonly commission = input.required<OrderCommission>();

  readonly formatCurrency = formatCurrency;
}

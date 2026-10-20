import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderCommission } from '../../../checkout/order.service';
import { formatCurrency } from '../../../pricing/currency.util';
import { AmountPerTransactionCommissionComponent } from './amount-per-transaction/amount-per-transaction-commission.component';
import { AmountPerUnitCommissionComponent } from './amount-per-unit/amount-per-unit-commission.component';
import { PercentagePerTransactionCommissionComponent } from './percentage-per-transaction/percentage-per-transaction-commission.component';
import { PercentagePerUnitCommissionComponent } from './percentage-per-unit/percentage-per-unit-commission.component';

@Component({
  selector: 'app-order-commission',
  imports: [
    PercentagePerTransactionCommissionComponent,
    AmountPerTransactionCommissionComponent,
    PercentagePerUnitCommissionComponent,
    AmountPerUnitCommissionComponent,
  ],
  templateUrl: './order-commission.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCommissionComponent {
  readonly commission = input.required<OrderCommission>();

  readonly formatCurrency = formatCurrency;
  readonly amountKept = computed(
    () => this.commission().originalPaymentAmount - this.commission().commissionAmount,
  );
}

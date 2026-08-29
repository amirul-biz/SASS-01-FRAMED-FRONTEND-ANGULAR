import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IVoucher, VouchersService, voucherConditionsSummary } from '../../../pricing/vouchers.service';

@Component({
  selector: 'app-vouchers-list',
  imports: [RouterLink],
  templateUrl: './vouchers-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VouchersListComponent {
  private readonly auth = inject(AuthService);
  private readonly vouchersService = inject(VouchersService);

  readonly vouchers = signal<IVoucher[]>([]);
  readonly conditionsSummary = voucherConditionsSummary;

  constructor() {
    this.reload();
  }

  deleteVoucher(id: string): void {
    this.vouchersService
      .deleteVoucher(id)
      .then(() => this.reload())
      .catch(() => {
        alert('Could not delete this voucher — it may still be attached to a bundle.');
        this.reload();
      });
  }

  private reload(): void {
    this.vouchersService.getVouchers(this.auth.photographerId()!).then((vouchers) => this.vouchers.set(vouchers));
  }
}

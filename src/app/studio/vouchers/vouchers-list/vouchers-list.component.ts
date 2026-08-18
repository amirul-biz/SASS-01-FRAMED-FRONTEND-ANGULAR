import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IVoucher, VouchersService } from '../../../pricing/vouchers.service';

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

  constructor() {
    this.reload();
  }

  conditionsSummary(voucher: IVoucher): string {
    return voucher.conditions
      .map((c) => {
        const range = c.maxPhotos === null ? `${c.minPhotos}+` : `${c.minPhotos}-${c.maxPhotos}`;
        const amount = voucher.discountType === 'percent-tier' ? `${c.value}% off` : `RM${c.value} flat`;
        return `${range} photos: ${amount}`;
      })
      .join(', ');
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

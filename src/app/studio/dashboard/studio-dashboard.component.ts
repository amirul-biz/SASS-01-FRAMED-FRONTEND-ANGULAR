import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { formatCurrency } from '../../pricing/currency.util';
import { formatBytes, formatGb } from '../../shared/storage.util';
import { PhotographerDashboard, StudioProfileService } from '../studio-profile.service';

const ORDER_STATUS_CHIPS = [
  { key: 'PENDING_CONFIRMATION', label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

@Component({
  selector: 'app-studio-dashboard',
  imports: [RouterLink],
  templateUrl: './studio-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioDashboardComponent {
  private readonly profileService = inject(StudioProfileService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly orderStatusChips = ORDER_STATUS_CHIPS;

  readonly stats = signal<PhotographerDashboard | null>(null);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);

  constructor() {
    this.profileService
      .getDashboard()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: () => this.errorMsg.set('Failed to load your dashboard. Please try again.'),
      });
  }

  readonly formatStorage = formatBytes;
  readonly formatGb = formatGb;

  paidOrderCount(stats: PhotographerDashboard): number {
    return stats.ordersByStatus.PROCESSING + stats.ordersByStatus.DELIVERED;
  }

  totalOrderCount(stats: PhotographerDashboard): number {
    const { PENDING_CONFIRMATION, PROCESSING, DELIVERED, CANCELLED } = stats.ordersByStatus;
    return PENDING_CONFIRMATION + PROCESSING + DELIVERED + CANCELLED;
  }
}

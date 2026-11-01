import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { formatCurrency } from '../../pricing/currency.util';
import { PhotographerDashboard, StudioProfileService } from '../studio-profile.service';

const STORAGE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

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

  formatStorage(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < STORAGE_UNITS.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${unit === 0 ? value : value.toFixed(1)} ${STORAGE_UNITS[unit]}`;
  }

  paidOrderCount(stats: PhotographerDashboard): number {
    return stats.ordersByStatus.PROCESSING + stats.ordersByStatus.DELIVERED;
  }

  totalOrderCount(stats: PhotographerDashboard): number {
    const { PENDING_CONFIRMATION, PROCESSING, DELIVERED, CANCELLED } = stats.ordersByStatus;
    return PENDING_CONFIRMATION + PROCESSING + DELIVERED + CANCELLED;
  }
}

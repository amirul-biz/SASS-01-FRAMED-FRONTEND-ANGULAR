import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminDailyStat, AdminService, AdminStats } from '../admin.service';
import { formatCurrency } from '../../pricing/currency.util';

type ChartSeries = 'photosUploaded' | 'orders' | 'photographersRegistered' | 'eventsCreated';

const CHART_SERIES: { key: ChartSeries; label: string }[] = [
  { key: 'photosUploaded', label: 'Photos' },
  { key: 'orders', label: 'Orders' },
  { key: 'photographersRegistered', label: 'Photographers' },
  { key: 'eventsCreated', label: 'Events' },
];

@Component({
  selector: 'app-admin-dashboard-overview',
  imports: [DatePipe],
  templateUrl: './admin-dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardOverviewComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly chartSeries = CHART_SERIES;

  readonly stats = signal<AdminStats | null>(null);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly selectedSeries = signal<ChartSeries>('photosUploaded');

  constructor() {
    this.adminService
      .getStats()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: () => this.errorMsg.set('Failed to load platform stats. Please try again.'),
      });
  }

  // SVG bar chart geometry: each bar is a fraction of the tallest value, spread across a
  // 640x200 viewBox with gaps — small enough to render inline, no chart library needed.
  readonly dailyBars = computed(() => {
    const daily = this.stats()?.daily ?? [];
    const max = Math.max(1, ...daily.map((d) => d[this.selectedSeries()]));
    const width = 640;
    const height = 200;
    const slot = daily.length > 0 ? width / daily.length : width;
    return daily.map((d, index) => {
      const value = d[this.selectedSeries()];
      const barHeight = Math.round((value / max) * (height - 30));
      const barWidth = Math.max(4, Math.floor(slot * 0.55));
      return {
        ...d,
        value,
        barHeight,
        barWidth,
        x: Math.round(index * slot + (slot - barWidth) / 2),
        y: height - barHeight - 20,
        isToday: index === daily.length - 1,
      };
    });
  });

  readonly selectedSeriesLabel = computed(
    () => this.chartSeries.find((s) => s.key === this.selectedSeries())?.label ?? '',
  );

  maxDailyValue(): number {
    return Math.max(1, ...this.daily().map((d) => d[this.selectedSeries()]));
  }

  daily(): AdminDailyStat[] {
    return this.stats()?.daily ?? [];
  }
}
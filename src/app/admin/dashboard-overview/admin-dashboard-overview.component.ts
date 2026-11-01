import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminOrder, AdminOrderStatus, AdminService, AdminStats } from '../admin.service';
import { formatCurrency } from '../../pricing/currency.util';

type SeriesKey = 'photosUploaded' | 'orders' | 'photographersRegistered' | 'eventsCreated';

const SERIES: { key: SeriesKey; label: string; icon: string }[] = [
  { key: 'orders', label: 'Orders', icon: 'receipt_long' },
  { key: 'photosUploaded', label: 'Photos', icon: 'photo_library' },
  { key: 'eventsCreated', label: 'Events', icon: 'event_available' },
  { key: 'photographersRegistered', label: 'Photographers', icon: 'photo_camera' },
];

const ORDER_STATUS_LABEL: Record<AdminOrderStatus, string> = {
  PENDING_CONFIRMATION: 'Pending',
  PROCESSING: 'Processing',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Chart viewBox: left pad holds the y-axis labels, bottom pad holds the date labels.
const CHART = { width: 640, height: 220, padLeft: 32, padRight: 12, padTop: 14, padBottom: 26 } as const;
const SPARK = { width: 88, height: 28, pad: 3 } as const;

/** Rounds a max up to 1/2/5 x 10^n so the y-axis ticks land on friendly numbers. */
function niceMax(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= max)!;
  return step * magnitude;
}

function linePath(values: number[], width: number, height: number, padX: number, padY: number, max: number): string {
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  return values
    .map((v, i) => {
      const x = padX + (values.length > 1 ? (i / (values.length - 1)) * innerW : innerW / 2);
      const y = padY + innerH - (v / max) * innerH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

@Component({
  selector: 'app-admin-dashboard-overview',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardOverviewComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly chartSeries = SERIES;
  readonly chart = CHART;
  readonly skeletonCards = [0, 1, 2, 3, 4];

  readonly stats = signal<AdminStats | null>(null);
  readonly recentOrders = signal<AdminOrder[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly selectedSeries = signal<SeriesKey>('orders');
  readonly hoverIndex = signal<number | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
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

    // Recent orders are a secondary panel: a failure there shouldn't blank the whole dashboard.
    this.adminService
      .getOrders({ pageSize: 6 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.recentOrders.set(response.items),
        error: () => this.recentOrders.set([]),
      });
  }

  orderStatusLabel(status: AdminOrderStatus): string {
    return ORDER_STATUS_LABEL[status];
  }

  // ---- KPI cards -----------------------------------------------------------------------

  /** Trend per series: last 7 days vs the 7 before, plus a sparkline over the whole window. */
  readonly trends = computed(() => {
    const daily = this.stats()?.daily ?? [];
    return Object.fromEntries(
      SERIES.map(({ key }) => {
        const values = daily.map((d) => d[key]);
        const max = Math.max(1, ...values);
        const recent = sum(values.slice(-7));
        const previous = sum(values.slice(-14, -7));
        const delta = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : null;
        return [
          key,
          {
            recent,
            delta,
            spark: linePath(values, SPARK.width, SPARK.height, SPARK.pad, SPARK.pad, max),
          },
        ];
      }),
    ) as Record<SeriesKey, { recent: number; delta: number | null; spark: string }>;
  });

  readonly spark = SPARK;

  readonly kpis = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const trends = this.trends();
    return [
      { label: 'Revenue', icon: 'payments', value: formatCurrency(s.totalRevenue), hint: 'All time', series: null },
      { label: 'Orders', icon: 'receipt_long', value: String(s.totalOrders), hint: `${trends.orders.recent} in last 7 days`, series: 'orders' as const },
      { label: 'Photos', icon: 'photo_library', value: String(s.totalPhotosUploaded), hint: `${trends.photosUploaded.recent} in last 7 days`, series: 'photosUploaded' as const },
      { label: 'Events published', icon: 'event_available', value: `${s.totalEventsPublished} / ${s.totalEvents}`, hint: `${trends.eventsCreated.recent} created in last 7 days`, series: 'eventsCreated' as const },
      { label: 'Photographers', icon: 'photo_camera', value: String(s.totalPhotographers), hint: `${trends.photographersRegistered.recent} joined in last 7 days`, series: 'photographersRegistered' as const },
    ];
  });

  // ---- Activity chart -------------------------------------------------------------------

  readonly selectedSeriesLabel = computed(
    () => SERIES.find((s) => s.key === this.selectedSeries())?.label ?? '',
  );

  readonly chartModel = computed(() => {
    const daily = this.stats()?.daily ?? [];
    const key = this.selectedSeries();
    const values = daily.map((d) => d[key]);
    const top = niceMax(Math.max(0, ...values));
    const innerW = CHART.width - CHART.padLeft - CHART.padRight;
    const innerH = CHART.height - CHART.padTop - CHART.padBottom;
    const xAt = (i: number) => CHART.padLeft + (values.length > 1 ? (i / (values.length - 1)) * innerW : innerW / 2);
    const yAt = (v: number) => CHART.padTop + innerH - (v / top) * innerH;

    const points = values.map((value, i) => ({ value, x: xAt(i), y: yAt(value), date: daily[i].date }));
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const baseline = CHART.padTop + innerH;
    const area = points.length
      ? `${line} L${points[points.length - 1].x.toFixed(1)} ${baseline} L${points[0].x.toFixed(1)} ${baseline} Z`
      : '';
    const ticks = [0, 0.5, 1].map((f) => ({ y: yAt(top * f), label: Math.round(top * f) }));

    return {
      points,
      line,
      area,
      ticks,
      total: sum(values),
      peak: Math.max(0, ...values),
      isEmpty: sum(values) === 0,
      slot: values.length > 1 ? innerW / (values.length - 1) : innerW,
      baseline,
    };
  });

  readonly hovered = computed(() => {
    const i = this.hoverIndex();
    const points = this.chartModel().points;
    return i !== null && points[i] ? points[i] : null;
  });

  /** Only label every 2nd day (plus the last) so the 14 date labels never collide on phones. */
  showDateLabel(index: number, count: number): boolean {
    return index === count - 1 || (index % 2 === 0 && index < count - 2);
  }

  // ---- Account health -------------------------------------------------------------------

  readonly health = computed(() => {
    const s = this.stats();
    const active = s?.activePhotographers ?? 0;
    const inactive = s?.inactivePhotographers ?? 0;
    const total = active + inactive;
    return { active, inactive, activePct: total ? Math.round((active / total) * 100) : 0 };
  });
}

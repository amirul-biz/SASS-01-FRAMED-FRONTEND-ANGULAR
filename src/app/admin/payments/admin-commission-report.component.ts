import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { formatCurrency } from '../../pricing/currency.util';
import {
  AdminPaymentsService,
  CommissionReport,
  CommissionReportRow,
  CommissionType,
  PaymentProvider,
} from '../admin-payments.service';

const TAB_PROVIDERS: { value: PaymentProvider; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'TOYYIBPAY', label: 'ToyyibPay' },
];

const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  PERCENTAGE_PER_TRANSACTION: '% per transaction',
  AMOUNT_PER_TRANSACTION: 'RM per transaction',
  PERCENTAGE_PER_UNIT: '% per photo',
  AMOUNT_PER_UNIT: 'RM per photo',
};

const ALL_PHOTOGRAPHERS = '';

@Component({
  selector: 'app-admin-commission-report',
  imports: [DatePipe],
  templateUrl: './admin-commission-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommissionReportComponent {
  private readonly paymentsService = inject(AdminPaymentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly tabs = TAB_PROVIDERS;
  readonly typeLabel = COMMISSION_TYPE_LABELS;

  readonly provider = signal<PaymentProvider>('CASH');
  readonly from = signal('');
  readonly to = signal('');
  readonly photographerFilter = signal(ALL_PHOTOGRAPHERS);

  readonly report = signal<CommissionReport | null>(null);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);

  // The photographer filter is client-side, so the table, totals and CSV all read the same rows.
  readonly rows = computed<CommissionReportRow[]>(() => {
    const filterId = this.photographerFilter();
    const allRows = this.report()?.rows ?? [];
    return filterId === ALL_PHOTOGRAPHERS
      ? allRows
      : allRows.filter((row) => row.photographerId === filterId);
  });
  readonly totalGrossPaid = computed(() =>
    this.rows().reduce((total, row) => total + row.grossPaid, 0),
  );
  readonly totalCommission = computed(() =>
    this.rows().reduce((total, row) => total + row.commission, 0),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.paymentsService
      .getCommissionReport(this.provider(), this.from() || undefined, this.to() || undefined)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.expandedId.set(null);
          const isFilteredPhotographerGone = !report.rows.some(
            (row) => row.photographerId === this.photographerFilter(),
          );
          if (isFilteredPhotographerGone) {
            this.photographerFilter.set(ALL_PHOTOGRAPHERS);
          }
        },
        error: () => this.errorMsg.set('Failed to load the commission report. Please try again.'),
      });
  }

  selectProvider(provider: PaymentProvider): void {
    this.provider.set(provider);
    this.photographerFilter.set(ALL_PHOTOGRAPHERS);
    this.load();
  }

  onFromChange(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
    this.load();
  }

  onToChange(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
    this.load();
  }

  onPhotographerChange(event: Event): void {
    this.photographerFilter.set((event.target as HTMLSelectElement).value);
  }

  toggleExpanded(photographerId: string): void {
    this.expandedId.update((current) => (current === photographerId ? null : photographerId));
  }

  // Built from the rows currently on screen, so the file always equals what the admin sees.
  exportCsv(): void {
    const header = [
      'Photographer',
      'Order ID',
      'Payment ID',
      'Event',
      'Paid at',
      'Paid amount',
      'Plan',
      'Type',
      'Base amount',
      'Stored commission',
      'Recomputed commission',
      'Delta',
      'Reconciles',
    ];
    const lines = this.rows().flatMap((row) =>
      row.charges.map((charge) =>
        [
          row.name,
          charge.orderId,
          charge.paymentId,
          charge.eventTitle,
          charge.paidAt,
          charge.paidAmount.toFixed(2),
          charge.planName ?? '',
          charge.commissionType ? COMMISSION_TYPE_LABELS[charge.commissionType] : '',
          charge.baseAmount.toFixed(2),
          charge.commissionAmount.toFixed(2),
          charge.recomputedAmount.toFixed(2),
          charge.delta.toFixed(2),
          charge.isReconciled ? 'yes' : 'no',
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      ),
    );

    const blob = new Blob([[header.join(','), ...lines].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commission-report-${this.provider().toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

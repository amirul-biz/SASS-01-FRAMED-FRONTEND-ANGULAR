import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { formatCurrency } from '../../pricing/currency.util';
import {
  COMMISSION_FILE_ACCEPT,
  CommissionStatement,
  CommissionStatementService,
  CommissionStatus,
} from '../../shared/commission-statement.service';
import { apiErrorMessage } from '../../shared/storage.util';

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  ACCRUING: 'Accruing',
  DUE: 'Due',
  OVERDUE: 'Overdue',
  PAID: 'Paid',
};

export const COMMISSION_STATUS_CLASS: Record<CommissionStatus, string> = {
  ACCRUING: 'bg-surface-variant text-on-surface-variant',
  DUE: 'bg-secondary-container text-on-secondary-container',
  OVERDUE: 'bg-error-container text-error',
  PAID: 'bg-secondary-fixed-dim text-on-secondary-fixed-variant',
};

@Component({
  selector: 'app-studio-commission',
  imports: [DatePipe],
  templateUrl: './studio-commission.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioCommissionComponent {
  private readonly service = inject(CommissionStatementService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly statusLabel = COMMISSION_STATUS_LABEL;
  readonly statusClass = COMMISSION_STATUS_CLASS;
  readonly fileAccept = COMMISSION_FILE_ACCEPT;

  readonly rows = signal<CommissionStatement[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly uploadingPeriod = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.service
      .list()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => this.rows.set(rows),
        error: () => this.errorMsg.set('Failed to load your commission history. Please try again.'),
      });
  }

  /** "2026-11" -> a Date the DatePipe can format as a month. */
  monthDate(period: string): Date {
    return new Date(`${period}-01T00:00:00`);
  }

  /** Last day to pay: the 5th of the month after the commission month. */
  payByDate(period: string): Date {
    const month = this.monthDate(period);
    return new Date(month.getFullYear(), month.getMonth() + 1, 5);
  }

  onFileSelected(period: string, event: globalThis.Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploadingPeriod.set(period);
    this.errorMsg.set(null);
    this.service
      .uploadMine(period, file)
      .pipe(
        finalize(() => this.uploadingPeriod.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.successMsg.set('Attachment uploaded.');
          setTimeout(() => this.successMsg.set(null), 3000);
          this.load();
        },
        error: (error) =>
          this.errorMsg.set(apiErrorMessage(error, 'Failed to upload the attachment.')),
      });
  }
}

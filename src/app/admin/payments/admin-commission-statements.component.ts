import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { formatCurrency } from '../../pricing/currency.util';
import {
  AdminCommissionStatement,
  COMMISSION_FILE_ACCEPT,
  CommissionStatementService,
  CommissionStatus,
} from '../../shared/commission-statement.service';
import { apiErrorMessage } from '../../shared/storage.util';
import {
  COMMISSION_STATUS_CLASS,
  COMMISSION_STATUS_LABEL,
} from '../../studio/commission/studio-commission.component';

/** The month that is currently being collected: last month. */
function previousMonth(): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-admin-commission-statements',
  imports: [DatePipe],
  templateUrl: './admin-commission-statements.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommissionStatementsComponent {
  private readonly service = inject(CommissionStatementService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly statusLabel = COMMISSION_STATUS_LABEL;
  readonly statusClass = COMMISSION_STATUS_CLASS;
  readonly fileAccept = COMMISSION_FILE_ACCEPT;
  readonly statusOptions: CommissionStatus[] = ['ACCRUING', 'DUE', 'OVERDUE', 'PAID'];

  readonly period = signal(previousMonth());
  readonly statusFilter = signal<CommissionStatus | ''>('');
  readonly rows = signal<AdminCommissionStatement[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  // The row open in the modal, looked up by photographer so it refreshes after each action.
  readonly editingId = signal<string | null>(null);
  readonly notes = signal('');
  readonly isBusy = signal(false);
  readonly formError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  editingRow(): AdminCommissionStatement | undefined {
    return this.rows().find((row) => row.photographerId === this.editingId());
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.service
      .adminList(this.period(), this.statusFilter() || undefined)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => this.rows.set(rows),
        error: () => this.errorMsg.set('Failed to load commission statements. Please try again.'),
      });
  }

  onPeriodChange(event: globalThis.Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.period.set(value);
      this.load();
    }
  }

  onStatusFilterChange(event: globalThis.Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as CommissionStatus | '');
    this.load();
  }

  monthDate(period: string): Date {
    return new Date(`${period}-01T00:00:00`);
  }

  openRow(row: AdminCommissionStatement): void {
    this.editingId.set(row.photographerId);
    this.notes.set(row.notes ?? '');
    this.formError.set(null);
  }

  closeModal(): void {
    if (!this.isBusy()) {
      this.editingId.set(null);
    }
  }

  setStatus(status: 'PAID' | 'UNPAID'): void {
    const row = this.editingRow();
    if (!row) {
      return;
    }
    this.run(
      this.service.adminSetStatus(
        row.photographerId,
        this.period(),
        status,
        this.notes().trim() || undefined,
      ),
      status === 'PAID' ? 'Marked as paid.' : 'Marked as unpaid.',
    );
  }

  onFileSelected(event: globalThis.Event): void {
    const row = this.editingRow();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!row || !file) {
      return;
    }
    this.run(
      this.service.adminUpload(row.photographerId, this.period(), file),
      'Attachment uploaded.',
    );
  }

  private run(request$: Observable<void>, successMessage: string): void {
    this.isBusy.set(true);
    this.formError.set(null);
    request$
      .pipe(
        finalize(() => this.isBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.successMsg.set(successMessage);
          setTimeout(() => this.successMsg.set(null), 3000);
          this.load();
        },
        error: (error) => this.formError.set(apiErrorMessage(error, 'Something went wrong.')),
      });
  }
}

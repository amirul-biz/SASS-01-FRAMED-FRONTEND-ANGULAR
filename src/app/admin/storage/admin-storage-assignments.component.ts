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
import {
  AdminStorageAssignment,
  AdminStorageLimit,
  AdminStorageService,
} from '../admin-storage.service';
import { apiErrorMessage, formatBytes, formatGb } from '../../shared/storage.util';

const BYTES_PER_MB = 1024 * 1024;

@Component({
  selector: 'app-admin-storage-assignments',
  templateUrl: './admin-storage-assignments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStorageAssignmentsComponent {
  private readonly storageService = inject(AdminStorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatBytes = formatBytes;
  readonly formatGb = formatGb;

  readonly rows = signal<AdminStorageAssignment[]>([]);
  readonly limits = signal<AdminStorageLimit[]>([]);
  readonly sortBy = signal<'usage' | 'quotaDesc' | 'quotaAsc'>('usage');
  // ponytail: client-side sort over the first 100 rows (pageSize 100); add a server sort param when photographers > 100
  readonly sortedRows = computed(() => {
    const sort = this.sortBy();
    const rank = (r: AdminStorageAssignment) => r.limitMb ?? Number.NEGATIVE_INFINITY;
    return [...this.rows()].sort((a, b) => {
      if (sort === 'usage') {
        return b.usedBytes - a.usedBytes;
      }
      // unlimited rows always last
      if (a.limitMb === null || b.limitMb === null) {
        return Number(a.limitMb === null) - Number(b.limitMb === null);
      }
      return sort === 'quotaDesc' ? rank(b) - rank(a) : rank(a) - rank(b);
    });
  });
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  readonly editingRow = signal<AdminStorageAssignment | null>(null);
  readonly selectedLimitId = signal('');
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);

  constructor() {
    this.load();
    this.storageService
      .getLimits()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (limits) => this.limits.set(limits), error: () => undefined });
  }

  load(): void {
    this.isLoading.set(true);
    this.storageService
      .getAssignments({ pageSize: 100 })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.rows.set(response.items),
        error: () => this.errorMsg.set('Failed to load photographers. Please try again.'),
      });
  }

  flash(message: string): void {
    this.errorMsg.set(null);
    this.successMsg.set(message);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  usagePercent(row: AdminStorageAssignment): number {
    if (row.limitMb === null) {
      return 0;
    }
    return Math.min(100, Math.round((row.usedBytes / (row.limitMb * BYTES_PER_MB)) * 100));
  }

  openAssign(row: AdminStorageAssignment): void {
    this.editingRow.set(row);
    this.selectedLimitId.set(row.storageLimitId ?? '');
    this.formError.set(null);
  }

  closeModal(): void {
    if (!this.isSaving()) {
      this.editingRow.set(null);
    }
  }

  save(storageLimitId: string | null): void {
    const row = this.editingRow();
    if (!row) {
      return;
    }
    this.isSaving.set(true);
    this.formError.set(null);
    this.storageService
      .assignLimit(row.photographerId, storageLimitId)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.editingRow.set(null);
          this.flash(storageLimitId ? 'Storage limit assigned.' : 'Storage limit removed.');
          this.load();
        },
        error: (error) =>
          this.formError.set(apiErrorMessage(error, 'Failed to save. Please try again.')),
      });
  }

  submitAssignment(): void {
    if (!this.selectedLimitId()) {
      this.formError.set('Select a storage limit.');
      return;
    }
    this.save(this.selectedLimitId());
  }
}

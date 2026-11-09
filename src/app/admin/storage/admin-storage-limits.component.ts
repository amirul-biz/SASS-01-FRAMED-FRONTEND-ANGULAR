import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminStorageLimit, AdminStorageService } from '../admin-storage.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { apiErrorMessage, formatGb, gbToMb, mbToGb } from '../../shared/storage.util';

@Component({
  selector: 'app-admin-storage-limits',
  imports: [ConfirmDialogComponent],
  templateUrl: './admin-storage-limits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStorageLimitsComponent {
  private readonly storageService = inject(AdminStorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatGb = formatGb;

  readonly limits = signal<AdminStorageLimit[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly name = signal('');
  readonly limitGb = signal('');

  readonly deleteTarget = signal<AdminStorageLimit | null>(null);
  readonly isDeleting = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.storageService
      .getLimits()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (limits) => this.limits.set(limits),
        error: () => this.errorMsg.set('Failed to load storage limits. Please try again.'),
      });
  }

  flash(message: string): void {
    this.errorMsg.set(null);
    this.successMsg.set(message);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.name.set('');
    this.limitGb.set('');
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  openEdit(limit: AdminStorageLimit): void {
    this.editingId.set(limit.id);
    this.name.set(limit.name);
    this.limitGb.set(String(mbToGb(limit.limitMb)));
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) {
      return;
    }
    this.isModalOpen.set(false);
    this.formError.set(null);
  }

  submit(): void {
    const name = this.name().trim();
    const limitMb = gbToMb(Number(this.limitGb()));
    const editingId = this.editingId();

    if (!name) {
      this.formError.set('Name is required.');
      return;
    }
    if (!Number.isFinite(limitMb) || limitMb < 1) {
      this.formError.set('Limit must be a number of GB greater than 0 (at least 1 MB).');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    const request$ = editingId
      ? this.storageService.updateLimit(editingId, { name, limitMb })
      : this.storageService.createLimit({ name, limitMb });

    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isModalOpen.set(false);
          this.flash(editingId ? 'Storage limit updated.' : 'Storage limit created.');
          this.load();
        },
        error: (error) =>
          this.formError.set(apiErrorMessage(error, 'Failed to save the storage limit.')),
      });
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }
    this.isDeleting.set(true);
    this.storageService
      .deleteLimit(target.id)
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.flash('Storage limit deleted.');
          this.load();
        },
        error: (error) => {
          this.deleteTarget.set(null);
          this.errorMsg.set(apiErrorMessage(error, 'Failed to delete the storage limit.'));
        },
      });
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { AdminPhotographer, AdminPhotographerStats, AdminService } from '../../admin.service';
import { formatCurrency } from '../../../pricing/currency.util';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

@Component({
  selector: 'app-admin-photographer-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-photographer-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPhotographerDetailComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  id = input.required<string>();

  readonly photographer = signal<AdminPhotographer | null>(null);
  readonly stats = signal<AdminPhotographerStats | null>(null);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);

  readonly isResetting = signal(false);
  readonly resetLink = signal<string | null>(null);
  readonly resetError = signal<string | null>(null);
  readonly copied = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatBytes = formatBytes;

  ngOnInit(): void {
    this.isLoading.set(true);
    forkJoin([this.adminService.getPhotographers(), this.adminService.getPhotographerStats(this.id())])
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ([list, stats]) => {
          const photographer = list.items.find((p) => p.id === this.id()) ?? null;
          if (!photographer) {
            this.errorMsg.set('Photographer not found.');
            return;
          }
          this.photographer.set(photographer);
          this.stats.set(stats);
        },
        error: () => this.errorMsg.set('Failed to load photographer. Please try again.'),
      });
  }

  readonly isToggling = signal(false);

  toggleStatus(): void {
    const current = this.photographer();
    if (!current) return;
    this.isToggling.set(true);
    this.adminService
      .setPhotographerStatus(current.id, !current.isActive)
      .pipe(
        finalize(() => this.isToggling.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.photographer.set({ ...current, isActive: !current.isActive }),
        error: () => this.errorMsg.set('Failed to update the account status. Please try again.'),
      });
  }

  resetPassword(): void {
    this.isResetting.set(true);
    this.resetError.set(null);
    this.resetLink.set(null);
    this.adminService
      .resetPhotographerPassword(this.id())
      .pipe(
        finalize(() => this.isResetting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.resetLink.set(res.resetLink),
        error: () => this.resetError.set('Failed to generate a reset link. Please try again.'),
      });
  }

  copyResetLink(): void {
    const link = this.resetLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}

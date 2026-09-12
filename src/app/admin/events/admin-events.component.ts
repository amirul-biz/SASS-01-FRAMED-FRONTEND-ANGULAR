import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminEvent, AdminService } from '../admin.service';

@Component({
  selector: 'app-admin-events',
  imports: [DatePipe],
  templateUrl: './admin-events.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEventsComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer?: ReturnType<typeof setTimeout>;
  private lastSearch = '';

  readonly events = signal<AdminEvent[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly searchDraft = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.adminService
      .getEvents({ search: this.lastSearch || undefined, pageSize: 100 })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.events.set(response.items),
        error: () => this.errorMsg.set('Failed to load events. Please try again.'),
      });
  }

  onSearchInput(event: globalThis.Event): void {
    this.searchDraft.set((event.target as HTMLInputElement).value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.lastSearch = this.searchDraft().trim();
      this.load();
    }, 400);
  }
}
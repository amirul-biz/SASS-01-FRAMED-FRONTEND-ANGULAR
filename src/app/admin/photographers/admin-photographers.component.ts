import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, finalize, switchMap } from 'rxjs';
import { AdminPhotographer, AdminService } from '../admin.service';

const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-admin-photographers',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './admin-photographers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPhotographersComponent {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchTrigger$ = new Subject<string>();
  private searchTimer?: ReturnType<typeof setTimeout>;
  private lastSearch = '';

  readonly photographers = signal<AdminPhotographer[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly searchDraft = signal('');
  readonly isToggling = signal<string | null>(null);

  readonly isRegisterFormOpen = signal(false);
  readonly isRegistering = signal(false);
  readonly formError = signal<string | null>(null);

  readonly registerForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    companyName: [''],
    phone: [''],
    bio: [''],
  });

  constructor() {
    this.load();

    this.searchTrigger$
      .pipe(
        switchMap(() => {
          this.isLoading.set(true);
          return this.adminService
            .getPhotographers({ search: this.searchDraft().trim() || undefined })
            .pipe(finalize(() => this.isLoading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.photographers.set(response.items),
        error: () => this.errorMsg.set('Failed to load photographers. Please try again.'),
      });
  }


  load(): void {
    this.isLoading.set(true);
    this.adminService
      .getPhotographers({ search: this.lastSearch || undefined })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.photographers.set(response.items),
        error: () => this.errorMsg.set('Failed to load photographers. Please try again.'),
      });
  }

  onSearchInput(event: globalThis.Event): void {
    this.searchDraft.set((event.target as HTMLInputElement).value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.lastSearch = this.searchDraft().trim();
      this.load();
    }, SEARCH_DEBOUNCE_MS);
  }


  openRegisterForm(): void {
    this.registerForm.reset();
    this.formError.set(null);
    this.isRegisterFormOpen.set(true);
  }

  closeRegisterForm(): void {
    if (this.isRegistering()) {
      return;
    }
    this.isRegisterFormOpen.set(false);
    this.formError.set(null);
  }

  submitRegister(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) {
      return;
    }

    this.isRegistering.set(true);
    this.formError.set(null);
    this.adminService
      .registerPhotographer(this.registerForm.getRawValue())
      .pipe(
        finalize(() => this.isRegistering.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isRegisterFormOpen.set(false);
          this.successMsg.set(`Photographer "${this.registerForm.getRawValue().name}" registered.`);
          setTimeout(() => this.successMsg.set(null), 4000);
          this.registerForm.reset();
          this.load();
        },
        error: (error) => {
          const message = error?.error?.message;
          const detail = Array.isArray(message) ? message.join(' ') : message;
          this.formError.set(detail ?? 'Registration failed. Please try again.');
        },
      });
  }

  toggleStatus(photographer: AdminPhotographer): void {
    this.isToggling.set(photographer.id);
    this.adminService
      .setPhotographerStatus(photographer.id, !photographer.isActive)
      .pipe(
        finalize(() => this.isToggling.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () =>
          this.photographers.update((list) =>
            list.map((p) => (p.id === photographer.id ? { ...p, isActive: !p.isActive } : p)),
          ),
        error: () => this.errorMsg.set('Failed to update the account status. Please try again.'),
      });
  }
}

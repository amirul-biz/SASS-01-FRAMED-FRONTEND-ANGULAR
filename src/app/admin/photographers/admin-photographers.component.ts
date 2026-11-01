import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminPhotographer, AdminService } from '../admin.service';
import { ResetPasswordDialogComponent } from './reset-password-dialog/reset-password-dialog.component';

const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-admin-photographers',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, ResetPasswordDialogComponent],
  templateUrl: './admin-photographers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPhotographersComponent {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
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
  });

  constructor() {
    this.load();
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

  readonly resetTarget = signal<AdminPhotographer | null>(null);
  readonly isResetting = signal(false);
  readonly resetLink = signal<string | null>(null);
  readonly resetError = signal<string | null>(null);
  readonly copied = signal(false);

  // Opens the dialog and generates the link straight away — the link is only shown to this admin.
  openResetPassword(photographer: AdminPhotographer): void {
    this.resetTarget.set(photographer);
    this.resetLink.set(null);
    this.resetError.set(null);
    this.copied.set(false);
    this.isResetting.set(true);
    this.adminService
      .resetPhotographerPassword(photographer.id)
      .pipe(
        finalize(() => this.isResetting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.resetLink.set(res.resetLink),
        error: () => this.resetError.set('Failed to generate a reset link. Please try again.'),
      });
  }

  closeResetPassword(): void {
    this.resetTarget.set(null);
  }

  copyResetLink(): void {
    const link = this.resetLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
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

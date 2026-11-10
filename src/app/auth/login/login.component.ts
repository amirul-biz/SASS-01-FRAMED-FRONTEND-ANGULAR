import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, Role } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  readonly resetMsg = signal<string | null>(null);

  forgotPassword(): void {
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      this.resetMsg.set(null);
      this.errorMsg.set('Enter your email address above, then click "Forgot password?".');
      return;
    }
    this.errorMsg.set(null);
    this.auth
      .sendPasswordReset(email.value)
      .then(() =>
        this.resetMsg.set('If an account exists for that email, a password reset link has been sent.'),
      )
      .catch((error: unknown) => {
        this.resetMsg.set(null);
        this.errorMsg.set(error instanceof Error ? error.message : 'Could not send the reset email.');
      });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth
      .login(email, password)
      .then((user) => {
        // Honour ?redirectTo= set by studioGuard so a photographer who arrived from an
        // order link lands back on that order rather than the generic landing page.
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
        const isSafeInternalPath =
          !!redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//');
        if (isSafeInternalPath && user.role === Role.Photographer) {
          void this.router.navigateByUrl(redirectTo);
          return;
        }
        this.router.navigate([user.role === Role.Admin ? '/admin' : '/studio']);
      })
      .catch((error: unknown) => {
        this.errorMsg.set(
          error instanceof Error ? error.message : 'Login failed',
        );
      })
      .finally(() => this.loading.set(false));
  }
}

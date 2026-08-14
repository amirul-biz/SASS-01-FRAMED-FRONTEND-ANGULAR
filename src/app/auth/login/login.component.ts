import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

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
        this.router.navigate([user.role === 'admin' ? '/admin' : '/studio']);
      })
      .catch((error: unknown) => {
        this.errorMsg.set(
          error instanceof Error ? error.message : 'Login failed',
        );
      })
      .finally(() => this.loading.set(false));
  }
}

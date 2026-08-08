import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { PhotographersService } from '../../photographers/photographers.service';

@Component({
  selector: 'app-profile-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly photographersService = inject(PhotographersService);

  private readonly photographerId = this.auth.demoPhotographerId;
  private readonly photographer = this.photographersService.getPhotographer(this.photographerId);

  readonly avatarUrl = this.photographer?.avatarUrl ?? '';
  readonly saved = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.photographer?.name ?? '', Validators.required],
    email: [{ value: this.photographer?.email ?? '', disabled: true }],
    location: [this.photographer?.location ?? ''],
    bio: [this.photographer?.bio ?? ''],
  });

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const { name, location, bio } = this.form.getRawValue();
    this.photographersService.updateProfile(this.photographerId, { name, location, bio });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}

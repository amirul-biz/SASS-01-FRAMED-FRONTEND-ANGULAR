import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { StudioProfileService } from '../studio-profile.service';
import { createProfileSettingsForm } from './profile-settings-form.config';

const AVATAR_PLACEHOLDER_URL = 'https://i.pravatar.cc/150?u=studio-profile';

@Component({
  selector: 'app-profile-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettingsComponent {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(StudioProfileService);
  private readonly destroyRef = inject(DestroyRef);

  readonly avatarUrl = AVATAR_PLACEHOLDER_URL;
  readonly saved = signal(false);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = createProfileSettingsForm(
    this.auth.currentUser()?.email ?? '',
  );

  private readonly contactNoValue = toSignal(
    this.form.controls.contactNo.valueChanges,
    { initialValue: this.form.controls.contactNo.value },
  );

  readonly whatsappTestUrl = computed(() => {
    const digits = this.contactNoValue().replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  });

  constructor() {
    this.profileService
      .getMyProfile()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.form.patchValue({
            name: profile.name,
            companyName: profile.companyName ?? '',
            phone: profile.phone ?? '',
            contactNo: profile.contactNo ?? '',
            bio: profile.bio ?? '',
          });
        },
        error: () => {
          this.errorMsg.set('Failed to load your profile. Please try again.');
        },
      });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const { name, companyName, phone, contactNo, bio } =
      this.form.getRawValue();
    this.errorMsg.set(null);
    this.isSaving.set(true);
    this.profileService
      .updateMyProfile({ name, companyName, phone, contactNo, bio })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 2000);
        },
        error: () => {
          this.errorMsg.set('Failed to save your profile. Please try again.');
        },
      });
  }
}

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
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { StudioProfileService } from '../studio-profile.service';
import { createProfileSettingsForm } from './profile-settings-form.config';

const AVATAR_PLACEHOLDER_URL = 'https://i.pravatar.cc/150?u=studio-profile';
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

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

  readonly profileImageUrl = signal<string | null>(null);
  readonly avatarUrl = computed(
    () => this.profileImageUrl() ?? AVATAR_PLACEHOLDER_URL,
  );
  readonly bannerUrl = signal<string | null>(null);
  readonly saved = signal(false);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isUploadingImage = signal(false);
  readonly isUploadingBanner = signal(false);
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
          this.profileImageUrl.set(profile.profileImageUrl);
          this.bannerUrl.set(profile.bannerUrl);
        },
        error: () => {
          this.errorMsg.set('Failed to load your profile. Please try again.');
        },
      });
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      this.errorMsg.set('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      this.errorMsg.set('Image must be smaller than 5MB.');
      return;
    }

    this.errorMsg.set(null);
    this.isUploadingImage.set(true);
    this.profileService
      .presignProfileImage(file.name, file.type)
      .pipe(
        switchMap(({ uploadUrl, publicUrl }) =>
          this.profileService
            .uploadToPresignedUrl(uploadUrl, file)
            .pipe(switchMap(() =>
              this.profileService.updateMyProfile({ profileImageUrl: publicUrl }),
            )),
        ),
        finalize(() => this.isUploadingImage.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.profileImageUrl.set(profile.profileImageUrl);
        },
        error: () => {
          this.errorMsg.set('Failed to upload your photo. Please try again.');
        },
      });
  }

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      this.errorMsg.set('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      this.errorMsg.set('Image must be smaller than 5MB.');
      return;
    }

    this.errorMsg.set(null);
    this.isUploadingBanner.set(true);
    this.profileService
      .presignProfileBanner(file.name, file.type)
      .pipe(
        switchMap(({ uploadUrl, publicUrl }) =>
          this.profileService
            .uploadToPresignedUrl(uploadUrl, file)
            .pipe(switchMap(() =>
              this.profileService.updateMyProfile({ bannerUrl: publicUrl }),
            )),
        ),
        finalize(() => this.isUploadingBanner.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.bannerUrl.set(profile.bannerUrl);
        },
        error: () => {
          this.errorMsg.set('Failed to upload your banner. Please try again.');
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
          this.profileService.refreshProfileCompleteness();
          setTimeout(() => this.saved.set(false), 2000);
        },
        error: () => {
          this.errorMsg.set('Failed to save your profile. Please try again.');
        },
      });
  }
}

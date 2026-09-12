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
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Subject, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs';
import { SEARCH_DEBOUNCE_MS } from '../../shared/constants/search.constants';
import { AuthService } from '../../auth/auth.service';
import { StudioProfileService } from '../studio-profile.service';
import { createProfileSettingsForm } from './profile-settings-form.config';
import { toWhatsAppNumber } from '../../shared/whatsapp-number.util';

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
    return digits ? `https://wa.me/${toWhatsAppNumber(digits)}` : null;
  });

  private originalNickname = signal('');
  private readonly nicknameInput$ = new Subject<string>();
  readonly nicknameStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  readonly nicknameCopied = signal(false);

  readonly nicknameValue = toSignal(this.form.controls.nickname.valueChanges, {
    initialValue: this.form.controls.nickname.value,
  });

  // The public link only exists once a nickname is saved — the copy button reflects the saved
  // state, not whatever is currently typed in the field (an unsaved nickname has no live page).
  readonly savedNicknameLink = computed(() => {
    const nickname = this.nicknameValue();
    return nickname && nickname === this.originalNickname()
      ? `https://picsweep.my/photographers/${nickname}`
      : null;
  });

  async copyProfileLink(): Promise<void> {
    const link = this.savedNicknameLink();
    if (!link) {
      return;
    }
    await navigator.clipboard.writeText(link);
    this.nicknameCopied.set(true);
    setTimeout(() => this.nicknameCopied.set(false), 2000);
  }

  constructor() {
    this.profileService
      .getMyProfile()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.originalNickname.set(profile.nickname ?? '');
          this.form.patchValue({
            name: profile.name,
            companyName: profile.companyName ?? '',
            contactNo: profile.contactNo ?? '',
            nickname: this.originalNickname(),
            bio: profile.bio ?? '',
          });
          this.profileImageUrl.set(profile.profileImageUrl);
          this.bannerUrl.set(profile.bannerUrl);
        },
        error: () => {
          this.errorMsg.set('Failed to load your profile. Please try again.');
        },
      });

    this.nicknameInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((value) => {
          if (!value || value === this.originalNickname()) {
            this.nicknameStatus.set('idle');
            return EMPTY;
          }
          if (this.form.controls.nickname.invalid) {
            this.nicknameStatus.set('invalid');
            return EMPTY;
          }
          this.nicknameStatus.set('checking');
          return this.profileService.checkNicknameAvailability(value);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.nicknameStatus.set(res.available ? 'available' : 'taken'));
  }

  onContactNoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '');
    if (digitsOnly !== input.value) {
      this.form.controls.contactNo.setValue(digitsOnly);
    }
  }

  onNicknameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (cleaned !== input.value) {
      this.form.controls.nickname.setValue(cleaned);
    }
    this.nicknameInput$.next(cleaned);
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
        switchMap(({ uploadUrl, key }) =>
          this.profileService
            .uploadToPresignedUrl(uploadUrl, file)
            .pipe(switchMap(() =>
              this.profileService.updateMyProfile({ profileImageKey: key }),
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
        switchMap(({ uploadUrl, key }) =>
          this.profileService
            .uploadToPresignedUrl(uploadUrl, file)
            .pipe(switchMap(() =>
              this.profileService.updateMyProfile({ bannerKey: key }),
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
    if (this.form.invalid || this.nicknameStatus() === 'taken') {
      return;
    }
    const { name, companyName, contactNo, nickname, bio } =
      this.form.getRawValue();
    this.errorMsg.set(null);
    this.isSaving.set(true);
    this.profileService
      .updateMyProfile({ name, companyName, contactNo, bio, nickname: nickname || undefined })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.originalNickname.set(nickname);
          this.saved.set(true);
          this.profileService.refreshProfileCompleteness();
          setTimeout(() => this.saved.set(false), 2000);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMsg.set(
            err.status === 409 ? 'This nickname is already taken.' : 'Failed to save your profile. Please try again.',
          );
        },
      });
  }
}

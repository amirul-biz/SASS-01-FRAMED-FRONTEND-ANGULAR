import { FormControl, FormGroup, Validators } from '@angular/forms';

export interface IProfileSettingsForm {
  name: FormControl<string>;
  email: FormControl<string>;
  companyName: FormControl<string>;
  contactNo: FormControl<string>;
  nickname: FormControl<string>;
  bio: FormControl<string>;
}

export function createProfileSettingsForm(
  email: string,
): FormGroup<IProfileSettingsForm> {
  return new FormGroup<IProfileSettingsForm>({
    name: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    email: new FormControl({ value: email, disabled: true }, { nonNullable: true }),
    companyName: new FormControl('', { nonNullable: true }),
    contactNo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]+$/)],
    }),
    nickname: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/)],
    }),
    bio: new FormControl('', { nonNullable: true }),
  });
}

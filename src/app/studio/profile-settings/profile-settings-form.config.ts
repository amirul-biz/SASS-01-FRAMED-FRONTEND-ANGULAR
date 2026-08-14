import { FormControl, FormGroup, Validators } from '@angular/forms';

export interface IProfileSettingsForm {
  name: FormControl<string>;
  email: FormControl<string>;
  companyName: FormControl<string>;
  phone: FormControl<string>;
  contactNo: FormControl<string>;
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
    phone: new FormControl('', { nonNullable: true }),
    contactNo: new FormControl('', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
  });
}

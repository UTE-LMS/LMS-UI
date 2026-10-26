import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

export const emailValidator = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value || typeof control.value !== 'string') {
    return null;
  } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(control.value)) {
    return { invalidEmail: { valid: false, value: control.value } };
  } else {
    return Validators.email(control);
  }
};

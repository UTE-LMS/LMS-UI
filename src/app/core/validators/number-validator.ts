import { AbstractControl, ValidationErrors } from '@angular/forms';

export const numberValidator = (control: AbstractControl): ValidationErrors | null => {
  if (control.pristine) {
    return null;
  }
  const NUMBER_REGEXP = /^-?[\d.]+(?:e-?\d+)?$/;
  control.markAsTouched();
  if (!control.value || typeof control.value !== 'string') {
    return null;
  } else if (NUMBER_REGEXP.test(control.value)) {
    return null;
  } else {
    return { invalidNumber: true };
  }
};

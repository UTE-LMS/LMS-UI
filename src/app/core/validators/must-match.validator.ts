import { AbstractControl, ValidationErrors } from '@angular/forms';

export const mustMatch = (firstControlName: string, secondControlName: string) => (formGroup: AbstractControl): ValidationErrors | null => {
  const firstControl = formGroup.get(firstControlName);
  const secondControl = formGroup.get(secondControlName);

  if (!firstControl || !secondControl) {
    console.error(`Form Control not found: ${firstControlName} or ${secondControlName}`);
    return null;
  } else if (secondControl.errors && !secondControl.errors.mustMatch) {
    return null;
  } else if (firstControl.value !== secondControl.value) {
    secondControl.setErrors({ mustMatch: true });
  } else {
    secondControl.setErrors(null);
  }
  return null;
};

// Using:
// this.form = this.fbd.group({
//   ......
//   formControlName1...
//   formControlName2...
//   ......
// }, {
//   validators: mustMatch('formControlName1', 'formControlName2')
// });


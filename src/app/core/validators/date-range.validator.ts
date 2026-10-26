import { AbstractControl, ValidationErrors } from '@angular/forms';

// custom validator to check Date A > Date B
export const dateRange = (firstControlName: string, secondControlName: string) => (formGroup: AbstractControl): ValidationErrors | null => {
  const firstControl = formGroup.get(firstControlName);
  const secondControl = formGroup.get(secondControlName);

  if (!firstControl || !secondControl) {
    console.error(`Form Control not found: ${firstControlName} or ${secondControlName}`);
    return null;
  } else if (secondControl.errors && !secondControl.errors.dateRange) {
    return null;
  } else if (firstControl.value > secondControl.value) {
    secondControl.setErrors({ dateRange: true, dateRangeError: `${firstControlName}_${secondControlName}` });
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
//   validators: dateRange('formControlName1', 'formControlName2')
// });

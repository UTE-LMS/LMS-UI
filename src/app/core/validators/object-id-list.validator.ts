import { AbstractControl, ValidationErrors } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';

/**
 * Mỗi phần tử của danh sách phải là ObjectId 24 ký tự hex (API-CONTRACT.md §1.3).
 * Việc ID có tồn tại hay không do backend kiểm tra và trả 422 (US-02/AC-3).
 */
export const objectIdListValidator = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  if (!Array.isArray(value)) {
    return null;
  }
  const invalid = (value as unknown[]).filter(
    item => typeof item !== 'string' || !SystemConstant.OBJECT_ID_REGEX.test(item),
  );
  return invalid.length ? { invalidObjectId: { values: invalid } } : null;
};

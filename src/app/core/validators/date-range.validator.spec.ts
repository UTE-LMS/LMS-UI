import { FormControl, FormGroup } from '@angular/forms';
import { dateRange } from './date-range.validator';

function rangeForm(from: string, to: string): FormGroup {
  return new FormGroup(
    { from: new FormControl(from), to: new FormControl(to) },
    { validators: dateRange('from', 'to') },
  );
}

describe('NT-UI/AC-1: dateRange', () => {
  it('ngày bắt đầu sau ngày kết thúc gắn lỗi dateRange kèm tên cặp control', () => {
    const form = rangeForm('2026-12-31', '2026-01-01');
    expect(form.get('to')?.errors).toEqual({ dateRange: true, dateRangeError: 'from_to' });
  });

  it('ngày bắt đầu bằng ngày kết thúc là hợp lệ (ca biên)', () => {
    expect(rangeForm('2026-05-01', '2026-05-01').get('to')?.errors).toBeNull();
  });

  it('ngày bắt đầu trước ngày kết thúc là hợp lệ', () => {
    expect(rangeForm('2026-01-01', '2026-01-02').get('to')?.errors).toBeNull();
  });

  it('không ghi đè lỗi khác (không phải dateRange) trên control thứ hai', () => {
    const form = rangeForm('2026-12-31', '2026-01-01');
    form.get('to')?.setErrors({ required: true });
    form.updateValueAndValidity();
    expect(form.get('to')?.errors).toEqual({ required: true });
  });

  it('tên control không tồn tại: ghi log lỗi và không ném ngoại lệ (ca âm)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const form = new FormGroup({ from: new FormControl('') });
    expect(dateRange('from', 'missing')(form)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

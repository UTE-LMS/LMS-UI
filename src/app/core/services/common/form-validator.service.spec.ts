import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { FormValidatorService } from './form-validator.service';

function createForm(): FormGroup {
  return new FormGroup({
    name: new FormControl('', Validators.required),
    nickname: new FormControl(''),
    address: new FormGroup({ street: new FormControl('', Validators.required) }),
    phones: new FormArray([
      new FormControl('', Validators.required),
      new FormGroup({ number: new FormControl('', Validators.required) }),
    ]),
  });
}

describe('NT-UI/AC-5: FormValidatorService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validateAllFormFields đánh dấu touched mọi control, kể cả trong nhóm con', () => {
    const service = TestBed.inject(FormValidatorService);
    const form = createForm();
    service.validateAllFormFields(form);
    expect(form.get('name')?.touched).toBe(true);
    expect(form.get('nickname')?.touched).toBe(true);
    expect(form.get('address.street')?.touched).toBe(true);
  });

  it('validateAllFormFieldWithFormArrays đánh dấu touched cả phần tử trong FormArray', () => {
    const service = TestBed.inject(FormValidatorService);
    const form = createForm();
    service.validateAllFormFieldWithFormArrays(form);
    const phones = form.get('phones') as FormArray;
    expect(phones.at(0).touched).toBe(true);
    expect(phones.at(1).get('number')?.touched).toBe(true);
    expect(form.get('name')?.touched).toBe(true);
    expect(form.get('address.street')?.touched).toBe(true);
  });

  describe('isFieldValid (true nghĩa là hiển thị lỗi)', () => {
    it('có lỗi nhưng chưa touched thì chưa hiển thị lỗi (ca biên)', () => {
      const service = TestBed.inject(FormValidatorService);
      expect(service.isFieldValid(createForm(), 'name')).toBe(false);
    });

    it('có lỗi và đã touched thì hiển thị lỗi', () => {
      const service = TestBed.inject(FormValidatorService);
      const form = createForm();
      form.get('name')?.markAsTouched();
      expect(service.isFieldValid(form, 'name')).toBe(true);
    });

    it('kiểm tra theo mã lỗi cụ thể', () => {
      const service = TestBed.inject(FormValidatorService);
      const form = createForm();
      form.get('name')?.markAsTouched();
      expect(service.isFieldValid(form, 'name', 'required')).toBe(true);
      expect(service.isFieldValid(form, 'name', 'minlength')).toBe(false);
    });

    it('trường không tồn tại trả về false (ca âm)', () => {
      const service = TestBed.inject(FormValidatorService);
      expect(service.isFieldValid(createForm(), 'khong-co')).toBe(false);
    });

    it('trường hợp form hỏng ném lỗi thì bắt lại và trả về false', () => {
      const service = TestBed.inject(FormValidatorService);
      const broken = { get: () => { throw new Error('hỏng'); } } as unknown as FormGroup;
      expect(service.isFieldValid(broken, 'name')).toBe(false);
    });
  });

  describe('isFieldRequired', () => {
    it('nhận biết trường bắt buộc và không bắt buộc', () => {
      const service = TestBed.inject(FormValidatorService);
      const form = createForm();
      expect(service.isFieldRequired(form, 'name')).toBe(true);
      expect(service.isFieldRequired(form, 'nickname')).toBe(false);
    });

    it('trường không tồn tại hoặc form hỏng trả về false (ca âm)', () => {
      const service = TestBed.inject(FormValidatorService);
      const broken = { get: () => { throw new Error('hỏng'); } } as unknown as FormGroup;
      expect(service.isFieldRequired(createForm(), 'khong-co')).toBe(false);
      expect(service.isFieldRequired(broken, 'name')).toBe(false);
    });
  });

  describe('isFormValid (lỗi cấp form, ví dụ mật khẩu không khớp)', () => {
    it('chỉ báo lỗi khi form có lỗi đó và đã touched', () => {
      const service = TestBed.inject(FormValidatorService);
      const form = new FormGroup({ a: new FormControl('') }, {
        validators: () => ({ mustMatch: true }),
      });
      expect(service.isFormValid(form, 'mustMatch')).toBe(false);
      form.markAsTouched();
      expect(service.isFormValid(form, 'mustMatch')).toBe(true);
      expect(service.isFormValid(form, 'khac')).toBe(false);
    });

    it('form hỏng ném lỗi thì trả về false', () => {
      const service = TestBed.inject(FormValidatorService);
      const broken = { hasError: () => { throw new Error('hỏng'); } } as unknown as FormGroup;
      expect(service.isFormValid(broken, 'x')).toBe(false);
    });
  });

  describe('lớp CSS hiển thị lỗi', () => {
    it('displayFieldCss và displayFieldCssZorro phản ánh trạng thái lỗi của trường', () => {
      const service = TestBed.inject(FormValidatorService);
      const form = createForm();
      expect(service.displayFieldCss(form, 'name')).toEqual({ 'has-error': false });
      expect(service.displayFieldCssZorro(form, 'name')).toBe('');
      form.get('name')?.markAsTouched();
      expect(service.displayFieldCss(form, 'name')).toEqual({ 'has-error': true });
      expect(service.displayFieldCssZorro(form, 'name')).toBe('error');
    });
  });
});

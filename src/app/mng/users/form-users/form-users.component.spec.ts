import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemConstant } from '@constants/system.constant';
import { ModalData } from '@models/common/modal-data.model';
import { IUser } from '@models/user/user.model';
import { UserService } from '@services/user/user.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject, throwError } from 'rxjs';
import { FormUsersComponent } from './form-users.component';

const SECTION_ID = '671dcba5f123456789abcd02';

const apiError = (status: number, message: string, fieldErrors?: { field: string; message: string; }[]): HttpErrorResponse => new HttpErrorResponse({ status, error: { timestamp: 't', status, code: 'X', message, path: '/api/v1/users', fieldErrors } });

const existingUser: IUser = {
  id: '671dcba5f123456789abcde1',
  username: 'gv.oop01',
  email: 'gv.oop01@example.test',
  fullName: 'Giảng viên thử nghiệm',
  status: 'ACTIVE',
  roleAssignments: [{ role: 'LECTURER', scope: { programIds: [], courseIds: [], sectionIds: [SECTION_ID] } }],
  createdAt: '2026-10-27T05:00:00Z',
  updatedAt: '2026-10-27T05:00:00Z',
};

describe('FormUsersComponent (F01 US-02)', () => {
  let fixture: ComponentFixture<FormUsersComponent>;
  let component: FormUsersComponent;
  const userSvc = {
    create: vi.fn((): Observable<unknown> => of({})),
    update: vi.fn((): Observable<unknown> => of({})),
  };
  const alert = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  let closed: boolean[];

  const setup = (mode: 'add' | 'edit'): void => {
    TestBed.configureTestingModule({
      imports: [FormUsersComponent],
      providers: [
        { provide: UserService, useValue: userSvc },
        { provide: ToastrService, useValue: alert },
      ],
    });
    const modal = new ModalData<IUser>();
    if (mode === 'edit') {
      modal.action = SystemConstant.ACTION.EDIT;
      modal.data = existingUser;
    }
    fixture = TestBed.createComponent(FormUsersComponent);
    fixture.componentRef.setInput('modalData', modal);
    component = fixture.componentInstance;
    closed = [];
    component.closeModal.subscribe(value => closed.push(value));
    fixture.detectChanges();
  };

  const fillValidCreate = (): void => {
    component.form.patchValue({
      username: '  GV_TranThiB ',
      password: 'Password123!',
      email: ' TranThiB@Example.Test ',
      fullName: ' Trần Thị B ',
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    userSvc.create.mockImplementation(() => of({}));
    userSvc.update.mockImplementation(() => of({}));
  });

  describe('thêm người dùng', () => {
    beforeEach(() => setup('add'));

    it('bắt đầu với đúng một dòng vai trò', () => {
      expect(component.roleForms()).toHaveLength(1);
      expect(component.isEdit).toBe(false);
    });

    it('form trống: không gọi API và đánh dấu lỗi', () => {
      component.onSubmit();
      expect(userSvc.create).not.toHaveBeenCalled();
      expect(component.form.controls.username.touched).toBe(true);
      expect(closed).toEqual([]);
    });

    it('mật khẩu 73 byte bị chặn ở client; 72 byte được qua', () => {
      fillValidCreate();
      component.form.controls.password.setValue('a'.repeat(73));
      component.onSubmit();
      expect(userSvc.create).not.toHaveBeenCalled();
      expect(component.form.controls.password.hasError('passwordTooLong')).toBe(true);

      component.form.controls.password.setValue('a'.repeat(72));
      component.onSubmit();
      expect(userSvc.create).toHaveBeenCalledTimes(1);
    });

    it('email sai định dạng bị chặn', () => {
      fillValidCreate();
      component.form.controls.email.setValue('khong-phai-email');
      component.onSubmit();
      expect(userSvc.create).not.toHaveBeenCalled();
      expect(component.form.controls.email.hasError('invalidEmail')).toBe(true);
    });

    it('US-02/AC-1: gửi username/email đã trim + lowercase và scope null cho ADMIN', () => {
      fillValidCreate();
      component.roleForms()[0].patchValue({ role: 'ADMIN', programIds: [SECTION_ID] });
      component.onSubmit();

      expect(userSvc.create).toHaveBeenCalledWith({
        username: 'gv_tranthib',
        email: 'tranthib@example.test',
        password: 'Password123!',
        fullName: 'Trần Thị B',
        roleAssignments: [{ role: 'ADMIN', scope: null }],
      });
      expect(closed).toEqual([true]);
      expect(alert.success).toHaveBeenCalledWith('Thêm mới thành công!');
    });

    it('gửi phạm vi của giảng viên khi có nhập mã hợp lệ', () => {
      fillValidCreate();
      component.roleForms()[0].patchValue({ role: 'LECTURER', sectionIds: [SECTION_ID] });
      component.onSubmit();
      const payload = userSvc.create.mock.calls[0] as unknown as [{ roleAssignments: unknown[]; }];
      expect(payload[0].roleAssignments).toEqual([
        { role: 'LECTURER', scope: { programIds: [], courseIds: [], sectionIds: [SECTION_ID] } },
      ]);
    });

    it('US-02/AC-1: không có vai trò nào thì bị chặn kèm thông báo', () => {
      fillValidCreate();
      component.removeRole(0);
      component.onSubmit();
      expect(userSvc.create).not.toHaveBeenCalled();
      expect(component.rolesErrorMsg()).toBe('Cần ít nhất một vai trò.');
    });

    it('mã phạm vi sai định dạng ObjectId bị chặn ở client', () => {
      fillValidCreate();
      component.roleForms()[0].patchValue({ role: 'LECTURER', courseIds: ['OOPR230279'] });
      component.onSubmit();
      expect(userSvc.create).not.toHaveBeenCalled();
      expect(component.rolesErrorMsg()).toContain('24 ký tự hex');
    });

    it('có thể thêm và bỏ dòng vai trò', () => {
      component.addRole();
      expect(component.roleForms()).toHaveLength(2);
      component.removeRole(0);
      expect(component.roleForms()).toHaveLength(1);
    });

    it('US-02/AC-2: 409 trùng tên đăng nhập hiện thông điệp của backend và giữ nguyên dữ liệu đã nhập', () => {
      userSvc.create.mockImplementation(() => throwError(() => apiError(409, 'Tên đăng nhập đã tồn tại')));
      fillValidCreate();
      component.roleForms()[0].patchValue({ role: 'ADMIN' });
      component.onSubmit();

      expect(component.formErrorMsg()).toBe('Tên đăng nhập đã tồn tại');
      expect(closed).toEqual([]);
      expect(component.form.controls.fullName.value).toBe(' Trần Thị B ');
      expect(component.isSubmitting()).toBe(false);
    });

    it('US-02/AC-3: 422 scope không tồn tại hiện thông điệp quy tắc nghiệp vụ', () => {
      userSvc.create.mockImplementation(() => throwError(() => apiError(422, 'Mã lớp học phần không tồn tại')));
      fillValidCreate();
      component.roleForms()[0].patchValue({ role: 'LECTURER', sectionIds: [SECTION_ID] });
      component.onSubmit();
      expect(component.formErrorMsg()).toBe('Mã lớp học phần không tồn tại');
      expect(closed).toEqual([]);
    });

    it('400 có fieldErrors: gắn lỗi vào đúng ô và xóa khi người dùng sửa ô đó', () => {
      userSvc.create.mockImplementation(() => throwError(() => apiError(400, 'Dữ liệu yêu cầu không hợp lệ', [
        { field: 'email', message: 'Email đã được dùng ở nơi khác' },
        { field: 'roleAssignments[0].role', message: 'Vai trò không hợp lệ' },
      ])));
      fillValidCreate();
      component.roleForms()[0].patchValue({ role: 'ADMIN' });
      component.onSubmit();

      expect(component.serverFieldErrors().email).toBe('Email đã được dùng ở nơi khác');
      expect(component.rolesErrorMsg()).toBe('Vai trò không hợp lệ');
      expect(component.formErrorMsg()).toBe('');

      component.form.controls.email.setValue('khac@example.test');
      expect(component.serverFieldErrors().email).toBeUndefined();
    });

    it('chống bấm đúp: bấm Lưu hai lần khi đang chờ chỉ tạo một lần', () => {
      const pending = new Subject<unknown>();
      userSvc.create.mockImplementation(() => pending);
      fillValidCreate();
      component.roleForms()[0].patchValue({ role: 'ADMIN' });
      component.onSubmit();
      component.onSubmit();
      expect(userSvc.create).toHaveBeenCalledTimes(1);
      expect(component.isSubmitting()).toBe(true);
      pending.next({});
      pending.complete();
      expect(component.isSubmitting()).toBe(false);
    });

    it('Hủy phát closeModal(false) và không gọi API', () => {
      component.onCancel();
      expect(closed).toEqual([false]);
      expect(userSvc.create).not.toHaveBeenCalled();
    });
  });

  describe('sửa người dùng', () => {
    beforeEach(() => setup('edit'));

    it('đổ dữ liệu cũ vào form và khóa username + mật khẩu (bất biến)', () => {
      expect(component.isEdit).toBe(true);
      expect(component.form.controls.username.value).toBe('gv.oop01');
      expect(component.form.controls.username.disabled).toBe(true);
      expect(component.form.controls.password.disabled).toBe(true);
      expect(component.roleForms()).toHaveLength(1);
      expect(component.roleForms()[0].getRawValue().sectionIds).toEqual([SECTION_ID]);
    });

    it('mật khẩu bị khóa nên không đòi nhập khi sửa', () => {
      component.onSubmit();
      expect(userSvc.update).toHaveBeenCalledTimes(1);
    });

    it('gửi PUT chỉ gồm email, fullName, roleAssignments (không có username/password)', () => {
      component.form.patchValue({ email: 'Moi@Example.Test', fullName: 'Tên mới' });
      component.onSubmit();

      expect(userSvc.update).toHaveBeenCalledTimes(1);
      const [body, id] = userSvc.update.mock.calls[0] as unknown as [Record<string, unknown>, string];
      expect(id).toBe(existingUser.id);
      expect(Object.keys(body).sort()).toEqual(['email', 'fullName', 'roleAssignments']);
      expect(body['email']).toBe('moi@example.test');
      expect(alert.success).toHaveBeenCalledWith('Cập nhật thành công!');
      expect(closed).toEqual([true]);
      expect(userSvc.create).not.toHaveBeenCalled();
    });

    it('US-02/AC-5: 422 tự gỡ vai trò ADMIN hiện thông điệp và giữ nguyên form', () => {
      userSvc.update.mockImplementation(() => throwError(() => apiError(422, 'Không thể tự gỡ vai trò quản trị viên của chính mình')));
      component.roleForms()[0].patchValue({ role: 'VIEWER' });
      component.onSubmit();
      expect(component.formErrorMsg()).toBe('Không thể tự gỡ vai trò quản trị viên của chính mình');
      expect(component.roleForms()[0].getRawValue().role).toBe('VIEWER');
      expect(closed).toEqual([]);
    });

    it('409 trùng email khi sửa hiện thông điệp của backend', () => {
      userSvc.update.mockImplementation(() => throwError(() => apiError(409, 'Email đã tồn tại')));
      component.onSubmit();
      expect(component.formErrorMsg()).toBe('Email đã tồn tại');
    });
  });
});

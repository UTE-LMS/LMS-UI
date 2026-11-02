import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IUser } from '@models/user/user.model';
import { UserService } from '@services/user/user.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { DetailUsersComponent } from './detail-users.component';
import { FormUsersComponent } from '../form-users/form-users.component';

const user: IUser = {
  id: '671dcba5f123456789abcde1',
  username: 'gv.oop01',
  email: 'gv.oop01@example.test',
  fullName: 'Giảng viên thử nghiệm',
  status: 'ACTIVE',
  roleAssignments: [{ role: 'VIEWER', scope: null }],
  createdAt: '2026-10-27T05:00:00Z',
  updatedAt: '2026-10-27T05:00:00Z',
};

describe('DetailUsersComponent (trang thêm/sửa người dùng)', () => {
  let fixture: ComponentFixture<DetailUsersComponent>;
  const userSvc = { getById: vi.fn((): Observable<IUser> => of(user)), create: vi.fn(), update: vi.fn() };

  const setup = async (id?: string): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [DetailUsersComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userSvc },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(DetailUsersComponent);
    if (id) {
      fixture.componentRef.setInput('id', id);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const formComponent = (): FormUsersComponent | undefined => fixture.debugElement.children.find(el => el.componentInstance instanceof FormUsersComponent)?.componentInstance as FormUsersComponent | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    userSvc.getById.mockImplementation(() => of(user));
  });

  it('/users/new: không gọi getById, mở form ở chế độ thêm', async () => {
    await setup();
    expect(userSvc.getById).not.toHaveBeenCalled();
    expect(text()).toContain('Thêm người dùng');
    expect(formComponent()?.modalData().action).toBe(SystemConstant.ACTION.ADD);
  });

  it('/users/:id: nạp người dùng rồi mở form ở chế độ sửa', async () => {
    await setup(user.id);
    expect(userSvc.getById).toHaveBeenCalledWith(user.id);
    expect(text()).toContain('Sửa người dùng');
    expect(formComponent()?.modalData().action).toBe(SystemConstant.ACTION.EDIT);
    expect(formComponent()?.modalData().data?.username).toBe('gv.oop01');
  });

  it.each([404, 400])('HTTP %s: hiện "Không tìm thấy dữ liệu yêu cầu" kèm nút quay lại danh sách', async status => {
    userSvc.getById.mockImplementation(() => throwError(() => new HttpErrorResponse({ status })));
    await setup('671dcba5f123456789abcdef');
    expect(text()).toContain('Không tìm thấy dữ liệu yêu cầu.');
    expect(text()).toContain('Quay lại trang danh sách');
    expect(formComponent()).toBeUndefined();
  });

  it('lỗi khác (403, mạng): báo không tải được, không nhầm với "không tìm thấy", và Thử lại nạp lại', async () => {
    userSvc.getById.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 403 })));
    await setup(user.id);
    expect(text()).toContain('Không tải được thông tin người dùng');
    expect(text()).not.toContain('Không tìm thấy dữ liệu yêu cầu.');

    userSvc.getById.mockImplementation(() => of(user));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(userSvc.getById).toHaveBeenCalledTimes(2);
    expect(formComponent()).toBeDefined();
  });

  it('đóng form (lưu hoặc hủy) thì về danh sách người dùng', async () => {
    await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    formComponent()?.onCancel();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.USERS);
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IPagedResults } from '@models/common/response-data.model';
import { IUser } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { UserService } from '@services/user/user.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { ListUsersComponent } from './list-users.component';

const makeUser = (id: string, username: string, status: 'ACTIVE' | 'LOCKED', role: IUser['roleAssignments'][0]['role'] = 'LECTURER'): IUser => ({
  id,
  username,
  email: `${username}@example.test`,
  fullName: `Họ tên ${username}`,
  status,
  roleAssignments: [{ role, scope: null }],
  createdAt: '2026-10-27T05:00:00Z',
  updatedAt: '2026-10-27T06:00:00Z',
});

const ME = makeUser('me', 'admin', 'ACTIVE', 'ADMIN');
const OTHER = makeUser('other', 'gv.oop01', 'ACTIVE');
const LOCKED = makeUser('locked', 'qa.01', 'LOCKED', 'QA_OFFICER');

const page = (content: IUser[]): IPagedResults<IUser> => ({
  content, page: 0, size: 10, totalElements: content.length, totalPages: content.length ? 1 : 0, last: true,
});

describe('ListUsersComponent (F01 US-02)', () => {
  let fixture: ComponentFixture<ListUsersComponent>;
  let component: ListUsersComponent;
  let modal: NzModalService;
  const userSvc = {
    filter: vi.fn((): Observable<IPagedResults<IUser>> => of(page([ME, OTHER, LOCKED]))),
    updateStatus: vi.fn((): Observable<unknown> => of({})),
  };
  const alert = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  let confirmSpy: ReturnType<typeof vi.fn>;
  let infoSpy: ReturnType<typeof vi.fn>;

  /** triggerReload cập nhật signal; toObservable phát lại bất đồng bộ nên phải chờ ổn định trước khi đếm lần gọi API. */
  const flush = async (): Promise<void> => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const setup = async (): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [ListUsersComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userSvc },
        { provide: AuthService, useValue: { getUserId: () => 'me' } },
        { provide: ToastrService, useValue: alert },
      ],
    });
    fixture = TestBed.createComponent(ListUsersComponent);
    component = fixture.componentInstance;
    // NzModalService do chính component cung cấp (qua NzModalModule), nên lấy từ injector của nó rồi theo dõi
    modal = fixture.debugElement.injector.get(NzModalService);
    confirmSpy = vi.spyOn(modal, 'confirm').mockImplementation((() => undefined) as never);
    infoSpy = vi.spyOn(modal, 'info').mockImplementation((() => undefined) as never);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    userSvc.filter.mockImplementation(() => of(page([ME, OTHER, LOCKED])));
    userSvc.updateStatus.mockImplementation(() => of({}));
  });

  it('gọi API với page zero-indexed (UI trang 1 → page 0) và size mặc định', async () => {
    await setup();
    expect(userSvc.filter).toHaveBeenCalledWith(0, 10);
  });

  it('hiển thị người dùng, nhãn vai trò tiếng Việt, "(bạn)" cho tài khoản hiện tại và nhãn dữ liệu thử nghiệm', async () => {
    await setup();
    const content = text();
    expect(content).toContain('gv.oop01');
    expect(content).toContain('Giảng viên');
    expect(content).toContain('Cán bộ đảm bảo chất lượng');
    expect(content).toContain('(bạn)');
    expect(content).toContain('Bị khóa');
    expect(content).toContain('DỮ LIỆU THỬ NGHIỆM');
    // Không hiển thị ô nào có thể chứa băm mật khẩu
    expect(content.toLowerCase()).not.toContain('passwordhash');
  });

  it('trạng thái rỗng: có hướng dẫn việc kế tiếp', async () => {
    userSvc.filter.mockImplementation(() => of(page([])));
    await setup();
    expect(text()).toContain('Chưa có người dùng nào.');
    expect(text()).toContain('Thêm người dùng đầu tiên');
  });

  it('trạng thái lỗi: báo lỗi (không nhầm với rỗng) và Thử lại gọi lại API', async () => {
    userSvc.filter.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 403 })));
    await setup();
    expect(text()).toContain('Không tải được danh sách người dùng');
    expect(text()).not.toContain('Chưa có người dùng nào.');

    userSvc.filter.mockImplementation(() => of(page([ME])));
    component.manager.triggerReload();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(userSvc.filter).toHaveBeenCalledTimes(2);
    expect(text()).not.toContain('Không tải được danh sách người dùng');
  });

  describe('khóa / mở khóa', () => {
    it('US-02/AC-5: tự khóa mình bị chặn ngay bằng hộp thoại thông tin, không gọi API', async () => {
      await setup();
      component.changeStatus(ME);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect((infoSpy.mock.calls[0][0] as { nzTitle: string; }).nzTitle).toBe('Không thể khóa tài khoản của bạn');
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(userSvc.updateStatus).not.toHaveBeenCalled();
    });

    it('khóa người khác: hỏi xác nhận kiểu nguy hiểm, chỉ gọi API khi bấm xác nhận', async () => {
      await setup();
      component.changeStatus(OTHER);
      const options = confirmSpy.mock.calls[0][0] as { nzTitle: string; nzOkText: string; nzOkDanger: boolean; nzOnOk: () => void; };
      expect(options.nzTitle).toBe('Khóa gv.oop01?');
      expect(options.nzOkText).toBe('Khóa tài khoản');
      expect(options.nzOkDanger).toBe(true);
      expect(userSvc.updateStatus).not.toHaveBeenCalled();

      options.nzOnOk();
      await flush();
      expect(userSvc.updateStatus).toHaveBeenCalledWith('other', 'LOCKED');
      expect(alert.success).toHaveBeenCalledWith('Đã khóa tài khoản.');
      expect(userSvc.filter).toHaveBeenCalledTimes(2); // tải lại danh sách sau khi đổi
    });

    it('mở khóa: xác nhận kiểu thường và gửi ACTIVE; mở khóa không bị chặn kể cả với tài khoản của mình', async () => {
      await setup();
      component.changeStatus(LOCKED);
      const options = confirmSpy.mock.calls[0][0] as { nzTitle: string; nzOkDanger: boolean; nzOnOk: () => void; };
      expect(options.nzTitle).toBe('Mở khóa qa.01?');
      expect(options.nzOkDanger).toBe(false);
      options.nzOnOk();
      expect(userSvc.updateStatus).toHaveBeenCalledWith('locked', 'ACTIVE');
    });

    it('422 (quản trị viên ACTIVE cuối cùng): giải thích bằng thông điệp backend, trả công tắc về và tải lại', async () => {
      userSvc.updateStatus.mockImplementation(() => throwError(() => new HttpErrorResponse({
        status: 422,
        error: { timestamp: 't', status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Đây là quản trị viên đang hoạt động duy nhất', path: 'p' },
      })));
      await setup();
      component.changeStatus(OTHER);
      (confirmSpy.mock.calls[0][0] as { nzOnOk: () => void; }).nzOnOk();
      await flush();

      const info = infoSpy.mock.calls[0][0] as { nzTitle: string; nzContent: string; };
      expect(info.nzTitle).toBe('Không khóa được gv.oop01');
      expect(info.nzContent).toBe('Đây là quản trị viên đang hoạt động duy nhất');
      expect(component.selectedSwitcherId()).toBe('');
      expect(userSvc.filter).toHaveBeenCalledTimes(2);
      expect(alert.success).not.toHaveBeenCalled();
    });

    it('404 (người dùng đã bị xóa): cảnh báo và tải lại danh sách', async () => {
      userSvc.updateStatus.mockImplementation(() => throwError(() => new HttpErrorResponse({
        status: 404, error: { timestamp: 't', status: 404, code: 'NOT_FOUND', message: 'Không có', path: 'p' },
      })));
      await setup();
      component.changeStatus(OTHER);
      (confirmSpy.mock.calls[0][0] as { nzOnOk: () => void; }).nzOnOk();
      await flush();
      expect(alert.warning).toHaveBeenCalledWith('Không tìm thấy người dùng này nữa.');
      expect(userSvc.filter).toHaveBeenCalledTimes(2);
    });
  });
});

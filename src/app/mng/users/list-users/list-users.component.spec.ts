import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { IPagedResults } from '@models/common/response-data.model';
import { IUser, Role } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { FacultyService } from '@services/faculty/faculty.service';
import { UserService } from '@services/user/user.service';
import { CsvImportModalComponent } from '@widget/csv-import-modal/csv-import-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { ListUsersComponent } from './list-users.component';

const makeUser = (id: string, username: string, status: 'ACTIVE' | 'LOCKED', role: Role = 'LECTURER'): IUser => ({
  id,
  username,
  email: `${username}@example.test`,
  fullName: `Họ tên ${username}`,
  status,
  roles: [role],
  createdAt: '2026-10-27T05:00:00Z',
  updatedAt: '2026-10-27T06:00:00Z',
});

const ME = makeUser('me', 'admin', 'ACTIVE', 'ADMIN');
const OTHER = makeUser('other', 'gv.oop01', 'ACTIVE');
const LOCKED = makeUser('locked', 'qa.01', 'LOCKED', 'QA');

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
    downloadImportTemplate: vi.fn((): Observable<Blob> => of(new Blob(['username,email,password,fullName,roles,facultyCode\n']))),
    importUsers: vi.fn(() => of({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] })),
  };
  const facultySvc = {
    getFaculties: vi.fn(() => of({
      content: [{ id: 'fac_fit_01', code: 'FIT', name: 'Khoa Công nghệ Thông tin', isActive: true }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      last: true,
    })),
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
        { provide: FacultyService, useValue: facultySvc },
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
    userSvc.downloadImportTemplate.mockImplementation(() => of(new Blob(['username,email,password,fullName,roles,facultyCode\n'])));
    userSvc.importUsers.mockImplementation(() => of({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] }));
    facultySvc.getFaculties.mockImplementation(() => of({
      content: [{ id: 'fac_fit_01', code: 'FIT', name: 'Khoa Công nghệ Thông tin', isActive: true }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      last: true,
    }));
  });

  it('gọi API với page zero-indexed (UI trang 1 → page 0) và size mặc định', async () => {
    await setup();
    expect(userSvc.filter).toHaveBeenCalledWith(0, 10);
  });

  it('hiển thị người dùng, nhãn vai trò tiếng Việt, "(bạn)" cho tài khoản hiện tại', async () => {
    await setup();
    const content = text();
    expect(content).toContain('gv.oop01');
    expect(content).toContain('Giảng viên');
    expect(content).toContain('Cán bộ ĐBCL & Khảo thí');
    expect(content).toContain('(bạn)');
    expect(content).toContain('Bị khóa');
    // Không hiển thị ô nào có thể chứa băm mật khẩu
    expect(content.toLowerCase()).not.toContain('passwordhash');
  });

  it('hiển thị Khoa phụ trách cho người dùng PROGRAM_MANAGER trong cột Phạm vi', async () => {
    const pmAssigned: IUser = {
      ...makeUser('pm1', 'pm.fit', 'ACTIVE', 'PROGRAM_MANAGER'),
      facultyCode: 'FIT',
      facultyName: 'Khoa Công nghệ Thông tin',
    };
    const pmUnassigned: IUser = makeUser('pm2', 'pm.none', 'ACTIVE', 'PROGRAM_MANAGER');
    userSvc.filter.mockImplementation(() => of(page([pmAssigned, pmUnassigned])));

    await setup();
    const content = text();
    expect(content).toContain('FIT - Khoa Công nghệ Thông tin');
    expect(content).toContain('Chưa gán Khoa');
  });

  it('vẫn hiển thị tên Khoa khi API người dùng chỉ trả về facultyId mà không trả facultyCode/facultyName', async () => {
    const pmWithIdOnly: IUser = {
      ...makeUser('pm3', 'pm.idonly', 'ACTIVE', 'PROGRAM_MANAGER'),
      facultyId: 'fac_fit_01',
    };
    userSvc.filter.mockImplementation(() => of(page([pmWithIdOnly])));

    await setup();
    const content = text();
    expect(facultySvc.getFaculties).toHaveBeenCalledWith(0, 100);
    expect(content).toContain('FIT - Khoa Công nghệ Thông tin');
    expect(content).not.toContain('Chưa gán Khoa');
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

  describe('import người dùng hàng loạt', () => {
    it('hiển thị hướng dẫn không còn cột status và nêu rõ trạng thái mặc định Hoạt động + bắt buộc đổi mật khẩu', async () => {
      await setup();
      const modalDebugEl = fixture.debugElement.query(By.directive(CsvImportModalComponent));
      expect(modalDebugEl).not.toBeNull();
      const modalCmp = modalDebugEl.componentInstance as CsvImportModalComponent;
      const guide = modalCmp.guideText();

      expect(guide).toContain('username, email, password, fullName, roles');
      expect(guide).toContain('facultyCode');
      expect(guide).toContain('Hoạt động');
      expect(guide).toContain('đổi mật khẩu');
      expect(guide).not.toContain('status');
    });

    it('downloadUserTemplate ủy quyền xuống UserService với cả định dạng csv và xlsx', async () => {
      await setup();
      component.downloadUserTemplate('csv').subscribe();
      expect(userSvc.downloadImportTemplate).toHaveBeenCalledWith('csv');

      component.downloadUserTemplate('xlsx').subscribe();
      expect(userSvc.downloadImportTemplate).toHaveBeenCalledWith('xlsx');
    });
  });
});

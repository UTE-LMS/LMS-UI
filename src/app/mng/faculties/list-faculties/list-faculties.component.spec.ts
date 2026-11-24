import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IPagedResults } from '@models/common/response-data.model';
import { IFaculty } from '@models/faculty/faculty.model';
import { IUser } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { FacultyService } from '@services/faculty/faculty.service';
import { UserService } from '@services/user/user.service';
import { CsvImportModalComponent } from '@widget/csv-import-modal/csv-import-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { ListFacultiesComponent } from './list-faculties.component';

describe('ListFacultiesComponent (M3: Admin Faculty Management & PM 1-1 Assignment)', () => {
  let fixture: ComponentFixture<ListFacultiesComponent>;
  let component: ListFacultiesComponent;
  let modalSvc: NzModalService;

  const mockFaculties: IFaculty[] = [
    {
      id: 'fac_fit_01',
      code: 'FIT',
      name: 'Khoa Công nghệ Thông tin',
      description: 'Đào tạo CNTT, KTPM, HTTT, AI',
      isActive: true,
      programManagerCount: 1,
      createdAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'fac_fme_02',
      code: 'FME',
      name: 'Khoa Cơ khí Chế tạo máy',
      description: 'Đào tạo Cơ khí, Cơ điện tử',
      isActive: true,
      programManagerCount: 1,
      createdAt: '2026-10-02T08:00:00Z',
    },
    {
      id: 'fac_fee_03',
      code: 'FEE',
      name: 'Khoa Điện - Điện tử',
      description: 'Đào tạo Điện, Tự động hóa',
      isActive: true,
      programManagerCount: 0,
      createdAt: '2026-10-03T08:00:00Z',
    },
    {
      id: 'fac_ffl_04',
      code: 'FFL',
      name: 'Khoa Ngoại ngữ',
      description: 'Đào tạo Ngôn ngữ Anh',
      isActive: false,
      programManagerCount: 0,
      createdAt: '2026-10-04T08:00:00Z',
    },
  ];

  const mockPmUser1: IUser = {
    id: 'usr_pm_01',
    username: 'pm.fit',
    email: 'pm.fit@hcmute.edu.vn',
    fullName: 'TS. Nguyễn Văn Nam',
    status: 'ACTIVE',
    facultyId: 'fac_fit_01',
    facultyCode: 'FIT',
    facultyName: 'Khoa Công nghệ Thông tin',
    roles: ['PROGRAM_MANAGER'],
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  };

  const mockPmCandidate: IUser = {
    id: 'usr_pm_02',
    username: 'pm.new',
    email: 'pm.new@hcmute.edu.vn',
    fullName: 'PGS. TS. Trần Thu Hương',
    status: 'ACTIVE',
    roles: ['PROGRAM_MANAGER'],
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  };

  const pagedFaculties = (items: IFaculty[] = mockFaculties): IPagedResults<IFaculty> => ({
    content: items,
    page: 0,
    size: 10,
    totalElements: items.length,
    totalPages: items.length ? 1 : 0,
    last: true,
  });

  const pagedUsers = (items: IUser[] = [mockPmUser1, mockPmCandidate]): IPagedResults<IUser> => ({
    content: items,
    page: 0,
    size: 100,
    totalElements: items.length,
    totalPages: 1,
    last: true,
  });

  const facultySvc = {
    getFaculties: vi.fn((): Observable<IPagedResults<IFaculty>> => of(pagedFaculties())),
    getFacultyById: vi.fn((): Observable<IFaculty> => of(mockFaculties[0])),
    createFaculty: vi.fn((): Observable<IFaculty> => of(mockFaculties[0])),
    updateFaculty: vi.fn((): Observable<IFaculty> => of(mockFaculties[0])),
    updateFacultyStatus: vi.fn((): Observable<IFaculty> => of(mockFaculties[0])),
    getProgramManagers: vi.fn((): Observable<IUser[]> => of([mockPmUser1])),
    assignProgramManager: vi.fn((): Observable<void> => of(undefined)),
    removeProgramManager: vi.fn((): Observable<void> => of(undefined)),
    transferProgramManager: vi.fn((): Observable<void> => of(undefined)),
    downloadImportTemplate: vi.fn((): Observable<Blob> => of(new Blob(['code,name,description\n']))),
    importFaculties: vi.fn(() => of({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] })),
  };

  const userSvc = {
    filter: vi.fn((): Observable<IPagedResults<IUser>> => of(pagedUsers())),
  };

  const authSvc = {
    getRoles: vi.fn(() => [SystemConstant.ROLE.ADMIN]),
  };

  const alert = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  let confirmSpy: ReturnType<typeof vi.fn>;
  let warningSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    facultySvc.getFaculties.mockImplementation(() => of(pagedFaculties()));
    facultySvc.createFaculty.mockImplementation(() => of(mockFaculties[0]));
    facultySvc.updateFaculty.mockImplementation(() => of(mockFaculties[0]));
    facultySvc.updateFacultyStatus.mockImplementation(() => of(mockFaculties[0]));
    facultySvc.getProgramManagers.mockImplementation(() => of([mockPmUser1]));
    facultySvc.assignProgramManager.mockImplementation(() => of(undefined));
    facultySvc.removeProgramManager.mockImplementation(() => of(undefined));
    facultySvc.transferProgramManager.mockImplementation(() => of(undefined));
    facultySvc.downloadImportTemplate.mockImplementation(() => of(new Blob(['code,name,description\n'])));
    facultySvc.importFaculties.mockImplementation(() => of({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] }));
    userSvc.filter.mockImplementation(() => of(pagedUsers()));
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.ADMIN]);

    await TestBed.configureTestingModule({
      imports: [ListFacultiesComponent],
      providers: [
        provideRouter([]),
        { provide: FacultyService, useValue: facultySvc },
        { provide: UserService, useValue: userSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alert },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListFacultiesComponent);
    component = fixture.componentInstance;
    modalSvc = fixture.debugElement.injector.get(NzModalService);
    confirmSpy = vi.spyOn(modalSvc, 'confirm').mockImplementation((() => undefined) as never);
    warningSpy = vi.spyOn(modalSvc, 'warning').mockImplementation((() => undefined) as never);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  // ==========================================================================
  // 1. Table Initialization & Search
  // ==========================================================================
  describe('Danh sách Khoa & Tìm kiếm', () => {
    it('khởi tạo thành công, gọi getFaculties(0, 10) và hiển thị các dòng Khoa', () => {
      expect(component).toBeTruthy();
      expect(facultySvc.getFaculties).toHaveBeenCalledWith(0, 10);
      expect(component.displayFaculties().length).toBe(4);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('FIT');
      expect(el.textContent).toContain('Khoa Công nghệ Thông tin');
      expect(el.textContent).toContain('Hoạt động');
      expect(el.textContent).toContain('Vô hiệu hóa');
    });

    it('lọc danh sách Khoa theo từ khóa tìm kiếm và xóa bộ lọc', () => {
      component.searchKeyword.set('Điện tử');
      fixture.detectChanges();
      expect(component.displayFaculties().length).toBe(2); // FME (Cơ điện tử) & FEE (Điện - Điện tử)

      component.searchKeyword.set('FFL');
      fixture.detectChanges();
      expect(component.displayFaculties().length).toBe(1);
      expect(component.displayFaculties()[0].code).toBe('FFL');

      component.clearSearch();
      fixture.detectChanges();
      expect(component.displayFaculties().length).toBe(4);
    });
  });

  // ==========================================================================
  // 2. Create & Edit Faculty Modal
  // ==========================================================================
  describe('Tạo mới & Cập nhật Khoa', () => {
    it('mở modal tạo mới Khoa với trường code được bật và kiểm tra ràng buộc hợp lệ', () => {
      component.openCreateModal();
      fixture.detectChanges();

      expect(component.isModalVisible()).toBe(true);
      expect(component.editingFacultyId()).toBeNull();
      expect(component.facultyForm.get('code')?.enabled).toBe(true);

      component.facultyForm.patchValue({ code: 'A', name: '' });
      expect(component.facultyForm.invalid).toBe(true);

      component.facultyForm.patchValue({ code: 'FIT@1', name: 'Khoa Test' });
      expect(component.facultyForm.invalid).toBe(true);

      component.facultyForm.patchValue({ code: 'fit_01', name: 'Khoa Thử nghiệm' });
      expect(component.facultyForm.valid).toBe(true);
    });

    it('submitFaculty tạo mới Khoa tự động chuyển code thành chữ in hoa và cắt khoảng trắng', () => {
      component.openCreateModal();
      component.facultyForm.patchValue({
        code: '  fce-01 ',
        name: '  Khoa Xây dựng  ',
        description: '  Đào tạo Kỹ thuật Xây dựng  ',
      });

      component.submitFaculty();

      expect(facultySvc.createFaculty).toHaveBeenCalledWith({
        code: 'FCE-01',
        name: 'Khoa Xây dựng',
        description: 'Đào tạo Kỹ thuật Xây dựng',
      });
      expect(alert.success).toHaveBeenCalledWith('Thêm Khoa mới thành công');
      expect(component.isModalVisible()).toBe(false);
    });

    it('mở modal sửa Khoa khóa trường code (disabled) và gửi payload cập nhật không chứa code', () => {
      component.openEditModal(mockFaculties[0]);
      fixture.detectChanges();

      expect(component.isModalVisible()).toBe(true);
      expect(component.editingFacultyId()).toBe('fac_fit_01');
      expect(component.facultyForm.get('code')?.disabled).toBe(true);
      expect(component.facultyForm.get('code')?.value).toBe('FIT');

      component.facultyForm.patchValue({
        name: 'Khoa CNTT & AI',
        description: 'Cập nhật mô tả mới',
      });

      component.submitFaculty();

      expect(facultySvc.updateFaculty).toHaveBeenCalledWith('fac_fit_01', {
        name: 'Khoa CNTT & AI',
        description: 'Cập nhật mô tả mới',
      });
      expect(alert.success).toHaveBeenCalledWith('Cập nhật thông tin Khoa thành công');
      expect(component.isModalVisible()).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Status Toggle & HTTP 422 Active Programs Protection
  // ==========================================================================
  describe('Đổi trạng thái Khoa & Bảo vệ 422 (FACULTY_HAS_ACTIVE_PROGRAMS)', () => {
    it('hiển thị hộp thoại xác nhận khi bấm đổi trạng thái và cập nhật thành công khi không có lỗi', () => {
      const fee = mockFaculties[2]; // Active faculty
      component.toggleFacultyStatus(fee);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      const confirmOpts = confirmSpy.mock.calls[0][0] as {
        nzTitle: string;
        nzOkDanger: boolean;
        nzOnOk: () => void;
      };
      expect(confirmOpts.nzTitle).toContain('Vô hiệu hóa Khoa FEE');
      expect(confirmOpts.nzOkDanger).toBe(true);

      confirmOpts.nzOnOk();
      expect(facultySvc.updateFacultyStatus).toHaveBeenCalledWith('fac_fee_03', { isActive: false });
      expect(alert.success).toHaveBeenCalledWith('Đã vô hiệu hóa Khoa thành công.');
    });

    it('bắt lỗi HTTP 422 FACULTY_HAS_ACTIVE_PROGRAMS và hiển thị modal cảnh báo #activeProgramWarningModal', () => {
      const fit = mockFaculties[0];
      facultySvc.updateFacultyStatus.mockImplementation(() => throwError(() => new HttpErrorResponse({
        status: 422,
        error: {
          code: 'FACULTY_HAS_ACTIVE_PROGRAMS',
          message: 'Khoa còn chương trình đào tạo đang hoạt động (ACTIVE). Không thể tắt trạng thái hoạt động của Khoa.',
        },
      })));

      component.applyStatusToggle(fit);
      fixture.detectChanges();

      expect(component.activeProgramWarningModalVisible()).toBe(true);
      expect(component.activeProgramWarningMessage()).toContain('Khoa còn chương trình đào tạo đang hoạt động');
      expect(warningSpy).toHaveBeenCalledTimes(1);

      const el = fixture.nativeElement as HTMLElement;
      const modal = el.querySelector('#activeProgramWarningModal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Không thể vô hiệu hóa Khoa');
      expect(modal?.textContent).toContain('Khoa còn chương trình đào tạo đang hoạt động');

      const btnClose = el.querySelector('#btnCloseActiveProgramWarning') as HTMLButtonElement;
      btnClose.click();
      fixture.detectChanges();
      expect(component.activeProgramWarningModalVisible()).toBe(false);
    });
  });

  // ==========================================================================
  // 4. Program Manager Assignment, Conflict 409, Removal & Transfer
  // ==========================================================================
  describe('Quản lý Program Manager (1 PM = 1 Khoa)', () => {
    it('mở modal Quản lý PM tải danh sách PM hiện tại của Khoa và danh sách ứng viên PM', () => {
      component.openPmModal(mockFaculties[0]);
      fixture.detectChanges();

      expect(component.isPmModalVisible()).toBe(true);
      expect(facultySvc.getProgramManagers).toHaveBeenCalledWith('fac_fit_01');
      expect(component.assignedPms().length).toBe(1);
      expect(component.assignedPms()[0].fullName).toBe('TS. Nguyễn Văn Nam');

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('.pm-item').length).toBe(1);
    });

    it('gán PM mới thành công vào Khoa', () => {
      component.openPmModal(mockFaculties[2]); // FEE
      component.selectedPmUserId.set('usr_pm_02');
      fixture.detectChanges();

      component.assignPm();

      expect(facultySvc.assignProgramManager).toHaveBeenCalledWith('fac_fee_03', { userId: 'usr_pm_02' });
      expect(alert.success).toHaveBeenCalledWith('Gán Program Manager cho Khoa thành công');
      expect(component.selectedPmUserId()).toBe('');
    });

    it('bắt lỗi HTTP 409 PM_ALREADY_ASSIGNED khi gán PM đã thuộc Khoa khác và hiện #pmConflictAlert', () => {
      facultySvc.assignProgramManager.mockImplementation(() => throwError(() => new HttpErrorResponse({
        status: 409,
        error: {
          code: 'PM_ALREADY_ASSIGNED',
          message: 'Người dùng đã là Program Manager của Khoa khác. Vi phạm ràng buộc 1 PM = 1 Khoa.',
        },
      })));

      component.openPmModal(mockFaculties[2]);
      component.selectedPmUserId.set('usr_pm_01');
      component.assignPm();
      fixture.detectChanges();

      expect(component.conflictError()).toContain('Vi phạm ràng buộc 1 PM = 1 Khoa');
      const el = fixture.nativeElement as HTMLElement;
      const conflictBanner = el.querySelector('#pmConflictAlert');
      expect(conflictBanner).not.toBeNull();
      expect(conflictBanner?.textContent).toContain('Người dùng đã là Program Manager của Khoa khác');
    });

    it('gỡ PM khỏi Khoa có xác nhận và gọi removeProgramManager', () => {
      component.openPmModal(mockFaculties[0]);
      component.confirmRemovePm(mockPmUser1);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      const confirmOpts = confirmSpy.mock.calls[0][0] as { nzOnOk: () => void; };
      confirmOpts.nzOnOk();

      expect(facultySvc.removeProgramManager).toHaveBeenCalledWith('fac_fit_01', 'usr_pm_01');
      expect(alert.success).toHaveBeenCalledWith('Đã gỡ Program Manager khỏi Khoa');
    });

    it('điều chuyển PM loại trừ Khoa hiện tại và Khoa bị vô hiệu hóa, bắt buộc nhập lý do (#btnConfirmTransfer)', () => {
      component.openPmModal(mockFaculties[0]); // FIT
      component.openTransferModal(mockPmUser1);
      fixture.detectChanges();

      const targetIds = component.availableTargetFaculties().map(f => f.id);
      expect(targetIds).not.toContain('fac_fit_01'); // Exclude current
      expect(targetIds).not.toContain('fac_ffl_04'); // Exclude inactive
      expect(targetIds).toContain('fac_fme_02');
      expect(targetIds).toContain('fac_fee_03');

      const el = fixture.nativeElement as HTMLElement;
      const btnConfirm = el.querySelector('#btnConfirmTransfer') as HTMLButtonElement;
      expect(btnConfirm.disabled).toBe(true);

      component.transferTargetFacultyId.set('fac_fee_03');
      component.transferReason.set('   ');
      fixture.detectChanges();
      expect(btnConfirm.disabled).toBe(true);

      component.transferReason.set('Điều động nhân sự quản lý CTĐT học kỳ mới');
      fixture.detectChanges();
      expect(btnConfirm.disabled).toBe(false);

      component.confirmTransfer();
      expect(facultySvc.transferProgramManager).toHaveBeenCalledWith({
        userId: 'usr_pm_01',
        targetFacultyId: 'fac_fee_03',
        transferReason: 'Điều động nhân sự quản lý CTĐT học kỳ mới',
      });
      expect(alert.success).toHaveBeenCalledWith('Điều chuyển Program Manager thành công');
      expect(component.transferringPm()).toBeNull();
    });
  });

  // ==========================================================================
  // 5. Import Khoa (bỏ cột isActive, mặc định Hoạt động, hỗ trợ CSV/XLSX)
  // ==========================================================================
  describe('Import Khoa hàng loạt', () => {
    it('hiển thị hướng dẫn chỉ gồm code, name, description (không có isActive) và nêu rõ trạng thái mặc định Hoạt động', () => {
      const modalDebugEl = fixture.debugElement.query(By.directive(CsvImportModalComponent));
      expect(modalDebugEl).not.toBeNull();
      const modalCmp = modalDebugEl.componentInstance as CsvImportModalComponent;
      const guide = modalCmp.guideText();

      expect(guide).toContain('code');
      expect(guide).toContain('name');
      expect(guide).toContain('description');
      expect(guide).toContain('Hoạt động');
      expect(guide).not.toContain('isActive');
    });

    it('downloadFacultyTemplate ủy quyền xuống FacultyService với cả định dạng csv và xlsx', () => {
      component.downloadFacultyTemplate('csv').subscribe();
      expect(facultySvc.downloadImportTemplate).toHaveBeenCalledWith('csv');

      component.downloadFacultyTemplate('xlsx').subscribe();
      expect(facultySvc.downloadImportTemplate).toHaveBeenCalledWith('xlsx');
    });
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IPagedResults } from '@models/common/response-data.model';
import { StudentResponse } from '@models/student/student.model';
import { StudentService } from '@services/student/student.service';
import { Paginate } from '@widget/paginate/paginate.model';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ListStudentsComponent } from './list-students.component';

/** DỮ LIỆU THỬ NGHIỆM: MSSV và ID sinh viên giả. */
describe('ListStudentsComponent (ADMIN)', () => {
  let fixture: ComponentFixture<ListStudentsComponent>;
  let component: ListStudentsComponent;

  const sampleStudents: StudentResponse[] = [
    {
      id: 'stu1',
      studentCode: 'SV-0001',
      fullName: 'Nguyễn Văn A',
      cohort: 'K2023',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    },
    {
      id: 'stu2',
      studentCode: 'SV-0002',
      fullName: 'Trần Thị B',
      cohort: 'K2023',
      status: 'SUSPENDED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-06T00:00:00Z',
    },
    {
      id: 'stu3',
      studentCode: 'SV-0003',
      fullName: 'Lê Văn C',
      cohort: 'K2021',
      status: 'GRADUATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: null,
    },
    {
      id: 'stu4',
      studentCode: 'SV-0004',
      fullName: '',
      cohort: '',
      status: 'DROPPED_OUT',
      createdAt: null,
      updatedAt: null,
    },
  ];

  const pageData = (content = sampleStudents): IPagedResults<StudentResponse> => ({
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  });

  const studentSvc = {
    getStudents: vi.fn(),
    downloadImportTemplate: vi.fn(() => of(new Blob(['studentCode,fullName,cohort\n']))),
    importStudents: vi.fn(),
    updateStatus: vi.fn(),
    batchUpdateStatus: vi.fn(),
    downloadStatusImportTemplate: vi.fn(() => of(new Blob(['studentCode,status\n']))),
    importStudentStatuses: vi.fn(),
  };

  const alertSvc = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
  let modalConfirmMock: ReturnType<typeof vi.fn>;

  async function setup(initialPage = pageData()): Promise<void> {
    vi.clearAllMocks();
    studentSvc.getStudents.mockReturnValue(of(initialPage));

    await TestBed.configureTestingModule({
      imports: [ListStudentsComponent],
      providers: [
        provideRouter([]),
        { provide: StudentService, useValue: studentSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListStudentsComponent);
    component = fixture.componentInstance;
    const modal = fixture.debugElement.injector.get(NzModalService);
    modalConfirmMock = vi.spyOn(modal, 'confirm').mockImplementation(((opts: { nzOnOk?: () => void; }) => {
      opts.nzOnOk?.();
      return undefined;
    }) as never);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('tải danh sách mặc định page=0, size=20 và hiển thị đầy đủ 4 trạng thái sinh viên', async () => {
    await setup();
    expect(studentSvc.getStudents).toHaveBeenCalledWith(0, 20, { search: '', cohort: '', status: null });
    const text = el().textContent ?? '';
    expect(text).toContain('SV-0001');
    expect(text).toContain('Nguyễn Văn A');
    expect(text).toContain('K2023');
    expect(text).toContain('Đang học');
    expect(text).toContain('Tạm dừng / Bảo lưu');
    expect(text).toContain('Đã tốt nghiệp');
    expect(text).toContain('Thôi học');
  });

  it('lọc theo search, cohort, status gọi lại API và đặt lại bộ lọc xóa trắng các trường', async () => {
    await setup();
    component.search.set('SV-0001');
    component.cohort.set('K2023');
    component.statusFilter.set('ACTIVE');
    component.applyFilters();

    expect(studentSvc.getStudents).toHaveBeenLastCalledWith(0, 20, {
      search: 'SV-0001',
      cohort: 'K2023',
      status: 'ACTIVE',
    });

    component.resetFilters();
    expect(component.search()).toBe('');
    expect(component.cohort()).toBe('');
    expect(component.statusFilter()).toBeNull();
    expect(studentSvc.getStudents).toHaveBeenLastCalledWith(0, 20, {
      search: '',
      cohort: '',
      status: null,
    });
  });

  it('chuyển trang gọi API với page 0-based và xóa danh sách đang chọn', async () => {
    await setup();
    component.toggleRowSelection('stu1', true);
    expect(component.selectedCount()).toBe(1);

    component.onPageChange(new Paginate<StudentResponse>(2, 3, 60, 20, []));
    expect(component.selectedCount()).toBe(0);
    expect(studentSvc.getStudents).toHaveBeenLastCalledWith(1, 20, { search: '', cohort: '', status: null });
  });

  it('checkbox từng dòng và chọn tất cả trong trang hiển thị thanh thao tác hàng loạt', async () => {
    await setup();
    expect(el().querySelector('#studentBatchActionBar')).toBeNull();

    const selectAll = el().querySelector('#chkSelectAllStudents') as HTMLInputElement;
    selectAll.click();
    fixture.detectChanges();

    expect(component.selectedCount()).toBe(4);
    expect(component.allCurrentPageChecked()).toBe(true);
    const bar = el().querySelector('#studentBatchActionBar');
    expect(bar?.textContent).toContain('Đã chọn 4 sinh viên');
    expect(bar?.textContent).toContain('Cập nhật trạng thái (4 sinh viên)');

    // Bỏ chọn 1 dòng -> indeterminate
    const rowBoxes = el().querySelectorAll('.student-row-checkbox');
    (rowBoxes[0] as HTMLInputElement).click();
    fixture.detectChanges();
    expect(component.selectedCount()).toBe(3);
    expect(component.allCurrentPageChecked()).toBe(false);
    expect(component.someCurrentPageChecked()).toBe(true);
  });

  it('đổi trạng thái 1 sinh viên thành công cập nhật dòng và hiện toast', async () => {
    await setup();
    const updated: StudentResponse = { ...sampleStudents[0], status: 'GRADUATED' };
    studentSvc.updateStatus.mockReturnValue(of(updated));

    component.changeSingleStatus(sampleStudents[0], 'GRADUATED');
    fixture.detectChanges();

    expect(studentSvc.updateStatus).toHaveBeenCalledWith('stu1', 'GRADUATED');
    expect(component.students()[0].status).toBe('GRADUATED');
    expect(alertSvc.success).toHaveBeenCalledWith(expect.stringContaining('SV-0001'));
  });

  it('đổi trạng thái 1 sinh viên gặp lỗi hiển thị toast lỗi và giữ nguyên dữ liệu', async () => {
    await setup();
    studentSvc.updateStatus.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Không thể đổi trạng thái' },
    })));

    component.changeSingleStatus(sampleStudents[0], 'DROPPED_OUT');
    expect(alertSvc.error).toHaveBeenCalledWith('Không thể đổi trạng thái');
    expect(component.students()[0].status).toBe('ACTIVE');
  });

  it('cập nhật trạng thái hàng loạt: xác nhận, gọi PUT /students/status, thông báo updatedCount/requestedCount, bỏ chọn và tải lại', async () => {
    await setup();
    component.toggleRowSelection('stu1', true);
    component.toggleRowSelection('stu2', true);
    component.batchTargetStatus.set('GRADUATED');
    studentSvc.batchUpdateStatus.mockReturnValue(of({
      requestedCount: 2,
      updatedCount: 2,
      status: 'GRADUATED',
      students: [],
    }));

    component.confirmBatchStatusUpdate();
    fixture.detectChanges();

    expect(modalConfirmMock).toHaveBeenCalled();
    expect(studentSvc.batchUpdateStatus).toHaveBeenCalledWith(['stu1', 'stu2'], 'GRADUATED');
    expect(alertSvc.success).toHaveBeenCalledWith('Đã cập nhật trạng thái cho 2/2 sinh viên.');
    expect(component.selectedCount()).toBe(0);
    expect(component.batchTargetStatus()).toBeNull();
    expect(studentSvc.getStudents).toHaveBeenCalledTimes(2);
  });

  it('mở 2 modal Import tách biệt: Import sinh viên mới (mặc định ACTIVE) và Import đổi trạng thái (4 giá trị)', async () => {
    await setup();

    (el().querySelector('#btnOpenImportStudents') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.isCreateImportVisible()).toBe(true);
    expect(document.body.textContent).toContain('Import sinh viên mới');
    expect(document.body.textContent).toContain('Cả 3 cột bắt buộc: studentCode, fullName, cohort');
    expect(document.body.textContent).toContain('ACTIVE');

    component.isCreateImportVisible.set(false);
    fixture.detectChanges();

    (el().querySelector('#btnOpenImportStudentStatuses') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.isStatusImportVisible()).toBe(true);
    expect(document.body.textContent).toContain('Import đổi trạng thái sinh viên');
    expect(document.body.textContent).toContain('DROPPED_OUT');

    component.onImportSuccess();
    expect(studentSvc.getStudents).toHaveBeenCalledTimes(2);
  });

  it('403 hoặc lỗi mạng hiển thị app-error-state và ẩn bảng', async () => {
    await setup();
    studentSvc.getStudents.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 403,
      error: { status: 403, code: 'FORBIDDEN', message: 'Chỉ ADMIN mới được truy cập' },
    })));

    component.loadStudents();
    fixture.detectChanges();

    expect(component.loadError()?.kind).toBe('FORBIDDEN');
    expect(el().textContent).toContain('Không đủ quyền');
    expect(el().querySelector('table')).toBeNull();
  });
});

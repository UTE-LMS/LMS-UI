import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IProgram } from '@models/program/program.model';
import { IProgramCsvImportResponse, IProgramVersion } from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ListCurriculumVersionsComponent } from './list-curriculum-versions.component';

describe('ListCurriculumVersionsComponent (F02 US-05, M4 2-Step CSV Import & Lock)', () => {
  let fixture: ComponentFixture<ListCurriculumVersionsComponent>;
  let component: ListCurriculumVersionsComponent;

  const mockPrograms: IProgram[] = [
    {
      id: '671dcba5f123456789abcde1',
      code: 'CNTT',
      name: 'Công nghệ thông tin',
      level: 'Đại học',
      degree: 'Kỹ sư',
      facultyId: 'fac_cntt_01',
    },
  ];

  const mockVersions: IProgramVersion[] = [
    {
      id: '671dcba5f123456789abcdef',
      programId: '671dcba5f123456789abcde1',
      version: 'BM7A-2.7-Updated-2026',
      totalCredits: 132,
      durationYears: 4,
      applicableCohort: '2026-HK1',
      status: 'ACTIVE',
    },
    {
      id: '671dcba5f123456789abcdea',
      programId: '671dcba5f123456789abcde1',
      version: 'BM7A-2.8-Draft',
      totalCredits: 132,
      durationYears: 4,
      status: 'ARCHIVED',
    },
  ];

  const mockImportResponse: IProgramCsvImportResponse = {
    programVersionId: 'ver_preview_01',
    programId: '671dcba5f123456789abcde1',
    version: '2026.1',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    ploCount: 2,
    piCount: 4,
    courseCount: 8,
    warnings: ['Cảnh báo mẫu 1'],
    plos: [{ code: 'PLO1', capabilityLevel: 3, contentSummary: 'Năng lực toán học' }],
    pis: [{ code: 'PI1.1', capabilityLevel: 3, contentShort: 'Giải tích ứng dụng' }],
  };

  const programSvc = {
    getPrograms: vi.fn(() => of({
      content: mockPrograms,
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      last: true,
    })),
  };

  const versionSvc = {
    getProgramVersions: vi.fn(() => of({
      content: mockVersions,
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
      last: true,
    })),
    previewImportProgramCsv: vi.fn(() => of(mockImportResponse)),
    importProgramCsv: vi.fn(() => of(mockImportResponse)),
    confirmImport: vi.fn(() => of(mockImportResponse)),
    lockProgramVersion: vi.fn(() => of({ ...mockVersions[0], status: 'ARCHIVED' as const })),
    downloadImportTemplate: vi.fn(),
    updateProgramVersionStatus: vi.fn(() => of(mockVersions[0])),
  };

  const ploPiSvc = {
    getPlos: vi.fn(() => of([])),
    getPis: vi.fn(() => of([])),
  };

  const courseSvc = {
    downloadProgramCoursesImportTemplate: vi.fn(() => of(new Blob(['courseCode\n'], { type: 'text/csv' }))),
    importProgramCoursesCsv: vi.fn(() => of({
      programVersionId: 'ver_new',
      importedCount: 3,
      updatedCount: 1,
      warnings: [],
      courses: [],
    })),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.PROGRAM_MANAGER]),
    getFacultyId: vi.fn<() => string | undefined>(() => 'fac_cntt_01'),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  };

  const modalSvc = {
    confirm: vi.fn((opts: { nzOnOk?: () => void; }) => {
      opts.nzOnOk?.();
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.PROGRAM_MANAGER]);
    authSvc.getFacultyId.mockReturnValue('fac_cntt_01');

    await TestBed.configureTestingModule({
      imports: [ListCurriculumVersionsComponent],
      providers: [
        provideRouter([]),
        { provide: ProgramService, useValue: programSvc },
        { provide: ProgramVersionService, useValue: versionSvc },
        { provide: PloPiService, useValue: ploPiSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
        { provide: NzModalService, useValue: modalSvc },
      ],
    })
      .overrideComponent(ListCurriculumVersionsComponent, {
        set: {
          providers: [{ provide: NzModalService, useValue: modalSvc }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ListCurriculumVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo và tải danh sách chương trình & phiên bản thành công', () => {
    expect(component).toBeTruthy();
    expect(component.programs().length).toBe(1);
    expect(component.selectedProgramId()).toBe('671dcba5f123456789abcde1');
    expect(component.versions().length).toBe(2);
  });

  it('hiển thị canManage = true khi Program Manager có quyền trong scope', () => {
    expect(component.canManage()).toBe(true);
  });

  it('mở modal Import CSV CTĐT reset về bước 1 (index 0)', () => {
    component.openImportModal();
    expect(component.isImportModalVisible()).toBe(true);
    expect(component.importStep()).toBe(0);
    expect(component.importVersion()).toBe('');
  });

  it('quy trình Import CSV 3 bước: Bước 1 Xem trước -> Bước 2 Xác nhận Import PLO/PI -> Bước 3 Import Khung học phần', () => {
    component.openImportModal();
    const csvFile = new File(['code,content'], 'ctdt.csv', { type: 'text/csv' });
    component.importVersion.set('2026.1');
    component.importApplicableCohort.set('K2026');
    component.importDurationYears.set(4);
    component.importTotalCredits.set(150);
    component.selectedFile.set(csvFile);

    component.submitPreview();
    expect(versionSvc.previewImportProgramCsv).toHaveBeenCalledWith(
      '671dcba5f123456789abcde1',
      '2026.1',
      csvFile,
      {
        totalCredits: 150,
        durationYears: 4,
        applicableCohort: 'K2026',
      },
    );
    expect(component.importStep()).toBe(1);
    expect(component.previewRows().length).toBe(2);
    expect(component.previewRows()[0].code).toBe('PLO1');

    component.confirmImport();
    expect(versionSvc.importProgramCsv).toHaveBeenCalledWith(
      '671dcba5f123456789abcde1',
      '2026.1',
      csvFile,
      {
        totalCredits: 150,
        durationYears: 4,
        applicableCohort: 'K2026',
      },
    );
    expect(component.importStep()).toBe(2);
    expect(component.createdProgramVersionId()).toBe('ver_preview_01');
    expect(component.isImportModalVisible()).toBe(true);
    expect(alertSvc.success).toHaveBeenCalled();

    const coursesFile = new File(['courseCode,semester\nOOP101,1'], 'courses.csv', { type: 'text/csv' });
    component.selectedCoursesFile.set(coursesFile);
    component.submitCoursesImport();
    expect(courseSvc.importProgramCoursesCsv).toHaveBeenCalledWith('ver_preview_01', coursesFile);
    expect(component.coursesImportResult()?.importedCount).toBe(3);

    component.finishImportModal();
    expect(component.isImportModalVisible()).toBe(false);
  });

  it('confirmLockVersion mở modal xác nhận và gọi lockProgramVersion chuyển sang ARCHIVED', () => {
    component.confirmLockVersion(mockVersions[0]);
    expect(modalSvc.confirm).toHaveBeenCalled();
    expect(versionSvc.lockProgramVersion).toHaveBeenCalledWith(mockVersions[0].id);
    expect(alertSvc.success).toHaveBeenCalled();
  });

  it('formatCohorts trả về dấu gạch — khi không có dữ liệu khóa', () => {
    expect(component.formatCohorts('')).toBe('—');
    expect(component.formatCohorts('2026-HK1')).toBe('2026-HK1');
  });

  it('Người dùng không có quyền canManage thì không được tự áp dụng hoặc khóa phiên bản', () => {
    component.userRoles.set([SystemConstant.ROLE.LECTURER]);
    expect(component.canManage()).toBe(false);
    component.confirmActivateVersion(mockVersions[1]);
    expect(alertSvc.error).toHaveBeenCalledWith(
      expect.stringContaining('Chỉ Trưởng chương trình đào tạo mới có quyền phê duyệt đưa phiên bản CTĐT vào áp dụng'),
    );

    alertSvc.error.mockClear();
    component.confirmLockVersion(mockVersions[0]);
    expect(alertSvc.error).toHaveBeenCalledWith(
      expect.stringContaining('Bạn không có quyền khóa phiên bản chương trình đào tạo này'),
    );
  });

  it('ADMIN chỉ được xem, không có quyền quản lý phiên bản (canManage = false)', () => {
    component.userRoles.set([SystemConstant.ROLE.ADMIN]);
    expect(component.canManage()).toBe(false);
  });
});

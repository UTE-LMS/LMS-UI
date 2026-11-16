import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import {
  IPi,
  IPlo,
  IProgramCourse,
} from '@models/program/plo-pi.model';
import { IProgram } from '@models/program/program.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { DetailCurriculumVersionComponent } from './detail-curriculum-version.component';

describe('DetailCurriculumVersionComponent (F02 US-06, US-07, US-08 UI.pdf Trang 4)', () => {
  let fixture: ComponentFixture<DetailCurriculumVersionComponent>;
  let component: DetailCurriculumVersionComponent;

  const mockVersion: IProgramVersion = {
    id: '671dcba5f123456789abcdef',
    programId: '671dcba5f123456789abcde1',
    version: 'BM7A-2.7-Updated-2026',
    totalCredits: 132,
    durationYears: 4,
    status: 'ACTIVE',
    verification: {
      status: 'VERIFIED',
      verifiedBy: 'qa.01',
      verifiedAt: '2026-10-27T10:00:00Z',
    },
  };

  const mockProgram: IProgram = {
    id: '671dcba5f123456789abcde1',
    code: 'CNTT',
    name: 'Công nghệ thông tin',
    level: 'Đại học',
    degree: 'Kỹ sư',
    facultyId: 'fac_cntt_01',
  };

  // PLO với thứ tự Khoa: PLO1, PLO6, PLO7 (displayOrder 1, 2, 3)
  const mockPlos: IPlo[] = [
    {
      id: 'plo_6',
      programVersionId: '671dcba5f123456789abcdef',
      code: 'PLO6',
      displayOrder: 2,
      category: 'SPECIALIZED',
      capabilityLevelRaw: 4,
      contentSummary: 'Làm việc nhóm',
    },
    {
      id: 'plo_1',
      programVersionId: '671dcba5f123456789abcdef',
      code: 'PLO1',
      displayOrder: 1,
      category: 'GENERAL',
      capabilityLevelRaw: 3,
      contentSummary: 'Kiến thức cơ bản',
    },
  ];

  const mockPis: IPi[] = [
    {
      id: 'pi_1_1',
      programVersionId: '671dcba5f123456789abcdef',
      ploId: 'plo_1',
      code: 'PI1.1',
      displayOrder: 1,
      contentShort: 'Toán ứng dụng',
      capabilityLevelRaw: 3,
      targetPassRate: 0.7,
    },
    {
      id: 'pi_6_1',
      programVersionId: '671dcba5f123456789abcdef',
      ploId: 'plo_6',
      code: 'PI6.1',
      displayOrder: 1,
      contentShort: 'Giao tiếp',
      capabilityLevelRaw: 4,
    },
  ];

  const mockCourses: IProgramCourse[] = [
    {
      id: 'pc_1',
      programVersionId: '671dcba5f123456789abcdef',
      courseId: 'course_1',
      course: {
        id: 'course_1',
        code: 'OOPR230279',
        name: 'Lập trình hướng đối tượng',
        credits: 3,
      },
    },
  ];

  const versionSvc = {
    getProgramVersionById: vi.fn(() => of(mockVersion)),
    lockProgramVersion: vi.fn(() => of({ ...mockVersion, status: 'ARCHIVED' as const })),
  };

  const programSvc = {
    getProgramById: vi.fn(() => of(mockProgram)),
  };

  const ploPiSvc = {
    getPlos: vi.fn(() => of(mockPlos)),
    getPis: vi.fn(() => of(mockPis)),
    getProgramCourses: vi.fn(() => of(mockCourses)),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.PROGRAM_MANAGER, SystemConstant.ROLE.QA]),
    getFacultyId: vi.fn<() => string | undefined>(() => 'fac_cntt_01'),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const modalSvc = {
    confirm: vi.fn((opts: { nzOnOk?: () => void; }) => {
      opts.nzOnOk?.();
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    versionSvc.getProgramVersionById.mockReturnValue(of(mockVersion));

    await TestBed.configureTestingModule({
      imports: [DetailCurriculumVersionComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'versionId' ? '671dcba5f123456789abcdef' : null),
              },
            },
          },
        },
        { provide: ProgramVersionService, useValue: versionSvc },
        { provide: ProgramService, useValue: programSvc },
        { provide: PloPiService, useValue: ploPiSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
        { provide: (await import('ng-zorro-antd/modal')).NzModalService, useValue: modalSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailCurriculumVersionComponent);
    component = fixture.componentInstance;
    const realModal = fixture.debugElement.injector.get(
      (await import('ng-zorro-antd/modal')).NzModalService,
    );
    vi.spyOn(realModal, 'confirm').mockImplementation(((opts?: { nzOnOk?: () => unknown; }) => {
      opts?.nzOnOk?.();
      return {} as never;
    }) as never);
    fixture.detectChanges();
  });

  it('khởi tạo và tải dữ liệu phiên bản, PLO, PI, ma trận thành công', () => {
    expect(component).toBeTruthy();
    expect(component.version()?.version).toBe('BM7A-2.7-Updated-2026');
    expect(component.program()?.code).toBe('CNTT');
    expect(component.plos().length).toBe(2);
    expect(component.pis().length).toBe(2);
    expect(component.courses().length).toBe(1);
  });

  it('sắp xếp danh sách PLO theo displayOrder (bất biến nghiệp vụ)', () => {
    const sorted = component.sortedPlos();
    expect(sorted[0].code).toBe('PLO1'); // displayOrder = 1
    expect(sorted[1].code).toBe('PLO6'); // displayOrder = 2
  });

  it('dựng cấu trúc cây treeRows đúng với cấp PLO và PI', () => {
    const rows = component.treeRows();
    expect(rows.length).toBe(4); // 2 PLO + 2 PI
    expect(rows[0].code).toBe('PLO1');
    expect(rows[0].isPlo).toBe(true);
    expect(rows[0].categoryLabel).toBe('Kiến thức chung');
    expect(rows[1].code).toBe('PI1.1');
    expect(rows[1].isPlo).toBe(false);
    expect(rows[2].code).toBe('PLO6');
    expect(rows[2].categoryLabel).toBe('Chuyên ngành');
    expect(rows[3].code).toBe('PI6.1');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bậc 3');
    expect(el.textContent).toContain('Bậc 4');
    expect(el.textContent).toContain('Kiến thức chung');
    expect(el.textContent).toContain('Chuyên ngành');
  });

  it('canImportProgramCourses chỉ bật khi phiên bản ở trạng thái ACTIVE (chưa khóa) và đúng quyền', () => {
    // Mặc định mockVersion đang ACTIVE
    expect(component.canImportProgramCourses()).toBe(true);

    // Khi đã khóa (ARCHIVED) thì không hiển thị import nữa
    component.version.set({ ...mockVersion, status: 'ARCHIVED' });
    fixture.detectChanges();
    expect(component.canImportProgramCourses()).toBe(false);

    // QA không có quyền import ngay cả khi ACTIVE
    component.version.set({ ...mockVersion, status: 'ACTIVE' });
    component.userRoles.set([SystemConstant.ROLE.QA]);
    expect(component.canImportProgramCourses()).toBe(false);
  });

  it('confirmLockVersion mở modal xác nhận và gọi lockProgramVersion chuyển phiên bản sang ARCHIVED', async () => {
    expect(component.canManage()).toBe(true);
    const realModal = fixture.debugElement.injector.get(
      (await import('ng-zorro-antd/modal')).NzModalService,
    );
    component.confirmLockVersion();
    expect(realModal.confirm).toHaveBeenCalled();
    expect(versionSvc.lockProgramVersion).toHaveBeenCalledWith('671dcba5f123456789abcdef');
    expect(component.version()?.status).toBe('ARCHIVED');
    expect(alertSvc.success).toHaveBeenCalled();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import {
  ICoursePiContribution,
  ICoursePiContributionRequest,
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
  };

  // PLO với thứ tự Khoa: PLO1, PLO6, PLO7 (displayOrder 1, 2, 3)
  const mockPlos: IPlo[] = [
    {
      id: 'plo_6',
      programVersionId: '671dcba5f123456789abcdef',
      code: 'PLO6',
      displayOrder: 2,
      capabilityLevelRaw: 4,
      contentSummary: 'Làm việc nhóm',
    },
    {
      id: 'plo_1',
      programVersionId: '671dcba5f123456789abcdef',
      code: 'PLO1',
      displayOrder: 1,
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

  const mockContributions: ICoursePiContribution[] = [
    {
      id: 'contrib_1',
      programVersionId: '671dcba5f123456789abcdef',
      courseId: 'course_1',
      piId: 'pi_1_1',
      contribution: 'I',
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
  };

  const programSvc = {
    getProgramById: vi.fn(() => of(mockProgram)),
  };

  const ploPiSvc = {
    getPlos: vi.fn(() => of(mockPlos)),
    getPis: vi.fn(() => of(mockPis)),
    getContributions: vi.fn(() => of(mockContributions)),
    getProgramCourses: vi.fn(() => of(mockCourses)),
    createContribution: vi.fn((pvId: string, req: ICoursePiContributionRequest) => of({
      id: 'contrib_new',
      programVersionId: pvId,
      courseId: req.courseId,
      piId: req.piId,
      contribution: req.contribution,
    })),
    deleteContribution: vi.fn(() => of(undefined)),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.PROGRAM_MANAGER, SystemConstant.ROLE.QA]),
    getRoleAssignments: vi.fn(() => [
      {
        role: SystemConstant.ROLE.PROGRAM_MANAGER,
        scope: { programIds: ['671dcba5f123456789abcde1'] },
      },
    ]),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailCurriculumVersionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo và tải dữ liệu phiên bản, PLO, PI, ma trận thành công', () => {
    expect(component).toBeTruthy();
    expect(component.version()?.version).toBe('BM7A-2.7-Updated-2026');
    expect(component.program()?.code).toBe('CNTT');
    expect(component.plos().length).toBe(2);
    expect(component.pis().length).toBe(2);
    expect(component.courses().length).toBe(1);
    expect(component.contributions().length).toBe(1);
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
    expect(rows[1].code).toBe('PI1.1');
    expect(rows[1].isPlo).toBe(false);
    expect(rows[2].code).toBe('PLO6');
    expect(rows[3].code).toBe('PI6.1');
  });

  it('isQaOfficer = true khi user có vai trò QA', () => {
    expect(component.isQaOfficer()).toBe(true);
  });

  it('click vào ô chưa có đóng góp sẽ gọi API tạo I', () => {
    component.onCellClick('course_1', 'pi_6_1');
    expect(ploPiSvc.createContribution).toHaveBeenCalledWith(
      '671dcba5f123456789abcdef',
      expect.objectContaining({
        courseId: 'course_1',
        piId: 'pi_6_1',
        contribution: 'I',
      }),
    );
  });

  it('tổng hợp danh sách chỉ số PI đóng góp theo học phần', () => {
    expect(component.getCourseContributions('course_1')).toEqual([
      { piCode: 'PI1.1', contribution: 'I' },
    ]);
  });

  it('ADMIN không có quyền sửa chương trình hay ma trận I/R/M và không có quyền duyệt ĐBCL', () => {
    component.userRoles.set([SystemConstant.ROLE.ADMIN]);
    expect(component.canEdit()).toBe(false);
    expect(component.isQaOfficer()).toBe(false);
  });
});

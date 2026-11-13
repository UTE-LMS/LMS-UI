import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IClo } from '@models/course/clo.model';
import { ICourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { AuthService } from '@services/auth/auth.service';
import { CloService } from '@services/course/clo.service';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { DetailSyllabusComponent } from './detail-syllabus.component';

describe('DetailSyllabusComponent (F03 US-10, US-11, TD-27, ADR 0010)', () => {
  let fixture: ComponentFixture<DetailSyllabusComponent>;
  let component: DetailSyllabusComponent;

  const courseId = '671dcba5f123456789abcde1';
  const syllabusId = '671dcba5f123456789abcde2';

  const mockCourse: ICourse = {
    id: courseId,
    code: 'OOPR230279',
    name: 'Lập trình hướng đối tượng',
    credits: 3,
  };

  const mockDraftSyllabus: ISyllabus = {
    id: syllabusId,
    courseId,
    version: '2026-v1',
    status: 'DRAFT',
    effectiveFromTermId: null,
    effectiveToTermId: null,
  };

  const mockClos: IClo[] = [
    {
      id: 'clo_2',
      syllabusId,
      courseId,
      code: 'CLO2',
      bloomLevel: 4,
      contentOriginal: 'Phân tích thiết kế lớp',
      measurement: null,
    },
    {
      id: 'clo_1',
      syllabusId,
      courseId,
      code: 'CLO1',
      bloomLevel: 3,
      contentOriginal: 'Áp dụng đóng gói và kế thừa',
      measurement: null,
    },
  ];

  const syllabusSvc = {
    getSyllabusById: vi.fn(() => of(mockDraftSyllabus)),
    updateSyllabusStatus: vi.fn(
      (id: string, status: 'CONFIRMED' | 'ARCHIVED') => of({ ...mockDraftSyllabus, id, status }),
    ),
  };

  const courseSvc = {
    getCourseById: vi.fn(() => of(mockCourse)),
  };

  const cloSvc = {
    getClosBySyllabus: vi.fn(() => of(mockClos)),
    createClo: vi.fn(),
    updateClo: vi.fn(),
    deleteClo: vi.fn(() => of(undefined)),
  };

  const termSvc = {
    getTerms: vi.fn(() => of([])),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.PROGRAM_MANAGER]),
    getRoleAssignments: vi.fn(() => [
      {
        role: SystemConstant.ROLE.PROGRAM_MANAGER,
        scope: { programIds: [], courseIds: [courseId], sectionIds: [] },
      },
    ]),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    syllabusSvc.getSyllabusById.mockReturnValue(of(mockDraftSyllabus));
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.PROGRAM_MANAGER]);

    await TestBed.configureTestingModule({
      imports: [DetailSyllabusComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (k: string) => (k === 'syllabusId' ? syllabusId : null),
              },
            },
          },
        },
        { provide: SyllabusService, useValue: syllabusSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: CloService, useValue: cloSvc },
        { provide: TermService, useValue: termSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
        { provide: NzModalService, useValue: { confirm: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailSyllabusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sắp xếp danh sách CLO theo thứ tự số học của mã (CLO1 trước CLO2)', () => {
    const sorted = component.sortedClos();
    expect(sorted.map(c => c.code)).toEqual(['CLO1', 'CLO2']);
  });

  it('PROGRAM_MANAGER trong scope được phép duyệt CONFIRMED và sửa CLO khi đề cương đang ở DRAFT (ADR 0014)', () => {
    expect(component.canApproveSyllabus()).toBe(true);
    expect(component.canEditClo()).toBe(true);
  });

  it('LECTURER trong scope được sửa CLO khi DRAFT nhưng KHÔNG có quyền duyệt CONFIRMED (ADR 0014)', () => {
    component.userRoles.set([SystemConstant.ROLE.LECTURER]);
    fixture.detectChanges();

    expect(component.canEditClo()).toBe(true);
    expect(component.canApproveSyllabus()).toBe(false);
  });

  it('ADMIN không có thẩm quyền học thuật để sửa CLO hoặc duyệt CONFIRMED đề cương (ADR 0010)', () => {
    component.userRoles.set([SystemConstant.ROLE.ADMIN]);
    fixture.detectChanges();

    expect(component.canEditClo()).toBe(false);
    expect(component.canApproveSyllabus()).toBe(false);
  });

  it('khóa cứng 100% thao tác thêm/sửa/xóa CLO khi đề cương ở trạng thái CONFIRMED (TD-27)', () => {
    component.changeStatus('CONFIRMED');
    fixture.detectChanges();

    expect(component.syllabus()?.status).toBe('CONFIRMED');
    expect(component.canEditClo()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('TD-27');
    expect(compiled.textContent).not.toContain('Thêm chuẩn đầu ra (CLO)');
  });

  it('validate regex mã CLO (^CLO[0-9]+$) và giới hạn mức Bloom (1–6)', () => {
    component.openCreateCloModal();
    component.cloForm.patchValue({ code: 'INVALID_1', bloomLevel: 7 });
    expect(component.cloForm.get('code')?.valid).toBe(false);
    expect(component.cloForm.get('bloomLevel')?.valid).toBe(false);

    component.cloForm.patchValue({ code: 'CLO3', bloomLevel: 5 });
    expect(component.cloForm.get('code')?.valid).toBe(true);
    expect(component.cloForm.get('bloomLevel')?.valid).toBe(true);
  });

  it('F04: có liên kết sang khung bài đánh giá của đề cương (mở được ở mọi trạng thái đề cương)', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href$="/mng/assessments/syllabi/' + syllabusId + '"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Khung bài đánh giá');
  });
});

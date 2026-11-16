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

  const mockActiveSyllabus: ISyllabus = {
    id: syllabusId,
    courseId,
    version: '2026-v1',
    status: 'CONFIRMED',
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
    getSyllabusById: vi.fn(() => of(mockActiveSyllabus)),
    lockSyllabus: vi.fn(
      (id: string) => of({ ...mockActiveSyllabus, id, status: 'ARCHIVED' as const }),
    ),
  };

  const courseSvc = {
    getCourseById: vi.fn(() => of(mockCourse)),
  };

  const cloSvc = {
    getClosBySyllabus: vi.fn(() => of(mockClos)),
    getCloPiLinks: vi.fn(() => of([])),
    createClo: vi.fn(),
    updateClo: vi.fn(),
    deleteClo: vi.fn(() => of(undefined)),
  };

  const termSvc = {
    getTerms: vi.fn(() => of([])),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.PROGRAM_MANAGER]),
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
    syllabusSvc.getSyllabusById.mockReturnValue(of(mockActiveSyllabus));
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
        { provide: NzModalService, useValue: modalSvc },
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

  it('PROGRAM_MANAGER trong scope được phép Khóa đề cương (canLockSyllabus = true)', () => {
    expect(component.canLockSyllabus()).toBe(true);
  });

  it('LECTURER, ADMIN và QA chỉ được xem (canLockSyllabus = false, QA strictly read-only)', () => {
    component.userRoles.set([SystemConstant.ROLE.LECTURER]);
    fixture.detectChanges();
    expect(component.canLockSyllabus()).toBe(false);

    component.userRoles.set([SystemConstant.ROLE.ADMIN]);
    fixture.detectChanges();
    expect(component.canLockSyllabus()).toBe(false);

    component.userRoles.set([SystemConstant.ROLE.QA]);
    fixture.detectChanges();
    expect(component.canLockSyllabus()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Phê duyệt Đề cương');
    expect(compiled.textContent).not.toContain('Khóa đề cương');
  });

  it('confirmLockSyllabus mở modal xác nhận và gọi lockSyllabus chuyển sang ARCHIVED (TD-27)', () => {
    component.confirmLockSyllabus();
    fixture.detectChanges();

    expect(modalSvc.confirm).toHaveBeenCalled();
    expect(syllabusSvc.lockSyllabus).toHaveBeenCalledWith(syllabusId);
    expect(component.syllabus()?.status).toBe('ARCHIVED');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('TD-27');
  });

  it('F04: có liên kết sang khung bài đánh giá của đề cương (mở được ở mọi trạng thái đề cương)', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href$="/mng/assessments/syllabi/' + syllabusId + '"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Khung bài đánh giá');
  });
});

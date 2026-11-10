import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IPagedResults } from '@models/common/response-data.model';
import { ICourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ListSyllabiComponent } from './list-syllabi.component';

describe('ListSyllabiComponent (Server-side Course Search & ADR 0010)', () => {
  let fixture: ComponentFixture<ListSyllabiComponent>;
  let component: ListSyllabiComponent;

  const mockTerms: ITerm[] = [
    {
      id: 'term-1',
      code: 'HK1_2026_2027',
      startDate: '2026-09-01',
      endDate: '2027-01-15',
      status: 'OPEN',
    },
  ];

  const mockCourses: ICourse[] = [
    {
      id: 'course-1',
      code: 'MATH1301',
      name: 'Toán cao cấp A1',
      credits: 3,
    },
    {
      id: 'course-2',
      code: 'PHYS1302',
      name: 'Vật lý đại cương',
      credits: 3,
    },
  ];

  const mockCourseOOP: ICourse = {
    id: 'course-105',
    code: 'OOPR230279',
    name: 'Lập trình hướng đối tượng',
    credits: 3,
  };

  const mockSyllabus: ISyllabus = {
    id: 'syl-1',
    courseId: 'course-1',
    version: '2026.1',
    status: 'DRAFT',
  };

  const pagedResponse = (content: ICourse[]): IPagedResults<ICourse> => ({
    content,
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  });

  let courseSvcMock: {
    getCourses: ReturnType<typeof vi.fn>;
    getCourseById: ReturnType<typeof vi.fn>;
  };
  let syllabusSvcMock: {
    getSyllabiByCourse: ReturnType<typeof vi.fn>;
    createSyllabus: ReturnType<typeof vi.fn>;
  };
  let termSvcMock: {
    getTerms: ReturnType<typeof vi.fn>;
  };
  let authSvcMock: {
    getRoles: ReturnType<typeof vi.fn>;
    getRoleAssignments: ReturnType<typeof vi.fn>;
  };
  let alertSvcMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let queryParamMapStub: ReturnType<typeof convertToParamMap>;

  const createComponent = async () => {
    await TestBed.configureTestingModule({
      imports: [ListSyllabiComponent],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: courseSvcMock },
        { provide: SyllabusService, useValue: syllabusSvcMock },
        { provide: TermService, useValue: termSvcMock },
        { provide: AuthService, useValue: authSvcMock },
        { provide: ToastrService, useValue: alertSvcMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: queryParamMapStub,
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListSyllabiComponent);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryParamMapStub = convertToParamMap({});

    courseSvcMock = {
      getCourses: vi.fn(() => of(pagedResponse(mockCourses))),
      getCourseById: vi.fn(() => of(mockCourseOOP)),
    };
    syllabusSvcMock = {
      getSyllabiByCourse: vi.fn(() => of([mockSyllabus])),
      createSyllabus: vi.fn(() => of(mockSyllabus)),
    };
    termSvcMock = {
      getTerms: vi.fn(() => of(mockTerms)),
    };
    authSvcMock = {
      getRoles: vi.fn(() => [SystemConstant.ROLE.ADMIN]),
      getRoleAssignments: vi.fn(() => []),
    };
    alertSvcMock = {
      success: vi.fn(),
      error: vi.fn(),
    };
  });

  it('khởi tạo thành công và tải danh sách học phần ban đầu (100 môn)', async () => {
    await createComponent();
    fixture.detectChanges();

    expect(termSvcMock.getTerms).toHaveBeenCalled();
    expect(courseSvcMock.getCourses).toHaveBeenCalledWith(0, 100);
    expect(component.allCourses()).toEqual(mockCourses);
    expect(component.selectedCourseId()).toBe('course-1');
    expect(syllabusSvcMock.getSyllabiByCourse).toHaveBeenCalledWith('course-1');
  });

  it('xử lý deep link query param courseId không nằm trong 100 môn đầu tiên', async () => {
    queryParamMapStub = convertToParamMap({ courseId: 'course-105' });
    await createComponent();
    fixture.detectChanges();

    expect(courseSvcMock.getCourseById).toHaveBeenCalledWith('course-105');
    expect(component.allCourses()).toEqual([mockCourseOOP, ...mockCourses]);
    expect(component.selectedCourseId()).toBe('course-105');
    expect(syllabusSvcMock.getSyllabiByCourse).toHaveBeenCalledWith('course-105');
  });

  describe('Server-side search với debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounce 300ms: chỉ gọi API getCourses sau khi dừng gõ đủ 300ms', async () => {
      await createComponent();
      fixture.detectChanges();

      // Reset initial calls count
      courseSvcMock.getCourses.mockClear();
      courseSvcMock.getCourses.mockReturnValue(of(pagedResponse([mockCourseOOP])));

      // Gõ liên tục các ký tự
      component.onSearchCourse('l');
      component.onSearchCourse('lập');
      component.onSearchCourse('lập trình');

      // Trước 300ms: chưa gọi API mới
      await vi.advanceTimersByTimeAsync(200);
      expect(courseSvcMock.getCourses).not.toHaveBeenCalled();

      // Sau đủ 300ms: gọi API đúng 1 lần với keyword mới nhất
      await vi.advanceTimersByTimeAsync(150);
      expect(courseSvcMock.getCourses).toHaveBeenCalledTimes(1);
      expect(courseSvcMock.getCourses).toHaveBeenCalledWith(0, 100, 'lập trình');
      expect(component.isSearchingCourse()).toBe(false);
    });

    it('khi tìm kiếm trả về danh sách mới, giữ lại môn đang chọn trong allCourses để không mất nhãn select', async () => {
      await createComponent();
      fixture.detectChanges();

      // Đang chọn môn course-1
      expect(component.selectedCourseId()).toBe('course-1');

      courseSvcMock.getCourses.mockReturnValue(of(pagedResponse([mockCourseOOP])));
      component.onSearchCourse('OOP');
      await vi.advanceTimersByTimeAsync(350);

      // Kết quả tìm kiếm chỉ có mockCourseOOP, nhưng component vẫn giữ course-1 để không mất label
      const courses = component.allCourses();
      expect(courses.some(c => c.id === 'course-1')).toBe(true);
      expect(courses.some(c => c.id === 'course-105')).toBe(true);
      expect(component.selectedCourse()?.id).toBe('course-1');
    });

    it('nếu API search gặp lỗi, reset isSearchingCourse về false và không làm gãy UI', async () => {
      await createComponent();
      fixture.detectChanges();

      courseSvcMock.getCourses.mockReturnValue(throwError(() => new Error('Server error')));
      component.onSearchCourse('Lỗi mạng');
      await vi.advanceTimersByTimeAsync(350);

      expect(component.isSearchingCourse()).toBe(false);
      expect(component.allCourses()).toBeDefined();
    });
  });
});

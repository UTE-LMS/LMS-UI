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

  describe('Giảng viên / Trưởng bộ môn có Scope phụ trách và nút toggleShowAllCourses', () => {
    beforeEach(() => {
      authSvcMock.getRoles.mockReturnValue([SystemConstant.ROLE.LECTURER]);
      authSvcMock.getRoleAssignments.mockReturnValue([
        {
          role: SystemConstant.ROLE.LECTURER,
          scope: {
            programIds: [],
            courseIds: ['course-105'],
            sectionIds: [],
          },
        },
      ]);
      courseSvcMock.getCourseById.mockImplementation((id: string) => {
        if (id === 'course-105') {
          return of(mockCourseOOP);
        }
        return of(mockCourses[0]);
      });
    });

    it('tải môn phụ trách qua getCourseById và tự động chọn môn phụ trách đầu tiên', async () => {
      await createComponent();
      fixture.detectChanges();

      expect(courseSvcMock.getCourseById).toHaveBeenCalledWith('course-105');
      expect(component.scopedCourses()).toEqual([mockCourseOOP]);
      expect(component.showAllCourses()).toBe(false);
      expect(component.filteredCourses()).toEqual([mockCourseOOP]);
      expect(component.selectedCourseId()).toBe('course-105');
      expect(component.isCourseInScope()).toBe(true);
    });

    it('bấm toggleShowAllCourses chuyển đổi giữa toàn trường và chỉ môn phụ trách, tự reset về môn phụ trách', async () => {
      await createComponent();
      fixture.detectChanges();

      // Ban đầu: chỉ hiện môn phụ trách course-105
      expect(component.filteredCourses()).toEqual([mockCourseOOP]);
      expect(component.selectedCourseId()).toBe('course-105');

      // Bấm chuyển sang tra cứu toàn trường
      component.toggleShowAllCourses();
      expect(component.showAllCourses()).toBe(true);
      expect(component.filteredCourses().length).toBeGreaterThan(1);

      // Chọn 1 môn ngoài scope
      component.onCourseChange('course-1');
      expect(component.selectedCourseId()).toBe('course-1');
      expect(component.isCourseInScope()).toBe(false);

      // Bấm quay lại chỉ hiện môn phụ trách -> tự động chuyển selectedCourseId về môn phụ trách course-105
      component.toggleShowAllCourses();
      expect(component.showAllCourses()).toBe(false);
      expect(component.filteredCourses()).toEqual([mockCourseOOP]);
      expect(component.selectedCourseId()).toBe('course-105');
      expect(component.isCourseInScope()).toBe(true);
    });
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

  describe('Cuộn vô tận nzScrollToBottom (Infinite Scroll)', () => {
    it('khi người dùng cuộn xuống đáy danh sách và còn trang tiếp theo, tải trang tiếp theo và nối vào allCourses', async () => {
      courseSvcMock.getCourses.mockReturnValue(
        of({
          content: [mockCourses[0]],
          page: 0,
          size: 100,
          totalElements: 2,
          totalPages: 2,
          last: false,
        }),
      );
      await createComponent();
      fixture.detectChanges();

      expect(component.allCourses()).toEqual([mockCourses[0]]);
      expect(component.coursePage()).toBe(0);
      expect(component.isCourseLastPage()).toBe(false);

      courseSvcMock.getCourses.mockReturnValue(
        of({
          content: [mockCourses[1]],
          page: 1,
          size: 100,
          totalElements: 2,
          totalPages: 2,
          last: true,
        }),
      );

      component.onCourseScrollToBottom();

      expect(courseSvcMock.getCourses).toHaveBeenCalledWith(1, 100, '');
      expect(component.coursePage()).toBe(1);
      expect(component.isCourseLastPage()).toBe(true);
      expect(component.allCourses()).toEqual([mockCourses[0], mockCourses[1]]);
      expect(component.isLoadingMoreCourses()).toBe(false);
    });

    it('khi đã ở trang cuối cùng (isCourseLastPage = true), không gọi thêm API', async () => {
      courseSvcMock.getCourses.mockReturnValue(
        of({
          content: mockCourses,
          page: 0,
          size: 100,
          totalElements: 2,
          totalPages: 1,
          last: true,
        }),
      );
      await createComponent();
      fixture.detectChanges();

      courseSvcMock.getCourses.mockClear();
      component.onCourseScrollToBottom();

      expect(courseSvcMock.getCourses).not.toHaveBeenCalled();
    });

    it('nếu API trang tiếp theo bị lỗi, reset isLoadingMoreCourses về false và không làm crash danh sách', async () => {
      courseSvcMock.getCourses.mockReturnValue(
        of({
          content: [mockCourses[0]],
          page: 0,
          size: 100,
          totalElements: 2,
          totalPages: 2,
          last: false,
        }),
      );
      await createComponent();
      fixture.detectChanges();

      courseSvcMock.getCourses.mockReturnValue(throwError(() => new Error('Network error')));
      component.onCourseScrollToBottom();

      expect(component.isLoadingMoreCourses()).toBe(false);
      expect(component.allCourses()).toEqual([mockCourses[0]]);
    });
  });
});

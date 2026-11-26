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
import { ProgramVersionService } from '@services/program/program-version.service';
import { NzModalService } from 'ng-zorro-antd/modal';
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
      facultyId: 'fac-other',
    },
    {
      id: 'course-2',
      code: 'PHYS1302',
      name: 'Vật lý đại cương',
      credits: 3,
      facultyId: 'fac-other',
    },
  ];

  const mockCourseOOP: ICourse = {
    id: 'course-105',
    code: 'OOPR230279',
    name: 'Lập trình hướng đối tượng',
    credits: 3,
    facultyId: 'fac-cntt',
  };

  const mockSyllabus: ISyllabus = {
    id: 'syl-1',
    courseId: 'course-1',
    courseCode: 'MATH1301',
    courseName: 'Toán cao cấp A1',
    version: '2026.1',
    effectiveFromTermId: 'term-1',
    effectiveFromTermCode: 'HK1_2026_2027',
    effectiveToTermId: null,
    effectiveToTermCode: null,
    status: 'CONFIRMED',
  };

  const pagedResponse = (content: ICourse[]): IPagedResults<ICourse> => ({
    content,
    page: 0,
    size: 20,
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
    previewImportSyllabusCsv: ReturnType<typeof vi.fn>;
    importSyllabusCsv: ReturnType<typeof vi.fn>;
    lockSyllabus: ReturnType<typeof vi.fn>;
  };
  let termSvcMock: {
    getTerms: ReturnType<typeof vi.fn>;
    getTermById: ReturnType<typeof vi.fn>;
  };
  let pvSvcMock: {
    getProgramVersions: ReturnType<typeof vi.fn>;
    getProgramVersionById: ReturnType<typeof vi.fn>;
  };
  let authSvcMock: {
    getRoles: ReturnType<typeof vi.fn>;
    getFacultyId: ReturnType<typeof vi.fn>;
  };
  let alertSvcMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };
  let modalSvcMock: {
    confirm: ReturnType<typeof vi.fn>;
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
        { provide: ProgramVersionService, useValue: pvSvcMock },
        { provide: AuthService, useValue: authSvcMock },
        { provide: ToastrService, useValue: alertSvcMock },
        { provide: NzModalService, useValue: modalSvcMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: queryParamMapStub,
            },
          },
        },
      ],
    })
      .overrideComponent(ListSyllabiComponent, {
        set: {
          providers: [{ provide: NzModalService, useValue: modalSvcMock }],
        },
      })
      .compileComponents();

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
      previewImportSyllabusCsv: vi.fn(() => of({
        syllabusId: 'syl-preview-1',
        courseId: 'course-1',
        version: '2026-v1',
        status: 'CONFIRMED',
        verificationStatus: 'VERIFIED',
        cloCount: 2,
        linkCount: 3,
        warnings: [],
        clos: [{ id: 'c1', code: 'CLO1', bloomLevel: 3, contentOriginal: 'Mô tả CLO1' }],
        links: [],
      })),
      importSyllabusCsv: vi.fn(() => of({
        syllabusId: 'syl-imported-1',
        courseId: 'course-1',
        version: '2026-v1',
        status: 'CONFIRMED',
        verificationStatus: 'VERIFIED',
        cloCount: 2,
        linkCount: 3,
        warnings: [],
        clos: [],
        links: [],
      })),
      lockSyllabus: vi.fn(() => of({ ...mockSyllabus, status: 'ARCHIVED' as const })),
    };
    termSvcMock = {
      getTerms: vi.fn(() => of({
        content: mockTerms,
        page: 0,
        size: 20,
        totalElements: mockTerms.length,
        totalPages: 1,
        last: true,
      })),
      getTermById: vi.fn(() => of(mockTerms[0])),
    };
    pvSvcMock = {
      getProgramVersions: vi.fn(() => of({
        content: [{ id: 'pv-1', programId: 'p1', version: '2026', status: 'ACTIVE' }],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        last: true,
      })),
      getProgramVersionById: vi.fn(() => of({ id: 'pv-1', programId: 'p1', version: '2026', status: 'ACTIVE' })),
    };
    authSvcMock = {
      getRoles: vi.fn(() => [SystemConstant.ROLE.ADMIN]),
      getFacultyId: vi.fn(() => undefined),
    };
    alertSvcMock = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };
    modalSvcMock = {
      confirm: vi.fn((opts: { nzOnOk?: () => void; }) => {
        opts.nzOnOk?.();
      }),
    };
  });

  it('khởi tạo thành công, tải danh sách học phần ban đầu (20 môn) và không gọi N+1 term/pv', async () => {
    await createComponent();
    fixture.detectChanges();

    expect(termSvcMock.getTerms).not.toHaveBeenCalled();
    expect(termSvcMock.getTermById).not.toHaveBeenCalled();
    expect(pvSvcMock.getProgramVersions).not.toHaveBeenCalled();
    expect(courseSvcMock.getCourses).toHaveBeenCalledWith(0, 20);
    expect(component.allCourses()).toEqual(mockCourses);
    expect(component.selectedCourseId()).toBe('course-1');
    expect(syllabusSvcMock.getSyllabiByCourse).toHaveBeenCalledWith('course-1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('HK1_2026_2027');
  });

  it('xử lý deep link query param courseId không nằm trong 20 môn đầu tiên', async () => {
    queryParamMapStub = convertToParamMap({ courseId: 'course-105' });
    await createComponent();
    fixture.detectChanges();

    expect(courseSvcMock.getCourseById).toHaveBeenCalledWith('course-105');
    expect(component.allCourses()).toEqual([mockCourseOOP, ...mockCourses]);
    expect(component.selectedCourseId()).toBe('course-105');
    expect(syllabusSvcMock.getSyllabiByCourse).toHaveBeenCalledWith('course-105');
  });

  describe('Program Manager có facultyId phụ trách và nút toggleShowAllCourses', () => {
    beforeEach(() => {
      authSvcMock.getRoles.mockReturnValue([SystemConstant.ROLE.PROGRAM_MANAGER]);
      authSvcMock.getFacultyId.mockReturnValue('fac-cntt');
      courseSvcMock.getCourses.mockReturnValue(of(pagedResponse([...mockCourses, mockCourseOOP])));
    });

    it('lọc môn theo facultyId của PM và tự động chọn môn đầu tiên thuộc Khoa', async () => {
      await createComponent();
      fixture.detectChanges();

      expect(courseSvcMock.getCourses).toHaveBeenCalledWith(0, 20, undefined, 'fac-cntt');
      expect(component.scopedCourses()).toEqual([mockCourseOOP]);
      expect(component.showAllCourses()).toBe(false);
      expect(component.filteredCourses()).toEqual([mockCourseOOP]);
      expect(component.selectedCourseId()).toBe('course-105');
      expect(component.isCourseInScope()).toBe(true);
    });

    it('PM quay lại từ chi tiết đề cương với ?courseId thuộc Khoa phụ trách: giữ showAllCourses=false và chỉ hiện môn của Khoa', async () => {
      queryParamMapStub = convertToParamMap({ courseId: 'course-105' });
      courseSvcMock.getCourses.mockReturnValue(of(pagedResponse([mockCourseOOP])));

      await createComponent();
      fixture.detectChanges();

      expect(courseSvcMock.getCourses).toHaveBeenCalledWith(0, 20, undefined, 'fac-cntt');
      expect(component.showAllCourses()).toBe(false);
      expect(component.filteredCourses()).toEqual([mockCourseOOP]);
      expect(component.selectedCourseId()).toBe('course-105');
      expect(component.isCourseInScope()).toBe(true);
    });

    it('PM mở deep link ?courseId thuộc Khoa khác: bật showAllCourses=true và nạp toàn bộ môn học', async () => {
      queryParamMapStub = convertToParamMap({ courseId: 'course-1' });
      courseSvcMock.getCourses
        .mockReturnValueOnce(of(pagedResponse([mockCourseOOP])))
        .mockReturnValueOnce(of(pagedResponse([...mockCourses, mockCourseOOP])));
      courseSvcMock.getCourseById.mockReturnValue(of(mockCourses[0]));

      await createComponent();
      fixture.detectChanges();

      expect(courseSvcMock.getCourseById).toHaveBeenCalledWith('course-1');
      expect(component.showAllCourses()).toBe(true);
      expect(courseSvcMock.getCourses).toHaveBeenNthCalledWith(1, 0, 20, undefined, 'fac-cntt');
      expect(courseSvcMock.getCourses).toHaveBeenNthCalledWith(2, 0, 20);
      expect(component.selectedCourseId()).toBe('course-1');
      expect(component.filteredCourses().length).toBe(3);
    });

    it('bấm toggleShowAllCourses chuyển đổi giữa toàn trường và chỉ môn thuộc Khoa, tự reset về môn của Khoa', async () => {
      await createComponent();
      fixture.detectChanges();

      // Ban đầu: chỉ hiện môn thuộc Khoa fac-cntt (course-105)
      expect(component.filteredCourses()).toEqual([mockCourseOOP]);
      expect(component.selectedCourseId()).toBe('course-105');

      // Bấm chuyển sang tra cứu toàn trường
      component.toggleShowAllCourses();
      expect(component.showAllCourses()).toBe(true);
      expect(courseSvcMock.getCourses).toHaveBeenLastCalledWith(0, 20);
      expect(component.filteredCourses().length).toBeGreaterThan(1);

      // Chọn 1 môn ngoài Khoa
      component.onCourseChange('course-1');
      expect(component.selectedCourseId()).toBe('course-1');
      expect(component.isCourseInScope()).toBe(false);

      // Bấm quay lại chỉ hiện môn thuộc Khoa -> gọi lại API theo facultyId và tự động chuyển selectedCourseId về course-105
      component.toggleShowAllCourses();
      expect(component.showAllCourses()).toBe(false);
      expect(courseSvcMock.getCourses).toHaveBeenLastCalledWith(0, 20, undefined, 'fac-cntt');
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
      expect(courseSvcMock.getCourses).toHaveBeenCalledWith(0, 20, 'lập trình');
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
          size: 20,
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
          size: 20,
          totalElements: 2,
          totalPages: 2,
          last: true,
        }),
      );

      component.onCourseScrollToBottom();

      expect(courseSvcMock.getCourses).toHaveBeenCalledWith(1, 20, '');
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
          size: 20,
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
          size: 20,
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

  describe('M4: Quy trình Import CSV 2 bước và Khóa Đề cương', () => {
    beforeEach(() => {
      authSvcMock.getRoles.mockReturnValue([SystemConstant.ROLE.PROGRAM_MANAGER]);
      authSvcMock.getFacultyId.mockReturnValue('fac-other');
    });

    it('chỉ PROGRAM_MANAGER mới có quyền canImportSyllabus và nút tải mẫu chỉ nằm trong modal Import Đề cương', async () => {
      await createComponent();
      fixture.detectChanges();
      expect(component.canImportSyllabus()).toBe(true);

      const headerText = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(headerText).toContain('Import Đề cương');
      expect(headerText).not.toContain('Tải CSV mẫu');
      expect(headerText).not.toContain('Tải Excel mẫu');

      component.userRoles.set([SystemConstant.ROLE.QA]);
      expect(component.canImportSyllabus()).toBe(false);

      component.userRoles.set([SystemConstant.ROLE.ADMIN]);
      expect(component.canImportSyllabus()).toBe(false);
    });

    it('previewImportStep gọi previewImportSyllabusCsv và confirmImportStep gọi importSyllabusCsv', async () => {
      await createComponent();
      fixture.detectChanges();

      component.onCourseChange('course-1');
      component.openImportModal();
      const csvFile = new File(['code,bloomLevel,content'], 'syllabus.csv', { type: 'text/csv' });
      component.importProgramVersionId.set('pv-1');
      component.importVersion.set('2026-v1');
      component.selectedFile.set(csvFile);

      component.previewImportStep();
      expect(syllabusSvcMock.previewImportSyllabusCsv).toHaveBeenCalledWith(
        'course-1',
        '2026-v1',
        'pv-1',
        csvFile,
        undefined,
      );
      expect(component.importStep()).toBe(2);
      expect(component.importPreview()?.cloCount).toBe(2);

      component.confirmImportStep();
      expect(syllabusSvcMock.importSyllabusCsv).toHaveBeenCalledWith(
        'course-1',
        '2026-v1',
        'pv-1',
        csvFile,
        null,
      );
      expect(component.isImportModalVisible()).toBe(false);
      expect(alertSvcMock.success).toHaveBeenCalled();
    });

    it('confirmLockSyllabus mở modal xác nhận và gọi lockSyllabus', async () => {
      await createComponent();
      fixture.detectChanges();

      const confirmedSyl: ISyllabus = {
        ...mockSyllabus,
        status: 'CONFIRMED',
      };
      expect(component.canLockSyllabus(confirmedSyl)).toBe(true);

      component.confirmLockSyllabus(confirmedSyl);
      expect(modalSvcMock.confirm).toHaveBeenCalled();
      expect(syllabusSvcMock.lockSyllabus).toHaveBeenCalledWith('syl-1');
      expect(alertSvcMock.success).toHaveBeenCalled();
    });
  });

  describe('courseLabel (nhãn học phần trong ô chọn)', () => {
    it('có số tín chỉ thì ghi "(n TC)", kể cả 0 tín chỉ', async () => {
      await createComponent();
      expect(component.courseLabel({ id: 'c1', code: 'CS101', name: 'Nhập môn', credits: 3 })).toBe('CS101 — Nhập môn (3 TC)');
      expect(component.courseLabel({ id: 'c2', code: 'CS102', name: 'Thực hành', credits: 0 })).toBe('CS102 — Thực hành (0 TC)');
    });

    it('API trả credits = null hoặc thiếu thì không in "null TC"', async () => {
      await createComponent();
      expect(component.courseLabel({ id: 'c3', code: 'CS103', name: 'Chưa khai', credits: null })).toBe('CS103 — Chưa khai');
      expect(component.courseLabel({ id: 'c4', code: 'CS104', name: 'Thiếu trường' })).toBe('CS104 — Thiếu trường');
    });
  });
});

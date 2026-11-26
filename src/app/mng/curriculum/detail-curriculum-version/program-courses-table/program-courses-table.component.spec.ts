import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseService } from '@services/course/course.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ProgramCoursesTableComponent } from './program-courses-table.component';

describe('ProgramCoursesTableComponent (Read-only)', () => {
  let fixture: ComponentFixture<ProgramCoursesTableComponent>;
  let component: ProgramCoursesTableComponent;

  const mockProgramCourses = [
    {
      id: 'pc_1',
      programVersionId: '671dcba5f123456789abcdef',
      courseId: '671dcba5f123456789abcde1',
      type: 'COMPULSORY' as const,
      category: 'MAJOR_FOUNDATION' as const,
      semester: 2,
      credits: 3,
      prerequisiteCodes: ['INTR130185'],
      previousCourseCodes: ['MATH1301'],
      course: { id: '671dcba5f123456789abcde1', code: 'OOPR230279', name: 'Lập trình OOP', credits: 3 },
    },
    {
      id: 'pc_2',
      programVersionId: '671dcba5f123456789abcdef',
      courseId: '671dcba5f123456789abcde2',
      type: 'ELECTIVE' as const,
      category: 'FOUNDATION' as const,
      semester: 1,
      credits: 3,
      prerequisiteCodes: [],
      previousCourseCodes: [],
      course: { id: '671dcba5f123456789abcde2', code: 'INTR130185', name: 'Nhập môn lập trình', credits: 3 },
    },
  ];

  const courseSvc = {
    getCourses: vi.fn(() => of({
      content: [
        { id: '671dcba5f123456789abcde1', code: 'OOPR230279', name: 'Lập trình OOP', credits: 3 },
        { id: '671dcba5f123456789abcde2', code: 'INTR130185', name: 'Nhập môn lập trình', credits: 3 },
      ],
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
      last: true,
    })),
    getProgramCourses: vi.fn(() => of({
      content: mockProgramCourses,
      page: 0,
      size: 20,
      totalElements: mockProgramCourses.length,
      totalPages: 1,
      last: true,
    })),
    downloadProgramCoursesImportTemplate: vi.fn(() => of(new Blob(['courseCode\n'], { type: 'text/csv' }))),
    importProgramCoursesCsv: vi.fn(() => of({
      programVersionId: '671dcba5f123456789abcdef',
      importedCount: 2,
      updatedCount: 1,
      warnings: [],
      courses: [],
    })),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ProgramCoursesTableComponent],
      providers: [
        { provide: CourseService, useValue: courseSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramCoursesTableComponent);
    fixture.componentRef.setInput('versionId', '671dcba5f123456789abcdef');
    fixture.componentRef.setInput('programCourses', [
      {
        id: 'pc_1',
        programVersionId: '671dcba5f123456789abcdef',
        courseId: '671dcba5f123456789abcde1',
        type: 'COMPULSORY',
        category: 'MAJOR_FOUNDATION',
        semester: 2,
        credits: 3,
      },
      {
        id: 'pc_2',
        programVersionId: '671dcba5f123456789abcdef',
        courseId: '671dcba5f123456789abcde2',
        type: 'ELECTIVE',
        category: 'FOUNDATION',
        semester: 1,
        credits: 3,
      },
    ]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('tải danh sách học phần phân trang server-side, đọc mã tiên quyết/học trước từ DTO và không gọi getCourses(0, 100)', async () => {
    vi.useFakeTimers();
    try {
      expect(courseSvc.getCourses).not.toHaveBeenCalled();
      expect(courseSvc.getProgramCourses).toHaveBeenCalledWith('671dcba5f123456789abcdef', undefined, undefined, undefined, undefined, 0, 20);
      expect(component.filteredProgramCourses().length).toBe(2);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('INTR130185');
      expect(text).toContain('MATH1301');

      component.onSemesterChange(2);
      expect(courseSvc.getProgramCourses).toHaveBeenLastCalledWith('671dcba5f123456789abcdef', 2, undefined, undefined, undefined, 0, 20);

      component.onTypeChange('ELECTIVE');
      component.onCategoryChange('FOUNDATION');
      expect(courseSvc.getProgramCourses).toHaveBeenLastCalledWith('671dcba5f123456789abcdef', 2, 'ELECTIVE', 'FOUNDATION', undefined, 0, 20);

      component.onSearchChange('INTR');
      await vi.advanceTimersByTimeAsync(350);
      expect(courseSvc.getProgramCourses).toHaveBeenLastCalledWith('671dcba5f123456789abcdef', 2, 'ELECTIVE', 'FOUNDATION', 'INTR', 0, 20);

      component.onPageIndexChange(2);
      expect(courseSvc.getProgramCourses).toHaveBeenLastCalledWith('671dcba5f123456789abcdef', 2, 'ELECTIVE', 'FOUNDATION', 'INTR', 1, 20);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hiển thị nút Import Khung học phần (CSV) khi canImportCourses=true và gọi API import thành công', () => {
    fixture.componentRef.setInput('versionStatus', 'ACTIVE');
    fixture.componentRef.setInput('canImportCourses', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="btn-open-import-program-courses"]')).not.toBeNull();

    const changedSpy = vi.fn();
    component.changed.subscribe(changedSpy);

    const file = new File(['courseCode,semester\nOOPR230279,2'], 'courses.csv', { type: 'text/csv' });
    component.selectedFile.set(file);
    component.submitImport();

    expect(courseSvc.importProgramCoursesCsv).toHaveBeenCalledWith('671dcba5f123456789abcdef', file);
    expect(component.importResult()?.importedCount).toBe(2);
    expect(component.importResult()?.updatedCount).toBe(1);
    expect(changedSpy).toHaveBeenCalled();
  });
});

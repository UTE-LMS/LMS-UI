import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseService } from '@services/course/course.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ProgramCoursesTableComponent } from './program-courses-table.component';

describe('ProgramCoursesTableComponent (Read-only)', () => {
  let fixture: ComponentFixture<ProgramCoursesTableComponent>;
  let component: ProgramCoursesTableComponent;

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

  it('hiển thị danh sách học phần và lọc theo học kỳ, khối kiến thức', () => {
    expect(component.filteredProgramCourses().length).toBe(2);

    component.filterSemester.set(2);
    expect(component.filteredProgramCourses().length).toBe(1);
    expect(component.getCourseCode(component.filteredProgramCourses()[0])).toBe('OOPR230279');

    component.filterSemester.set(null);
    component.filterCategory.set('FOUNDATION');
    expect(component.filteredProgramCourses().length).toBe(1);
    expect(component.getCourseCode(component.filteredProgramCourses()[0])).toBe('INTR130185');
  });

  it('hiển thị nút Import Khung học phần (CSV) khi canImportCourses=true và gọi API import thành công', () => {
    fixture.componentRef.setInput('versionStatus', 'DRAFT');
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

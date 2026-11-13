import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseService } from '@services/course/course.service';
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgramCoursesTableComponent],
      providers: [
        { provide: CourseService, useValue: courseSvc },
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
});

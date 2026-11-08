import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseService } from '@services/course/course.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ProgramCoursesTableComponent } from './program-courses-table.component';

describe('ProgramCoursesTableComponent (F03 US-09/AC-2, AC-3)', () => {
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
    addCourseToProgramVersion: vi.fn(),
    updateProgramCourse: vi.fn(),
    removeCourseFromProgramVersion: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgramCoursesTableComponent],
      providers: [
        { provide: CourseService, useValue: courseSvc },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: NzModalService, useValue: { confirm: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramCoursesTableComponent);
    fixture.componentRef.setInput('versionId', '671dcba5f123456789abcdef');
    fixture.componentRef.setInput('canManage', true);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('chặn chọn một học phần vừa làm tiên quyết vừa làm học trước (prereqPrevConflict)', () => {
    component.openCreateModal();
    component.pcForm.patchValue({
      courseId: '671dcba5f123456789abcde1',
      prerequisiteCourseIds: ['671dcba5f123456789abcde2'],
      previousCourseIds: ['671dcba5f123456789abcde2'],
    });
    expect(component.pcForm.hasError('prereqPrevConflict')).toBe(true);
    expect(component.pcForm.valid).toBe(false);
  });

  it('chặn học phần tự làm tiên quyết của chính nó (selfReferenceConflict)', () => {
    component.openCreateModal();
    component.pcForm.patchValue({
      courseId: '671dcba5f123456789abcde1',
      prerequisiteCourseIds: ['671dcba5f123456789abcde1'],
      previousCourseIds: [],
    });
    expect(component.pcForm.hasError('selfReferenceConflict')).toBe(true);
    expect(component.pcForm.valid).toBe(false);
  });

  it('hợp lệ khi học phần tiên quyết và học trước tách biệt nhau', () => {
    component.openCreateModal();
    component.pcForm.patchValue({
      courseId: '671dcba5f123456789abcde1',
      prerequisiteCourseIds: ['671dcba5f123456789abcde2'],
      previousCourseIds: [],
    });
    expect(component.pcForm.valid).toBe(true);
  });
});

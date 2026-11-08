import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { IUser } from '@models/user/user.model';
import { CourseService } from '@services/course/course.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { AssignCourseModalComponent } from './assign-course-modal.component';

describe('AssignCourseModalComponent (ADR 0010 Assign/Unassign Lecturer)', () => {
  let fixture: ComponentFixture<AssignCourseModalComponent>;
  let component: AssignCourseModalComponent;

  const mockCourse: ICourse = {
    id: '671dcba5f123456789abcde0',
    code: 'OOPR230279',
    name: 'Lập trình hướng đối tượng',
    credits: 3,
  };

  const mockLecturer: IUser = {
    id: '671dcba5f123456789abcde9',
    username: 'gv.cntt01',
    fullName: 'Nguyễn Văn Giảng Viên',
    email: 'gv01@hcmute.edu.vn',
    status: 'ACTIVE',
    roleAssignments: [
      {
        role: SystemConstant.ROLE.LECTURER,
        scope: {
          programIds: ['671dcba5f123456789abcd01'],
          courseIds: ['671dcba5f123456789abcde0'],
          sectionIds: [],
        },
      },
    ],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const courseSvc = {
    getDepartmentLecturers: vi.fn(() => of([mockLecturer])),
    assignCourseToLecturer: vi.fn(() => of(mockLecturer)),
    unassignCourseFromLecturer: vi.fn(() => of(mockLecturer)),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AssignCourseModalComponent],
      providers: [
        { provide: CourseService, useValue: courseSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignCourseModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('course', mockCourse);
    fixture.detectChanges();
  });

  it('tải danh sách giảng viên thuộc phạm vi Khoa/Ngành qua getDepartmentLecturers khi mở modal', () => {
    fixture.componentRef.setInput('canLoadUsers', true);
    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();

    expect(courseSvc.getDepartmentLecturers).toHaveBeenCalledWith('671dcba5f123456789abcde0');
    expect(component.lecturers()).toEqual([mockLecturer]);
    expect(component.formatLecturerLabel(mockLecturer)).toContain('[Đã phân công môn này]');
  });

  it('bấm Đóng hoặc X gọi handleCancel() / onVisibleChange(false) phát sự kiện đóng modal', () => {
    const visibleSpy = vi.fn();
    component.visibleChange.subscribe(visibleSpy);

    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();

    component.handleCancel();
    expect(visibleSpy).toHaveBeenCalledWith(false);

    visibleSpy.mockClear();
    component.onVisibleChange(false);
    expect(visibleSpy).toHaveBeenCalledWith(false);
  });

  it('phân công giảng viên hợp lệ gọi assignCourseToLecturer và đóng modal', () => {
    const visibleSpy = vi.fn();
    component.visibleChange.subscribe(visibleSpy);

    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();

    component.assignForm.patchValue({
      mode: 'ASSIGN',
      lecturerId: '671dcba5f123456789abcde9',
    });

    component.submitAssignment();

    expect(courseSvc.assignCourseToLecturer).toHaveBeenCalledWith({
      courseId: '671dcba5f123456789abcde0',
      lecturerId: '671dcba5f123456789abcde9',
    });
    expect(visibleSpy).toHaveBeenCalledWith(false);
  });
});

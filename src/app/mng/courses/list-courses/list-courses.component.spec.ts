import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { ITerm } from '@models/course/term.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { TermService } from '@services/course/term.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ListCoursesComponent } from './list-courses.component';

describe('ListCoursesComponent (F03 US-09/AC-1 & F05a US-18)', () => {
  let fixture: ComponentFixture<ListCoursesComponent>;
  let component: ListCoursesComponent;

  const mockCourses: ICourse[] = [
    {
      id: '671dcba5f123456789abcde1',
      code: 'OOPR230279',
      name: 'Lập trình hướng đối tượng',
      credits: 3,
    },
    {
      id: '671dcba5f123456789abcde2',
      code: 'APCM220307',
      name: 'Ứng dụng công nghệ thông tin trong thị trường vốn',
      credits: undefined,
    },
  ];

  const mockTerms: ITerm[] = [
    {
      id: '671dcba5f123456789abcde0',
      code: '2026-HK1',
      academicYear: '2026-2027',
      status: 'SCORE_LOCKED',
    },
  ];

  const courseSvc = {
    getCourses: vi.fn(() => of({
      content: mockCourses,
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    })),
    deleteCourse: vi.fn(() => of(undefined)),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
  };

  const termSvc = {
    getTerms: vi.fn(() => of(mockTerms)),
    updateTermStatus: vi.fn(() => of(mockTerms[0])),
    deleteTerm: vi.fn(() => of(undefined)),
    createTerm: vi.fn(),
    updateTerm: vi.fn(),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.ADMIN]),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const modalSvc = {
    confirm: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.ADMIN]);

    await TestBed.configureTestingModule({
      imports: [ListCoursesComponent],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: courseSvc },
        { provide: TermService, useValue: termSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
        { provide: NzModalService, useValue: modalSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo và hiển thị danh sách học phần kèm nút Thêm/Sửa/Xóa cho ADMIN', () => {
    expect(component.isAdmin()).toBe(true);
    expect(component.manager.listData().data.length).toBe(2);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OOPR230279');
    expect(compiled.textContent).toContain('Thêm học phần mới');
    expect(compiled.textContent).toContain('Nhập từ CSV');
    // Học phần thứ 2 chưa có credits hiển thị dấu gạch — thay vì số 0
    expect(compiled.textContent).toContain('—');
  });

  it('ẩn các nút Thêm/Sửa/Xóa học phần và Nhập từ CSV đối với vai trò không phải ADMIN (ADR 0010)', () => {
    component.userRoles.set([SystemConstant.ROLE.PROGRAM_MANAGER]);
    fixture.detectChanges();

    expect(component.isAdmin()).toBe(false);
    expect(component.canManageTerms()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Thêm học phần mới');
    expect(compiled.textContent).not.toContain('Nhập từ CSV');
  });

  it('mở modal import CSV khi gọi openImportCourseModal và reload dữ liệu khi onCoursesImported', () => {
    component.userRoles.set([SystemConstant.ROLE.ADMIN]);
    fixture.detectChanges();

    component.openImportCourseModal();
    expect(component.isImportModalVisible()).toBe(true);

    const reloadSpy = vi.spyOn(component.manager, 'triggerReload');
    component.onCoursesImported();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('yêu cầu nhập lý do giải trình khi mở lại học kỳ SCORE_LOCKED -> OPEN (US-18/AC-3)', () => {
    component.switchTab('TERMS');
    fixture.detectChanges();

    component.changeTermStatus(mockTerms[0], 'OPEN');
    expect(component.isReopenModalVisible()).toBe(true);

    // Chưa nhập lý do -> báo lỗi, không gọi API
    component.submitReopenTerm();
    expect(alertSvc.error).toHaveBeenCalled();
    expect(termSvc.updateTermStatus).not.toHaveBeenCalled();

    // Có lý do -> gọi API thành công
    component.reopenReason.set('Mở sổ điểm bổ sung phúc khảo');
    component.submitReopenTerm();
    expect(termSvc.updateTermStatus).toHaveBeenCalledWith('671dcba5f123456789abcde0', {
      status: 'OPEN',
      reason: 'Mở sổ điểm bổ sung phúc khảo',
    });
  });
});

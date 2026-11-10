import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { ISection } from '@models/course/section.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { UserService } from '@services/user/user.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ListSectionsComponent } from './list-sections.component';

/** DỮ LIỆU THỬ NGHIỆM: toàn bộ ID, mã lớp và học phần là dữ liệu giả. */
describe('ListSectionsComponent (F05a US-19)', () => {
  let fixture: ComponentFixture<ListSectionsComponent>;

  const course: ICourse = { id: 'c1', code: 'TEST101', name: 'Học phần thử nghiệm', credits: 3 };
  const term: ITerm = { id: 't1', code: '2026-HK1', status: 'OPEN' };
  const syllabus: ISyllabus = { id: 's1', courseId: 'c1', version: '1', status: 'CONFIRMED' };
  const sections: ISection[] = [
    { id: 'sec1', code: 'TEST101-01', courseId: 'c1', syllabusId: 's1', termId: 't1', lecturerIds: ['u1'], enrolledCount: 45, status: 'OPEN' },
    { id: 'sec2', code: 'TEST101-02', courseId: 'c1', syllabusId: 's1', termId: 't1', lecturerIds: ['u1'], enrolledCount: 0, status: 'LOCKED' },
  ];

  const sectionSvc = { getSections: vi.fn() };
  const termSvc = { getTerms: vi.fn(() => of([term])) };
  const courseSvc = {
    getCourses: vi.fn(() => of({ content: [course], page: 0, size: 100, totalElements: 1, totalPages: 1, last: true })),
    getCourseById: vi.fn(() => of(course)),
  };
  const syllabusSvc = { getSyllabusById: vi.fn(() => of(syllabus)), getSyllabiByCourse: vi.fn(() => of([syllabus])) };
  const userSvc = {
    filter: vi.fn(() => of({
      content: [{ id: 'u1', username: 'gv.test01', fullName: 'GV Thử', email: 'a@test.local', status: 'ACTIVE', createdAt: '', updatedAt: '', roleAssignments: [{ role: 'LECTURER', scope: null }] }],
      page: 0, size: 100, totalElements: 1, totalPages: 1, last: true,
    })),
  };
  const authSvc = { getRoles: vi.fn<() => string[]>(), getUserId: vi.fn(() => 'u1') };

  async function setup(roles: string[], list: ISection[] = sections): Promise<void> {
    sectionSvc.getSections.mockReset();
    userSvc.filter.mockClear();
    sectionSvc.getSections.mockReturnValue(of(list));
    authSvc.getRoles.mockReturnValue(roles);
    await TestBed.configureTestingModule({
      imports: [ListSectionsComponent],
      providers: [
        provideRouter([]),
        { provide: SectionService, useValue: sectionSvc },
        { provide: TermService, useValue: termSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: SyllabusService, useValue: syllabusSvc },
        { provide: UserService, useValue: userSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListSectionsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('US-19/AC-4: hiển thị lớp với tên học phần, học kỳ, đề cương và tên giảng viên tra được', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    expect(text()).toContain('TEST101-01');
    expect(text()).toContain('TEST101');
    expect(text()).toContain('Học phần thử nghiệm');
    expect(text()).toContain('2026-HK1');
    expect(text()).toContain('Bản 1');
    expect(text()).toContain('gv.test01');
  });

  it('hiện "—" (không phải 0) cho lớp chưa có danh sách ghi danh và hiện số khi có', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr.ant-table-row'));
    const enrolledCell = (row: Element): string => (row.querySelectorAll('td')[5].textContent ?? '').trim();
    expect(enrolledCell(rows[0])).toBe('45');
    expect(enrolledCell(rows[1])).toBe('—');
    expect(rows[1].querySelector('[aria-label="Chưa có danh sách ghi danh"]')).not.toBeNull();
  });

  it('trạng thái lớp có chữ, không chỉ màu (Đang mở, Đã khóa sổ điểm)', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    expect(text()).toContain('Đang mở');
    expect(text()).toContain('Đã khóa sổ điểm');
  });

  it('chỉ ADMIN hoặc PROGRAM_MANAGER thấy nút "Thêm lớp"; LECTURER không thấy (ẩn nút chỉ để tiện dùng)', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(text()).not.toContain('Thêm lớp');
    expect(fixture.componentInstance.canCreate()).toBe(false);
  });

  it('PROGRAM_MANAGER thấy nút "Thêm lớp" và không tải danh sách người dùng (API chỉ cho ADMIN)', async () => {
    await setup([SystemConstant.ROLE.PROGRAM_MANAGER]);
    expect(text()).toContain('Thêm lớp');
    expect(userSvc.filter).not.toHaveBeenCalled();
    expect(fixture.componentInstance.lecturerListAvailable()).toBe(false);
  });

  it('trạng thái rỗng: hướng dẫn việc kế tiếp theo vai trò', async () => {
    await setup([SystemConstant.ROLE.ADMIN], []);
    expect(text()).toContain('Chưa có lớp học phần nào khớp bộ lọc');
    expect(text()).toContain('Thêm lớp đầu tiên');
  });

  it('trạng thái rỗng của giảng viên không có nút tạo mà nói rõ chỉ thấy lớp mình', async () => {
    await setup([SystemConstant.ROLE.LECTURER], []);
    expect(text()).not.toContain('Thêm lớp đầu tiên');
    expect(text()).toContain('chỉ thấy các lớp mình phụ trách');
  });

  it('403: hiện trạng thái hết quyền, không hiện bảng', async () => {
    await setup([SystemConstant.ROLE.VIEWER]);
    sectionSvc.getSections.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 403, error: { status: 403, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập tài nguyên này' },
    })));
    fixture.componentInstance.loadSections();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()?.kind).toBe('FORBIDDEN');
    expect(text()).toContain('Không đủ quyền');
    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
  });

  it('lỗi mạng: có nút Thử lại gọi lại API', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    sectionSvc.getSections.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    fixture.componentInstance.loadSections();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()?.retryable).toBe(true);
    sectionSvc.getSections.mockReturnValue(of(sections));
    fixture.componentInstance.loadSections();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBeNull();
    expect(text()).toContain('TEST101-01');
  });

  it('lọc theo học kỳ và học phần gọi lại API với đúng tham số', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    fixture.componentInstance.termFilter.set('t1');
    fixture.componentInstance.courseFilter.set('c1');
    fixture.componentInstance.applyFilters();
    expect(sectionSvc.getSections).toHaveBeenLastCalledWith('t1', 'c1');
  });

  it('tìm mã lớp chỉ lọc phần hiển thị, không gọi lại API', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    const calls = sectionSvc.getSections.mock.calls.length;
    fixture.componentInstance.codeSearch.set('-02');
    fixture.detectChanges();
    expect(fixture.componentInstance.visibleSections().map(s => s.code)).toEqual(['TEST101-02']);
    expect(sectionSvc.getSections.mock.calls.length).toBe(calls);
  });
});

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
import { EnrollmentService } from '@services/course/enrollment.service';
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
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
    {
      id: 'sec1',
      code: 'TEST101-01',
      courseId: 'c1',
      syllabusId: 's1',
      termId: 't1',
      lecturerIds: ['u1'],
      lecturers: [{ id: 'u1', username: 'gv.test01', fullName: 'GV Thử' }],
      enrolledCount: 45,
      status: 'OPEN',
    },
    {
      id: 'sec2',
      code: 'TEST101-02',
      courseId: 'c1',
      syllabusId: 's1',
      termId: 't1',
      lecturerIds: ['u_locked'],
      lecturers: [{ id: 'u_locked', username: 'gv.locked', fullName: 'GV Đã Khóa' }],
      enrolledCount: 0,
      status: 'LOCKED',
    },
  ];

  const paged = <T>(content: T[], page = 0, size = 20, totalElements = content.length) => ({
    content,
    page,
    size,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
    last: (page + 1) * size >= totalElements,
  });

  const sectionSvc = {
    getSections: vi.fn(),
    getSection: vi.fn((id: string) => of(sections.find(s => s.id === id) ?? sections[0])),
    getLecturers: vi.fn(() => of([
      { id: 'u1', username: 'gv.khoa', fullName: 'GV Khoa Thử', email: 'a@test.local', status: 'ACTIVE', createdAt: '', updatedAt: '', roles: ['LECTURER'] },
    ])),
    downloadImportTemplate: vi.fn(() => of(new Blob([''], { type: 'text/csv' }))),
    importSections: vi.fn(),
  };
  const enrollmentSvc = {
    downloadBulkImportTemplate: vi.fn(() => of(new Blob([''], { type: 'text/csv' }))),
    importEnrollmentsBulk: vi.fn(),
  };
  const termSvc = {
    getTerms: vi.fn(() => of(paged([term]))),
    getTermById: vi.fn(() => of(term)),
  };
  const courseSvc = {
    getCourses: vi.fn(() => of(paged([course]))),
    getCourseById: vi.fn(() => of(course)),
  };
  const syllabusSvc = { getSyllabusById: vi.fn(() => of(syllabus)), getSyllabiByCourse: vi.fn(() => of([syllabus])) };
  const authSvc = { getRoles: vi.fn<() => string[]>(), getUserId: vi.fn(() => 'u1'), getNameOfLogin: vi.fn(() => 'Nguyễn Văn Thử') };

  async function setup(roles: string[], list: ISection[] = sections): Promise<void> {
    sectionSvc.getSections.mockReset();
    sectionSvc.getLecturers.mockClear();
    sectionSvc.getLecturers.mockReturnValue(of([
      { id: 'u1', username: 'gv.khoa', fullName: 'GV Khoa Thử', email: 'a@test.local', status: 'ACTIVE', createdAt: '', updatedAt: '', roles: ['LECTURER'] },
    ]));
    sectionSvc.getSections.mockReturnValue(of(paged(list)));
    authSvc.getRoles.mockReturnValue(roles);
    await TestBed.configureTestingModule({
      imports: [ListSectionsComponent],
      providers: [
        provideRouter([]),
        { provide: SectionService, useValue: sectionSvc },
        { provide: EnrollmentService, useValue: enrollmentSvc },
        { provide: TermService, useValue: termSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: SyllabusService, useValue: syllabusSvc },
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

  it('US-19/AC-4: hiển thị lớp với tên học phần, học kỳ, đề cương và họ tên giảng viên trực tiếp từ section.lecturers', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    expect((fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Lớp học"]')).toBeNull();
    expect(text()).toContain('TEST101-01');
    expect(text()).toContain('TEST101');
    expect(text()).toContain('Học phần thử nghiệm');
    expect(text()).toContain('2026-HK1');
    expect(text()).toContain('Bản 1');
    expect(text()).toContain('GV Thử');
    expect(text()).toContain('GV Đã Khóa');
    expect(text()).not.toContain('gv.test01');
    expect(sectionSvc.getLecturers).toHaveBeenCalled();
    expect(fixture.componentInstance.lecturerListAvailable()).toBe(true);
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

  it('LECTURER xem được lớp mình phụ trách, KHÔNG gọi sectionSvc.getLecturers() (tránh 403), và ẩn nút tạo/import lớp', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(sectionSvc.getLecturers).not.toHaveBeenCalled();
    expect(text()).toContain('TEST101-01');
    expect(text()).toContain('GV Thử');
    expect(text()).not.toContain('Thêm lớp');
    expect(text()).not.toContain('Import Lớp học phần');
    expect(fixture.componentInstance.canCreate()).toBe(false);
    expect(fixture.componentInstance.lecturerListAvailable()).toBe(false);
  });

  it('PROGRAM_MANAGER thấy nút "Thêm lớp" & "Import Lớp học phần", và gọi sectionSvc.getLecturers()', async () => {
    await setup([SystemConstant.ROLE.PROGRAM_MANAGER]);
    expect(text()).toContain('Thêm lớp');
    expect(text()).toContain('Import Lớp học phần');
    expect(sectionSvc.getLecturers).toHaveBeenCalled();
    expect(text()).toContain('GV Thử');
    expect(fixture.componentInstance.lecturerListAvailable()).toBe(true);
  });

  it('LECTURER fallback sang username khi fullName trống và fallback currentUserName khi section.lecturers rỗng', async () => {
    await setup([SystemConstant.ROLE.LECTURER], [
      {
        id: 'sec_u',
        code: 'TEST101-03',
        courseId: 'c1',
        syllabusId: 's1',
        termId: 't1',
        lecturerIds: ['u2'],
        lecturers: [{ id: 'u2', username: 'gv.fallback', fullName: '' }],
        status: 'OPEN',
      },
      {
        id: 'sec_me',
        code: 'TEST101-04',
        courseId: 'c1',
        syllabusId: 's1',
        termId: 't1',
        lecturerIds: ['u1'],
        status: 'OPEN',
      },
    ]);
    expect(sectionSvc.getLecturers).not.toHaveBeenCalled();
    expect(text()).toContain('gv.fallback');
    expect(text()).toContain('Nguyễn Văn Thử');
  });

  it('QA không gọi sectionSvc.getLecturers() và không thấy nút tạo/import lớp', async () => {
    await setup([SystemConstant.ROLE.QA]);
    expect(sectionSvc.getLecturers).not.toHaveBeenCalled();
    expect(text()).not.toContain('Thêm lớp');
    expect(text()).not.toContain('Import Lớp học phần');
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
    await setup([SystemConstant.ROLE.QA]);
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
    sectionSvc.getSections.mockReturnValue(of(paged(sections)));
    fixture.componentInstance.loadSections();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBeNull();
    expect(text()).toContain('TEST101-01');
  });

  it('lọc theo học kỳ, học phần, chuyển trang và tìm mã lớp server-side (debounce 300ms)', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    vi.useFakeTimers();
    try {
      sectionSvc.getSections.mockClear();

      fixture.componentInstance.onTermFilterChange('t1');
      expect(sectionSvc.getSections).toHaveBeenLastCalledWith('t1', undefined, undefined, 0, 20);

      fixture.componentInstance.onCourseFilterChange('c1');
      expect(sectionSvc.getSections).toHaveBeenLastCalledWith('t1', 'c1', undefined, 0, 20);

      fixture.componentInstance.onPageIndexChange(2);
      expect(sectionSvc.getSections).toHaveBeenLastCalledWith('t1', 'c1', undefined, 1, 20);

      fixture.componentInstance.onCodeSearchChange('-02');
      await vi.advanceTimersByTimeAsync(350);
      expect(sectionSvc.getSections).toHaveBeenLastCalledWith('t1', 'c1', '-02', 0, 20);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hướng dẫn import ghi danh nhiều lớp nêu rõ yêu cầu ADMIN import trước và trạng thái ACTIVE', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    const guide = fixture.componentInstance.bulkEnrollmentGuideText;
    expect(guide).toContain('ADMIN');
    expect(guide).toContain('ACTIVE');
    expect(guide).toContain('SUSPENDED');
    expect(guide).toContain('GRADUATED');
    expect(guide).toContain('DROPPED_OUT');
  });
});

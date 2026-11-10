import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IEnrollment, IEnrollmentList, ISection } from '@models/course/section.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { EnrollmentService } from '@services/course/enrollment.service';
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { UserService } from '@services/user/user.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { DetailSectionComponent } from './detail-section.component';

/** DỮ LIỆU THỬ NGHIỆM: mã sinh viên SV-xxxx, ID và học phần là dữ liệu giả. */
describe('DetailSectionComponent (F05a US-19, US-20)', () => {
  let fixture: ComponentFixture<DetailSectionComponent>;
  let component: DetailSectionComponent;

  const section: ISection = {
    id: 'sec1', code: 'TEST101-01', courseId: 'c1', syllabusId: 's1', termId: 't1',
    lecturerIds: ['u1'], enrolledCount: 3, status: 'OPEN',
  };
  const enrollment = (id: string, ref: string, status: IEnrollment['status']): IEnrollment => ({
    id, sectionId: 'sec1', studentId: `st-${id}`, studentRef: ref, status, enrolledAt: '2026-09-07T00:00:00Z',
  });
  // 3 đang học, 2 đã rút: số liệu tự đặt để kiểm tra hiển thị đúng giá trị API, không phải kết quả đo thật
  const roster: IEnrollmentList = {
    sectionId: 'sec1', enrolled: 3, withdrawn: 2,
    enrollments: [
      enrollment('e1', 'SV-0001', 'ENROLLED'), enrollment('e2', 'SV-0002', 'ENROLLED'), enrollment('e3', 'SV-0003', 'ENROLLED'),
      enrollment('e4', 'SV-0004', 'WITHDRAWN'), enrollment('e5', 'SV-0005', 'WITHDRAWN'),
    ],
  };

  const sectionSvc = { getSection: vi.fn(), updateStatus: vi.fn(), updateLecturers: vi.fn() };
  const enrollmentSvc = { getEnrollments: vi.fn(), updateStatus: vi.fn() };
  const termSvc = { getTermById: vi.fn() };
  const courseSvc = { getCourseById: vi.fn(() => of({ id: 'c1', code: 'TEST101', name: 'Học phần thử nghiệm' })) };
  const syllabusSvc = { getSyllabusById: vi.fn(() => of({ id: 's1', courseId: 'c1', version: '1', status: 'CONFIRMED' })) };
  const userSvc = { filter: vi.fn(() => of({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0, last: true })) };
  const authSvc = { getRoles: vi.fn<() => string[]>(), getUserId: vi.fn(() => 'u1') };
  const alertSvc = { success: vi.fn(), error: vi.fn() };

  async function setup(
    roles: string[],
    opts: { section?: ISection; roster?: IEnrollmentList; termStatus?: 'OPEN' | 'SCORE_LOCKED' | 'CLOSED'; } = {},
  ): Promise<void> {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue(roles);
    sectionSvc.getSection.mockReturnValue(of(opts.section ?? section));
    enrollmentSvc.getEnrollments.mockReturnValue(of(opts.roster ?? roster));
    termSvc.getTermById.mockReturnValue(of({ id: 't1', code: '2026-HK1', status: opts.termStatus ?? 'OPEN' }));
    await TestBed.configureTestingModule({
      imports: [DetailSectionComponent],
      providers: [
        provideRouter([]),
        { provide: SectionService, useValue: sectionSvc },
        { provide: EnrollmentService, useValue: enrollmentSvc },
        { provide: TermService, useValue: termSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: SyllabusService, useValue: syllabusSvc },
        { provide: UserService, useValue: userSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DetailSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sectionId', 'sec1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttonByLabel = (label: string): HTMLButtonElement | undefined => Array.from(el().querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === label || b.getAttribute('aria-label') === label);

  it('US-20/AC-4: hiển thị mẫu số và số đã rút đúng giá trị API (3 đang học, 2 đã rút)', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    expect(el().textContent).toContain('đang học, là mẫu số của tỷ lệ đạt');
    const figures = Array.from(el().querySelectorAll('p.text-3xl')).map(p => (p.textContent ?? '').trim());
    expect(figures).toEqual(['3', '2']);
  });

  it('lớp chưa có bản ghi ghi danh: hiện "—" và giải thích chưa có mẫu số, không hiện 0', async () => {
    await setup([SystemConstant.ROLE.ADMIN], { roster: { sectionId: 'sec1', enrolled: 0, withdrawn: 0, enrollments: [] } });
    expect(component.hasNoRoster()).toBe(true);
    expect(el().textContent).toContain('Chưa nhập danh sách lớp, nên chưa có mẫu số');
    expect(el().querySelectorAll('p.text-3xl').length).toBe(0);
  });

  it('biên: có sinh viên nhưng tất cả đã rút thì hiện số 0 thật (khác với chưa nhập danh sách)', async () => {
    await setup([SystemConstant.ROLE.ADMIN], {
      roster: { sectionId: 'sec1', enrolled: 0, withdrawn: 1, enrollments: [enrollment('e4', 'SV-0004', 'WITHDRAWN')] },
    });
    expect(component.hasNoRoster()).toBe(false);
    expect(Array.from(el().querySelectorAll('p.text-3xl')).map(p => (p.textContent ?? '').trim())).toEqual(['0', '1']);
  });

  it('lọc danh sách theo Đang học / Đã rút ở phía hiển thị', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    component.rosterFilter.set('WITHDRAWN');
    expect(component.visibleEnrollments().map(e => e.studentRef)).toEqual(['SV-0004', 'SV-0005']);
    component.rosterFilter.set('ENROLLED');
    expect(component.visibleEnrollments().length).toBe(3);
  });

  it('giảng viên của lớp rút sinh viên: gọi API đổi sang WITHDRAWN rồi tải lại số đếm', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    enrollmentSvc.updateStatus.mockReturnValue(of(enrollment('e1', 'SV-0001', 'WITHDRAWN')));
    component.changeEnrollment(roster.enrollments[0], 'WITHDRAWN');
    expect(enrollmentSvc.updateStatus).toHaveBeenCalledWith('e1', 'WITHDRAWN');
    expect(enrollmentSvc.getEnrollments).toHaveBeenCalledTimes(2);
  });

  it('ẩn thao tác rút/ghi danh lại và nhập danh sách với vai trò không phải ADMIN hoặc giảng viên của lớp', async () => {
    await setup([SystemConstant.ROLE.VIEWER]);
    expect(component.canEditRoster()).toBe(false);
    expect(buttonByLabel('Rút SV-0001 khỏi lớp')).toBeUndefined();
    expect(el().textContent).not.toContain('Nhập danh sách lớp');
  });

  it('giảng viên không phụ trách lớp này không có quyền sửa danh sách (userId không nằm trong lecturerIds)', async () => {
    await setup([SystemConstant.ROLE.LECTURER], { section: { ...section, lecturerIds: ['other'] } });
    expect(component.canEditRoster()).toBe(false);
    component.currentUserId.set('other');
    expect(component.canEditRoster()).toBe(true);
  });

  it('lớp đã đóng: nút Rút bị vô hiệu hóa và giải thích vì sao (mẫu số bị đóng băng)', async () => {
    await setup([SystemConstant.ROLE.ADMIN], { section: { ...section, status: 'CLOSED' } });
    expect(component.frozenReason()).toContain('đóng băng');
    expect(el().textContent).toContain('đóng băng');
    expect(buttonByLabel('Rút SV-0001 khỏi lớp')?.disabled).toBe(true);
    expect(buttonByLabel('Nhập danh sách lớp')?.disabled).toBe(true);
  });

  it('học kỳ đã khóa sổ điểm: danh sách ghi danh bị đóng băng dù lớp còn OPEN', async () => {
    await setup([SystemConstant.ROLE.ADMIN], { termStatus: 'SCORE_LOCKED' });
    expect(component.frozenReason()).toContain('2026-HK1');
    expect(buttonByLabel('Ghi danh lại SV-0004')?.disabled).toBe(true);
  });

  it('lỗi 422 khi rút (ví dụ lớp vừa bị đóng bởi người khác): hiện thông điệp backend, không đổi dữ liệu', async () => {
    await setup([SystemConstant.ROLE.ADMIN]);
    enrollmentSvc.updateStatus.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Không thể đổi danh sách ghi danh vì lớp đang ở trạng thái CLOSED' },
    })));
    component.changeEnrollment(roster.enrollments[0], 'WITHDRAWN');
    fixture.detectChanges();
    expect(component.actionError()).toContain('lớp đang ở trạng thái CLOSED');
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('lớp đang ở trạng thái CLOSED');
    expect(enrollmentSvc.getEnrollments).toHaveBeenCalledTimes(1);
  });

  it('403 khi tải lớp: hiện trạng thái hết quyền và không hiện dữ liệu', async () => {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.VIEWER]);
    sectionSvc.getSection.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 403, error: { status: 403, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập tài nguyên này' },
    })));
    await TestBed.configureTestingModule({
      imports: [DetailSectionComponent],
      providers: [
        provideRouter([]),
        { provide: SectionService, useValue: sectionSvc },
        { provide: EnrollmentService, useValue: enrollmentSvc },
        { provide: TermService, useValue: termSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: SyllabusService, useValue: syllabusSvc },
        { provide: UserService, useValue: userSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DetailSectionComponent);
    fixture.componentRef.setInput('sectionId', 'sec1');
    fixture.detectChanges();
    expect(el().textContent).toContain('Không đủ quyền');
    expect(el().textContent).not.toContain('Danh sách ghi danh');
  });

  describe('đổi trạng thái lớp (US-19)', () => {
    it('mở lại lớp LOCKED mà thiếu lý do: báo lỗi, không gọi API', async () => {
      await setup([SystemConstant.ROLE.ADMIN], { section: { ...section, status: 'LOCKED' } });
      component.openStatusModal();
      component.targetStatus.set('OPEN');
      component.submitStatus();
      expect(component.statusError()).toContain('lý do');
      expect(sectionSvc.updateStatus).not.toHaveBeenCalled();
    });

    it('mở lại lớp LOCKED có lý do: gửi status và reason đã cắt khoảng trắng', async () => {
      await setup([SystemConstant.ROLE.ADMIN], { section: { ...section, status: 'LOCKED' } });
      sectionSvc.updateStatus.mockReturnValue(of({ ...section, status: 'OPEN' }));
      component.openStatusModal();
      component.targetStatus.set('OPEN');
      component.statusReason.set('  Sửa điểm nhập sai  ');
      component.submitStatus();
      expect(sectionSvc.updateStatus).toHaveBeenCalledWith('sec1', { status: 'OPEN', reason: 'Sửa điểm nhập sai' });
      expect(component.section()?.status).toBe('OPEN');
    });

    it('đóng lớp đang OPEN không cần lý do và không gửi reason', async () => {
      await setup([SystemConstant.ROLE.ADMIN]);
      sectionSvc.updateStatus.mockReturnValue(of({ ...section, status: 'CLOSED' }));
      component.openStatusModal();
      component.targetStatus.set('CLOSED');
      component.submitStatus();
      expect(sectionSvc.updateStatus).toHaveBeenCalledWith('sec1', { status: 'CLOSED' });
    });

    it('chỉ ADMIN hoặc PROGRAM_MANAGER thấy nút đổi trạng thái và đổi giảng viên', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      expect(component.canManage()).toBe(false);
      expect(buttonByLabel('Đổi trạng thái lớp')).toBeUndefined();
    });
  });
});

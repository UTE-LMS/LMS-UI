import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentStatus, IAssessment } from '@models/assessment/assessment.model';
import { ISection } from '@models/course/section.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ListAssessmentsComponent } from './list-assessments.component';

/** DỮ LIỆU THỬ NGHIỆM: ID, mã bài và ghi chú giả. */
describe('ListAssessmentsComponent (F04 US-15, NEW-01)', () => {
  let fixture: ComponentFixture<ListAssessmentsComponent>;
  let component: ListAssessmentsComponent;

  const section: ISection = {
    id: 'sec1', code: 'TEST101-01', courseId: 'c1', syllabusId: 'syl1', termId: 't1', lecturerIds: ['u1'], enrolledCount: 3, status: 'OPEN',
  };
  const make = (id: string, name: string, status: AssessmentStatus, extra: Partial<IAssessment> = {}): IAssessment => ({
    id, syllabusId: 'syl1', sectionId: 'sec1', code: id.toUpperCase(), name, scope: 'SECTION', dataGranularity: 'ITEM',
    measurableByOutcome: true, status, locked: ['APPROVED', 'SCORE_ENTERED', 'LOCKED'].includes(status),
    items: [{ code: 'C1', kind: 'QUESTION', maxScore: 5, outcomeMappings: [{ cloId: 'x', weight: 1 }] }], totalPoints: 10, ...extra,
  });
  const list: IAssessment[] = [
    make('gk', 'Giữa kỳ', 'SCORE_ENTERED'),
    make('th', 'Thực hành', 'SUBMITTED'),
    make('ck', 'Cuối kỳ', 'DRAFT'),
    make('kt', 'Kiểm tra nhanh 1', 'REJECTED', { approval: { reviewNote: 'Câu 2 chưa gắn CLO' } }),
  ];
  const template: IAssessment = make('tpl', 'Khung giữa kỳ', 'DRAFT', { scope: 'SYLLABUS_TEMPLATE', sectionId: null });

  const assessmentSvc = { getSectionAssessments: vi.fn(), getTemplates: vi.fn() };
  const sectionSvc = { getSection: vi.fn() };
  const courseSvc = { getCourseById: vi.fn(() => of({ id: 'c1', code: 'TEST101', name: 'Học phần thử nghiệm' })) };
  const authSvc = { getRoles: vi.fn<() => string[]>(), getUserId: vi.fn(() => 'u1') };

  async function setup(roles: string[], input: { sectionId?: string; syllabusId?: string; } = { sectionId: 'sec1' }): Promise<void> {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue(roles);
    sectionSvc.getSection.mockReturnValue(of(section));
    assessmentSvc.getSectionAssessments.mockReturnValue(of(list));
    assessmentSvc.getTemplates.mockReturnValue(of([template]));
    await TestBed.configureTestingModule({
      imports: [ListAssessmentsComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentService, useValue: assessmentSvc },
        { provide: SectionService, useValue: sectionSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListAssessmentsComponent);
    component = fixture.componentInstance;
    if (input.sectionId) {
      fixture.componentRef.setInput('sectionId', input.sectionId);
    }
    if (input.syllabusId) {
      fixture.componentRef.setInput('syllabusId', input.syllabusId);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rowText = (name: string): string => Array.from(el().querySelectorAll('tbody tr.ant-table-row')).map(r => (r.textContent ?? '').replace(/\s+/g, ' ')).find(t => t.includes(name)) ?? '';

  it('hiển thị trạng thái bằng chữ và giải thích cột Cấu trúc cho từng bài', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(rowText('Giữa kỳ')).toContain('Đã nhập điểm');
    expect(rowText('Giữa kỳ')).toContain('Đã khóa, chỉ xem');
    expect(rowText('Thực hành')).toContain('Đã gửi duyệt');
    expect(rowText('Thực hành')).toContain('Chờ Trưởng bộ môn duyệt');
    expect(rowText('Cuối kỳ')).toContain('Nháp');
    expect(rowText('Cuối kỳ')).toContain('Sửa được');
    expect(rowText('Kiểm tra nhanh 1')).toContain('Bị từ chối');
    expect(rowText('Kiểm tra nhanh 1')).toContain('"Câu 2 chưa gắn CLO"');
  });

  it('nhãn thao tác theo trạng thái: Mở (Nháp), Sửa (Bị từ chối), Xem (đã khóa)', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(component.actionFor(list[2]).label).toBe('Mở');
    expect(component.actionFor(list[3]).label).toBe('Sửa');
    expect(component.actionFor(list[0]).label).toBe('Xem');
    expect(component.actionFor(list[1]).label).toBe('Xem');
  });

  it('NEW-01: Trưởng bộ môn thấy nút "Duyệt" cho bài chờ duyệt và nhắc số bài đang chờ', async () => {
    await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
    expect(component.actionFor(list[1])).toEqual({ label: 'Duyệt', link: '/mng/assessments/th/review' });
    expect(el().textContent).toContain('Có 1 bài đang chờ bạn duyệt');
    expect(component.canCreate()).toBe(false);
  });

  it('giảng viên không thấy lời nhắc chờ duyệt và nhãn của bài chờ duyệt là "Xem"', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(el().textContent).not.toContain('đang chờ bạn duyệt');
    expect(component.actionFor(list[1]).label).toBe('Xem');
  });

  it('chỉ giảng viên phụ trách lớp thấy nút tạo bài; vai trò khác và giảng viên khác lớp không thấy', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(component.canCreate()).toBe(true);
    expect(el().textContent).toContain('Bài mới');
    component.currentUserId.set('another');
    expect(component.canCreate()).toBe(false);
  });

  it('VIEWER không có nút tạo', async () => {
    await setup([SystemConstant.ROLE.VIEWER]);
    expect(component.canCreate()).toBe(false);
    expect(el().textContent).not.toContain('Bài mới');
  });

  it('có khung thì hiện nút "Tạo từ khung mẫu" và liệt kê khung trong mục khung theo đề cương', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(el().textContent).toContain('Tạo từ khung mẫu');
    expect(el().textContent).toContain('Khung giữa kỳ');
  });

  it('trạng thái rỗng của lớp: giảng viên có nút tạo, vai trò khác được giải thích', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    assessmentSvc.getSectionAssessments.mockReturnValue(of([]));
    component.load();
    fixture.detectChanges();
    expect(el().textContent).toContain('Lớp chưa có bài đánh giá nào');
    expect(el().textContent).toContain('Tạo bài đầu tiên');

    component.roles.set([SystemConstant.ROLE.VIEWER]);
    fixture.detectChanges();
    expect(el().textContent).not.toContain('Tạo bài đầu tiên');
    expect(el().textContent).toContain('Chỉ giảng viên phụ trách lớp');
  });

  it('403 khi tải: hiện trạng thái hết quyền, không hiện bảng', async () => {
    await setup([SystemConstant.ROLE.VIEWER]);
    assessmentSvc.getSectionAssessments.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 403, error: { status: 403, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập tài nguyên này' },
    })));
    component.load();
    fixture.detectChanges();
    expect(component.loadError()?.kind).toBe('FORBIDDEN');
    expect(el().textContent).toContain('Không đủ quyền');
    expect(el().querySelector('table')).toBeNull();
  });

  it('lỗi khung (403) không chặn danh sách bài của lớp', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    assessmentSvc.getTemplates.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.load();
    fixture.detectChanges();
    expect(component.loadError()).toBeNull();
    expect(component.templates()).toEqual([]);
    expect(rowText('Cuối kỳ')).toContain('Nháp');
  });

  it('chế độ khung theo đề cương: chỉ tải khung, không tải lớp, và cho LECTURER/DEPARTMENT_HEAD soạn', async () => {
    await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], { syllabusId: 'syl1' });
    expect(component.mode()).toBe('TEMPLATE');
    expect(sectionSvc.getSection).not.toHaveBeenCalled();
    expect(assessmentSvc.getTemplates).toHaveBeenCalledWith('syl1');
    expect(rowText('Khung giữa kỳ')).toContain('Sửa được');
    expect(component.canCreate()).toBe(true);
    expect(el().textContent).toContain('Khung mới');
  });

  it('bài chỉ có điểm tổng (TOTAL_ONLY) được ghi chú không đo được CLO/PI', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    assessmentSvc.getSectionAssessments.mockReturnValue(of([make('tong', 'Điểm tổng', 'DRAFT', { measurableByOutcome: false, dataGranularity: 'TOTAL_ONLY' })]));
    component.load();
    fixture.detectChanges();
    expect(rowText('Điểm tổng')).toContain('không đo được CLO/PI');
  });

  it('thiếu tổng điểm hiện "—", không phải 0', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    assessmentSvc.getSectionAssessments.mockReturnValue(of([make('x', 'Chưa có điểm', 'DRAFT', { totalPoints: null })]));
    component.load();
    fixture.detectChanges();
    const cells = Array.from(el().querySelectorAll('tbody tr.ant-table-row td')).map(td => (td.textContent ?? '').trim());
    expect(cells).toContain('—');
  });
});

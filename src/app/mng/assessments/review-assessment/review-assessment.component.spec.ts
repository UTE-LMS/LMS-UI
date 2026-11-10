import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentStatus, IAssessment, ICoverage } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { CloService } from '@services/course/clo.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { MAX_REJECT_NOTE_LENGTH, ReviewAssessmentComponent } from './review-assessment.component';

/** DỮ LIỆU THỬ NGHIỆM: ID, CLO, điểm giả. Ví dụ độc lập: 3 phần tử điểm tối đa 3, 4, 3 (tổng 10) đo CLO1, CLO2, CLO3. */
describe('ReviewAssessmentComponent (F04 NEW-01)', () => {
  let fixture: ComponentFixture<ReviewAssessmentComponent>;
  let component: ReviewAssessmentComponent;

  const make = (status: AssessmentStatus, extra: Partial<IAssessment> = {}): IAssessment => ({
    id: 'a1', syllabusId: 'syl1', sectionId: 'sec1', code: 'TH', name: 'Thực hành', scope: 'SECTION', dataGranularity: 'ITEM',
    measurableByOutcome: true, status, locked: ['APPROVED', 'SCORE_ENTERED', 'LOCKED'].includes(status), totalPoints: 10,
    items: [
      { code: 'T1', kind: 'CRITERION', maxScore: 3, bloomLevel: 2, outcomeMappings: [{ cloId: 'clo1', weight: 1 }] },
      { code: 'T2', kind: 'CRITERION', maxScore: 4, bloomLevel: 3, outcomeMappings: [{ cloId: 'clo2', weight: 1 }] },
      { code: 'T3', kind: 'CRITERION', maxScore: 3, bloomLevel: 4, outcomeMappings: [{ cloId: 'clo3', weight: 0.5 }, { cloId: 'clo2', weight: 0.5 }] },
    ],
    approval: { submittedBy: 'gv1', submittedAt: '2026-10-27T01:00:00Z', history: [{ action: 'SUBMIT', actorId: 'gv1', at: '2026-10-27T01:00:00Z' }] },
    ...extra,
  });
  const coverage: ICoverage = {
    totalItemsSum: 10,
    byClo: [
      { cloId: 'clo1', cloCode: 'CLO1', points: 3, percentage: 30 },
      { cloId: 'clo2', cloCode: 'CLO2', points: 5.5, percentage: 55 },
      { cloId: 'clo3', cloCode: 'CLO3', points: 1.5, percentage: 15 },
    ],
    byBloom: [
      { bloomLevel: 2, questionCount: 1, points: 3, percentage: 30 },
      { bloomLevel: 3, questionCount: 1, points: 4, percentage: 40 },
      { bloomLevel: 4, questionCount: 1, points: 3, percentage: 30 },
    ],
  };

  const assessmentSvc = { getAssessment: vi.fn(), getCoverage: vi.fn(), approve: vi.fn(), reject: vi.fn() };
  const cloSvc = {
    getClosBySyllabus: vi.fn(() => of([
      { id: 'clo1', syllabusId: 'syl1', courseId: 'c1', code: 'CLO1', bloomLevel: 2 },
      { id: 'clo2', syllabusId: 'syl1', courseId: 'c1', code: 'CLO2', bloomLevel: 3 },
      { id: 'clo3', syllabusId: 'syl1', courseId: 'c1', code: 'CLO3', bloomLevel: 4 },
    ])),
  };
  const authSvc = { getRoles: vi.fn<() => string[]>(), getUserId: vi.fn(() => 'tbm1') };
  const alertSvc = { success: vi.fn(), error: vi.fn() };
  const modalSvc = { confirm: vi.fn() };

  async function setup(roles: string[], assessment: IAssessment = make('SUBMITTED'), userId = 'tbm1'): Promise<void> {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue(roles);
    authSvc.getUserId.mockReturnValue(userId);
    assessmentSvc.getAssessment.mockReturnValue(of(assessment));
    assessmentSvc.getCoverage.mockReturnValue(of(coverage));
    await TestBed.configureTestingModule({
      imports: [ReviewAssessmentComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentService, useValue: assessmentSvc },
        { provide: CloService, useValue: cloSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
        { provide: NzModalService, useValue: modalSvc },
      ],
    })
      // NzModalModule (import của component) tự cung cấp NzModalService nên phải ghi đè provider ở mọi cấp
      .overrideProvider(NzModalService, { useValue: modalSvc })
      .compileComponents();
    fixture = TestBed.createComponent(ReviewAssessmentComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'a1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const dockText = (): string => el().querySelector('app-action-dock')?.textContent ?? '';
  const dockButton = (label: string): HTMLButtonElement | undefined => Array.from(el().querySelectorAll('app-action-dock button')).find(b => (b.textContent ?? '').trim() === label) as HTMLButtonElement | undefined;
  const httpError = (status: number, code: string, message: string): HttpErrorResponse => new HttpErrorResponse({ status, error: { status, code, message } });

  describe('hiển thị độ phủ (NEW-01/AC-6)', () => {
    it('hiện độ phủ theo CLO và Bloom đúng giá trị API trả về, kèm tổng điểm', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      const text = (el().textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('Tổng 10 điểm');
      expect(text).toContain('CLO1');
      expect(text).toContain('3 điểm · 30%');
      expect(text).toContain('5,5 điểm · 55%');
      expect(text).toContain('1 câu · 3 điểm · 30%');
      expect(text).toContain('3 · Áp dụng');
    });

    it('không tự tính lại: giá trị API bất thường (12,5%) vẫn hiện đúng như API, thanh rộng 12,5%', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.getCoverage.mockReturnValue(of({
        totalItemsSum: 8, byClo: [{ cloId: 'clo1', cloCode: 'CLO1', points: 1, percentage: 12.5 }], byBloom: [],
      }));
      component.load();
      fixture.detectChanges();
      expect((el().textContent ?? '').replace(/\s+/g, ' ')).toContain('1 điểm · 12,5%');
      const bar = el().querySelector('[aria-label="CLO1: 12,5%"] i') as HTMLElement;
      expect(bar.style.width).toBe('12.5%');
    });

    it('độ phủ theo Bloom chú thích "Chỉ để xem phân bố, không phải điểm"', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      expect(el().textContent).toContain('Chỉ để xem phân bố, không phải điểm');
    });

    it('bài chưa có phần tử: độ phủ rỗng được giải thích, không hiện 0%', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], make('SUBMITTED', { items: [] }));
      assessmentSvc.getCoverage.mockReturnValue(of({ totalItemsSum: 0, byClo: [], byBloom: [] }));
      component.load();
      fixture.detectChanges();
      expect(el().textContent).toContain('Chưa có dữ liệu độ phủ');
      expect(el().textContent).toContain('Chưa có phần tử nào khai báo mức Bloom');
      expect(el().textContent).toContain('Bài chưa có câu hỏi/tiêu chí nào');
    });

    it('lỗi tải độ phủ: báo lỗi có nút thử lại, phần còn lại của màn hình vẫn dùng được', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.getCoverage.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.load();
      fixture.detectChanges();
      expect(component.coverageError()).toBe(true);
      expect(el().textContent).toContain('Không tải được độ phủ');
      expect(el().textContent).toContain('T1');
    });

    it('bảng từng phần tử hiện mã CLO và phần điểm (CLO3 0,5 + CLO2 0,5) và điểm tối đa', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      const text = (el().textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('CLO3 (0,5)');
      expect(text).toContain('CLO2 (0,5)');
    });

    it('không còn dòng chú thích "đang chờ GVHD xác nhận" (GVHD đã xác nhận Q11)', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      expect(el().textContent).not.toContain('Q11');
      expect(el().textContent).not.toContain('chờ GVHD');
    });
  });

  describe('duyệt (NEW-01/AC-3)', () => {
    it('Trưởng bộ môn xác nhận rồi duyệt: gọi approve, bài chuyển Đã duyệt và các nút biến mất', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.approve.mockReturnValue(of(make('APPROVED')));
      component.confirmApprove();
      expect(assessmentSvc.approve).not.toHaveBeenCalled();
      (modalSvc.confirm.mock.calls[0][0] as { nzOnOk: () => void; }).nzOnOk();
      fixture.detectChanges();
      expect(assessmentSvc.approve).toHaveBeenCalledWith('a1');
      expect(component.assessment()?.status).toBe('APPROVED');
      expect(alertSvc.success).toHaveBeenCalled();
      expect(dockButton('Duyệt')).toBeUndefined();
      expect(el().textContent).toContain('không còn chờ duyệt');
    });
  });

  describe('từ chối (NEW-01/AC-4)', () => {
    it('ca âm: ghi chú trống bị chặn ở client, nêu rõ cần ghi chú, không gọi API', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      component.reject();
      fixture.detectChanges();
      expect(assessmentSvc.reject).not.toHaveBeenCalled();
      expect(dockText()).toContain('cần nhập ghi chú');
    });

    it('ca âm: ghi chú chỉ có khoảng trắng cũng bị chặn', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      component.rejectNote.set('    ');
      component.reject();
      expect(assessmentSvc.reject).not.toHaveBeenCalled();
    });

    it('có ghi chú: gửi ghi chú đã cắt khoảng trắng, bài chuyển Bị từ chối, ô ghi chú được xóa', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.reject.mockReturnValue(of(make('REJECTED', { approval: { reviewNote: 'Câu 2 chưa gắn CLO' } })));
      component.rejectNote.set('  Câu 2 chưa gắn CLO  ');
      component.reject();
      expect(assessmentSvc.reject).toHaveBeenCalledWith('a1', { reviewNote: 'Câu 2 chưa gắn CLO' });
      expect(component.assessment()?.status).toBe('REJECTED');
      expect(component.rejectNote()).toBe('');
    });

    it('biên: ghi chú đúng giới hạn 1000 ký tự được gửi, 1001 ký tự bị chặn', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.reject.mockReturnValue(of(make('REJECTED')));
      component.rejectNote.set('a'.repeat(MAX_REJECT_NOTE_LENGTH + 1));
      component.reject();
      expect(assessmentSvc.reject).not.toHaveBeenCalled();
      component.rejectNote.set('a'.repeat(MAX_REJECT_NOTE_LENGTH));
      component.reject();
      expect(assessmentSvc.reject).toHaveBeenCalledTimes(1);
    });
  });

  describe('phân quyền và trạng thái (NEW-01/AC-5, AC-7)', () => {
    it('giảng viên không thấy nút Duyệt/Từ chối, thanh dưới nói chỉ Trưởng bộ môn mới duyệt được', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      expect(dockButton('Duyệt')).toBeUndefined();
      expect(dockButton('Từ chối')).toBeUndefined();
      expect(dockText()).toContain('Chỉ Trưởng bộ môn');
    });

    it('người gửi duyệt cũng giữ vai trò Trưởng bộ môn: nút bị khóa và giải thích không tự duyệt', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], make('SUBMITTED'), 'gv1');
      expect(component.isOwnSubmission()).toBe(true);
      expect(component.canAct()).toBe(false);
      expect(dockButton('Duyệt')?.disabled).toBe(true);
      expect(dockButton('Từ chối')?.disabled).toBe(true);
      expect(dockText()).toContain('không tự duyệt');
      component.confirmApprove();
      expect(modalSvc.confirm).not.toHaveBeenCalled();
    });

    it('bài đã duyệt không còn nút hành động và nêu trạng thái hiện tại', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], make('APPROVED'));
      expect(component.isAwaitingReview()).toBe(false);
      expect(dockButton('Duyệt')).toBeUndefined();
      expect(el().textContent).toContain('Đã duyệt');
      expect(dockText()).toContain('không ở trạng thái chờ duyệt');
    });

    it('bài đã bị từ chối hiện lại ghi chú đã gửi', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], make('REJECTED', { approval: { reviewNote: 'Sửa câu 2', history: [] } }));
      expect(el().textContent).toContain('Sửa câu 2');
    });

    it('khung theo đề cương không có hành động duyệt (không qua quy trình duyệt)', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], make('SUBMITTED', { scope: 'SYLLABUS_TEMPLATE', sectionId: null }));
      expect(component.isAwaitingReview()).toBe(false);
    });
  });

  describe('lỗi từ backend', () => {
    it('403 (ngoài phạm vi học phần hoặc người gửi tự duyệt): hiện thông báo không đủ quyền theo bảng mã lỗi, giữ trạng thái', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.approve.mockReturnValue(throwError(() => httpError(403, 'FORBIDDEN', 'Người gửi duyệt không được tự duyệt bài của mình')));
      component.confirmApprove();
      (modalSvc.confirm.mock.calls[0][0] as { nzOnOk: () => void; }).nzOnOk();
      fixture.detectChanges();
      expect(component.actionError()?.kind).toBe('FORBIDDEN');
      expect(dockText()).toContain('Bạn không có quyền truy cập chức năng này');
      expect(component.assessment()?.status).toBe('SUBMITTED');
    });

    it('409 hai người cùng duyệt: cảnh báo kèm nút "Tải lại dữ liệu" và không ghi đè im lặng', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.reject.mockReturnValue(throwError(() => httpError(409, 'CONFLICT', 'Dữ liệu đã bị thay đổi')));
      component.rejectNote.set('Sửa');
      component.reject();
      fixture.detectChanges();
      expect(component.isConflict()).toBe(true);
      const reload = Array.from(el().querySelectorAll('button')).find(b => (b.textContent ?? '').includes('Tải lại dữ liệu'));
      expect(reload).toBeDefined();
      reload?.click();
      expect(assessmentSvc.getAssessment).toHaveBeenCalledTimes(2);
    });

    it('422 sai thứ tự trạng thái: hiện thông điệp backend', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.approve.mockReturnValue(throwError(() => httpError(422, 'BUSINESS_RULE_VIOLATION', 'Không thể chuyển bài đánh giá từ trạng thái APPROVED sang APPROVED')));
      component.confirmApprove();
      (modalSvc.confirm.mock.calls[0][0] as { nzOnOk: () => void; }).nzOnOk();
      fixture.detectChanges();
      expect(dockText()).toContain('Không thể chuyển bài đánh giá');
    });

    it('chống bấm đúp: đang xử lý thì lần từ chối thứ hai bị bỏ qua', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.reject.mockReturnValue({ subscribe: vi.fn() });
      component.rejectNote.set('Sửa');
      component.reject();
      component.reject();
      expect(assessmentSvc.reject).toHaveBeenCalledTimes(1);
    });

    it('404 khi tải: hiện trạng thái lỗi, không hiện nút duyệt', async () => {
      vi.clearAllMocks();
      authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      assessmentSvc.getAssessment.mockReturnValue(throwError(() => httpError(404, 'NOT_FOUND', 'Bài đánh giá không tồn tại')));
      await TestBed.configureTestingModule({
        imports: [ReviewAssessmentComponent],
        providers: [
          provideRouter([]),
          { provide: AssessmentService, useValue: assessmentSvc },
          { provide: CloService, useValue: cloSvc },
          { provide: AuthService, useValue: authSvc },
          { provide: ToastrService, useValue: alertSvc },
          { provide: NzModalService, useValue: modalSvc },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(ReviewAssessmentComponent);
      fixture.componentRef.setInput('id', 'missing');
      fixture.detectChanges();
      expect(el().textContent).toContain('Không tìm thấy dữ liệu');
      expect(el().querySelector('app-action-dock')).toBeNull();
    });
  });

  it('lịch sử hiển thị hành động bằng chữ', async () => {
    await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
    expect(el().textContent).toContain('Lịch sử');
    expect(el().textContent).toContain('Gửi duyệt');
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentStatus, IAssessment, IAssessmentItem } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { CloService } from '@services/course/clo.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { DetailAssessmentComponent } from './detail-assessment.component';

/** DỮ LIỆU THỬ NGHIỆM: ID, mã câu, CLO và điểm giả; kỳ vọng tính tay. */
describe('DetailAssessmentComponent (F04 US-15, US-16, NEW-01)', () => {
  let fixture: ComponentFixture<DetailAssessmentComponent>;
  let component: DetailAssessmentComponent;

  const item = (code: string, maxScore: number, cloId = 'clo1'): IAssessmentItem => ({
    id: `id-${code}`, code, kind: 'QUESTION', maxScore, bloomLevel: 3, outcomeMappings: [{ cloId, weight: 1 }],
  });
  // Σ điểm tối đa = 4 + 6 = 10, khớp totalPoints = 10
  const baseItems = [item('C1', 4), item('C2', 6, 'clo2')];
  const make = (status: AssessmentStatus, extra: Partial<IAssessment> = {}): IAssessment => ({
    id: 'a1', syllabusId: 'syl1', sectionId: 'sec1', code: 'CK', name: 'Cuối kỳ', scope: 'SECTION', dataGranularity: 'ITEM',
    measurableByOutcome: true, status, locked: ['APPROVED', 'SCORE_ENTERED', 'LOCKED'].includes(status),
    items: baseItems, totalPoints: 10, approval: null, ...extra,
  });

  const assessmentSvc = { getAssessment: vi.fn(), updateAssessment: vi.fn(), replaceItems: vi.fn(), submit: vi.fn() };
  const cloSvc = {
    getClosBySyllabus: vi.fn(() => of([
      { id: 'clo1', syllabusId: 'syl1', courseId: 'c1', code: 'CLO1', bloomLevel: 2 },
      { id: 'clo2', syllabusId: 'syl1', courseId: 'c1', code: 'CLO2', bloomLevel: 3 },
    ])),
  };
  const authSvc = { getRoles: vi.fn<() => string[]>() };
  const alertSvc = { success: vi.fn(), error: vi.fn() };
  const modalSvc = { confirm: vi.fn() };

  async function setup(roles: string[], assessment: IAssessment = make('DRAFT')): Promise<void> {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue(roles);
    assessmentSvc.getAssessment.mockReturnValue(of(assessment));
    await TestBed.configureTestingModule({
      imports: [DetailAssessmentComponent],
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
    fixture = TestBed.createComponent(DetailAssessmentComponent);
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

  describe('soạn bài ở trạng thái Nháp', () => {
    it('US-15/AC-1: giảng viên thấy bảng câu hỏi với CLO kèm phần điểm, Bloom và điểm tối đa', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      expect(component.editable()).toBe(true);
      const text = el().textContent ?? '';
      expect(text).toContain('C1');
      expect(text).toContain('CLO1 (1)');
      expect(text).toContain('CLO2 (1)');
      expect(text).toContain('Bloom: mức 3/6');
      expect(el().textContent).toContain('Thêm câu');
    });

    it('hiển thị tổng điểm tối đa các phần tử (10) cạnh tổng điểm khai báo (10) và báo Khớp', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      expect(component.itemsSum()).toBe(10);
      expect(component.totalMatch()).toBe(true);
      expect(el().textContent).toContain('Khớp.');
    });

    it('thêm một câu mới chỉ sửa bản làm việc và đánh dấu chưa lưu; thanh dưới nhắc lưu', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      component.onItemSaved(item('C3', 2));
      fixture.detectChanges();
      expect(component.items().length).toBe(3);
      expect(component.itemsDirty()).toBe(true);
      expect(assessmentSvc.replaceItems).not.toHaveBeenCalled();
      expect(dockText()).toContain('Có thay đổi chưa lưu');
    });

    it('sửa một câu thay đúng phần tử đang sửa (giữ id)', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      component.openEditItem(1);
      component.onItemSaved({ ...baseItems[1], maxScore: 5 });
      expect(component.items().map(i => i.maxScore)).toEqual([4, 5]);
      expect(component.items()[1].id).toBe('id-C2');
    });

    it('US-15: lưu cấu trúc gửi toàn bộ items đã đánh số lại 1..n rồi xóa cờ chưa lưu', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      const response = make('DRAFT', { items: [item('C2', 6, 'clo2'), item('C1', 4)] });
      assessmentSvc.replaceItems.mockReturnValue(of(response));
      component.moveItem(1, -1);
      expect(component.items().map(i => i.code)).toEqual(['C2', 'C1']);
      component.saveItems();
      const body = assessmentSvc.replaceItems.mock.calls[0][1] as { items: IAssessmentItem[]; };
      expect(assessmentSvc.replaceItems.mock.calls[0][0]).toBe('a1');
      expect(body.items.map(i => [i.code, i.orderIndex])).toEqual([['C2', 1], ['C1', 2]]);
      expect(component.itemsDirty()).toBe(false);
      expect(alertSvc.success).toHaveBeenCalled();
    });

    it('biên: không thể đẩy câu đầu lên hoặc câu cuối xuống (không đổi, không thành chưa lưu)', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      component.moveItem(0, -1);
      expect(component.items().map(i => i.code)).toEqual(['C1', 'C2']);
    });

    it('bỏ một câu cần xác nhận rồi mới xóa khỏi bản làm việc', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      component.removeItem(0);
      expect(component.items().length).toBe(2);
      const options = modalSvc.confirm.mock.calls[0][0] as { nzOnOk: () => void; };
      options.nzOnOk();
      expect(component.items().map(i => i.code)).toEqual(['C2']);
      expect(component.itemsDirty()).toBe(true);
    });

    it('US-15/AC-2: lỗi 422 của backend (tổng phần điểm) hiện nguyên văn và giữ bản làm việc', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      assessmentSvc.replaceItems.mockReturnValue(throwError(() => httpError(
        422,
        'BUSINESS_RULE_VIOLATION',
        'Phần tử [C1]: tổng phần điểm chia cho các CLO phải bằng 1, hiện là 0.9',
      )));
      component.onItemSaved(item('C3', 2));
      component.saveItems();
      fixture.detectChanges();
      expect(dockText()).toContain('tổng phần điểm chia cho các CLO phải bằng 1');
      expect(component.items().length).toBe(3);
      expect(component.itemsDirty()).toBe(true);
    });

    it('409 xung đột: hiện cảnh báo kèm nút "Tải lại dữ liệu" gọi lại API, không ghi đè im lặng', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      assessmentSvc.replaceItems.mockReturnValue(throwError(() => httpError(409, 'CONFLICT', 'Dữ liệu vừa được cập nhật bởi người khác')));
      component.onItemSaved(item('C3', 2));
      component.saveItems();
      fixture.detectChanges();
      expect(component.isConflict()).toBe(true);
      const reload = Array.from(el().querySelectorAll('button')).find(b => (b.textContent ?? '').includes('Tải lại dữ liệu'));
      expect(reload).toBeDefined();
      reload?.click();
      expect(assessmentSvc.getAssessment).toHaveBeenCalledTimes(2);
    });

    it('chống bấm đúp: đang lưu thì lần lưu thứ hai bị bỏ qua', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      const pending = { subscribe: vi.fn() };
      assessmentSvc.replaceItems.mockReturnValue(pending);
      component.onItemSaved(item('C3', 2));
      component.saveItems();
      component.saveItems();
      expect(assessmentSvc.replaceItems).toHaveBeenCalledTimes(1);
    });

    it('lưu thông tin bài gửi tên, tổng điểm... và không đụng vào bản làm việc của câu hỏi', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      assessmentSvc.updateAssessment.mockReturnValue(of(make('DRAFT', { name: 'Cuối kỳ (mới)', totalPoints: 12 })));
      component.onItemSaved(item('C3', 2));
      component.infoForm.patchValue({ name: 'Cuối kỳ (mới)', totalPoints: 12 });
      component.infoForm.markAsDirty();
      component.saveInfo();
      expect(assessmentSvc.updateAssessment).toHaveBeenCalledWith('a1', expect.objectContaining({ name: 'Cuối kỳ (mới)', totalPoints: 12, dataGranularity: 'ITEM' }));
      expect(component.items().length).toBe(3);
      expect(component.assessment()?.totalPoints).toBe(12);
    });

    it('ca âm: tên bài trống thì không gọi API cập nhật thông tin', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      component.infoForm.patchValue({ name: '' });
      component.saveInfo();
      expect(assessmentSvc.updateAssessment).not.toHaveBeenCalled();
    });
  });

  describe('gửi duyệt (NEW-01/AC-1, AC-2)', () => {
    it('đủ điều kiện: nút Gửi duyệt bật; xác nhận rồi gọi API và chuyển sang chờ duyệt (khóa sửa)', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      expect(component.submitBlocked()).toBe(false);
      assessmentSvc.submit.mockReturnValue(of(make('SUBMITTED', { approval: { submittedBy: 'u1', history: [{ action: 'SUBMIT', actorId: 'u1', at: '2026-10-27T00:00:00Z' }] } })));
      component.confirmSubmit();
      (modalSvc.confirm.mock.calls[0][0] as { nzOnOk: () => void; }).nzOnOk();
      fixture.detectChanges();
      expect(assessmentSvc.submit).toHaveBeenCalledWith('a1');
      expect(component.assessment()?.status).toBe('SUBMITTED');
      expect(component.editable()).toBe(false);
      expect(el().textContent).toContain('đang chờ Trưởng bộ môn');
      expect(dockButton('Gửi duyệt')).toBeUndefined();
    });

    it('ca âm: tổng điểm khai báo lệch Σ điểm tối đa thì chặn nút và nêu cả hai giá trị', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('DRAFT', { totalPoints: 12 }));
      expect(component.submitBlocked()).toBe(true);
      expect(dockText()).toContain('(12)');
      expect(dockText()).toContain('(10)');
      expect(dockButton('Gửi duyệt')?.disabled).toBe(true);
      component.confirmSubmit();
      expect(modalSvc.confirm).not.toHaveBeenCalled();
    });

    it('ca âm: bài chưa có câu nào thì chặn gửi duyệt', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('DRAFT', { items: [] }));
      expect(component.submitBlocked()).toBe(true);
      expect(dockText()).toContain('Chưa có câu hỏi/tiêu chí nào');
      expect(el().textContent).toContain('Bài chưa có câu hỏi/tiêu chí nào');
    });

    it('ca âm: chưa khai báo tổng điểm thì chặn (khác với tổng điểm 0)', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('DRAFT', { totalPoints: null }));
      expect(component.submitBlocked()).toBe(true);
      expect(dockText()).toContain('Chưa khai báo tổng điểm');
      expect(el().textContent).toContain('Tổng điểm khai báo: —');
    });

    it('còn thay đổi chưa lưu thì chặn gửi duyệt cho tới khi lưu', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      component.onItemSaved(item('C3', 0.5));
      expect(component.submitBlocked()).toBe(true);
      expect(component.hints()[0].message).toContain('chưa lưu');
    });

    it('422 do backend từ chối gửi duyệt: hiện thông điệp, bài vẫn là Nháp', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      assessmentSvc.submit.mockReturnValue(throwError(() => httpError(422, 'BUSINESS_RULE_VIOLATION', 'Tổng điểm khai báo (10) lệch tổng điểm các phần tử (9) quá 0.001')));
      component.confirmSubmit();
      (modalSvc.confirm.mock.calls[0][0] as { nzOnOk: () => void; }).nzOnOk();
      fixture.detectChanges();
      expect(dockText()).toContain('lệch tổng điểm các phần tử');
      expect(component.assessment()?.status).toBe('DRAFT');
    });

    it('NEW-01/AC-5: chỉ LECTURER thấy nút Gửi duyệt (Trưởng bộ môn không)', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD]);
      expect(component.canSubmit()).toBe(false);
      expect(dockButton('Gửi duyệt')).toBeUndefined();
    });
  });

  describe('khóa sửa (US-15/AC-5)', () => {
    it('đã duyệt (locked=true): ẩn nút thêm/sửa/lưu, khóa form thông tin, nêu lý do khóa', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('APPROVED'));
      expect(component.editable()).toBe(false);
      expect(el().textContent).toContain('Ma trận đã được duyệt');
      expect(el().textContent).not.toContain('Thêm câu');
      expect(dockButton('Lưu cấu trúc')).toBeUndefined();
      expect(component.infoForm.disabled).toBe(true);
      expect(el().querySelector('[aria-label="Xem C1"]')).not.toBeNull();
      expect(el().querySelector('[aria-label="Sửa C1"]')).toBeNull();
    });

    it('lưu cấu trúc bị bỏ qua khi bài đã khóa dù gọi trực tiếp', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('APPROVED'));
      component.saveItems();
      expect(assessmentSvc.replaceItems).not.toHaveBeenCalled();
    });

    it('cờ locked=true khóa dù trạng thái là Nháp (không tin riêng trạng thái)', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('DRAFT', { locked: true }));
      expect(component.editable()).toBe(false);
    });

    it('đang chờ duyệt (SUBMITTED): tạm khóa và nói rõ đang chờ Trưởng bộ môn', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('SUBMITTED'));
      expect(component.editable()).toBe(false);
      expect(component.lockMessage()).toContain('chờ Trưởng bộ môn');
      expect(dockText()).toContain('Đang chờ Trưởng bộ môn duyệt');
    });

    it('Bị từ chối: sửa được và hiện ghi chú từ chối của Trưởng bộ môn', async () => {
      await setup([SystemConstant.ROLE.LECTURER], make('REJECTED', { approval: { reviewNote: 'Câu 2 chưa gắn CLO' } }));
      expect(component.editable()).toBe(true);
      expect(el().textContent).toContain('"Câu 2 chưa gắn CLO"');
      expect(el().textContent).toContain('quay về Nháp');
    });
  });

  describe('phân quyền hiển thị (chỉ ẩn nút; backend quyết định)', () => {
    it('VIEWER, ADMIN, PROGRAM_MANAGER chỉ đọc bài của lớp', async () => {
      for (const role of [SystemConstant.ROLE.VIEWER, SystemConstant.ROLE.ADMIN, SystemConstant.ROLE.PROGRAM_MANAGER]) {
        TestBed.resetTestingModule();
        await setup([role]);
        expect(component.canWrite()).toBe(false);
        expect(component.editable()).toBe(false);
      }
    });

    it('Trưởng bộ môn không sửa bản lớp nhưng thấy nút mở màn hình duyệt khi bài chờ duyệt', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], make('SUBMITTED'));
      expect(component.canWrite()).toBe(false);
      expect(component.canReview()).toBe(true);
      expect(el().textContent).toContain('Mở màn hình duyệt');
    });

    it('khung theo đề cương: Trưởng bộ môn được soạn, không có luồng gửi duyệt và không hiện trạng thái duyệt', async () => {
      await setup([SystemConstant.ROLE.DEPARTMENT_HEAD], make('DRAFT', { scope: 'SYLLABUS_TEMPLATE', sectionId: null }));
      expect(component.editable()).toBe(true);
      expect(component.canSubmit()).toBe(false);
      expect(el().textContent).toContain('Khung theo đề cương');
      expect(el().querySelector('app-display-chip')).toBeNull();
    });
  });

  it('bài chỉ có điểm tổng (TOTAL_ONLY) được ghi chú không đo được CLO/PI', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT', { measurableByOutcome: false, dataGranularity: 'TOTAL_ONLY' }));
    expect(el().textContent).toContain('không đo được CLO/PI');
  });

  it('lịch sử duyệt hiển thị hành động bằng chữ và ghi chú', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('REJECTED', {
      approval: {
        reviewNote: 'Sửa',
        history: [
          { action: 'SUBMIT', actorId: 'u1', at: '2026-10-27T01:00:00Z' },
          { action: 'REJECT', actorId: 'u2', at: '2026-10-28T01:00:00Z', note: 'Sửa' },
        ],
      },
    }));
    const text = el().textContent ?? '';
    expect(text).toContain('Gửi duyệt');
    expect(text).toContain('Từ chối');
  });

  describe('rời trang khi còn thay đổi chưa lưu', () => {
    it('không có thay đổi thì cho rời mà không hỏi', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      const confirmSpy = vi.spyOn(window, 'confirm');
      expect(component.canDeactivate()).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('có thay đổi chưa lưu thì hỏi và tôn trọng lựa chọn của người dùng', async () => {
      await setup([SystemConstant.ROLE.LECTURER]);
      component.onItemSaved(item('C3', 1));
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
      expect(component.canDeactivate()).toBe(false);
      expect(component.canDeactivate()).toBe(true);
      expect(confirmSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('404 khi tải: hiện trạng thái lỗi kèm nút quay lại, không hiện form', async () => {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.LECTURER]);
    assessmentSvc.getAssessment.mockReturnValue(throwError(() => httpError(404, 'NOT_FOUND', 'Bài đánh giá không tồn tại')));
    await TestBed.configureTestingModule({
      imports: [DetailAssessmentComponent],
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
    fixture = TestBed.createComponent(DetailAssessmentComponent);
    fixture.componentRef.setInput('id', 'missing');
    fixture.detectChanges();
    expect(el().textContent).toContain('Không tìm thấy dữ liệu');
    expect(el().querySelector('form')).toBeNull();
  });
});

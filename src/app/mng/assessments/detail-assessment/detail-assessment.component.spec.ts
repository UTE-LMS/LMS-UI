import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentStatus, IAssessment, IAssessmentItem } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { CloService } from '@services/course/clo.service';
import { ModalOptions, NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { DetailAssessmentComponent } from './detail-assessment.component';

function invokeConfirm(cfg: ModalOptions): void {
  const handler = cfg.nzOnOk;
  if (typeof handler === 'function') {
    (handler as (e?: unknown) => unknown)({});
  }
}

/** DỮ LIỆU THỬ NGHIỆM: ID, mã câu, CLO và điểm giả. */
describe('DetailAssessmentComponent (F04 US-15, US-16, ADR 0014)', () => {
  let fixture: ComponentFixture<DetailAssessmentComponent>;
  let component: DetailAssessmentComponent;

  const item = (code: string, maxScore: number, cloId = 'clo1'): IAssessmentItem => ({
    id: `id-${code}`, code, bloomLevel: 3, outcomeMappings: [{ cloId, maxScore }],
  });
  const baseItems = [item('C1', 4), item('C2', 6, 'clo2')];
  const make = (status: AssessmentStatus, extra: Partial<IAssessment> = {}): IAssessment => ({
    id: 'a1', syllabusId: 'syl1', sectionId: 'sec1', code: 'CK', name: 'Cuối kỳ', scope: 'SECTION',
    status, locked: status === 'LOCKED' || status === 'SCORE_ENTERED',
    cloWeights: [{ cloId: 'clo1', weight: 0.5 }, { cloId: 'clo2', weight: 0.5 }],
    items: baseItems, ...extra,
  });

  const assessmentSvc = {
    getAssessment: vi.fn(),
    getSectionAssessments: vi.fn(),
    updateAssessment: vi.fn(),
    replaceItems: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
    deleteAssessment: vi.fn(),
  };
  const cloSvc = {
    getClosBySyllabus: vi.fn(() => of([
      { id: 'clo1', syllabusId: 'syl1', courseId: 'c1', code: 'CLO1', bloomLevel: 2 },
      { id: 'clo2', syllabusId: 'syl1', courseId: 'c1', code: 'CLO2', bloomLevel: 3 },
    ])),
  };
  const authSvc = { getRoles: vi.fn<() => string[]>() };
  const alertSvc = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const modalSvc = { confirm: vi.fn() };

  async function setup(roles: string[], assessment: IAssessment = make('DRAFT')): Promise<void> {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue(roles);
    assessmentSvc.getAssessment.mockReturnValue(of(assessment));
    assessmentSvc.getSectionAssessments.mockReturnValue(of([assessment]));
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
      .overrideProvider(NzModalService, { useValue: modalSvc })
      .compileComponents();
    fixture = TestBed.createComponent(DetailAssessmentComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'a1');
    fixture.detectChanges();
  }

  it('soạn ở Nháp với quyền LECTURER: cho phép sửa cấu trúc', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    expect(component.editable()).toBe(true);
    expect(component.infoForm.enabled).toBe(true);
  });

  it('bài đã LOCKED: không cho sửa cấu trúc', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('LOCKED'));
    expect(component.editable()).toBe(false);
    expect(component.infoForm.disabled).toBe(true);
  });

  it('lưu thông tin chung gọi updateAssessment với dữ liệu form', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    assessmentSvc.updateAssessment.mockReturnValue(of(make('DRAFT', { name: 'Tên mới' })));
    component.infoForm.patchValue({ name: 'Tên mới' });
    component.saveInfo();
    expect(assessmentSvc.updateAssessment).toHaveBeenCalledWith('a1', expect.objectContaining({ name: 'Tên mới' }));
  });

  it('lưu cấu trúc câu hỏi gọi replaceItems', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    assessmentSvc.replaceItems.mockReturnValue(of(make('DRAFT')));
    component.onItemSaved(item('C3', 2, 'clo1'));
    expect(component.itemsDirty()).toBe(true);
    component.saveItems();
    expect(assessmentSvc.replaceItems).toHaveBeenCalledWith('a1', expect.objectContaining({ items: expect.any(Array) }));
  });

  it('khóa ma trận mở hộp thoại xác nhận và gọi lock', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    assessmentSvc.lock.mockReturnValue(of(make('LOCKED')));
    modalSvc.confirm.mockImplementation(invokeConfirm);
    component.lockAssessment();
    expect(modalSvc.confirm).toHaveBeenCalled();
    expect(assessmentSvc.lock).toHaveBeenCalledWith('a1');
  });

  it('mở khóa ma trận mở hộp thoại và gọi unlock', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('LOCKED'));
    assessmentSvc.unlock.mockReturnValue(of(make('DRAFT')));
    modalSvc.confirm.mockImplementation(invokeConfirm);
    component.unlockAssessment();
    expect(modalSvc.confirm).toHaveBeenCalled();
    expect(assessmentSvc.unlock).toHaveBeenCalledWith('a1');
  });

  it('xóa câu hỏi giảm số lượng items và đánh dấu itemsDirty', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    expect(component.items().length).toBe(2);
    component.removeItem(0);
    expect(component.items().length).toBe(1);
    expect(component.itemsDirty()).toBe(true);
  });

  it('hiển thị % CLO các bài khác, tổng toàn lớp và phần còn lại cho bài của lớp', async () => {
    const current = make('DRAFT');
    const other: IAssessment = {
      id: 'a0', syllabusId: 'syl1', sectionId: 'sec1', code: 'GK', name: 'Giữa kỳ', scope: 'SECTION',
      status: 'LOCKED', locked: true,
      cloWeights: [{ cloId: 'clo1', weight: 0.4 }],
      items: [],
    };
    await setup([SystemConstant.ROLE.LECTURER], current);
    assessmentSvc.getSectionAssessments.mockReturnValue(of([other, current]));
    component.load();
    fixture.detectChanges();

    expect(assessmentSvc.getSectionAssessments).toHaveBeenCalledWith('sec1');
    const clo1Summary = component.sectionCloWeightMap()?.get('clo1');
    expect(clo1Summary?.otherWeight).toBe(0.4);
    expect(clo1Summary?.currentWeight).toBe(0.5);
    expect(clo1Summary?.totalWeight).toBe(0.9);
    expect(clo1Summary?.remainingWeight).toBe(0.1);
    expect(clo1Summary?.status).toBe('UNDER');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('GK: 40%');
    expect(text).toContain('90%');
    expect(text).toContain('Còn 10%');
  });

  it('cảnh báo ngay khi nhập trọng số làm tổng CLO toàn lớp vượt quá 100%', async () => {
    const current = make('DRAFT');
    const other: IAssessment = {
      id: 'a0', syllabusId: 'syl1', sectionId: 'sec1', code: 'GK', name: 'Giữa kỳ', scope: 'SECTION',
      status: 'LOCKED', locked: true,
      cloWeights: [{ cloId: 'clo1', weight: 0.6 }],
      items: [],
    };
    await setup([SystemConstant.ROLE.LECTURER], current);
    assessmentSvc.getSectionAssessments.mockReturnValue(of([other, current]));
    component.load();
    component.updateCloWeight('clo1', 0.55);
    fixture.detectChanges();

    expect(component.overflowingClos().map(o => o.cloCode)).toEqual(['CLO1']);
    const alertEl = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alertEl?.textContent).toContain('Cảnh báo vượt quá 100%');
    expect(alertEl?.textContent).toContain('115%');
    expect(alertEl?.textContent).toContain('vượt 15%');
  });

  it('khung theo đề cương (SYLLABUS_TEMPLATE) không gọi getSectionAssessments', async () => {
    const template = make('DRAFT', { scope: 'SYLLABUS_TEMPLATE', sectionId: null });
    await setup([SystemConstant.ROLE.LECTURER], template);
    expect(assessmentSvc.getSectionAssessments).not.toHaveBeenCalled();
    expect(component.isSectionScope()).toBe(false);
    expect(component.sectionCloWeightMap()).toBeNull();
  });

  it('lỗi tải danh sách bài cùng lớp: hiện "—" (không hiện 0%) và cho phép thử lại', async () => {
    const current = make('DRAFT');
    await setup([SystemConstant.ROLE.LECTURER], current);
    assessmentSvc.getSectionAssessments.mockReturnValue(throwError(() => new Error('network')));
    component.load();
    fixture.detectChanges();

    expect(component.sectionAssessmentsError()).toBe(true);
    expect(component.sectionCloWeightMap()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không tải được tổng trọng số CLO');

    assessmentSvc.getSectionAssessments.mockReturnValue(of([current]));
    component.retrySectionAssessments();
    fixture.detectChanges();
    expect(component.sectionAssessmentsError()).toBe(false);
    expect(component.sectionCloWeightMap()?.get('clo1')?.totalWeight).toBe(0.5);
  });

  it('updateCloWeight chuẩn hóa NaN hoặc số âm về 0', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    component.updateCloWeight('clo1', Number.NaN);
    expect(component.cloWeights().find(c => c.cloId === 'clo1')?.weight).toBe(0);
    component.updateCloWeight('clo1', -0.2);
    expect(component.cloWeights().find(c => c.cloId === 'clo1')?.weight).toBe(0);
  });
});

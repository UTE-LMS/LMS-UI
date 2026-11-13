import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentStatus, IAssessment, IAssessmentItem } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { CloService } from '@services/course/clo.service';
import { ModalOptions, NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
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
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentStatus, IAssessment, ICoverage } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { CloService } from '@services/course/clo.service';
import { ModalOptions, NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ReviewAssessmentComponent } from './review-assessment.component';

function invokeConfirm(cfg: ModalOptions): void {
  const handler = cfg.nzOnOk;
  if (typeof handler === 'function') {
    (handler as (e?: unknown) => unknown)({});
  }
}

/** DỮ LIỆU THỬ NGHIỆM: ID, CLO, điểm giả. */
describe('ReviewAssessmentComponent (F04 NEW-01, ADR 0014)', () => {
  let fixture: ComponentFixture<ReviewAssessmentComponent>;
  let component: ReviewAssessmentComponent;

  const make = (status: AssessmentStatus, extra: Partial<IAssessment> = {}): IAssessment => ({
    id: 'a1', syllabusId: 'syl1', sectionId: 'sec1', code: 'TH', name: 'Thực hành', scope: 'SECTION',
    status, locked: status === 'LOCKED' || status === 'SCORE_ENTERED',
    cloWeights: [{ cloId: 'clo1', weight: 1.0 }],
    items: [
      { code: 'T1', bloomLevel: 2, outcomeMappings: [{ cloId: 'clo1', maxScore: 3 }] },
      { code: 'T2', bloomLevel: 3, outcomeMappings: [{ cloId: 'clo2', maxScore: 4 }] },
      { code: 'T3', bloomLevel: 4, outcomeMappings: [{ cloId: 'clo3', maxScore: 1.5 }, { cloId: 'clo2', maxScore: 1.5 }] },
    ],
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

  const assessmentSvc = {
    getAssessment: vi.fn(),
    getCoverage: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
  };
  const cloSvc = {
    getClosBySyllabus: vi.fn(() => of([
      { id: 'clo1', syllabusId: 'syl1', courseId: 'c1', code: 'CLO1', bloomLevel: 2 },
      { id: 'clo2', syllabusId: 'syl1', courseId: 'c1', code: 'CLO2', bloomLevel: 3 },
      { id: 'clo3', syllabusId: 'syl1', courseId: 'c1', code: 'CLO3', bloomLevel: 4 },
    ])),
  };
  const authSvc = { getRoles: vi.fn<() => string[]>(), getUserId: vi.fn(() => 'gv1') };
  const alertSvc = { success: vi.fn(), error: vi.fn() };
  const modalSvc = { confirm: vi.fn() };

  async function setup(roles: string[], assessment: IAssessment = make('DRAFT')): Promise<void> {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue(roles);
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
      .overrideProvider(NzModalService, { useValue: modalSvc })
      .compileComponents();
    fixture = TestBed.createComponent(ReviewAssessmentComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'a1');
    fixture.detectChanges();
  }

  it('tải bài và độ phủ: hiển thị đủ các bảng CLO và Bloom', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    expect(assessmentSvc.getAssessment).toHaveBeenCalledWith('a1');
    expect(assessmentSvc.getCoverage).toHaveBeenCalledWith('a1');
    expect(component.coverage()).toEqual(coverage);
    expect(component.items().length).toBe(3);
  });

  it('ở trạng thái DRAFT: giảng viên có quyền bấm Khóa ma trận', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('DRAFT'));
    expect(component.canLock()).toBe(true);
    expect(component.canUnlock()).toBe(false);

    assessmentSvc.lock.mockReturnValue(of(make('LOCKED')));
    modalSvc.confirm.mockImplementation(invokeConfirm);
    component.lock();
    expect(assessmentSvc.lock).toHaveBeenCalledWith('a1');
    expect(alertSvc.success).toHaveBeenCalled();
  });

  it('ở trạng thái LOCKED: giảng viên có quyền bấm Mở khóa ma trận', async () => {
    await setup([SystemConstant.ROLE.LECTURER], make('LOCKED'));
    expect(component.canLock()).toBe(false);
    expect(component.canUnlock()).toBe(true);

    assessmentSvc.unlock.mockReturnValue(of(make('DRAFT')));
    modalSvc.confirm.mockImplementation(invokeConfirm);
    component.unlock();
    expect(assessmentSvc.unlock).toHaveBeenCalledWith('a1');
    expect(alertSvc.success).toHaveBeenCalled();
  });
});

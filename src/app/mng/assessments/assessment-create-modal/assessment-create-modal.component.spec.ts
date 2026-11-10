import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IAssessment } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, throwError } from 'rxjs';
import { AssessmentCreateModalComponent } from './assessment-create-modal.component';

/** DỮ LIỆU THỬ NGHIỆM: ID, mã bài giả. */
describe('AssessmentCreateModalComponent (F04 US-15)', () => {
  let fixture: ComponentFixture<AssessmentCreateModalComponent>;
  let component: AssessmentCreateModalComponent;
  const createdAssessment = { id: 'a1', code: 'GK', name: 'Giữa kỳ' } as IAssessment;

  const assessmentSvc = { createSectionAssessment: vi.fn(), createTemplate: vi.fn() };
  const alertSvc = { success: vi.fn(), error: vi.fn() };

  async function setup(mode: 'SECTION' | 'TEMPLATE', preset: string | null = null): Promise<void> {
    vi.clearAllMocks();
    assessmentSvc.createSectionAssessment.mockReturnValue(of(createdAssessment));
    assessmentSvc.createTemplate.mockReturnValue(of(createdAssessment));
    await TestBed.configureTestingModule({
      imports: [AssessmentCreateModalComponent],
      providers: [
        { provide: AssessmentService, useValue: assessmentSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AssessmentCreateModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('sectionId', 'sec1');
    fixture.componentRef.setInput('syllabusId', 'syl1');
    fixture.componentRef.setInput('presetTemplateId', preset);
    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();
  }

  it('US-15/AC-1: tạo bản lớp gửi sectionId, thông tin chung và độ chi tiết ITEM mặc định', async () => {
    await setup('SECTION');
    const created = vi.fn();
    component.created.subscribe(created);
    component.form.patchValue({ code: 'GK', name: ' Giữa kỳ ', type: 'MIDTERM', totalPoints: 10, weightInCourse: 0.3, scheduledDate: '2026-10-20' });
    component.submit();
    expect(assessmentSvc.createSectionAssessment).toHaveBeenCalledWith('sec1', {
      code: 'GK', name: 'Giữa kỳ', type: 'MIDTERM', phase: undefined, scheduledAt: '2026-10-20T00:00:00Z',
      totalPoints: 10, weightInCourse: 0.3, dataGranularity: 'ITEM', templateId: undefined,
    });
    expect(created).toHaveBeenCalledWith(createdAssessment);
    expect(alertSvc.success).toHaveBeenCalled();
  });

  it('US-15/AC-1: tạo từ khung gửi templateId và không gửi items', async () => {
    await setup('SECTION', 'tpl1');
    component.form.patchValue({ code: 'CK', name: 'Cuối kỳ' });
    component.submit();
    const body = assessmentSvc.createSectionAssessment.mock.calls[0][1] as { templateId?: string; items?: unknown; };
    expect(body.templateId).toBe('tpl1');
    expect(body.items).toBeUndefined();
  });

  it('tạo khung theo đề cương gọi createTemplate và không gửi templateId dù form có giá trị', async () => {
    await setup('TEMPLATE');
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ', templateId: 'tpl1' });
    component.submit();
    expect(assessmentSvc.createTemplate).toHaveBeenCalledTimes(1);
    expect(assessmentSvc.createSectionAssessment).not.toHaveBeenCalled();
    expect((assessmentSvc.createTemplate.mock.calls[0][1] as { templateId?: string; }).templateId).toBeUndefined();
    expect(assessmentSvc.createTemplate.mock.calls[0][0]).toBe('syl1');
  });

  it('ca âm: thiếu mã hoặc tên thì không gọi API', async () => {
    await setup('SECTION');
    component.submit();
    expect(assessmentSvc.createSectionAssessment).not.toHaveBeenCalled();
    component.form.patchValue({ code: 'GK' });
    component.submit();
    expect(assessmentSvc.createSectionAssessment).not.toHaveBeenCalled();
  });

  it('ca âm: mã sai định dạng, tỷ trọng ngoài [0,1] và tổng điểm âm bị chặn', async () => {
    await setup('SECTION');
    component.form.patchValue({ code: 'GK 1', name: 'Giữa kỳ' });
    component.submit();
    expect(component.form.controls.code.invalid).toBe(true);
    component.form.patchValue({ code: 'GK', weightInCourse: 1.2 });
    component.submit();
    expect(component.form.controls.weightInCourse.invalid).toBe(true);
    component.form.patchValue({ weightInCourse: 0.3, totalPoints: -1 });
    component.submit();
    expect(component.form.controls.totalPoints.invalid).toBe(true);
    expect(assessmentSvc.createSectionAssessment).not.toHaveBeenCalled();
  });

  it('biên: tỷ trọng 0 và 1 hợp lệ', async () => {
    await setup('SECTION');
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ', weightInCourse: 0 });
    expect(component.form.controls.weightInCourse.valid).toBe(true);
    component.form.patchValue({ weightInCourse: 1 });
    expect(component.form.controls.weightInCourse.valid).toBe(true);
  });

  it('US-15 (409 trùng mã): hiện thông điệp backend và giữ nguyên dữ liệu đã nhập', async () => {
    await setup('SECTION');
    assessmentSvc.createSectionAssessment.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { status: 409, code: 'CONFLICT', message: 'Mã bài đánh giá [GK] đã tồn tại trong phạm vi này' },
    })));
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ' });
    component.submit();
    expect(component.submitError()).toContain('đã tồn tại trong phạm vi này');
    expect(component.form.controls.name.value).toBe('Giữa kỳ');
    expect(component.isSubmitting()).toBe(false);
  });

  it('US-15/AC-4 (403 ngoài phạm vi): hiện thông điệp quyền', async () => {
    await setup('SECTION');
    assessmentSvc.createSectionAssessment.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 403, error: { status: 403, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập tài nguyên này' },
    })));
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ' });
    component.submit();
    expect(component.submitError()).toContain('không có quyền');
  });

  it('chống bấm đúp: lần submit thứ hai khi đang gửi bị bỏ qua', async () => {
    await setup('SECTION');
    assessmentSvc.createSectionAssessment.mockReturnValue(new Subject());
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ' });
    component.submit();
    component.submit();
    expect(assessmentSvc.createSectionAssessment).toHaveBeenCalledTimes(1);
  });

  it('thiếu sectionId ở chế độ SECTION thì báo lỗi, không gọi API', async () => {
    await setup('SECTION');
    fixture.componentRef.setInput('sectionId', null);
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ' });
    component.submit();
    expect(component.submitError()).toContain('Thiếu thông tin');
    expect(assessmentSvc.createSectionAssessment).not.toHaveBeenCalled();
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IAssessment } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, throwError } from 'rxjs';
import { AssessmentCreateModalComponent } from './assessment-create-modal.component';

/** DỮ LIỆU THỬ NGHIỆM: ID, mã bài giả. */
describe('AssessmentCreateModalComponent (F04 US-15, ADR 0014)', () => {
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

  it('US-15/AC-1: tạo bản lớp gửi sectionId và thông tin chung', async () => {
    await setup('SECTION');
    const created = vi.fn();
    component.created.subscribe(created);
    component.form.patchValue({ code: 'GK', name: ' Giữa kỳ ', type: 'MIDTERM', scheduledDate: '2026-10-20' });
    component.submit();
    expect(assessmentSvc.createSectionAssessment).toHaveBeenCalledWith('sec1', {
      code: 'GK', name: 'Giữa kỳ', type: 'MIDTERM', phase: undefined, scheduledAt: '2026-10-20T00:00:00Z',
      templateId: undefined,
    });
    expect(created).toHaveBeenCalledWith(createdAssessment);
    expect(alertSvc.success).toHaveBeenCalled();
  });

  it('US-15/AC-1: tạo từ khung gửi templateId và không gửi items', async () => {
    await setup('SECTION', 'tpl-41');
    component.form.patchValue({ code: 'CK', name: 'Cuối kỳ' });
    component.submit();
    expect(assessmentSvc.createSectionAssessment).toHaveBeenCalledWith(
      'sec1',
      expect.objectContaining({ templateId: 'tpl-41' }),
    );
  });

  it('tạo khung theo đề cương gọi createTemplate và không gửi templateId', async () => {
    await setup('TEMPLATE');
    component.form.patchValue({ code: 'KHUNG1', name: 'Khung giữa kỳ', templateId: 'ignored' });
    component.submit();
    expect(assessmentSvc.createTemplate).toHaveBeenCalledWith('syl1', {
      code: 'KHUNG1', name: 'Khung giữa kỳ', type: undefined, phase: undefined, scheduledAt: undefined,
      templateId: undefined,
    });
  });

  it('ca âm: thiếu mã hoặc tên thì không gọi API', async () => {
    await setup('SECTION');
    component.form.patchValue({ code: '', name: '' });
    component.submit();
    expect(assessmentSvc.createSectionAssessment).not.toHaveBeenCalled();
  });

  it('US-15 (409 trùng mã): hiện thông điệp backend và giữ nguyên dữ liệu đã nhập', async () => {
    await setup('SECTION');
    assessmentSvc.createSectionAssessment.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Mã bài đánh giá đã tồn tại' } })),
    );
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ' });
    component.submit();
    expect(component.submitError()).toContain('đã tồn tại');
    expect(component.form.controls.code.value).toBe('GK');
  });

  it('chống bấm đúp: lần submit thứ hai khi đang gửi bị bỏ qua', async () => {
    await setup('SECTION');
    const slow$ = new Subject<IAssessment>();
    assessmentSvc.createSectionAssessment.mockReturnValue(slow$);
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ' });
    component.submit();
    expect(component.isSubmitting()).toBe(true);
    component.submit();
    expect(assessmentSvc.createSectionAssessment).toHaveBeenCalledTimes(1);
    slow$.next(createdAssessment);
    slow$.complete();
    expect(component.isSubmitting()).toBe(false);
  });

  it('thiếu sectionId ở chế độ SECTION thì báo lỗi, không gọi API', async () => {
    await setup('SECTION');
    fixture.componentRef.setInput('sectionId', null);
    fixture.detectChanges();
    component.form.patchValue({ code: 'GK', name: 'Giữa kỳ' });
    component.submit();
    expect(component.submitError()).toContain('Thiếu thông tin lớp');
    expect(assessmentSvc.createSectionAssessment).not.toHaveBeenCalled();
  });
});

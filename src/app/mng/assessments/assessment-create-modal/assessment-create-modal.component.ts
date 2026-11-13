import {
  ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ASSESSMENT_PHASE_LABEL, ASSESSMENT_TYPE_LABEL, toOptions,
} from '@constants/assessment-display.constant';
import {
  AssessmentPhase, AssessmentType, IAssessment, IAssessmentRequest,
} from '@models/assessment/assessment.model';
import { toUserError } from '@services/common/api-error.util';
import { AssessmentService } from '@services/assessment/assessment.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ToastrService } from 'ngx-toastr';
import { cleanOptional } from '../assessments.util';

export type AssessmentCreateMode = 'SECTION' | 'TEMPLATE';

/**
 * Modal tạo bài đánh giá: bản của một lớp hoặc khung theo đề cương (ADR 0014, Schema v0.7).
 */
@Component({
  selector: 'app-assessment-create-modal',
  templateUrl: './assessment-create-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, NzModalModule, NzButtonModule, NzSelectModule],
})
export class AssessmentCreateModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly assessmentSvc = inject(AssessmentService);
  private readonly alert = inject(ToastrService);

  readonly isVisible = input(false);
  readonly mode = input.required<AssessmentCreateMode>();
  readonly sectionId = input<string | null>(null);
  readonly syllabusId = input<string | null>(null);
  readonly templates = input<IAssessment[]>([]);
  readonly presetTemplateId = input<string | null>(null);

  readonly visibleChange = output<boolean>();
  readonly created = output<IAssessment>();

  protected readonly typeOptions = toOptions<AssessmentType>(ASSESSMENT_TYPE_LABEL);
  protected readonly phaseOptions = toOptions<AssessmentPhase>(ASSESSMENT_PHASE_LABEL);

  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{1,40}$/)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    type: [null as AssessmentType | null],
    phase: [null as AssessmentPhase | null],
    scheduledDate: [''],
    templateId: [null as string | null],
  });

  constructor() {
    effect(() => {
      if (this.isVisible()) {
        const preset = this.presetTemplateId();
        untracked(() => {
          this.submitError.set(null);
          this.form.reset({ templateId: preset });
        });
      }
    });
  }

  handleCancel(): void {
    if (!this.isSubmitting()) {
      this.visibleChange.emit(false);
    }
  }

  submit(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.submitError.set(null);
    Object.values(this.form.controls).forEach(c => {
      c.markAsDirty();
      c.markAsTouched();
    });
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const request: IAssessmentRequest = {
      code: v.code.trim(),
      name: v.name.trim(),
      type: v.type ?? undefined,
      phase: v.phase ?? undefined,
      scheduledAt: cleanOptional(v.scheduledDate) ? `${v.scheduledDate}T00:00:00Z` : undefined,
      templateId: this.mode() === 'SECTION' ? (v.templateId ?? undefined) : undefined,
    };

    const sectionId = this.sectionId();
    const syllabusId = this.syllabusId();
    const request$ = this.mode() === 'SECTION'
      ? (sectionId ? this.assessmentSvc.createSectionAssessment(sectionId, request) : null)
      : (syllabusId ? this.assessmentSvc.createTemplate(syllabusId, request) : null);
    if (!request$) {
      this.submitError.set('Thiếu thông tin lớp hoặc đề cương để tạo bài đánh giá.');
      return;
    }

    this.isSubmitting.set(true);
    request$.subscribe({
      next: created => {
        this.isSubmitting.set(false);
        this.alert.success(`Đã tạo bài đánh giá ${created.code}`);
        this.visibleChange.emit(false);
        this.created.emit(created);
      },
      error: err => {
        this.isSubmitting.set(false);
        this.submitError.set(toUserError(err).message);
      },
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ASSESSMENT_STATUS_DISPLAY } from '@constants/assessment-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IAssessment } from '@models/assessment/assessment.model';
import { IUserError } from '@models/common/user-error.model';
import { ICourse } from '@models/course/course.model';
import { ISection } from '@models/course/section.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { catchError, of } from 'rxjs';
import { AssessmentCreateMode, AssessmentCreateModalComponent } from '../assessment-create-modal/assessment-create-modal.component';
import { formatNumber, isStructureEditable } from '../assessments.util';

export interface IRowAction {
  label: string;
  link: string;
}

/**
 * Danh sách bài đánh giá của một lớp hoặc khung theo đề cương (ADR 0014, Schema v0.7).
 */
@Component({
  selector: 'app-list-assessments',
  templateUrl: './list-assessments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, NzTableModule, NzButtonModule, DisplayChipComponent, ErrorStateComponent,
    TestDataFlagComponent, AssessmentCreateModalComponent,
  ],
})
export class ListAssessmentsComponent implements OnInit {
  private readonly assessmentSvc = inject(AssessmentService);
  private readonly sectionSvc = inject(SectionService);
  private readonly courseSvc = inject(CourseService);
  private readonly authSvc = inject(AuthService);

  readonly sectionId = input<string>();
  readonly syllabusId = input<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = ASSESSMENT_STATUS_DISPLAY;
  protected readonly formatNumber = formatNumber;

  readonly roles = signal<string[]>([]);
  readonly currentUserId = signal('');
  readonly section = signal<ISection | null>(null);
  readonly course = signal<ICourse | null>(null);
  readonly assessments = signal<IAssessment[]>([]);
  readonly templates = signal<IAssessment[]>([]);

  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly isCreateVisible = signal(false);
  readonly presetTemplateId = signal<string | null>(null);

  readonly mode = computed<AssessmentCreateMode>(() => (this.sectionId() ? 'SECTION' : 'TEMPLATE'));
  readonly effectiveSyllabusId = computed(() => this.section()?.syllabusId ?? this.syllabusId() ?? null);
  readonly rows = computed(() => (this.mode() === 'SECTION' ? this.assessments() : this.templates()));

  readonly canCreate = computed(() => {
    const roles = this.roles();
    if (this.mode() === 'SECTION') {
      const section = this.section();
      return roles.includes(SystemConstant.ROLE.LECTURER) && !!section && section.lecturerIds.includes(this.currentUserId());
    }
    return roles.includes(SystemConstant.ROLE.LECTURER) || roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER);
  });

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.currentUserId.set(this.authSvc.getUserId());
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    const sectionId = this.sectionId();
    if (sectionId) {
      this.sectionSvc.getSection(sectionId).subscribe({
        next: section => {
          this.section.set(section);
          this.courseSvc.getCourseById(section.courseId).pipe(catchError(() => of(null))).subscribe(c => this.course.set(c));
          this.loadAssessments(sectionId);
          this.loadTemplates(section.syllabusId, false);
        },
        error: err => this.fail(err),
      });
      return;
    }
    const syllabusId = this.syllabusId();
    if (syllabusId) {
      this.loadTemplates(syllabusId, true);
    }
  }

  private loadAssessments(sectionId: string): void {
    this.assessmentSvc.getSectionAssessments(sectionId).subscribe({
      next: list => {
        this.assessments.set(list ?? []);
        this.isLoading.set(false);
      },
      error: err => this.fail(err),
    });
  }

  private loadTemplates(syllabusId: string, primary: boolean): void {
    this.assessmentSvc.getTemplates(syllabusId).subscribe({
      next: list => {
        this.templates.set(list ?? []);
        if (primary) {
          this.isLoading.set(false);
        }
      },
      error: err => (primary ? this.fail(err) : this.templates.set([])),
    });
  }

  private fail(err: unknown): void {
    this.isLoading.set(false);
    this.loadError.set(toUserError(err));
  }

  openCreate(templateId: string | null = null): void {
    this.presetTemplateId.set(templateId);
    this.isCreateVisible.set(true);
  }

  onCreated(): void {
    this.load();
  }

  structureNote(assessment: IAssessment): string {
    if (isStructureEditable(assessment)) {
      return 'Bản nháp (Sửa được)';
    }
    if (assessment.status === 'SCORE_ENTERED') {
      return 'Đã nhập điểm (Khóa cố định)';
    }
    return 'Đã khóa ma trận';
  }

  actionFor(assessment: IAssessment): IRowAction {
    const link = this.urlConst.ASSESSMENT_DETAIL(assessment.id);
    return {
      label: isStructureEditable(assessment) ? 'Chỉnh sửa' : 'Chi tiết',
      link,
    };
  }
}

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
 * Danh sách bài đánh giá của một lớp (route `sections/:sectionId`) hoặc khung theo đề cương (route
 * `syllabi/:syllabusId`) (F04 US-15). Luồng: Nháp, Đã gửi duyệt, Đã duyệt, Đã nhập điểm, Đã khóa; Bị từ chối quay
 * về Nháp. Ẩn nút theo vai trò chỉ để tiện dùng; backend kiểm tra quyền và trả 403/409/422.
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

  /** Gắn từ tham số route (withComponentInputBinding): chỉ một trong hai có giá trị. */
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

  /** Đề cương áp dụng: của lớp (khi xem theo lớp) hoặc đề cương trên đường dẫn (khi xem khung). */
  readonly effectiveSyllabusId = computed(() => this.section()?.syllabusId ?? this.syllabusId() ?? null);

  /** Danh sách đang hiển thị ở bảng chính. */
  readonly rows = computed(() => (this.mode() === 'SECTION' ? this.assessments() : this.templates()));

  /**
   * Chỉ để ẩn nút: bản lớp do LECTURER của lớp tạo; khung do LECTURER hoặc DEPARTMENT_HEAD soạn (trong phạm vi
   * học phần). Backend kiểm tra phạm vi thật.
   */
  readonly canCreate = computed(() => {
    const roles = this.roles();
    if (this.mode() === 'SECTION') {
      const section = this.section();
      return roles.includes(SystemConstant.ROLE.LECTURER) && !!section && section.lecturerIds.includes(this.currentUserId());
    }
    return roles.includes(SystemConstant.ROLE.LECTURER) || roles.includes(SystemConstant.ROLE.DEPARTMENT_HEAD);
  });

  readonly isDepartmentHead = computed(() => this.roles().includes(SystemConstant.ROLE.DEPARTMENT_HEAD));

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
      // Khung chỉ là phụ trợ ở màn của lớp: lỗi (ví dụ 403) không chặn danh sách bài của lớp
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

  /** Câu mô tả cột "Cấu trúc": nói rõ vì sao sửa được hoặc bị khóa. */
  structureNote(assessment: IAssessment): string {
    if (assessment.status === 'REJECTED') {
      return assessment.approval?.reviewNote ? `"${assessment.approval.reviewNote}"` : 'Bị từ chối, chưa có ghi chú';
    }
    if (assessment.status === 'SUBMITTED') {
      return 'Chờ Trưởng bộ môn duyệt';
    }
    return isStructureEditable(assessment) ? 'Sửa được' : 'Đã khóa, chỉ xem';
  }

  actionFor(assessment: IAssessment): IRowAction {
    if (assessment.scope === 'SECTION' && assessment.status === 'SUBMITTED' && this.isDepartmentHead()) {
      return { label: 'Duyệt', link: this.urlConst.ASSESSMENT_REVIEW(assessment.id) };
    }
    const link = this.urlConst.ASSESSMENT_DETAIL(assessment.id);
    if (assessment.scope === 'SECTION' && !isStructureEditable(assessment)) {
      return { label: 'Xem', link };
    }
    return { label: assessment.status === 'REJECTED' ? 'Sửa' : 'Mở', link };
  }

  /** Bài chờ duyệt cần chú ý (hiện ở đầu trang cho Trưởng bộ môn). */
  readonly pendingReviewCount = computed(() => this.assessments().filter(a => a.status === 'SUBMITTED').length);
}

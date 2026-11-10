import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  APPROVAL_ACTION_LABEL, ASSESSMENT_STATUS_DISPLAY, bloomLabel, ITEM_KIND_LABEL,
} from '@constants/assessment-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IAssessment, ICoverage } from '@models/assessment/assessment.model';
import { IUserError } from '@models/common/user-error.model';
import { IClo } from '@models/course/clo.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { CloService } from '@services/course/clo.service';
import { ActionDockComponent, DockTone } from '@widget/action-dock/action-dock.component';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { describeMappings, formatNumber, meterWidth } from '../assessments.util';

export const MAX_REJECT_NOTE_LENGTH = 1000;

/**
 * Màn hình Trưởng bộ môn duyệt ma trận bài đánh giá (F04 NEW-01, ADR 0001 phương án A). Duyệt việc gắn câu hỏi với
 * chuẩn đầu ra, KHÔNG duyệt nội dung câu hỏi. Độ phủ theo CLO và Bloom lấy nguyên từ API (/coverage), UI không tự
 * tính. Từ chối bắt buộc có ghi chú. Ẩn nút theo vai trò chỉ để tiện dùng; backend trả 403 (không đúng vai trò hoặc
 * người gửi tự duyệt), 409 (hai người cùng duyệt), 422 (sai thứ tự trạng thái).
 */
@Component({
  selector: 'app-review-assessment',
  templateUrl: './review-assessment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, FormsModule, RouterLink, NzTableModule, NzButtonModule, NzModalModule,
    ActionDockComponent, DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent,
  ],
})
export class ReviewAssessmentComponent implements OnInit {
  private readonly assessmentSvc = inject(AssessmentService);
  private readonly cloSvc = inject(CloService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);
  private readonly nzModal = inject(NzModalService);

  /** Gắn từ tham số route `:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = ASSESSMENT_STATUS_DISPLAY;
  protected readonly kindLabel = ITEM_KIND_LABEL;
  protected readonly actionLabel = APPROVAL_ACTION_LABEL;
  protected readonly maxNoteLength = MAX_REJECT_NOTE_LENGTH;
  protected readonly formatNumber = formatNumber;
  protected readonly meterWidth = meterWidth;
  protected readonly bloomLabel = bloomLabel;

  readonly roles = signal<string[]>([]);
  readonly currentUserId = signal('');
  readonly assessment = signal<IAssessment | null>(null);
  readonly coverage = signal<ICoverage | null>(null);
  readonly clos = signal<IClo[]>([]);

  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly coverageError = signal(false);
  readonly actionError = signal<IUserError | null>(null);
  readonly isActing = signal(false);

  readonly rejectNote = signal('');
  readonly rejectAttempted = signal(false);

  readonly cloCodes = computed<ReadonlyMap<string, string>>(() => new Map(this.clos().map(c => [c.id, c.code])));

  readonly isDepartmentHead = computed(() => this.roles().includes(SystemConstant.ROLE.DEPARTMENT_HEAD));

  /** Chỉ bài bản lớp đang chờ duyệt mới có hành động duyệt/từ chối. */
  readonly isAwaitingReview = computed(() => {
    const a = this.assessment();
    return !!a && a.scope === 'SECTION' && a.status === 'SUBMITTED';
  });

  /** Người gửi duyệt không tự duyệt bài của mình (NEW-01/AC-5): ẩn/khóa nút và giải thích; backend vẫn trả 403. */
  readonly isOwnSubmission = computed(() => {
    const submitter = this.assessment()?.approval?.submittedBy;
    return !!submitter && submitter === this.currentUserId();
  });

  readonly canAct = computed(() => this.isDepartmentHead() && this.isAwaitingReview() && !this.isOwnSubmission());

  readonly noteBlank = computed(() => this.rejectNote().trim().length === 0);
  readonly noteTooLong = computed(() => this.rejectNote().trim().length > MAX_REJECT_NOTE_LENGTH);

  readonly isConflict = computed(() => this.actionError()?.kind === 'CONFLICT');

  /** Danh sách phần tử của bài để hiển thị. */
  readonly items = computed(() => this.assessment()?.items ?? []);

  readonly dock = computed<{ tone: DockTone; message: string; }>(() => {
    const error = this.actionError();
    if (error) {
      return { tone: 'error', message: error.message };
    }
    if (this.rejectAttempted() && (this.noteBlank() || this.noteTooLong())) {
      return {
        tone: 'error',
        message: this.noteBlank() ? 'Chưa từ chối được: cần nhập ghi chú nêu rõ phải sửa gì.' : `Ghi chú dài tối đa ${MAX_REJECT_NOTE_LENGTH} ký tự.`,
      };
    }
    if (!this.isAwaitingReview()) {
      return { tone: 'neutral', message: 'Bài không ở trạng thái chờ duyệt.' };
    }
    if (!this.isDepartmentHead()) {
      return { tone: 'neutral', message: 'Chỉ Trưởng bộ môn của học phần mới duyệt hoặc từ chối được.' };
    }
    if (this.isOwnSubmission()) {
      return { tone: 'warning', message: 'Bạn là người gửi duyệt bài này nên không tự duyệt hoặc từ chối được.' };
    }
    return { tone: 'neutral', message: 'Bài đang chờ bạn duyệt.' };
  });

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.currentUserId.set(this.authSvc.getUserId());
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.assessmentSvc.getAssessment(this.id()).subscribe({
      next: assessment => {
        this.assessment.set(assessment);
        this.isLoading.set(false);
        this.cloSvc.getClosBySyllabus(assessment.syllabusId).pipe(catchError(() => of([] as IClo[])))
          .subscribe(list => this.clos.set(list ?? []));
        this.loadCoverage();
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  private loadCoverage(): void {
    this.coverageError.set(false);
    this.assessmentSvc.getCoverage(this.id()).subscribe({
      next: coverage => this.coverage.set(coverage),
      error: () => {
        this.coverage.set(null);
        this.coverageError.set(true);
      },
    });
  }

  mappingLabels(index: number): string[] {
    const item = this.items()[index];
    return item ? describeMappings(item, this.cloCodes()) : [];
  }

  confirmApprove(): void {
    if (!this.canAct() || this.isActing()) {
      return;
    }
    this.nzModal.confirm({
      nzTitle: 'Duyệt ma trận bài đánh giá?',
      nzContent: 'Sau khi duyệt, cấu trúc câu hỏi, điểm tối đa và CLO bị khóa; điểm nhập sau này gắn vào đúng ma trận này.',
      nzOkText: 'Duyệt',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.approve(),
    });
  }

  private approve(): void {
    this.run(this.assessmentSvc.approve(this.id()), 'Đã duyệt ma trận. Cấu trúc bài đã được khóa.');
  }

  reject(): void {
    if (!this.canAct() || this.isActing()) {
      return;
    }
    this.rejectAttempted.set(true);
    if (this.noteBlank() || this.noteTooLong()) {
      return;
    }
    this.run(this.assessmentSvc.reject(this.id(), { reviewNote: this.rejectNote().trim() }), 'Đã từ chối. Giảng viên sẽ thấy ghi chú để sửa.');
  }

  private run(request$: ReturnType<AssessmentService['approve']>, successMessage: string): void {
    this.isActing.set(true);
    this.actionError.set(null);
    request$.subscribe({
      next: updated => {
        this.isActing.set(false);
        this.assessment.set(updated);
        this.rejectNote.set('');
        this.rejectAttempted.set(false);
        this.alert.success(successMessage);
        this.loadCoverage();
      },
      error: err => {
        this.isActing.set(false);
        this.actionError.set(toUserError(err));
      },
    });
  }
}

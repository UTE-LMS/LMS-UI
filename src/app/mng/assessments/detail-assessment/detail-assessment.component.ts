import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  APPROVAL_ACTION_LABEL, ASSESSMENT_PHASE_LABEL, ASSESSMENT_STATUS_DISPLAY, ASSESSMENT_TYPE_LABEL,
  DATA_GRANULARITY_LABEL, ITEM_KIND_LABEL, toOptions,
} from '@constants/assessment-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import {
  AssessmentPhase, AssessmentType, DataGranularity, IAssessment, IAssessmentItem,
} from '@models/assessment/assessment.model';
import { IUserError } from '@models/common/user-error.model';
import { IClo } from '@models/course/clo.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { CloService } from '@services/course/clo.service';
import { ActionDockComponent, DockTone } from '@widget/action-dock/action-dock.component';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, map, of } from 'rxjs';
import { AssessmentItemModalComponent } from '../assessment-item-modal/assessment-item-modal.component';
import {
  cleanOptional, describeMappings, formatNumber, isStructureEditable, lockReason, renumber, submitHints,
  sumMaxScores, totalPointsMatches,
} from '../assessments.util';

/**
 * Soạn một bài đánh giá (F04 US-15, US-16): thông tin chung, danh sách câu hỏi/tiêu chí (điểm tối đa, Bloom, CLO
 * kèm phần điểm, rubric mức 1–4), lưu cấu trúc, gửi duyệt. Khóa sửa khi `locked` hoặc đang chờ duyệt.
 * Câu hỏi sửa trong bộ nhớ rồi mới ghi một lần bằng PUT items (thay toàn bộ). UI không tự quyết: mọi kiểm tra ở
 * đây chỉ là gợi ý, backend kiểm tra lại và trả 403/409/422.
 */
@Component({
  selector: 'app-detail-assessment',
  templateUrl: './detail-assessment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, FormsModule, ReactiveFormsModule, RouterLink, NzTableModule, NzButtonModule, NzModalModule, NzSelectModule,
    ActionDockComponent, DisplayChipComponent, ErrorStateComponent, BloomLevelLabelComponent, TestDataFlagComponent,
    AssessmentItemModalComponent,
  ],
})
export class DetailAssessmentComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
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
  protected readonly typeOptions = toOptions<AssessmentType>(ASSESSMENT_TYPE_LABEL);
  protected readonly phaseOptions = toOptions<AssessmentPhase>(ASSESSMENT_PHASE_LABEL);
  protected readonly granularityOptions = toOptions<DataGranularity>(DATA_GRANULARITY_LABEL);
  protected readonly formatNumber = formatNumber;

  readonly roles = signal<string[]>([]);
  readonly assessment = signal<IAssessment | null>(null);
  /** Bản làm việc của items: chỉ ghi lên backend khi bấm "Lưu cấu trúc". */
  readonly items = signal<IAssessmentItem[]>([]);
  readonly clos = signal<IClo[]>([]);
  readonly itemsDirty = signal(false);

  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly actionError = signal<IUserError | null>(null);
  readonly isSavingItems = signal(false);
  readonly isSavingInfo = signal(false);
  readonly isSubmitting = signal(false);

  readonly isItemModalVisible = signal(false);
  readonly editingIndex = signal<number | null>(null);

  readonly infoForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    type: [null as AssessmentType | null],
    phase: [null as AssessmentPhase | null],
    scheduledDate: [''],
    totalPoints: [null as number | null, [Validators.min(0)]],
    weightInCourse: [null as number | null, [Validators.min(0), Validators.max(1)]],
    dataGranularity: this.fb.control<DataGranularity>('ITEM'),
  });

  /** `FormGroup.dirty` không phải signal nên theo dõi qua valueChanges để thanh dưới cập nhật đúng. */
  private readonly infoDirty = toSignal(this.infoForm.valueChanges.pipe(map(() => this.infoForm.dirty)), { initialValue: false });

  readonly cloCodes = computed<ReadonlyMap<string, string>>(() => new Map(this.clos().map(c => [c.id, c.code])));

  /**
   * Chỉ để ẩn nút. Khung: LECTURER hoặc DEPARTMENT_HEAD soạn; bản lớp: chỉ LECTURER của lớp (backend kiểm tra
   * phạm vi). ADMIN, PROGRAM_MANAGER, QA, VIEWER chỉ đọc.
   */
  readonly canWrite = computed(() => {
    const a = this.assessment();
    const roles = this.roles();
    if (!a) {
      return false;
    }
    const lecturer = roles.includes(SystemConstant.ROLE.LECTURER);
    return a.scope === 'SYLLABUS_TEMPLATE' ? lecturer || roles.includes(SystemConstant.ROLE.DEPARTMENT_HEAD) : lecturer;
  });

  /** Có quyền (gợi ý) và cấu trúc chưa khóa. */
  readonly editable = computed(() => {
    const a = this.assessment();
    return !!a && this.canWrite() && isStructureEditable(a);
  });

  readonly lockMessage = computed(() => {
    const a = this.assessment();
    return a ? lockReason(a) : null;
  });

  readonly canSubmit = computed(() => {
    const a = this.assessment();
    return !!a && a.scope === 'SECTION' && a.status === 'DRAFT' && this.roles().includes(SystemConstant.ROLE.LECTURER);
  });

  readonly canReview = computed(() => {
    const a = this.assessment();
    return !!a && a.scope === 'SECTION' && a.status === 'SUBMITTED' && this.roles().includes(SystemConstant.ROLE.DEPARTMENT_HEAD);
  });

  readonly itemsSum = computed(() => sumMaxScores(this.items()));

  /** null: chưa khai báo tổng điểm. Chỉ để đối chiếu hiển thị; backend kiểm tra khi gửi duyệt. */
  readonly totalMatch = computed(() => totalPointsMatches(this.assessment()?.totalPoints, this.itemsSum()));

  readonly hints = computed(() => {
    const a = this.assessment();
    return a && this.canSubmit() ? submitHints(a, this.items(), this.hasUnsavedChanges()) : [];
  });

  readonly submitBlocked = computed(() => this.hints().some(h => h.blocking));

  readonly editingItem = computed(() => {
    const index = this.editingIndex();
    return index === null ? null : (this.items()[index] ?? null);
  });

  readonly otherCodes = computed(() => {
    const index = this.editingIndex();
    return this.items().filter((_, i) => i !== index).map(item => item.code);
  });

  readonly isConflict = computed(() => this.actionError()?.kind === 'CONFLICT');

  readonly dock = computed<{ tone: DockTone; message: string; }>(() => {
    const error = this.actionError();
    if (error) {
      return { tone: 'error', message: error.message };
    }
    if (this.hasUnsavedChanges()) {
      return { tone: 'warning', message: 'Có thay đổi chưa lưu.' };
    }
    const hint = this.hints()[0];
    if (hint) {
      return { tone: 'warning', message: hint.message };
    }
    const a = this.assessment();
    if (!this.editable()) {
      return { tone: 'neutral', message: a?.status === 'SUBMITTED' ? 'Đang chờ Trưởng bộ môn duyệt.' : 'Chỉ xem.' };
    }
    return { tone: 'neutral', message: 'Đã lưu.' };
  });

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.load();
  }

  hasUnsavedChanges(): boolean {
    return this.itemsDirty() || this.infoDirty();
  }

  /** Chặn rời trang khi còn thay đổi chưa lưu (guard canDeactivate dùng chung). */
  canDeactivate(): boolean {
    return !this.hasUnsavedChanges() || window.confirm('Có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?');
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.assessmentSvc.getAssessment(this.id()).subscribe({
      next: assessment => {
        this.applyAssessment(assessment, true);
        this.isLoading.set(false);
        this.cloSvc.getClosBySyllabus(assessment.syllabusId).pipe(catchError(() => of([] as IClo[])))
          .subscribe(list => this.clos.set(list ?? []));
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  /** Nạp phản hồi vào màn hình; `resetItems=false` giữ bản làm việc của items khi chỉ lưu thông tin. */
  private applyAssessment(assessment: IAssessment, resetItems: boolean): void {
    this.assessment.set(assessment);
    if (resetItems) {
      this.items.set(assessment.items ?? []);
      this.itemsDirty.set(false);
    }
    this.infoForm.reset({
      name: assessment.name,
      type: assessment.type ?? null,
      phase: assessment.phase ?? null,
      scheduledDate: assessment.scheduledAt ? assessment.scheduledAt.slice(0, 10) : '',
      totalPoints: assessment.totalPoints ?? null,
      weightInCourse: assessment.weightInCourse ?? null,
      dataGranularity: assessment.dataGranularity,
    });
    if (this.editable()) {
      this.infoForm.enable({ emitEvent: false });
    } else {
      this.infoForm.disable({ emitEvent: false });
    }
  }

  // ------------------------------------------------------------------ thông tin chung

  saveInfo(): void {
    const a = this.assessment();
    if (!a || !this.editable() || this.isSavingInfo()) {
      return;
    }
    this.infoForm.markAllAsTouched();
    if (this.infoForm.invalid) {
      return;
    }
    const v = this.infoForm.getRawValue();
    this.isSavingInfo.set(true);
    this.actionError.set(null);
    this.assessmentSvc.updateAssessment(a.id, {
      name: v.name.trim(),
      type: v.type ?? undefined,
      phase: v.phase ?? undefined,
      scheduledAt: cleanOptional(v.scheduledDate) ? `${v.scheduledDate}T00:00:00Z` : undefined,
      totalPoints: v.totalPoints ?? undefined,
      weightInCourse: v.weightInCourse ?? undefined,
      dataGranularity: v.dataGranularity,
    }).subscribe({
      next: updated => {
        this.isSavingInfo.set(false);
        this.applyAssessment(updated, false);
        this.alert.success('Đã lưu thông tin bài');
      },
      error: err => {
        this.isSavingInfo.set(false);
        this.actionError.set(toUserError(err));
      },
    });
  }

  // ------------------------------------------------------------------ câu hỏi / tiêu chí

  openAddItem(): void {
    this.editingIndex.set(null);
    this.isItemModalVisible.set(true);
  }

  openEditItem(index: number): void {
    this.editingIndex.set(index);
    this.isItemModalVisible.set(true);
  }

  onItemSaved(item: IAssessmentItem): void {
    const index = this.editingIndex();
    this.items.update(list => (index === null ? [...list, item] : list.map((current, i) => (i === index ? item : current))));
    this.itemsDirty.set(true);
  }

  removeItem(index: number): void {
    const item = this.items()[index];
    this.nzModal.confirm({
      nzTitle: `Bỏ ${item.code} khỏi bài?`,
      nzContent: 'Thay đổi chỉ có hiệu lực sau khi bấm "Lưu cấu trúc".',
      nzOkText: 'Bỏ phần tử',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.items.update(list => list.filter((_, i) => i !== index));
        this.itemsDirty.set(true);
      },
    });
  }

  moveItem(index: number, delta: -1 | 1): void {
    const target = index + delta;
    this.items.update(list => {
      if (target < 0 || target >= list.length) {
        return list;
      }
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
    this.itemsDirty.set(true);
  }

  /** Ghi toàn bộ cấu trúc (PUT items). Lỗi 422 (Σ phần điểm, CLO không thuộc đề cương, đã khóa...) hiện nguyên văn. */
  saveItems(): void {
    const a = this.assessment();
    if (!a || !this.editable() || this.isSavingItems()) {
      return;
    }
    this.isSavingItems.set(true);
    this.actionError.set(null);
    this.assessmentSvc.replaceItems(a.id, { items: renumber(this.items()) }).subscribe({
      next: updated => {
        this.isSavingItems.set(false);
        this.assessment.set(updated);
        this.items.set(updated.items ?? []);
        this.itemsDirty.set(false);
        this.alert.success('Đã lưu cấu trúc bài');
      },
      error: err => {
        this.isSavingItems.set(false);
        this.actionError.set(toUserError(err));
      },
    });
  }

  // ------------------------------------------------------------------ gửi duyệt

  confirmSubmit(): void {
    if (!this.canSubmit() || this.submitBlocked() || this.isSubmitting()) {
      return;
    }
    this.nzModal.confirm({
      nzTitle: 'Gửi duyệt ma trận bài đánh giá?',
      nzContent: 'Sau khi gửi, cấu trúc tạm khóa sửa cho tới khi Trưởng bộ môn duyệt hoặc từ chối. Người gửi không tự duyệt bài của mình.',
      nzOkText: 'Gửi duyệt',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.submit(),
    });
  }

  private submit(): void {
    const a = this.assessment();
    if (!a) {
      return;
    }
    this.isSubmitting.set(true);
    this.actionError.set(null);
    this.assessmentSvc.submit(a.id).subscribe({
      next: updated => {
        this.isSubmitting.set(false);
        this.applyAssessment(updated, true);
        this.alert.success('Đã gửi duyệt');
      },
      error: err => {
        this.isSubmitting.set(false);
        this.actionError.set(toUserError(err));
      },
    });
  }

  mappingLabels(item: IAssessmentItem): string[] {
    return describeMappings(item, this.cloCodes());
  }

  rubricCount(item: IAssessmentItem): number {
    return item.rubric?.levels?.length ?? 0;
  }
}

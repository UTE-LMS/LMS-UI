import { ChangeDetectionStrategy, Component, computed, HostListener, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ASSESSMENT_PHASE_LABEL, ASSESSMENT_STATUS_DISPLAY, ASSESSMENT_TYPE_LABEL, toOptions,
} from '@constants/assessment-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import {
  AssessmentPhase, AssessmentType, IAssessment, IAssessmentCloWeight, IAssessmentItem,
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
  cleanOptional, describeMappings, formatNumber, isStructureEditable, lockHints, lockReason, renumber,
  sumCloWeights, sumItemMaxScores,
} from '../assessments.util';

/**
 * Quản lý chi tiết bài đánh giá (ADR 0014, Schema v0.7):
 * - Thông tin chung
 * - Cấu trúc câu hỏi: Điểm tối đa theo từng CLO, mức Bloom 1–6
 * - Bảng tỷ trọng đóng góp của bài đánh giá cho từng CLO (cloWeights)
 * - Khóa ma trận câu hỏi (lock) / Mở khóa lại (unlock)
 */
@Component({
  selector: 'app-detail-assessment',
  templateUrl: './detail-assessment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink, NzTableModule, NzButtonModule, NzModalModule, NzSelectModule,
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
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = ASSESSMENT_STATUS_DISPLAY;
  protected readonly typeOptions = toOptions<AssessmentType>(ASSESSMENT_TYPE_LABEL);
  protected readonly phaseOptions = toOptions<AssessmentPhase>(ASSESSMENT_PHASE_LABEL);
  protected readonly formatNumber = formatNumber;
  protected readonly describeMappings = describeMappings;

  readonly roles = signal<string[]>([]);
  readonly assessment = signal<IAssessment | null>(null);
  readonly items = signal<IAssessmentItem[]>([]);
  readonly cloWeights = signal<IAssessmentCloWeight[]>([]);
  readonly clos = signal<IClo[]>([]);
  readonly itemsDirty = signal(false);
  readonly cloWeightsDirty = signal(false);

  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly actionError = signal<IUserError | null>(null);
  readonly isSavingItems = signal(false);
  readonly isSavingInfo = signal(false);
  readonly isLocking = signal(false);

  readonly isItemModalVisible = signal(false);
  readonly editingIndex = signal<number | null>(null);

  readonly infoForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    type: [null as AssessmentType | null],
    phase: [null as AssessmentPhase | null],
    scheduledDate: [''],
  });

  private readonly infoDirty = toSignal(this.infoForm.valueChanges.pipe(map(() => this.infoForm.dirty)), { initialValue: false });

  readonly cloCodes = computed<ReadonlyMap<string, string>>(() => new Map(this.clos().map(c => [c.id, c.code])));

  readonly canWrite = computed(() => {
    const a = this.assessment();
    const roles = this.roles();
    if (!a) return false;
    const lecturer = roles.includes(SystemConstant.ROLE.LECTURER);
    return a.scope === 'SYLLABUS_TEMPLATE' ? lecturer || roles.includes(SystemConstant.ROLE.DEPARTMENT_HEAD) : lecturer;
  });

  readonly editable = computed(() => {
    const a = this.assessment();
    return !!a && this.canWrite() && isStructureEditable(a);
  });

  readonly lockMessage = computed(() => {
    const a = this.assessment();
    return a ? lockReason(a) : null;
  });

  readonly itemsSum = computed(() => sumItemMaxScores(this.items()));
  readonly totalCloWeight = computed(() => sumCloWeights(this.cloWeights()));

  readonly hints = computed(() => {
    const a = this.assessment();
    if (!a || !this.editable()) return [];
    return lockHints({ cloWeights: this.cloWeights() }, this.items(), this.hasUnsavedChanges());
  });

  readonly lockBlocked = computed(() => this.hints().some(h => h.blocking));

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
    if (error) return { tone: 'error', message: error.message };
    if (this.hasUnsavedChanges()) return { tone: 'warning', message: 'Có thay đổi chưa lưu.' };
    const a = this.assessment();
    if (!this.editable()) {
      return { tone: 'neutral', message: a?.status === 'SCORE_ENTERED' ? 'Đã nhập điểm (Khóa cố định).' : 'Đã khóa ma trận.' };
    }
    return { tone: 'neutral', message: 'Đã lưu tất cả thay đổi.' };
  });

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.load();
  }

  hasUnsavedChanges(): boolean {
    return this.itemsDirty() || this.infoDirty() || this.cloWeightsDirty();
  }

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

  private applyAssessment(assessment: IAssessment, resetItems: boolean): void {
    this.assessment.set(assessment);
    if (resetItems) {
      this.items.set(assessment.items ?? []);
      this.cloWeights.set(assessment.cloWeights ?? []);
      this.itemsDirty.set(false);
      this.cloWeightsDirty.set(false);
    }
    this.infoForm.reset({
      name: assessment.name,
      type: assessment.type ?? null,
      phase: assessment.phase ?? null,
      scheduledDate: assessment.scheduledAt ? assessment.scheduledAt.slice(0, 10) : '',
    });
    if (this.editable()) {
      this.infoForm.enable({ emitEvent: false });
    } else {
      this.infoForm.disable({ emitEvent: false });
    }
  }

  saveInfo(): void {
    const a = this.assessment();
    if (!a || !this.editable() || this.isSavingInfo()) return;
    this.infoForm.markAllAsTouched();
    if (this.infoForm.invalid) return;

    const v = this.infoForm.getRawValue();
    this.isSavingInfo.set(true);
    this.actionError.set(null);
    this.assessmentSvc.updateAssessment(a.id, {
      name: v.name.trim(),
      type: v.type ?? undefined,
      phase: v.phase ?? undefined,
      scheduledAt: cleanOptional(v.scheduledDate) ? `${v.scheduledDate}T00:00:00Z` : undefined,
      cloWeights: this.cloWeights(),
    }).subscribe({
      next: updated => {
        this.isSavingInfo.set(false);
        this.applyAssessment(updated, false);
        this.cloWeightsDirty.set(false);
        this.alert.success('Đã lưu thông tin chung.');
      },
      error: err => {
        this.isSavingInfo.set(false);
        this.actionError.set(toUserError(err));
      },
    });
  }

  saveItems(): void {
    const a = this.assessment();
    if (!a || !this.editable() || this.isSavingItems()) return;
    this.isSavingItems.set(true);
    this.actionError.set(null);
    this.assessmentSvc.replaceItems(a.id, { items: this.items() }).subscribe({
      next: updated => {
        this.isSavingItems.set(false);
        this.items.set(updated.items ?? []);
        this.itemsDirty.set(false);
        this.alert.success('Đã lưu cấu trúc câu hỏi.');
      },
      error: err => {
        this.isSavingItems.set(false);
        this.actionError.set(toUserError(err));
      },
    });
  }

  lockAssessment(): void {
    const a = this.assessment();
    if (!a || !this.editable() || this.isLocking()) return;
    if (this.hasUnsavedChanges()) {
      this.alert.warning('Vui lòng lưu thay đổi trước khi khóa ma trận.');
      return;
    }
    this.nzModal.confirm({
      nzTitle: 'Khóa ma trận đánh giá',
      nzContent: 'Sau khi khóa, ma trận câu hỏi và trọng số CLO sẽ không thể thay đổi trừ khi bạn mở khóa lại. Bạn có chắc chắn muốn khóa?',
      nzOkText: 'Khóa ma trận',
      nzOkType: 'primary',
      nzOnOk: () => {
        this.isLocking.set(true);
        this.assessmentSvc.lock(a.id).subscribe({
          next: updated => {
            this.isLocking.set(false);
            this.applyAssessment(updated, true);
            this.alert.success('Đã khóa ma trận thành công.');
          },
          error: err => {
            this.isLocking.set(false);
            this.actionError.set(toUserError(err));
          },
        });
      },
    });
  }

  unlockAssessment(): void {
    const a = this.assessment();
    if (a?.status !== 'LOCKED' || this.isLocking()) {
      return;
    }
    this.nzModal.confirm({
      nzTitle: 'Mở khóa ma trận đánh giá',
      nzContent: 'Mở lại trạng thái Bản nháp để chỉnh sửa cấu trúc câu hỏi và trọng số CLO?',
      nzOkText: 'Mở khóa',
      nzOnOk: () => {
        this.isLocking.set(true);
        this.assessmentSvc.unlock(a.id).subscribe({
          next: updated => {
            this.isLocking.set(false);
            this.applyAssessment(updated, true);
            this.alert.success('Đã mở khóa ma trận về bản nháp.');
          },
          error: err => {
            this.isLocking.set(false);
            this.actionError.set(toUserError(err));
          },
        });
      },
    });
  }

  deleteAssessment(): void {
    const a = this.assessment();
    if (a?.status !== 'DRAFT') {
      return;
    }
    this.nzModal.confirm({
      nzTitle: 'Xóa bài đánh giá',
      nzContent: `Xác nhận xóa bài đánh giá ${a.code}? Hành động này không thể hoàn tác.`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzOnOk: () => {
        this.assessmentSvc.deleteAssessment(a.id).subscribe({
          next: () => {
            this.alert.success('Đã xóa bài đánh giá.');
            if (a.scope === 'SECTION' && a.sectionId) {
              this.router.navigateByUrl(this.urlConst.ASSESSMENTS_OF_SECTION(a.sectionId));
            } else {
              this.router.navigateByUrl(this.urlConst.ASSESSMENT_TEMPLATES(a.syllabusId));
            }
          },
          error: err => this.actionError.set(toUserError(err)),
        });
      },
    });
  }

  updateCloWeight(cloId: string, weight: number): void {
    const current = [...this.cloWeights()];
    const index = current.findIndex(c => c.cloId === cloId);
    if (index >= 0) {
      current[index] = { cloId, weight };
    } else {
      current.push({ cloId, weight });
    }
    this.cloWeights.set(current);
    this.cloWeightsDirty.set(true);
  }

  openCreateItemModal(): void {
    this.editingIndex.set(null);
    this.isItemModalVisible.set(true);
  }

  openEditItemModal(index: number): void {
    this.editingIndex.set(index);
    this.isItemModalVisible.set(true);
  }

  onItemSaved(item: IAssessmentItem): void {
    const index = this.editingIndex();
    const current = [...this.items()];
    if (index === null) {
      current.push(item);
    } else {
      current[index] = item;
    }
    this.items.set(renumber(current));
    this.itemsDirty.set(true);

    // Tự động đồng bộ các CLO mới xuất hiện vào cloWeights nếu chưa có
    const existingCloIds = new Set(this.cloWeights().map(c => c.cloId));
    const nextCloWeights = [...this.cloWeights()];
    let added = false;
    for (const m of item.outcomeMappings) {
      if (!existingCloIds.has(m.cloId)) {
        nextCloWeights.push({ cloId: m.cloId, weight: 0.1 });
        existingCloIds.add(m.cloId);
        added = true;
      }
    }
    if (added) {
      this.cloWeights.set(nextCloWeights);
      this.cloWeightsDirty.set(true);
    }
  }

  removeItem(index: number): void {
    if (!this.editable()) return;
    const current = this.items().filter((_, i) => i !== index);
    this.items.set(renumber(current));
    this.itemsDirty.set(true);
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IMPORT_BATCH_STATUS_DISPLAY } from '@constants/assessment-display.constant';
import { UrlConstant } from '@constants/url.constant';
import { IAssessment } from '@models/assessment/assessment.model';
import { IImportBatch, IImportRowError, ImportBatchStatus } from '@models/assessment/score-import.model';
import { IUserError } from '@models/common/user-error.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { ScoreImportService } from '@services/assessment/score-import.service';
import { toUserError } from '@services/common/api-error.util';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { finalize, switchMap } from 'rxjs';

/** Trạng thái còn hủy được, khớp rollbackBatch() của backend (CONFIRMED và ROLLED_BACK bị từ chối). */
export const ROLLBACKABLE_STATUSES: readonly ImportBatchStatus[] = ['UPLOADED', 'VALIDATED', 'HAS_ERRORS'];

export const ERRORS_PAGE_SIZE = 50;

/**
 * F05b - Lịch sử và chi tiết các lần nhập điểm của một bài đánh giá.
 * Danh sách bên trên; chọn một lần nhập để xem thống kê, lỗi theo dòng/cột và hủy (khi còn được hủy).
 */
@Component({
  selector: 'app-import-batches',
  imports: [DatePipe, RouterLink, NzButtonModule, NzModalModule, NzTableModule, DisplayChipComponent, ErrorStateComponent],
  templateUrl: './import-batches.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportBatchesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assessmentSvc = inject(AssessmentService);
  private readonly importSvc = inject(ScoreImportService);
  private readonly modal = inject(NzModalService);
  private readonly toastr = inject(ToastrService);

  /** ID bài đánh giá, lấy từ route `:id`. */
  readonly id = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = IMPORT_BATCH_STATUS_DISPLAY;
  protected readonly errorsPageSize = ERRORS_PAGE_SIZE;

  readonly assessment = signal<IAssessment | null>(null);
  readonly batches = signal<IImportBatch[]>([]);
  readonly loading = signal(false);
  readonly error = signal<IUserError | null>(null);

  readonly selected = signal<IImportBatch | null>(null);
  readonly rowErrors = signal<IImportRowError[]>([]);
  readonly errorsTotal = signal(0);
  readonly errorsPage = signal(1);
  readonly errorsLoading = signal(false);
  readonly errorTypeFilter = signal<string | null>(null);
  readonly rollingBack = signal(false);

  /** Mới nhất lên đầu (sắp xếp thuần hiển thị). */
  readonly sortedBatches = computed(() => [...this.batches()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')));

  readonly errorTypes = computed(() => [...new Set(this.rowErrors().map(e => e.errorType))]);

  readonly visibleErrors = computed(() => {
    const type = this.errorTypeFilter();
    return type ? this.rowErrors().filter(e => e.errorType === type) : this.rowErrors();
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.assessmentSvc.getAssessment(this.id()).pipe(
      switchMap(a => {
        this.assessment.set(a);
        return this.importSvc.listBatches(a.sectionId ?? '', a.id);
      }),
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: list => {
        this.batches.set(list);
        const current = this.selected();
        if (current) {
          this.selected.set(list.find(b => b.id === current.id) ?? null);
        }
      },
      error: (err: unknown) => this.error.set(toUserError(err)),
    });
  }

  select(batch: IImportBatch): void {
    if (this.selected()?.id === batch.id) {
      this.selected.set(null);
      return;
    }
    this.selected.set(batch);
    this.errorTypeFilter.set(null);
    this.loadErrors(1);
  }

  loadErrors(page: number): void {
    const batch = this.selected();
    if (!batch) {
      return;
    }
    this.errorsLoading.set(true);
    this.errorsPage.set(page);
    this.importSvc.getErrors(batch.id, page - 1, ERRORS_PAGE_SIZE).pipe(
      finalize(() => this.errorsLoading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: res => {
        this.rowErrors.set(res.content);
        this.errorsTotal.set(res.totalElements);
      },
      error: () => {
        this.rowErrors.set([]);
        this.errorsTotal.set(0);
        this.toastr.error('Không tải được danh sách lỗi của lần nhập này');
      },
    });
  }

  canRollback(batch: IImportBatch): boolean {
    return ROLLBACKABLE_STATUSES.includes(batch.status);
  }

  confirmRollback(batch: IImportBatch): void {
    if (!this.canRollback(batch) || this.rollingBack()) {
      return;
    }
    this.modal.confirm({
      nzTitle: `Hủy lần nhập ${batch.fileName}?`,
      nzContent: 'Lần nhập chuyển sang Đã hủy và không lưu được nữa. Chưa có điểm nào được ghi nên điểm hiện có không đổi.',
      nzOkText: 'Hủy lần nhập',
      nzOkDanger: true,
      nzCancelText: 'Giữ lại',
      nzOnOk: () => this.rollback(batch),
    });
  }

  private rollback(batch: IImportBatch): void {
    this.rollingBack.set(true);
    this.importSvc.rollbackBatch(batch.id).pipe(
      finalize(() => this.rollingBack.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: updated => {
        this.batches.update(list => list.map(b => (b.id === updated.id ? updated : b)));
        this.selected.set(updated);
        this.toastr.success('Đã hủy lần nhập');
      },
      error: (err: unknown) => this.toastr.error(toUserError(err).message),
    });
  }
}

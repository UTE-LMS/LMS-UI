import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ASSESSMENT_STATUS_DISPLAY, bloomLabel,
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

/**
 * Màn hình xem độ phủ ma trận bài đánh giá (ADR 0014, NEW-01/AC-6).
 * Hiển thị độ phủ theo CLO và phân bố theo mức độ Bloom do backend tính toán (/coverage).
 */
@Component({
  selector: 'app-review-assessment',
  templateUrl: './review-assessment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, NzTableModule, NzButtonModule, NzModalModule,
    ActionDockComponent, DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent,
  ],
})
export class ReviewAssessmentComponent implements OnInit {
  private readonly assessmentSvc = inject(AssessmentService);
  private readonly cloSvc = inject(CloService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);
  private readonly nzModal = inject(NzModalService);

  readonly id = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = ASSESSMENT_STATUS_DISPLAY;
  protected readonly formatNumber = formatNumber;
  protected readonly meterWidth = meterWidth;
  protected readonly bloomLabel = bloomLabel;
  protected readonly describeMappings = describeMappings;

  readonly roles = signal<string[]>([]);
  readonly assessment = signal<IAssessment | null>(null);
  readonly coverage = signal<ICoverage | null>(null);
  readonly clos = signal<IClo[]>([]);

  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly coverageError = signal<IUserError | null>(null);
  readonly isLocking = signal(false);

  readonly cloCodes = computed<ReadonlyMap<string, string>>(() => new Map(this.clos().map(c => [c.id, c.code])));
  readonly items = computed(() => this.assessment()?.items ?? []);

  readonly canLock = computed(() => {
    const a = this.assessment();
    return !!a && a.status === 'DRAFT' && this.roles().includes(SystemConstant.ROLE.LECTURER);
  });

  readonly canUnlock = computed(() => {
    const a = this.assessment();
    return !!a && a.status === 'LOCKED' && this.roles().includes(SystemConstant.ROLE.LECTURER);
  });

  readonly dock = computed<{ tone: DockTone; message: string; }>(() => {
    const a = this.assessment();
    if (!a) return { tone: 'neutral', message: '' };
    if (a.status === 'DRAFT') return { tone: 'warning', message: 'Ma trận ở trạng thái Nháp (chưa khóa).' };
    if (a.status === 'LOCKED') return { tone: 'info', message: 'Ma trận đã khóa, sẵn sàng nhập điểm.' };
    return { tone: 'neutral', message: 'Đã nhập điểm thi.' };
  });

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.coverageError.set(null);
    this.assessmentSvc.getAssessment(this.id()).subscribe({
      next: assessment => {
        this.assessment.set(assessment);
        this.isLoading.set(false);
        this.loadClos(assessment.syllabusId);
        this.loadCoverage(assessment.id);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  private loadClos(syllabusId: string): void {
    this.cloSvc.getClosBySyllabus(syllabusId).pipe(catchError(() => of([] as IClo[])))
      .subscribe(list => this.clos.set(list ?? []));
  }

  private loadCoverage(assessmentId: string): void {
    this.assessmentSvc.getCoverage(assessmentId).subscribe({
      next: cov => this.coverage.set(cov),
      error: err => this.coverageError.set(toUserError(err)),
    });
  }

  lock(): void {
    const a = this.assessment();
    if (!a || !this.canLock() || this.isLocking()) return;
    this.nzModal.confirm({
      nzTitle: 'Khóa ma trận đánh giá',
      nzContent: 'Khóa ma trận để chuẩn bị nhập điểm sinh viên?',
      nzOkText: 'Khóa ma trận',
      nzOnOk: () => {
        this.isLocking.set(true);
        this.assessmentSvc.lock(a.id).subscribe({
          next: updated => {
            this.isLocking.set(false);
            this.assessment.set(updated);
            this.alert.success('Đã khóa ma trận thành công.');
            this.loadCoverage(a.id);
          },
          error: err => {
            this.isLocking.set(false);
            this.alert.error(toUserError(err).message);
          },
        });
      },
    });
  }

  unlock(): void {
    const a = this.assessment();
    if (!a || !this.canUnlock() || this.isLocking()) return;
    this.nzModal.confirm({
      nzTitle: 'Mở khóa ma trận',
      nzContent: 'Chuyển lại về trạng thái Nháp để chỉnh sửa câu hỏi và CLO?',
      nzOkText: 'Mở khóa',
      nzOnOk: () => {
        this.isLocking.set(true);
        this.assessmentSvc.unlock(a.id).subscribe({
          next: updated => {
            this.isLocking.set(false);
            this.assessment.set(updated);
            this.alert.success('Đã mở khóa ma trận về bản nháp.');
          },
          error: err => {
            this.isLocking.set(false);
            this.alert.error(toUserError(err).message);
          },
        });
      },
    });
  }
}

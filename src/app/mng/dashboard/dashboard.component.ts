import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CALCULATION_SCOPE_LABEL } from '@constants/analytics-display.constant';
import { PLACEHOLDER } from '@constants/measurement-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISection } from '@models/course/section.model';
import { AggregateResultResponse, CalculationRunResponse } from '@models/measurement/measurement.model';
import { AuthService } from '@services/auth/auth.service';
import { SectionService } from '@services/course/section.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { StaleWarningComponent } from '@widget/stale-warning/stale-warning.component';
import { UnofficialLabelComponent } from '@widget/unofficial-label/unofficial-label.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { catchError, finalize, forkJoin, of } from 'rxjs';

export interface IQuickLink {
  title: string;
  hint: string;
  icon: string;
  link: string;
  roles: readonly string[];
}

const ROLE = SystemConstant.MNG_ROLE;
const ROUTE = UrlConstant.ROUTE.MANAGEMENT;

/** Lối tắt theo vai trò; chỉ để tiện điều hướng, quyền thật do backend kiểm tra. */
export const QUICK_LINKS: readonly IQuickLink[] = [
  { title: 'Lớp học phần', hint: 'Danh sách lớp, ghi danh, bài đánh giá', icon: 'fa-users', link: ROUTE.SECTIONS,
    roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER, ROLE.LECTURER, ROLE.QA] },
  { title: 'Đo lường', hint: 'Chạy tính và xem kết quả CLO, PI, PLO', icon: 'fa-calculator', link: ROUTE.CALCULATIONS,
    roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER, ROLE.LECTURER, ROLE.QA] },
  { title: 'Báo cáo & truy vết', hint: 'Lập báo cáo, xuất CSV, truy về điểm gốc', icon: 'fa-chart-pie', link: ROUTE.REPORTS,
    roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER, ROLE.LECTURER, ROLE.QA] },
  { title: 'Phân tích đa chiều', hint: 'So sánh theo học kỳ, lớp, khóa, giảng viên…', icon: 'fa-chart-column',
    link: ROUTE.ANALYTICS, roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER, ROLE.LECTURER, ROLE.QA] },
  { title: 'Chương trình đào tạo', hint: 'Phiên bản CTĐT, PLO, PI', icon: 'fa-book-open', link: ROUTE.CURRICULUM,
    roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER, ROLE.QA] },
  { title: 'Người dùng', hint: 'Tài khoản, vai trò, phạm vi', icon: 'fa-user-shield', link: ROUTE.USERS, roles: [ROLE.ADMIN] },
  { title: 'Nhật ký thao tác', hint: 'Ai đã làm gì, khi nào', icon: 'fa-clock-rotate-left', link: ROUTE.AUDIT_LOGS,
    roles: [ROLE.ADMIN] },
];

/** Lần tính xong gần nhất (theo thời điểm kết thúc, rồi bắt đầu). */
export function latestSuccessfulRun(runs: readonly CalculationRunResponse[]): CalculationRunResponse | null {
  const done = runs.filter(r => r.status === 'SUCCESS');
  done.sort((a, b) => (b.finishedAt ?? b.startedAt ?? '').localeCompare(a.finishedAt ?? a.startedAt ?? ''));
  return done[0] ?? null;
}

/**
 * Tổng quan: lần tính gần nhất trong phạm vi người dùng và kết quả tổng hợp PI/PLO của lần đó, kèm mẫu số.
 * Mọi số liệu lấy nguyên từ API (rule 02); không có số thì hiện "Chưa có", không hiện 0.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, RouterLink, NzButtonModule, StaleWarningComponent, UnofficialLabelComponent],
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSvc = inject(AuthService);
  private readonly calcSvc = inject(CalculationService);
  private readonly sectionSvc = inject(SectionService);

  protected readonly route = ROUTE;
  protected readonly placeholder = PLACEHOLDER;
  protected readonly scopeLabel = CALCULATION_SCOPE_LABEL;

  readonly username = this.authSvc.getUsername();
  readonly quickLinks = QUICK_LINKS.filter(l => this.authSvc.hasAnyRole(l.roles));

  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly sections = signal<ISection[] | null>(null);
  readonly runs = signal<CalculationRunResponse[]>([]);
  readonly piResults = signal<AggregateResultResponse[]>([]);
  readonly ploResults = signal<AggregateResultResponse[]>([]);

  readonly latestRun = computed(() => latestSuccessfulRun(this.runs()));
  readonly failedRuns = computed(() => this.runs().filter(r => r.status === 'FAILED').length);
  readonly runningRuns = computed(() => this.runs().filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    forkJoin({
      sections: this.sectionSvc.getSections().pipe(catchError(() => of(null))),
      runs: this.calcSvc.getCalculationRuns(undefined, 0, 20).pipe(catchError(() => of(null))),
    }).pipe(
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ sections, runs }) => {
      this.sections.set(sections);
      this.loadFailed.set(sections === null && runs === null);
      this.runs.set(runs?.content ?? []);
      this.loadAggregates();
    });
  }

  private loadAggregates(): void {
    const run = this.latestRun();
    if (!run) {
      this.piResults.set([]);
      this.ploResults.set([]);
      return;
    }
    forkJoin({
      pi: this.calcSvc.getAggregateResults(run.id, 'PI', undefined, 0, 100).pipe(catchError(() => of(null))),
      plo: this.calcSvc.getAggregateResults(run.id, 'PLO', undefined, 0, 100).pipe(catchError(() => of(null))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ pi, plo }) => {
      this.piResults.set(pi?.content ?? []);
      this.ploResults.set(plo?.content ?? []);
    });
  }

  /** Độ rộng thanh: mean là tỷ lệ 0–1 do backend tính; chỉ nhân 100 để vẽ. */
  meterWidth(mean: number | null | undefined): number {
    return mean === null || mean === undefined ? 0 : Math.max(0, Math.min(1, mean)) * 100;
  }
}

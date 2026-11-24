import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CALCULATION_SCOPE_LABEL,
  REPORT_TYPE_LABEL,
  RESULT_LEVEL_LABEL,
  RESULT_STATUS_LABEL,
} from '@constants/analytics-display.constant';
import { ISection } from '@models/course/section.model';
import {
  CalculationRunResponse,
  ReportCreateRequest,
  ReportResponse,
  ReportType,
} from '@models/measurement/measurement.model';
import { TraceModalComponent } from '@mng/reports/trace-modal/trace-modal.component';
import { toApiError } from '@services/common/api-error.util';
import { SectionService } from '@services/course/section.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ReportService } from '@services/measurement/report.service';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { Paginate } from '@widget/paginate/paginate.model';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzSelectModule,
    NzInputModule,
    NzTableModule,
    NzTagModule,
    NzAlertModule,
    TablePaginateComponent,
    TraceModalComponent,
  ],
  templateUrl: './reports-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent implements OnInit {
  private readonly reportSvc = inject(ReportService);
  private readonly calcSvc = inject(CalculationService);
  private readonly sectionSvc = inject(SectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  protected readonly reportTypeLabel = REPORT_TYPE_LABEL;
  protected readonly scopeLabel = CALCULATION_SCOPE_LABEL;
  protected readonly levelLabel = RESULT_LEVEL_LABEL;
  protected readonly resultStatusLabel = RESULT_STATUS_LABEL;

  readonly reports = signal<ReportResponse[]>([]);
  readonly loadingReports = signal<boolean>(false);
  readonly reportsError = signal<string | null>(null);
  readonly page = signal<number>(0);
  readonly size = signal<number>(20);
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(1);

  readonly reportPageConfig = computed(() => new Paginate<ReportResponse>(
    this.page() + 1,
    this.totalPages() || 1,
    this.totalElements(),
    this.size(),
    this.reports(),
  ));

  readonly successRuns = signal<CalculationRunResponse[]>([]);
  readonly sections = signal<ISection[]>([]);

  readonly selectedType = signal<ReportType>('PROGRAM_PLO');
  readonly selectedRunId = signal<string | null>(null);
  readonly selectedSectionId = signal<string | null>(null);
  readonly reportTitle = signal<string>('');
  readonly generating = signal<boolean>(false);

  readonly activeReport = signal<ReportResponse | null>(null);
  readonly traceVisible = signal<boolean>(false);
  readonly traceStudentResultId = signal<string | null>(null);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const p = Number(qp.get('page'));
    const s = Number(qp.get('size'));
    if (Number.isInteger(p) && p >= 0) {
      this.page.set(p);
    }
    if (Number.isInteger(s) && s >= 1 && s <= 100) {
      this.size.set(s);
    }
    this.loadData();
  }

  loadData(): void {
    this.loadReports();

    this.calcSvc.getCalculationRuns(undefined, 0, 100).subscribe({
      next: res => this.successRuns.set((res.content ?? []).filter(r => r.status === 'SUCCESS')),
      error: () => undefined,
    });

    this.sectionSvc.getSections().subscribe({
      next: list => this.sections.set(list),
      error: () => undefined,
    });
  }

  loadReports(): void {
    this.loadingReports.set(true);
    this.reportsError.set(null);
    this.reportSvc.listReports(undefined, undefined, undefined, this.page(), this.size()).subscribe({
      next: res => {
        const list = res.content ?? [];
        this.reports.set(list);
        this.totalElements.set(res.totalElements ?? list.length);
        this.totalPages.set(res.totalPages || 1);
        this.loadingReports.set(false);
        if (list.length > 0 && !this.activeReport()) {
          this.activeReport.set(list[0]);
        }
      },
      error: err => {
        this.loadingReports.set(false);
        const msg = toApiError(err)?.message ?? 'Không thể tải danh sách báo cáo';
        this.reportsError.set(msg);
      },
    });
  }

  onReportPageChange(cfg: Paginate<ReportResponse>): void {
    this.page.set(Math.max(0, cfg.currentPage - 1));
    this.syncQueryParams();
    this.loadReports();
  }

  onReportSizeChange(cfg: Paginate<ReportResponse>): void {
    this.size.set(cfg.limit);
    this.page.set(0);
    this.syncQueryParams();
    this.loadReports();
  }

  private syncQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.page(), size: this.size() },
      queryParamsHandling: 'merge',
    });
  }

  generate(): void {
    const runId = this.selectedRunId();
    const type = this.selectedType();
    if (!runId) {
      this.toastr.warning('Vui lòng chọn một lượt tính toán đã hoàn tất');
      return;
    }
    if (type === 'SECTION_CLO' && !this.selectedSectionId()) {
      this.toastr.warning('Báo cáo CLO theo lớp học phần yêu cầu chọn lớp học phần');
      return;
    }

    const request: ReportCreateRequest = {
      type,
      runId,
      title: this.reportTitle().trim() || undefined,
      sectionId: this.selectedSectionId() ?? undefined,
    };

    this.generating.set(true);
    this.reportSvc.generateReport(request).subscribe({
      next: rep => {
        this.toastr.success('Sinh báo cáo thành công');
        this.generating.set(false);
        this.reports.update(prev => [rep, ...prev]);
        this.activeReport.set(rep);
        this.reportTitle.set('');
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err.error as { message?: string; } | null)?.message;
        this.toastr.error(msg ?? 'Không thể sinh báo cáo');
        this.generating.set(false);
      },
    });
  }

  selectReport(rep: ReportResponse): void {
    this.activeReport.set(rep);
  }

  exportCsv(rep: ReportResponse): void {
    this.reportSvc.exportReportCsv(rep.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${rep.id}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.toastr.success('Đã xuất tệp CSV báo cáo');
      },
      error: () => this.toastr.error('Không thể xuất tệp CSV'),
    });
  }

  getLevelLabel(level: string): string {
    return (this.levelLabel as Record<string, string>)[level] ?? level;
  }

  getResultStatusLabel(status: string): string {
    return (this.resultStatusLabel as Record<string, string>)[status] ?? status;
  }

  openTrace(studentResultId: string): void {
    this.traceStudentResultId.set(studentResultId);
    this.traceVisible.set(true);
  }
}

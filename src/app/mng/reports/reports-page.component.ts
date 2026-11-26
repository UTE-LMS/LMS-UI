import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { createPaginatedSelect } from '@builder/paginated-select.builder';
import {
  REPORT_TYPE_LABEL,
  RESULT_LEVEL_LABEL,
  RESULT_STATUS_LABEL,
} from '@constants/analytics-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { ISection } from '@models/course/section.model';
import { ITerm } from '@models/course/term.model';
import {
  CalculationRunResponse,
  ReportCreateRequest,
  ReportExportFormat,
  ReportResponse,
  ReportType,
} from '@models/measurement/measurement.model';
import { IProgramVersion, formatProgramVersionLabel } from '@models/program/program-version.model';
import { TraceModalComponent } from '@mng/reports/trace-modal/trace-modal.component';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import {
  formatCourseOptionLabel,
  formatSectionOptionLabel,
  invalidatePaginatedSelect,
  mapProgramCoursesToCoursePage,
} from '@services/course/program-course-select.util';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { buildCalculationRunOptions, CalculationRunLookupMaps } from '@services/measurement/calculation-run-display.util';
import { CalculationService } from '@services/measurement/calculation.service';
import { ReportService } from '@services/measurement/report.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { Paginate } from '@widget/paginate/paginate.model';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastrService } from 'ngx-toastr';
import { catchError, EMPTY, finalize, map, of, Subject, switchMap } from 'rxjs';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzSelectModule,
    NzSpinModule,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSvc = inject(AuthService);
  private readonly reportSvc = inject(ReportService);
  private readonly calcSvc = inject(CalculationService);
  private readonly programVersionSvc = inject(ProgramVersionService);
  private readonly courseSvc = inject(CourseService);
  private readonly sectionSvc = inject(SectionService);
  private readonly termSvc = inject(TermService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  private readonly role = SystemConstant.MNG_ROLE;
  readonly canFilterProgramVersion = this.authSvc.hasAnyRole([
    this.role.ADMIN,
    this.role.QA,
    this.role.PROGRAM_MANAGER,
  ]);

  protected readonly reportTypeLabel = REPORT_TYPE_LABEL;
  protected readonly levelLabel = RESULT_LEVEL_LABEL;
  protected readonly resultStatusLabel = RESULT_STATUS_LABEL;
  protected readonly formatProgramVersionLabel = formatProgramVersionLabel;
  protected readonly formatCourseOptionLabel = formatCourseOptionLabel;
  protected readonly formatSectionOptionLabel = formatSectionOptionLabel;

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
  readonly loadingRuns = signal<boolean>(false);
  readonly pvSelect = createPaginatedSelect<IProgramVersion>({
    fetchPage: ({ page, size, search }) => this.programVersionSvc.getProgramVersions(page, size, undefined, undefined, undefined, undefined, search),
    getId: pv => pv.id,
    fetchById: id => this.programVersionSvc.getProgramVersionById(id),
  });
  readonly courseSelect = createPaginatedSelect<ICourse>({
    fetchPage: ({ page, size, search }) => {
      const pvId = this.canFilterProgramVersion ? this.selectedProgramVersionId() : null;
      if (pvId) {
        return this.courseSvc
          .getProgramCourses(pvId, undefined, undefined, undefined, search, page, size)
          .pipe(map(mapProgramCoursesToCoursePage));
      }
      return this.courseSvc.getCourses(page, size, search);
    },
    getId: c => c.id,
    fetchById: id => this.courseSvc.getCourseById(id),
  });
  readonly sectionSelect = createPaginatedSelect<ISection>({
    fetchPage: ({ page, size, search }) => {
      const pvId = this.canFilterProgramVersion ? (this.selectedProgramVersionId() ?? undefined) : undefined;
      return this.sectionSvc.getSections(undefined, this.selectedCourseId() ?? undefined, search, page, size, pvId);
    },
    getId: s => s.id,
    fetchById: id => this.sectionSvc.getSection(id),
  });
  readonly termSelect = createPaginatedSelect<ITerm>({
    fetchPage: ({ page, size, search }) => this.termSvc.getTerms(search, undefined, page, size),
    getId: t => t.id,
    fetchById: id => (this.termSvc.getTermById ? this.termSvc.getTermById(id) : EMPTY),
  });

  readonly selectedType = signal<ReportType>('PROGRAM_PLO');
  readonly selectedProgramVersionId = signal<string | null>(null);
  readonly selectedCourseId = signal<string | null>(null);
  readonly selectedRunId = signal<string | null>(null);
  readonly selectedSectionId = signal<string | null>(null);
  readonly reportTitle = signal<string>('');
  readonly generating = signal<boolean>(false);
  readonly exportingKey = signal<string | null>(null);

  private readonly runsReload$ = new Subject<string | null>();

  private readonly runLookups = computed<CalculationRunLookupMaps>(() => ({
    programVersions: new Map(this.pvSelect.options().map(pv => [pv.id, formatProgramVersionLabel(pv)])),
    courses: new Map(this.courseSelect.options().map(c => [c.id, c.code])),
    sections: new Map(this.sectionSelect.options().map(s => [s.id, s.code])),
    terms: new Map(this.termSelect.options().map(t => [t.id, t.code])),
  }));

  readonly runOptions = computed(() => buildCalculationRunOptions(
    this.successRuns(),
    {
      programVersionId: this.canFilterProgramVersion ? this.selectedProgramVersionId() : null,
      courseId: this.selectedCourseId(),
      sectionIds: this.selectedSectionId() ? [this.selectedSectionId()!] : [],
      reportType: this.selectedType(),
    },
    this.runLookups(),
  ));

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

    this.runsReload$
      .pipe(
        switchMap(pvId => {
          this.loadingRuns.set(true);
          return this.calcSvc.getCalculationRuns(pvId ?? undefined, 0, 20).pipe(
            map(res => (res.content ?? []).filter(r => r.status === 'SUCCESS')),
            catchError(() => of([])),
            finalize(() => this.loadingRuns.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(list => {
        this.successRuns.set(list);
        this.reconcileSelectedRun();
      });

    this.loadData();
  }

  loadData(): void {
    this.loadReports();
    this.runsReload$.next(this.canFilterProgramVersion ? this.selectedProgramVersionId() : null);
  }

  private reconcileSelectedRun(): void {
    const current = this.selectedRunId();
    if (!current || this.successRuns().length === 0) {
      return;
    }
    if (!this.runOptions().some(opt => opt.id === current)) {
      this.selectedRunId.set(null);
    }
  }

  onTypeChange(type: ReportType): void {
    this.selectedType.set(type);
    this.reconcileSelectedRun();
  }

  onProgramVersionChange(pvId: string | null): void {
    this.selectedProgramVersionId.set(pvId);
    this.pvSelect.syncSelected(pvId);
    this.selectedCourseId.set(null);
    this.courseSelect.syncSelected(null);
    invalidatePaginatedSelect(this.courseSelect);
    this.selectedSectionId.set(null);
    this.sectionSelect.syncSelected(null);
    invalidatePaginatedSelect(this.sectionSelect);
    this.runsReload$.next(pvId);
    this.reconcileSelectedRun();
  }

  onCourseChange(courseId: string | null): void {
    this.selectedCourseId.set(courseId);
    this.courseSelect.syncSelected(courseId);
    this.selectedSectionId.set(null);
    this.sectionSelect.syncSelected(null);
    invalidatePaginatedSelect(this.sectionSelect);
    this.reconcileSelectedRun();
  }

  onSectionChange(sectionId: string | null): void {
    this.selectedSectionId.set(sectionId);
    this.sectionSelect.syncSelected(sectionId);
    this.reconcileSelectedRun();
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

  private exportReport(rep: ReportResponse, format: ReportExportFormat): void {
    const key = `${rep.id}:${format}`;
    if (this.exportingKey() === key) {
      return;
    }
    this.exportingKey.set(key);
    const request$ = format === 'xlsx'
      ? this.reportSvc.exportReportExcel(rep.id)
      : this.reportSvc.exportReportCsv(rep.id);
    request$.pipe(
      finalize(() => {
        if (this.exportingKey() === key) {
          this.exportingKey.set(null);
        }
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${rep.id}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
        this.toastr.success(format === 'xlsx' ? 'Đã xuất tệp Excel báo cáo' : 'Đã xuất tệp CSV báo cáo');
      },
      error: () => this.toastr.error(format === 'xlsx' ? 'Không thể xuất tệp Excel' : 'Không thể xuất tệp CSV'),
    });
  }

  exportCsv(rep: ReportResponse): void {
    this.exportReport(rep, 'csv');
  }

  exportExcel(rep: ReportResponse): void {
    this.exportReport(rep, 'xlsx');
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

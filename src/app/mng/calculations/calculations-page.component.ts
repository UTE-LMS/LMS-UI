import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { createPaginatedSelect } from '@builder/paginated-select.builder';
import {
  CALCULATION_SCOPE_LABEL,
  CALCULATION_STATUS_LABEL,
  RESULT_LEVEL_LABEL,
} from '@constants/analytics-display.constant';
import { ISection } from '@models/course/section.model';
import { ITerm } from '@models/course/term.model';
import {
  AggregateResultResponse,
  CalculationRunRequest,
  CalculationRunResponse,
  CalculationScope,
  ResultLevel,
  StudentResultResponse,
} from '@models/measurement/measurement.model';
import { IProgramVersion, formatProgramVersionLabel } from '@models/program/program-version.model';
import { TraceModalComponent } from '@mng/reports/trace-modal/trace-modal.component';
import { toApiError } from '@services/common/api-error.util';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import {
  formatCalculationRunOption,
  formatMeasurementResultContext,
} from '@services/measurement/calculation-run-display.util';
import { CalculationService } from '@services/measurement/calculation.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { Paginate } from '@widget/paginate/paginate.model';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastrService } from 'ngx-toastr';

export type PassedFilterValue = 'ALL' | 'true' | 'false';

@Component({
  selector: 'app-calculations-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzSelectModule,
    NzSpinModule,
    NzInputModule,
    NzCheckboxModule,
    NzTableModule,
    NzTagModule,
    NzTabsModule,
    NzAlertModule,
    TablePaginateComponent,
    TraceModalComponent,
  ],
  templateUrl: './calculations-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculationsPageComponent implements OnInit {
  private readonly calcSvc = inject(CalculationService);
  private readonly pvSvc = inject(ProgramVersionService);
  private readonly sectionSvc = inject(SectionService);
  private readonly termSvc = inject(TermService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  protected readonly scopeLabel = CALCULATION_SCOPE_LABEL;
  protected readonly statusLabel = CALCULATION_STATUS_LABEL;
  protected readonly levelLabel = RESULT_LEVEL_LABEL;
  protected readonly formatProgramVersionLabel = formatProgramVersionLabel;
  protected readonly formatRunContext = (run: CalculationRunResponse): string => formatCalculationRunOption(run).primaryLabel;
  protected readonly formatResultContext = formatMeasurementResultContext;

  readonly runs = signal<CalculationRunResponse[]>([]);
  readonly loadingRuns = signal<boolean>(false);
  readonly runsError = signal<string | null>(null);
  readonly runsPage = signal<number>(0);
  readonly runsSize = signal<number>(20);
  readonly runsTotalElements = signal<number>(0);
  readonly runsTotalPages = signal<number>(1);
  readonly runsPageConfig = computed(() => new Paginate<CalculationRunResponse>(
    this.runsPage() + 1,
    this.runsTotalPages() || 1,
    this.runsTotalElements(),
    this.runsSize(),
    this.runs(),
  ));

  readonly selectedScope = signal<CalculationScope>('SECTION');
  readonly selectedProgramVersionId = signal<string | null>(null);
  readonly selectedSectionIds = signal<string[]>([]);
  readonly selectedTermId = signal<string | null>(null);
  readonly cohortsText = signal<string>('');
  readonly isOfficial = signal<boolean>(true);
  readonly running = signal<boolean>(false);

  readonly pvSelect = createPaginatedSelect<IProgramVersion>({
    fetchPage: ({ page, size, search }) => this.pvSvc.getProgramVersions(page, size, undefined, undefined, undefined, undefined, search),
    getId: pv => pv.id,
    fetchById: id => this.pvSvc.getProgramVersionById(id),
  });
  readonly sectionSelect = createPaginatedSelect<ISection>({
    fetchPage: ({ page, size, search }) => this.sectionSvc.getSections(this.selectedTermId() ?? undefined, undefined, search, page, size),
    getId: s => s.id,
    fetchById: id => this.sectionSvc.getSection(id),
  });
  readonly termSelect = createPaginatedSelect<ITerm>({
    fetchPage: ({ page, size, search }) => this.termSvc.getTerms(search, undefined, page, size),
    getId: t => t.id,
    fetchById: id => this.termSvc.getTermById(id),
  });

  readonly selectedRun = signal<CalculationRunResponse | null>(null);
  readonly selectedLevel = signal<ResultLevel | ''>('');
  readonly activeTabIndex = signal<number>(0);
  private subjectOptionsLoadedForRunId: string | null = null;
  private studentResultsLoadedKey: string | null = null;

  // Bộ lọc chi tiết Student Results (B1)
  readonly selectedSubjectId = signal<string | null>(null);
  readonly passedFilter = signal<PassedFilterValue>('ALL');
  readonly studentIdFilter = signal<string>('');
  readonly subjectOptions = signal<{ id: string; label: string; }[]>([]);

  // Aggregate results pagination
  readonly aggregateResults = signal<AggregateResultResponse[]>([]);
  readonly loadingAggregates = signal<boolean>(false);
  readonly aggregatesError = signal<string | null>(null);
  readonly aggPage = signal<number>(0);
  readonly aggSize = signal<number>(20);
  readonly aggTotalElements = signal<number>(0);
  readonly aggTotalPages = signal<number>(1);
  readonly aggPageConfig = computed(() => new Paginate<AggregateResultResponse>(
    this.aggPage() + 1,
    this.aggTotalPages() || 1,
    this.aggTotalElements(),
    this.aggSize(),
    this.aggregateResults(),
  ));

  // Student results pagination
  readonly studentResults = signal<StudentResultResponse[]>([]);
  readonly loadingStudents = signal<boolean>(false);
  readonly studentsError = signal<string | null>(null);
  readonly stuPage = signal<number>(0);
  readonly stuSize = signal<number>(20);
  readonly stuTotalElements = signal<number>(0);
  readonly stuTotalPages = signal<number>(1);
  readonly stuPageConfig = computed(() => new Paginate<StudentResultResponse>(
    this.stuPage() + 1,
    this.stuTotalPages() || 1,
    this.stuTotalElements(),
    this.stuSize(),
    this.studentResults(),
  ));

  readonly traceVisible = signal<boolean>(false);
  readonly traceStudentResultId = signal<string | null>(null);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const p = Number(qp.get('page'));
    const s = Number(qp.get('size'));
    if (Number.isInteger(p) && p >= 0) {
      this.runsPage.set(p);
    }
    if (Number.isInteger(s) && s >= 1 && s <= 100) {
      this.runsSize.set(s);
    }
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loadRuns();
  }

  onProgramVersionChange(pvId: string | null): void {
    this.selectedProgramVersionId.set(pvId);
    this.pvSelect.syncSelected(pvId);
  }

  onSectionIdsChange(sectionIds: string[]): void {
    const ids = sectionIds ?? [];
    this.selectedSectionIds.set(ids);
    this.sectionSelect.syncSelected(ids);
  }

  onTermChange(termId: string | null): void {
    this.selectedTermId.set(termId);
    this.termSelect.syncSelected(termId);
    this.sectionSelect.reload(true);
    this.sectionSelect.syncSelected(this.selectedSectionIds());
  }

  loadRuns(): void {
    this.loadingRuns.set(true);
    this.runsError.set(null);
    this.calcSvc.getCalculationRuns(undefined, this.runsPage(), this.runsSize()).subscribe({
      next: res => {
        const list = res.content ?? [];
        this.runs.set(list);
        this.runsTotalElements.set(res.totalElements ?? list.length);
        this.runsTotalPages.set(res.totalPages || 1);
        this.loadingRuns.set(false);
        if (list.length > 0 && !this.selectedRun()) {
          this.selectRun(list[0]);
        }
      },
      error: err => {
        this.loadingRuns.set(false);
        this.runsError.set(toApiError(err)?.message ?? 'Không thể tải danh sách lượt tính toán');
      },
    });
  }

  onRunsPageChange(cfg: Paginate<CalculationRunResponse>): void {
    this.runsPage.set(Math.max(0, cfg.currentPage - 1));
    this.syncRunsQueryParams();
    this.loadRuns();
  }

  onRunsSizeChange(cfg: Paginate<CalculationRunResponse>): void {
    this.runsSize.set(cfg.limit);
    this.runsPage.set(0);
    this.syncRunsQueryParams();
    this.loadRuns();
  }

  private syncRunsQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.runsPage(), size: this.runsSize() },
      queryParamsHandling: 'merge',
    });
  }

  triggerRun(): void {
    const scope = this.selectedScope();
    if (scope === 'SECTION' && this.selectedSectionIds().length === 0) {
      this.toastr.warning('Vui lòng chọn ít nhất một lớp học phần cho phạm vi lớp học phần');
      return;
    }

    const cohorts = this.cohortsText()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const request: CalculationRunRequest = {
      scope,
      programVersionId: this.selectedProgramVersionId(),
      sectionIds: this.selectedSectionIds(),
      termId: this.selectedTermId(),
      cohorts,
      official: this.isOfficial(),
    };

    this.running.set(true);
    this.calcSvc.triggerCalculation(request).subscribe({
      next: run => {
        this.toastr.success('Chạy đo lường 4 cấp độ thành công');
        this.running.set(false);
        this.runs.update(prev => [run, ...prev]);
        this.selectRun(run);
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err.error as { message?: string; } | null)?.message;
        this.toastr.error(msg ?? 'Lỗi khi chạy tính toán đo lường');
        this.running.set(false);
      },
    });
  }

  selectRun(run: CalculationRunResponse): void {
    this.selectedRun.set(run);
    this.aggPage.set(0);
    this.stuPage.set(0);
    this.selectedSubjectId.set(null);
    this.subjectOptions.set([]);
    this.subjectOptionsLoadedForRunId = null;
    this.studentResultsLoadedKey = null;
    this.loadRunDetails();
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
    const run = this.selectedRun();
    if (!run || index !== 1) {
      return;
    }
    if (this.subjectOptionsLoadedForRunId !== run.id) {
      this.loadSubjectOptions(run.id);
    }
    const key = `${run.id}:${this.selectedLevel()}`;
    if (this.studentResultsLoadedKey !== key) {
      this.loadStudentResults();
    }
  }

  onLevelFilterChange(level: ResultLevel | ''): void {
    this.selectedLevel.set(level);
    this.aggPage.set(0);
    this.stuPage.set(0);
    this.studentResultsLoadedKey = null;
    this.loadRunDetails();
  }

  onStudentFilterChange(): void {
    this.stuPage.set(0);
    this.loadStudentResults();
  }

  loadRunDetails(): void {
    this.loadAggregateResults();
    if (this.activeTabIndex() === 1) {
      this.loadStudentResults();
    }
  }

  loadAggregateResults(): void {
    const run = this.selectedRun();
    if (!run) return;
    const level = this.selectedLevel() || undefined;
    this.loadingAggregates.set(true);
    this.aggregatesError.set(null);

    this.calcSvc.getAggregateResults(run.id, level, undefined, this.aggPage(), this.aggSize()).subscribe({
      next: res => {
        const list = res.content ?? [];
        this.aggregateResults.set(list);
        this.aggTotalElements.set(res.totalElements ?? list.length);
        this.aggTotalPages.set(res.totalPages || 1);
        this.loadingAggregates.set(false);
        if (!level && this.aggPage() === 0) {
          const seen = new Set<string>();
          const opts: { id: string; label: string; }[] = [];
          for (const item of list) {
            if (!seen.has(item.subjectId)) {
              seen.add(item.subjectId);
              opts.push({
                id: item.subjectId,
                label: `${this.levelLabel[item.level] ?? item.level}: ${item.subjectCode ?? item.subjectId}`,
              });
            }
          }
          const isComplete = res.last ?? list.length >= (res.totalElements ?? list.length);
          if (isComplete) {
            this.subjectOptions.set(opts);
            this.subjectOptionsLoadedForRunId = run.id;
          } else if (this.subjectOptionsLoadedForRunId !== run.id) {
            this.subjectOptions.set(opts);
          }
        }
      },
      error: err => {
        this.aggregateResults.set([]);
        this.loadingAggregates.set(false);
        this.aggregatesError.set(toApiError(err)?.message ?? 'Không thể tải kết quả tổng hợp');
      },
    });
  }

  loadStudentResults(): void {
    const run = this.selectedRun();
    if (!run) return;
    const level = this.selectedLevel() || undefined;
    const passedVal = this.passedFilter();
    const passed = passedVal === 'ALL' ? undefined : passedVal === 'true';
    const studentId = this.studentIdFilter().trim() || undefined;
    const subjectId = this.selectedSubjectId() ?? undefined;

    this.loadingStudents.set(true);
    this.studentsError.set(null);
    this.studentResultsLoadedKey = `${run.id}:${this.selectedLevel()}`;

    this.calcSvc.getStudentResults(run.id, {
      level,
      subjectId,
      studentId,
      passed,
      page: this.stuPage(),
      size: this.stuSize(),
    }).subscribe({
      next: res => {
        const list = res.content ?? [];
        this.studentResults.set(list);
        this.stuTotalElements.set(res.totalElements ?? list.length);
        this.stuTotalPages.set(res.totalPages || 1);
        this.loadingStudents.set(false);
      },
      error: err => {
        this.studentResults.set([]);
        this.loadingStudents.set(false);
        this.studentsError.set(toApiError(err)?.message ?? 'Không thể tải kết quả sinh viên');
      },
    });
  }

  onAggPageChange(cfg: Paginate<AggregateResultResponse>): void {
    this.aggPage.set(Math.max(0, cfg.currentPage - 1));
    this.loadAggregateResults();
  }

  onAggSizeChange(cfg: Paginate<AggregateResultResponse>): void {
    this.aggSize.set(cfg.limit);
    this.aggPage.set(0);
    this.loadAggregateResults();
  }

  onStuPageChange(cfg: Paginate<StudentResultResponse>): void {
    this.stuPage.set(Math.max(0, cfg.currentPage - 1));
    this.loadStudentResults();
  }

  onStuSizeChange(cfg: Paginate<StudentResultResponse>): void {
    this.stuSize.set(cfg.limit);
    this.stuPage.set(0);
    this.loadStudentResults();
  }

  private loadSubjectOptions(runId: string): void {
    this.subjectOptionsLoadedForRunId = runId;
    this.calcSvc.getAggregateResults(runId, undefined, undefined, 0, 100).subscribe({
      next: res => {
        const seen = new Set<string>();
        const opts: { id: string; label: string; }[] = [];
        for (const item of res.content ?? []) {
          if (!seen.has(item.subjectId)) {
            seen.add(item.subjectId);
            opts.push({
              id: item.subjectId,
              label: `${this.levelLabel[item.level] ?? item.level}: ${item.subjectCode ?? item.subjectId}`,
            });
          }
        }
        this.subjectOptions.set(opts);
      },
      error: () => {
        this.subjectOptionsLoadedForRunId = null;
        this.subjectOptions.set([]);
      },
    });
  }

  versionStatusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Đang áp dụng' : 'Lưu trữ';
  }

  openTrace(studentResultId: string): void {
    this.traceStudentResultId.set(studentResultId);
    this.traceVisible.set(true);
  }
}

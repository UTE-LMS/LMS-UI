import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { createPaginatedSelect } from '@builder/paginated-select.builder';
import {
  ANALYTICS_DIMENSION_DISPLAY, CLASSIFICATION_TYPE_LABEL, RESULT_LEVEL_LABEL,
} from '@constants/analytics-display.constant';
import { ASSESSMENT_TYPE_LABEL, toOptions } from '@constants/assessment-display.constant';
import { PLACEHOLDER } from '@constants/measurement-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentType } from '@models/assessment/assessment.model';
import { IUserError } from '@models/common/user-error.model';
import { ICourse } from '@models/course/course.model';
import { ISection } from '@models/course/section.model';
import { ITerm } from '@models/course/term.model';
import {
  AnalyticsDimension, CurriculumClassificationType, IAnalyticsMatrix, IAnalyticsQuery, IMatrixHeader, IMatrixMetricCell,
} from '@models/measurement/analytics.model';
import { CalculationRunResponse, ReportExportFormat, ResultLevel } from '@models/measurement/measurement.model';
import { IProgramVersion, formatProgramVersionLabel } from '@models/program/program-version.model';
import { IUser } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import {
  formatCourseOptionLabel,
  formatSectionOptionLabel,
  invalidatePaginatedSelect,
  mapProgramCoursesToCoursePage,
} from '@services/course/program-course-select.util';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { AnalyticsService } from '@services/measurement/analytics.service';
import { buildCalculationRunOptions, CalculationRunLookupMaps } from '@services/measurement/calculation-run-display.util';
import { CalculationService } from '@services/measurement/calculation.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { StaleWarningComponent } from '@widget/stale-warning/stale-warning.component';
import { UnofficialLabelComponent } from '@widget/unofficial-label/unofficial-label.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, finalize, map, of, Subject, switchMap } from 'rxjs';

/** Chỉ số người dùng chọn để vẽ. Đều là tỷ lệ 0–1 do backend tính sẵn trong từng ô. */
export type AnalyticsMetric = 'mean' | 'passRate' | 'passRateOfEnrolled';

export const METRIC_LABEL: Record<AnalyticsMetric, string> = {
  mean: 'Mức đạt trung bình',
  passRate: 'Tỷ lệ đạt / đủ dữ liệu',
  passRateOfEnrolled: 'Tỷ lệ đạt / ghi danh',
};

/** Bảng màu phân loại 8 ô đã kiểm định mù màu (dataviz reference palette, chế độ sáng), dùng theo thứ tự cố định. */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

/** Biểu đồ chỉ vẽ tối đa 8 chuỗi (hàng); nhiều hơn thì đọc ở bảng để không rối mắt và không lặp màu. */
export const MAX_CHART_SERIES = 8;

/** Các chiều phân tích trong phạm vi lớp học phần dành cho tài khoản Giảng viên thuần túy. */
export const LECTURER_DIMENSIONS: readonly AnalyticsDimension[] = [
  'COURSE_SECTIONS',
  'TIME_TERM',
  'ASSESSMENT_COMPONENT',
  'STUDENT',
];

export const ANALYTICS_DIMENSION_ICON: Record<AnalyticsDimension, string> = {
  TIME_TERM: 'fa-calendar-days',
  COURSE_SECTIONS: 'fa-users-rectangle',
  COHORT: 'fa-graduation-cap',
  ASSESSMENT_COMPONENT: 'fa-clipboard-check',
  CURRICULUM_CLASSIFICATION: 'fa-layer-group',
  COURSE_LECTURER: 'fa-chalkboard-user',
  STUDENT: 'fa-user-graduate',
};

export interface IChartBar {
  seriesIndex: number;
  label: string;
  color: string;
  /** null = chưa có dữ liệu (không vẽ như 0%). */
  value: number | null;
  cell: IMatrixMetricCell;
}

export interface IChartGroup {
  id: string;
  label: string;
  bars: IChartBar[];
}

function trimmedNonEmpty(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return null;
}

function isOutcomeHeader(h: IMatrixHeader): boolean {
  if (
    (h.passThreshold !== null && h.passThreshold !== undefined)
    || (h.bloomLevel !== null && h.bloomLevel !== undefined)
  ) {
    return true;
  }
  const code = trimmedNonEmpty(h.code);
  return code !== null && /^(PLO|PI|CLO)(?:\d|$|[\s._-])/i.test(code);
}

/** Xác định trục chứa giảng viên trong ma trận `COURSE_LECTURER` để ưu tiên hiển thị họ tên. */
export function lecturerAxisOf(res: IAnalyticsMatrix | null): 'columns' | 'rows' | null {
  if (res?.dimension !== 'COURSE_LECTURER') {
    return null;
  }
  const rowsAreOutcomes = res.rows.some(isOutcomeHeader);
  const colsAreOutcomes = res.columns.some(isOutcomeHeader);
  if (colsAreOutcomes && !rowsAreOutcomes) {
    return 'rows';
  }
  return 'columns';
}

/** Nhãn hiển thị cho giảng viên: ưu tiên họ tên (`name` khác `code`), sau đó tra từ lookup `fullName`, rồi mới fallback `code`/`id`. */
export function lecturerHeaderLabel(h: IMatrixHeader, nameLookup?: ReadonlyMap<string, string>): string {
  const code = trimmedNonEmpty(h.code);
  const name = trimmedNonEmpty(h.name);
  if (name && name !== code) {
    return name;
  }
  const lookedUp = trimmedNonEmpty(nameLookup?.get(h.id))
    ?? (code ? trimmedNonEmpty(nameLookup?.get(code)) : null);
  if (lookedUp) {
    return lookedUp;
  }
  return name ?? code ?? h.id;
}

/** Nhãn hiển thị của một tiêu đề hàng/cột: mã, rồi tên, rồi ID (bỏ qua chuỗi rỗng). */
export function headerLabel(h: IMatrixHeader): string {
  return [h.code, h.name].find((v): v is string => !!v) ?? h.id;
}

function splitList(text: string): string[] {
  return text.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
}

function fileNameFrom(header: string | null): string | null {
  const match = header ? /filename="?([^";]+)"?/i.exec(header) : null;
  return match ? match[1] : null;
}

@Component({
  selector: 'app-analytics-page',
  imports: [
    FormsModule, DecimalPipe, NzButtonModule, NzInputModule, NzPaginationModule,
    NzRadioModule, NzSelectModule, NzSpinModule, NzTableModule,
    ErrorStateComponent, StaleWarningComponent, UnofficialLabelComponent,
  ],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSvc = inject(AuthService);
  private readonly analyticsSvc = inject(AnalyticsService);
  private readonly programVersionSvc = inject(ProgramVersionService);
  private readonly courseSvc = inject(CourseService);
  private readonly termSvc = inject(TermService);
  private readonly sectionSvc = inject(SectionService);
  private readonly calcSvc = inject(CalculationService);
  private readonly toastr = inject(ToastrService);

  private readonly role = SystemConstant.MNG_ROLE;
  readonly isAdmin = this.authSvc.hasAnyRole([this.role.ADMIN]);
  readonly isAdminOrQa = this.authSvc.hasAnyRole([this.role.ADMIN, this.role.QA]);
  readonly isProgramManager = this.authSvc.hasAnyRole([this.role.PROGRAM_MANAGER]);
  readonly isLecturer = this.authSvc.hasAnyRole([this.role.LECTURER]);
  readonly canAnalyzeProgramScope = this.isAdminOrQa || this.isProgramManager;
  readonly canLoadLecturers = this.isAdmin || this.isProgramManager;
  readonly canAccessAnalytics = this.canAnalyzeProgramScope || this.isLecturer;

  protected readonly dimensionDisplay = ANALYTICS_DIMENSION_DISPLAY;
  protected readonly dimensionIcons = ANALYTICS_DIMENSION_ICON;
  protected readonly availableDimensions: readonly AnalyticsDimension[] = this.canAnalyzeProgramScope
    ? (Object.keys(ANALYTICS_DIMENSION_DISPLAY) as AnalyticsDimension[])
    : this.isLecturer
      ? LECTURER_DIMENSIONS
      : [];
  protected readonly availableLevelOptions = this.canAnalyzeProgramScope
    ? toOptions(RESULT_LEVEL_LABEL)
    : toOptions(RESULT_LEVEL_LABEL).filter(o => o.value !== 'PLO');
  protected readonly roleScopeBadge: { label: string; icon: string; tone: 'sky' | 'indigo' | 'emerald' | 'slate'; } =
    this.isAdminOrQa
      ? { label: 'Phạm vi: Toàn hệ thống', icon: 'fa-globe', tone: 'sky' }
      : this.isProgramManager
        ? { label: 'Phạm vi: Khoa phụ trách', icon: 'fa-building-columns', tone: 'indigo' }
        : this.isLecturer
          ? { label: 'Phạm vi: Lớp học phần phụ trách', icon: 'fa-chalkboard-user', tone: 'emerald' }
          : { label: 'Chưa được cấp quyền phân tích', icon: 'fa-lock', tone: 'slate' };
  protected readonly classificationOptions = toOptions(CLASSIFICATION_TYPE_LABEL);
  protected readonly assessmentTypeOptions = toOptions(ASSESSMENT_TYPE_LABEL);
  protected readonly metricOptions = toOptions(METRIC_LABEL);
  protected readonly placeholder = PLACEHOLDER;
  protected readonly maxSeries = MAX_CHART_SERIES;
  protected readonly headerLabel = headerLabel;
  protected readonly lecturerAxisOf = lecturerAxisOf;
  protected readonly formatProgramVersionLabel = formatProgramVersionLabel;
  protected readonly formatCourseOptionLabel = formatCourseOptionLabel;
  protected readonly formatSectionOptionLabel = formatSectionOptionLabel;

  // Danh mục cho bộ lọc (paginated select infinite scroll + runs)
  readonly runs = signal<CalculationRunResponse[]>([]);
  readonly loadingRuns = signal(false);
  readonly lecturers = signal<IUser[]>([]);
  readonly loadingLecturers = signal(false);
  private lecturersLoaded = false;

  // Tham số truy vấn
  readonly dimension = signal<AnalyticsDimension>(
    this.availableDimensions.includes('COURSE_SECTIONS')
      ? 'COURSE_SECTIONS'
      : (this.availableDimensions[0] ?? 'COURSE_SECTIONS'),
  );
  readonly programVersionId = signal<string | null>(null);
  readonly courseId = signal<string | null>(null);
  readonly termIds = signal<string[]>([]);
  readonly sectionIds = signal<string[]>([]);
  readonly level = signal<ResultLevel | null>(null);
  readonly runId = signal<string | null>(null);
  readonly cohortsText = signal('');
  readonly assessmentTypes = signal<AssessmentType[]>([]);
  readonly classificationType = signal<CurriculumClassificationType>('PLO_CATEGORY');
  readonly selectedLecturerIds = signal<string[]>([]);
  readonly lecturerIdsText = signal('');
  readonly studentIdsText = signal('');
  readonly studentSearch = signal('');
  readonly studentPage = signal(0);
  readonly studentSize = signal(20);
  readonly subjectIdsText = signal('');
  readonly passedFilter = signal<'ALL' | 'true' | 'false'>('ALL');

  readonly pvSelect = createPaginatedSelect<IProgramVersion>({
    fetchPage: ({ page, size, search }) => this.programVersionSvc.getProgramVersions(page, size, undefined, undefined, undefined, undefined, search),
    getId: pv => pv.id,
    fetchById: id => this.programVersionSvc.getProgramVersionById(id),
  });

  readonly courseSelect = createPaginatedSelect<ICourse>({
    fetchPage: ({ page, size, search }) => {
      const pvId = this.canAnalyzeProgramScope ? this.programVersionId() : null;
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

  readonly termSelect = createPaginatedSelect<ITerm>({
    fetchPage: ({ page, size, search }) => this.termSvc.getTerms(search, undefined, page, size),
    getId: t => t.id,
    fetchById: id => (this.termSvc.getTermById ? this.termSvc.getTermById(id) : EMPTY),
  });

  readonly sectionSelect = createPaginatedSelect<ISection>({
    fetchPage: ({ page, size, search }) => {
      const selectedTerms = this.termIds();
      const singleTermId = selectedTerms.length === 1 ? selectedTerms[0] : undefined;
      const pvId = this.canAnalyzeProgramScope ? (this.programVersionId() ?? undefined) : undefined;
      return this.sectionSvc.getSections(singleTermId, this.courseId() ?? undefined, search, page, size, pvId);
    },
    getId: s => s.id,
    fetchById: id => (this.sectionSvc.getSection ? this.sectionSvc.getSection(id) : EMPTY),
  });

  private readonly studentSearchSubject$ = new Subject<string>();
  private readonly runsReload$ = new Subject<string | null>();

  private readonly runLookups = computed<CalculationRunLookupMaps>(() => ({
    programVersions: new Map(this.pvSelect.options().map(pv => [pv.id, formatProgramVersionLabel(pv)])),
    sections: new Map(this.sectionSelect.options().map(s => [s.id, s.code])),
    terms: new Map(this.termSelect.options().map(t => [t.id, t.code])),
    courses: new Map(this.courseSelect.options().map(c => [c.id, c.code])),
  }));

  readonly runOptions = computed(() => buildCalculationRunOptions(
    this.runs(),
    {
      programVersionId: this.canAnalyzeProgramScope ? this.programVersionId() : null,
      courseId: this.courseId(),
      termIds: this.termIds(),
      sectionIds: this.sectionIds(),
      cohorts: this.dimension() === 'COHORT' && this.canAnalyzeProgramScope ? splitList(this.cohortsText()) : [],
    },
    this.runLookups(),
  ));

  // Kết quả
  readonly metric = signal<AnalyticsMetric>('mean');
  readonly loading = signal(false);
  readonly exportingFormat = signal<ReportExportFormat | null>(null);
  readonly exporting = computed(() => this.exportingFormat() !== null);
  readonly error = signal<IUserError | null>(null);
  readonly result = signal<IAnalyticsMatrix | null>(null);

  readonly isEmpty = computed(() => {
    const res = this.result();
    return !!res && (res.rows.length === 0 || res.columns.length === 0);
  });

  private readonly lecturerNameLookup = computed<ReadonlyMap<string, string>>(() => {
    const mapByKey = new Map<string, string>();
    for (const lec of this.lecturers()) {
      const fullName = trimmedNonEmpty(lec.fullName);
      if (!fullName) {
        continue;
      }
      mapByKey.set(lec.id, fullName);
      const username = trimmedNonEmpty(lec.username);
      if (username) {
        mapByKey.set(username, fullName);
      }
    }
    return mapByKey;
  });

  /** Nhóm theo cột (CLO/PI/PLO…), mỗi nhóm có một thanh cho mỗi hàng (lớp, học kỳ, khóa…). */
  readonly chartGroups = computed<IChartGroup[]>(() => {
    const res = this.result();
    if (!res) {
      return [];
    }
    const metric = this.metric();
    const rows = res.rows.slice(0, MAX_CHART_SERIES);
    return res.columns.map((col, colIndex) => ({
      id: col.id,
      label: this.columnHeaderLabel(col, res),
      bars: rows.map((row, rowIndex) => {
        const cell = res.matrix[rowIndex]?.[colIndex];
        return {
          seriesIndex: rowIndex,
          label: this.rowHeaderLabel(row, res),
          color: SERIES_COLORS[rowIndex],
          value: cell ? cell[metric] : null,
          cell,
        };
      }),
    }));
  });

  readonly legend = computed(() => {
    const res = this.result();
    return (res?.rows ?? []).slice(0, MAX_CHART_SERIES).map((row, i) => ({
      id: row.id,
      label: res ? this.rowHeaderLabel(row, res) : headerLabel(row),
      color: SERIES_COLORS[i],
    }));
  });

  ngOnInit(): void {
    this.studentSearchSubject$
      .pipe(
        map(q => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.studentPage.set(0);
        if (this.dimension() === 'STUDENT') {
          this.analyze();
        }
      });

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
        this.runs.set(list);
        this.reconcileSelectedRun();
      });

    this.loadLookups();
  }

  private loadLookups(): void {
    if (!this.canAccessAnalytics) {
      return;
    }
    this.runsReload$.next(null);
  }

  private reconcileSelectedRun(): void {
    const current = this.runId();
    if (!current || this.runs().length === 0) {
      return;
    }
    if (!this.runOptions().some(opt => opt.id === current)) {
      this.runId.set(null);
    }
  }

  onProgramVersionChange(pvId: string | null): void {
    this.programVersionId.set(pvId);
    this.pvSelect.syncSelected(pvId);
    this.courseId.set(null);
    this.courseSelect.syncSelected(null);
    invalidatePaginatedSelect(this.courseSelect);
    this.sectionIds.set([]);
    this.sectionSelect.syncSelected([]);
    invalidatePaginatedSelect(this.sectionSelect);
    this.runsReload$.next(pvId);
    this.reconcileSelectedRun();
    this.studentPage.set(0);
  }

  onCourseChange(courseId: string | null): void {
    this.courseId.set(courseId);
    this.courseSelect.syncSelected(courseId);
    this.sectionIds.set([]);
    this.sectionSelect.syncSelected([]);
    invalidatePaginatedSelect(this.sectionSelect);
    this.reconcileSelectedRun();
    this.studentPage.set(0);
  }

  onTermIdsChange(termIds: string[]): void {
    const ids = termIds ?? [];
    this.termIds.set(ids);
    this.termSelect.syncSelected(ids);
    invalidatePaginatedSelect(this.sectionSelect);
    this.sectionSelect.syncSelected(this.sectionIds());
    this.reconcileSelectedRun();
    this.studentPage.set(0);
  }

  onSectionIdsChange(sectionIds: string[]): void {
    const ids = sectionIds ?? [];
    this.sectionIds.set(ids);
    this.sectionSelect.syncSelected(ids);
    this.reconcileSelectedRun();
    this.studentPage.set(0);
  }

  onCohortsChange(text: string): void {
    this.cohortsText.set(text);
    this.reconcileSelectedRun();
  }

  onStudentSearchChange(keyword: string): void {
    this.studentSearch.set(keyword);
    this.studentSearchSubject$.next(keyword);
  }

  onStudentPageChange(page1Indexed: number): void {
    this.studentPage.set(Math.max(0, page1Indexed - 1));
    this.analyze();
  }

  onStudentSizeChange(newSize: number): void {
    this.studentSize.set(newSize);
    this.studentPage.set(0);
    this.analyze();
  }

  selectDimension(dimension: AnalyticsDimension): void {
    if (!this.availableDimensions.includes(dimension)) {
      return;
    }
    this.dimension.set(dimension);
    this.studentPage.set(0);
    this.result.set(null);
    this.error.set(null);
  }

  resetFilters(): void {
    this.programVersionId.set(null);
    this.pvSelect.syncSelected(null);
    this.courseId.set(null);
    this.courseSelect.syncSelected(null);
    invalidatePaginatedSelect(this.courseSelect);
    this.termIds.set([]);
    this.termSelect.syncSelected([]);
    this.sectionIds.set([]);
    this.sectionSelect.syncSelected([]);
    invalidatePaginatedSelect(this.sectionSelect);
    this.level.set(null);
    this.runId.set(null);
    this.cohortsText.set('');
    this.assessmentTypes.set([]);
    this.classificationType.set('PLO_CATEGORY');
    this.selectedLecturerIds.set([]);
    this.lecturerIdsText.set('');
    this.studentIdsText.set('');
    this.studentSearch.set('');
    this.studentPage.set(0);
    this.subjectIdsText.set('');
    this.passedFilter.set('ALL');
    this.error.set(null);
    if (this.canAccessAnalytics) {
      this.runsReload$.next(null);
    }
  }

  /** Gom tham số đang chọn. Trường chỉ dùng cho một chiều hoặc phạm vi cấp CTĐT thì chỉ gửi khi hợp lệ. */
  buildQuery(): IAnalyticsQuery {
    const dimension = this.dimension();
    const rawLevel = this.level();
    const allowedLevel = rawLevel && this.availableLevelOptions.some(o => o.value === rawLevel) ? rawLevel : undefined;
    const query: IAnalyticsQuery = {
      dimension,
      programVersionId: this.canAnalyzeProgramScope ? (this.programVersionId() ?? undefined) : undefined,
      courseId: this.courseId() ?? undefined,
      termIds: this.termIds(),
      sectionIds: this.sectionIds(),
      level: allowedLevel,
      runId: this.runId() ?? undefined,
    };
    if (dimension === 'COHORT' && this.canAnalyzeProgramScope) {
      query.cohorts = splitList(this.cohortsText());
    }
    if (dimension === 'ASSESSMENT_COMPONENT') {
      query.assessmentTypes = this.assessmentTypes();
    }
    if (dimension === 'CURRICULUM_CLASSIFICATION' && this.canAnalyzeProgramScope) {
      query.classificationType = this.classificationType();
    } else {
      const subjectIds = splitList(this.subjectIdsText());
      if (subjectIds.length > 0) {
        query.subjectIds = subjectIds;
      }
    }
    if (dimension === 'COURSE_LECTURER' && this.canAnalyzeProgramScope) {
      const selected = this.selectedLecturerIds();
      query.lecturerIds = selected.length > 0 ? selected : splitList(this.lecturerIdsText());
    }
    if (dimension === 'STUDENT') {
      query.studentIds = splitList(this.studentIdsText());
      query.page = this.studentPage();
      query.size = this.studentSize();
      const search = this.studentSearch().trim();
      if (search) {
        query.search = search;
      }
    }
    const passedVal = this.passedFilter();
    if (passedVal === 'true' || passedVal === 'false') {
      query.passed = passedVal === 'true';
    }
    return query;
  }

  analyze(): void {
    if (this.loading() || !this.canAccessAnalytics || !this.availableDimensions.includes(this.dimension())) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.analyticsSvc.getMatrix(this.buildQuery()).pipe(
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: res => {
        this.result.set(res);
        if (res.dimension === 'COURSE_LECTURER' && this.canLoadLecturers) {
          const lecturerHeaders = lecturerAxisOf(res) === 'rows' ? res.rows : res.columns;
          const needsLookup = lecturerHeaders.some(h => {
            const name = trimmedNonEmpty(h.name);
            const code = trimmedNonEmpty(h.code);
            return !name || name === code;
          });
          if (needsLookup) {
            this.ensureLecturersLoaded();
          }
        }
        if (res.dimension === 'STUDENT') {
          if (res.page !== undefined) {
            this.studentPage.set(res.page);
          }
          if (res.size !== undefined) {
            this.studentSize.set(res.size);
          }
        }
      },
      error: (err: unknown) => {
        this.result.set(null);
        this.error.set(toUserError(err));
      },
    });
  }

  private runExport(format: ReportExportFormat): void {
    if (this.exporting() || !this.canAccessAnalytics || !this.availableDimensions.includes(this.dimension())) {
      return;
    }
    this.exportingFormat.set(format);
    const request$ = format === 'xlsx'
      ? this.analyticsSvc.exportExcel(this.buildQuery())
      : this.analyticsSvc.exportCsv(this.buildQuery());
    request$.pipe(
      finalize(() => this.exportingFormat.set(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: res => {
        const blob = res.body;
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileNameFrom(res.headers.get('Content-Disposition')) ?? `phan-tich-${this.dimension().toLowerCase()}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
        this.toastr.success(format === 'xlsx' ? 'Đã xuất tệp Excel' : 'Đã xuất tệp CSV');
      },
      error: (err: unknown) => this.toastr.error(toUserError(err).message),
    });
  }

  exportCsv(): void {
    this.runExport('csv');
  }

  exportExcel(): void {
    this.runExport('xlsx');
  }

  /** Độ rộng thanh theo % của trục 0–100%; giá trị đã là tỷ lệ 0–1 nên chỉ nhân 100 để vẽ. */
  barWidth(value: number | null): number {
    return value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  }

  barTitle(group: IChartGroup, bar: IChartBar): string {
    const value = bar.value === null ? PLACEHOLDER.INSUFFICIENT : `${(bar.value * 100).toFixed(1)}%`;
    const cell = bar.cell;
    const counts = cell ? ` · ${cell.evaluated}/${cell.enrolled} đủ dữ liệu` : '';
    return `${bar.label} · ${group.label} · ${value}${counts}`;
  }

  ensureLecturersLoaded(): void {
    if (
      !this.canLoadLecturers
      || this.lecturersLoaded
      || this.loadingLecturers()
      || typeof this.sectionSvc.getLecturers !== 'function'
    ) {
      return;
    }
    this.loadingLecturers.set(true);
    this.sectionSvc.getLecturers().pipe(
      catchError(() => of(null)),
      finalize(() => this.loadingLecturers.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => {
      if (list !== null) {
        this.lecturers.set(list);
        this.lecturersLoaded = true;
      }
    });
  }

  onLecturerDropdownOpen(open: boolean): void {
    if (open) {
      this.ensureLecturersLoaded();
    }
  }

  protected lecturerOptionLabel(user: IUser): string {
    return trimmedNonEmpty(user.fullName) ?? trimmedNonEmpty(user.username) ?? user.id;
  }

  protected columnHeaderLabel(col: IMatrixHeader, res: IAnalyticsMatrix): string {
    if (lecturerAxisOf(res) === 'columns') {
      return lecturerHeaderLabel(col, this.lecturerNameLookup());
    }
    return headerLabel(col);
  }

  protected rowHeaderLabel(row: IMatrixHeader, res: IAnalyticsMatrix): string {
    if (lecturerAxisOf(res) === 'rows') {
      return lecturerHeaderLabel(row, this.lecturerNameLookup());
    }
    return headerLabel(row);
  }

  protected rowSubtitle(row: IMatrixHeader, res: IAnalyticsMatrix): string | null {
    if (lecturerAxisOf(res) === 'rows') {
      return null;
    }
    const code = trimmedNonEmpty(row.code);
    const name = trimmedNonEmpty(row.name);
    if (code && name) {
      return name;
    }
    return null;
  }

  cellValue(cell: IMatrixMetricCell | undefined): number | null {
    return cell ? cell[this.metric()] : null;
  }
}

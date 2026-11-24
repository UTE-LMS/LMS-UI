import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
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
import { CalculationRunResponse, ResultLevel } from '@models/measurement/measurement.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { AnalyticsService } from '@services/measurement/analytics.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { StaleWarningComponent } from '@widget/stale-warning/stale-warning.component';
import { UnofficialLabelComponent } from '@widget/unofficial-label/unofficial-label.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, finalize, map, of } from 'rxjs';

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
  label: string;
  bars: IChartBar[];
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
    FormsModule, DecimalPipe, NzButtonModule, NzRadioModule, NzSelectModule, NzTableModule,
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
  readonly isAdminOrQa = this.authSvc.hasAnyRole([this.role.ADMIN, this.role.QA]);
  readonly isProgramManager = this.authSvc.hasAnyRole([this.role.PROGRAM_MANAGER]);
  readonly isLecturer = this.authSvc.hasAnyRole([this.role.LECTURER]);
  readonly canAnalyzeProgramScope = this.isAdminOrQa || this.isProgramManager;
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

  // Danh mục cho bộ lọc
  readonly programVersions = signal<IProgramVersion[]>([]);
  readonly courses = signal<ICourse[]>([]);
  readonly terms = signal<ITerm[]>([]);
  readonly sections = signal<ISection[]>([]);
  readonly runs = signal<CalculationRunResponse[]>([]);

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
  readonly lecturerIdsText = signal('');
  readonly studentIdsText = signal('');
  readonly subjectIdsText = signal('');
  readonly passedFilter = signal<'ALL' | 'true' | 'false'>('ALL');

  // Kết quả
  readonly metric = signal<AnalyticsMetric>('mean');
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<IUserError | null>(null);
  readonly result = signal<IAnalyticsMatrix | null>(null);

  readonly sectionsOfCourse = computed(() => {
    const courseId = this.courseId();
    return courseId ? this.sections().filter(s => s.courseId === courseId) : this.sections();
  });

  readonly isEmpty = computed(() => {
    const res = this.result();
    return !!res && (res.rows.length === 0 || res.columns.length === 0);
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
      label: headerLabel(col),
      bars: rows.map((row, rowIndex) => {
        const cell = res.matrix[rowIndex]?.[colIndex];
        return {
          seriesIndex: rowIndex,
          label: headerLabel(row),
          color: SERIES_COLORS[rowIndex],
          value: cell ? cell[metric] : null,
          cell,
        };
      }),
    }));
  });

  readonly legend = computed(() => (this.result()?.rows ?? []).slice(0, MAX_CHART_SERIES).map((row, i) => ({
    label: headerLabel(row),
    color: SERIES_COLORS[i],
  })));

  ngOnInit(): void {
    this.loadLookups();
  }

  private loadLookups(): void {
    if (!this.canAccessAnalytics) {
      return;
    }
    if (this.canAnalyzeProgramScope) {
      this.programVersionSvc.getProgramVersions(0, 100)
        .pipe(map(page => page.content), catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
        .subscribe(list => this.programVersions.set(list));
    }
    // Backend giới hạn size <= 100 (@Max ở CourseController); quá giới hạn sẽ trả 400.
    this.courseSvc.getCourses(0, 100).pipe(map(page => page.content), catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(list => this.courses.set(list));
    this.termSvc.getTerms().pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.terms.set(list));
    this.sectionSvc.getSections().pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.sections.set(list));
    this.calcSvc.getCalculationRuns(undefined, 0, 100).pipe(
      map(res => res.content.filter(r => r.status === 'SUCCESS')),
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => this.runs.set(list));
  }

  selectDimension(dimension: AnalyticsDimension): void {
    if (!this.availableDimensions.includes(dimension)) {
      return;
    }
    this.dimension.set(dimension);
    this.result.set(null);
    this.error.set(null);
  }

  resetFilters(): void {
    this.programVersionId.set(null);
    this.courseId.set(null);
    this.termIds.set([]);
    this.sectionIds.set([]);
    this.level.set(null);
    this.runId.set(null);
    this.cohortsText.set('');
    this.assessmentTypes.set([]);
    this.classificationType.set('PLO_CATEGORY');
    this.lecturerIdsText.set('');
    this.studentIdsText.set('');
    this.subjectIdsText.set('');
    this.passedFilter.set('ALL');
    this.error.set(null);
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
      query.lecturerIds = splitList(this.lecturerIdsText());
    }
    if (dimension === 'STUDENT') {
      query.studentIds = splitList(this.studentIdsText());
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
      next: res => this.result.set(res),
      error: (err: unknown) => {
        this.result.set(null);
        this.error.set(toUserError(err));
      },
    });
  }

  exportCsv(): void {
    if (this.exporting() || !this.canAccessAnalytics || !this.availableDimensions.includes(this.dimension())) {
      return;
    }
    this.exporting.set(true);
    this.analyticsSvc.exportCsv(this.buildQuery()).pipe(
      finalize(() => this.exporting.set(false)),
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
        link.download = fileNameFrom(res.headers.get('Content-Disposition')) ?? `phan-tich-${this.dimension().toLowerCase()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.toastr.success('Đã xuất tệp CSV');
      },
      error: (err: unknown) => this.toastr.error(toUserError(err).message),
    });
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

  cellValue(cell: IMatrixMetricCell | undefined): number | null {
    return cell ? cell[this.metric()] : null;
  }
}

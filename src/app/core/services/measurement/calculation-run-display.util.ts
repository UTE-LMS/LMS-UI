import { CALCULATION_SCOPE_LABEL } from '@constants/analytics-display.constant';
import { ASSESSMENT_TYPE_LABEL } from '@constants/assessment-display.constant';
import { AggregateResultResponse, CalculationRunResponse, ReportType } from '@models/measurement/measurement.model';

export interface CalculationRunLookupMaps {
  readonly programVersions?: ReadonlyMap<string, string>;
  readonly sections?: ReadonlyMap<string, string>;
  readonly terms?: ReadonlyMap<string, string>;
  readonly courses?: ReadonlyMap<string, string>;
}

export interface CalculationRunFilterCriteria {
  readonly programVersionId?: string | null;
  readonly termIds?: readonly string[];
  readonly sectionIds?: readonly string[];
  readonly courseId?: string | null;
  readonly cohorts?: readonly string[];
  readonly reportType?: ReportType | null;
}

export interface CalculationRunOptionView {
  readonly id: string;
  readonly run: CalculationRunResponse;
  readonly primaryLabel: string;
  readonly metaText: string;
  readonly timeLabel: string;
  readonly selectLabel: string;
  readonly official: boolean;
  readonly stale: boolean;
}

export type MeasurementResultContextInput = Pick<
  AggregateResultResponse,
  | 'level'
  | 'sectionCode'
  | 'courseCode'
  | 'courseName'
  | 'assessmentName'
  | 'assessmentType'
  | 'termCode'
  | 'programCode'
  | 'programName'
  | 'programVersion'
> & {
  readonly scope?: {
    readonly cohort?: string | null;
  } | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatRunTimestamp(iso?: string): string {
  const trimmed = iso?.trim();
  if (!trimmed) {
    return '';
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatCodeList(codes: readonly string[] | undefined, maxItems = 2): string | null {
  const cleaned = (codes ?? []).map(c => c.trim()).filter(c => c.length > 0);
  if (cleaned.length === 0) {
    return null;
  }
  const shown = cleaned.slice(0, maxItems);
  const remaining = cleaned.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')} +${remaining}` : shown.join(', ');
}

function formatResolvedList(
  ids: readonly string[] | undefined,
  map: ReadonlyMap<string, string> | undefined,
  unit: string,
  maxItems = 2,
): string | null {
  const cleaned = (ids ?? []).map(id => id.trim()).filter(id => id.length > 0);
  if (cleaned.length === 0) {
    return null;
  }
  const resolved = cleaned
    .map(id => map?.get(id)?.trim())
    .filter((label): label is string => Boolean(label));
  if (resolved.length === 0) {
    return `${cleaned.length} ${unit}`;
  }
  const shown = resolved.slice(0, maxItems);
  const remaining = cleaned.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')} +${remaining}` : shown.join(', ');
}

function formatCohortList(cohorts: readonly string[] | undefined, maxItems = 3): string | null {
  const cleaned = (cohorts ?? []).map(c => c.trim()).filter(c => c.length > 0);
  if (cleaned.length === 0) {
    return null;
  }
  const shown = cleaned.slice(0, maxItems);
  const remaining = cleaned.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')} +${remaining}` : shown.join(', ');
}

function nonEmpty(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return null;
}

function formatProgramLabel(
  programCode?: string | null,
  programName?: string | null,
  programVersion?: string | null,
  fallbackVersion?: string | null,
): string | null {
  const prog = nonEmpty(programCode) ?? nonEmpty(programName);
  const ver = nonEmpty(programVersion);
  if (prog && ver) {
    return `${prog} ${ver}`;
  }
  if (ver) {
    return `CTĐT ${ver}`;
  }
  if (prog) {
    return `CTĐT ${prog}`;
  }
  const fb = nonEmpty(fallbackVersion);
  if (fb) {
    return fb.includes('·') ? fb : `CTĐT ${fb}`;
  }
  return null;
}

function formatCourseLabel(courseCode?: string | null, courseName?: string | null): string | null {
  const code = nonEmpty(courseCode);
  const name = nonEmpty(courseName);
  if (code && name) {
    return `${code} — ${name}`;
  }
  return code ?? name;
}

export function formatCalculationRunOption(
  run: CalculationRunResponse,
  lookups: CalculationRunLookupMaps = {},
): CalculationRunOptionView {
  const scopeLabel = CALCULATION_SCOPE_LABEL[run.scope] ?? run.scope;
  const pvDisplay = formatProgramLabel(
    run.programCode,
    run.programName,
    run.programVersion,
    run.programVersionId ? lookups.programVersions?.get(run.programVersionId) : undefined,
  );
  const termLabel = nonEmpty(run.termCode)
    ?? (run.scopeRef?.termId ? nonEmpty(lookups.terms?.get(run.scopeRef.termId)) : null);
  const sectionText = formatCodeList(run.sectionCodes, 2)
    ?? formatResolvedList(run.scopeRef?.sectionIds, lookups.sections, 'lớp', 2);
  const courseText = nonEmpty(run.courseCode)
    ?? formatResolvedList(run.scopeRef?.courseIds, lookups.courses, 'học phần', 2);
  const cohortText = formatCohortList(run.scopeRef?.cohorts, 3);

  const contextParts: string[] = [];
  if (run.scope === 'SECTION') {
    const primaryTarget = sectionText ?? courseText;
    if (primaryTarget) contextParts.push(primaryTarget);
    if (sectionText && courseText) contextParts.push(courseText);
    if (termLabel) contextParts.push(termLabel);
    if (pvDisplay) contextParts.push(pvDisplay);
  } else if (run.scope === 'COHORT') {
    if (cohortText) contextParts.push(cohortText);
    if (pvDisplay) contextParts.push(pvDisplay);
    if (termLabel) contextParts.push(termLabel);
  } else {
    if (pvDisplay) contextParts.push(pvDisplay);
    if (cohortText) contextParts.push(`Khóa ${cohortText}`);
    if (termLabel) contextParts.push(termLabel);
  }

  const primaryLabel = contextParts.length > 0 ? `${scopeLabel} · ${contextParts.join(' · ')}` : scopeLabel;
  const metaText = `${run.studentResultCount ?? 0} KQ SV · ${run.aggregateResultCount ?? 0} tổng hợp`;
  const timeLabel = formatRunTimestamp(run.startedAt ?? run.finishedAt);
  const statusParts = [
    run.official ? 'Chính thức' : 'Thử nghiệm',
    ...(run.stale ? ['Cần tính lại'] : []),
    ...(timeLabel ? [timeLabel] : []),
  ];
  const selectLabel = `${primaryLabel} (${statusParts.join(' · ')})`;

  return {
    id: run.id,
    run,
    primaryLabel,
    metaText,
    timeLabel,
    selectLabel,
    official: run.official,
    stale: run.stale,
  };
}

export function formatMeasurementResultContext(item: MeasurementResultContextInput): string {
  const assessmentName = item.assessmentName?.trim();
  const assessmentTypeLabel = item.assessmentType
    ? (ASSESSMENT_TYPE_LABEL[item.assessmentType] ?? item.assessmentType)
    : undefined;
  const assessmentLabel = assessmentName
    ? (assessmentTypeLabel ? `${assessmentName} (${assessmentTypeLabel})` : assessmentName)
    : assessmentTypeLabel;
  const sectionLabel = nonEmpty(item.sectionCode);
  const courseLabel = formatCourseLabel(item.courseCode, item.courseName);
  const termLabel = nonEmpty(item.termCode);
  const programLabel = formatProgramLabel(item.programCode, item.programName, item.programVersion);
  const cohort = nonEmpty(item.scope?.cohort);

  const parts: string[] = [];
  if (item.level === 'ASSESSMENT_CLO') {
    if (assessmentLabel) parts.push(assessmentLabel);
    if (sectionLabel) parts.push(sectionLabel);
    if (courseLabel) parts.push(courseLabel);
    if (termLabel) parts.push(termLabel);
  } else if (item.level === 'CLO') {
    if (sectionLabel) parts.push(sectionLabel);
    if (courseLabel) parts.push(courseLabel);
    if (termLabel) parts.push(termLabel);
  } else {
    if (programLabel) parts.push(programLabel);
    if (cohort) parts.push(`Khóa ${cohort}`);
    if (sectionLabel) parts.push(sectionLabel);
    if (courseLabel) parts.push(courseLabel);
    if (termLabel) parts.push(termLabel);
  }

  return parts.length > 0 ? parts.join(' · ') : '—';
}

function scopePreferenceRank(scope: CalculationRunResponse['scope'], reportType?: ReportType | null): number {
  if (reportType === 'SECTION_CLO') {
    if (scope === 'SECTION') return 0;
    if (scope === 'COHORT') return 1;
    return 2;
  }
  if (reportType === 'COURSE_PI') {
    return scope === 'SECTION' ? 1 : 0;
  }
  if (reportType === 'PROGRAM_PLO') {
    if (scope === 'PROGRAM') return 0;
    if (scope === 'COHORT') return 1;
    return 2;
  }
  return 0;
}

function runTimestampMs(run: CalculationRunResponse): number {
  const raw = run.startedAt ?? run.finishedAt;
  if (!raw) {
    return 0;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function filterCalculationRuns(
  runs: readonly CalculationRunResponse[],
  criteria: CalculationRunFilterCriteria = {},
): CalculationRunResponse[] {
  const normalizedCohorts = new Set(
    (criteria.cohorts ?? []).map(c => c.trim().toLowerCase()).filter(c => c.length > 0),
  );
  const termIds = criteria.termIds ?? [];
  const sectionIds = criteria.sectionIds ?? [];
  const courseId = criteria.courseId?.trim() ? criteria.courseId : null;
  const pvId = criteria.programVersionId?.trim() ? criteria.programVersionId : null;

  const filtered = runs.filter(run => {
    if (run.status !== 'SUCCESS') {
      return false;
    }
    if (pvId && run.programVersionId !== pvId) {
      return false;
    }
    if (termIds.length > 0 && run.scopeRef?.termId && !termIds.includes(run.scopeRef.termId)) {
      return false;
    }
    if (
      sectionIds.length > 0
      && run.scopeRef?.sectionIds?.length
      && !run.scopeRef.sectionIds.some(id => sectionIds.includes(id))
    ) {
      return false;
    }
    if (courseId && run.scopeRef?.courseIds?.length && !run.scopeRef.courseIds.includes(courseId)) {
      return false;
    }
    if (
      normalizedCohorts.size > 0
      && run.scopeRef?.cohorts?.length
      && !run.scopeRef.cohorts.some(c => normalizedCohorts.has(c.trim().toLowerCase()))
    ) {
      return false;
    }
    if (criteria.reportType === 'PROGRAM_PLO' && run.scope !== 'PROGRAM' && !run.programVersionId) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const scopeDiff = scopePreferenceRank(a.scope, criteria.reportType) - scopePreferenceRank(b.scope, criteria.reportType);
    if (scopeDiff !== 0) {
      return scopeDiff;
    }
    if (a.official !== b.official) {
      return a.official ? -1 : 1;
    }
    if (a.stale !== b.stale) {
      return a.stale ? 1 : -1;
    }
    return runTimestampMs(b) - runTimestampMs(a);
  });
}

export function buildCalculationRunOptions(
  runs: readonly CalculationRunResponse[],
  criteria: CalculationRunFilterCriteria = {},
  lookups: CalculationRunLookupMaps = {},
): CalculationRunOptionView[] {
  return filterCalculationRuns(runs, criteria).map(run => formatCalculationRunOption(run, lookups));
}

import { CalculationRunResponse } from '@models/measurement/measurement.model';
import { describe, expect, it } from 'vitest';
import {
  buildCalculationRunOptions,
  CalculationRunLookupMaps,
  filterCalculationRuns,
  formatCalculationRunOption,
  formatMeasurementResultContext,
  formatRunTimestamp,
} from './calculation-run-display.util';

function makeRun(overrides: Partial<CalculationRunResponse> = {}): CalculationRunResponse {
  return {
    id: 'run-1',
    scope: 'SECTION',
    lockKey: 'lock-1',
    official: true,
    stale: false,
    status: 'SUCCESS',
    studentResultCount: 45,
    aggregateResultCount: 6,
    startedAt: '2026-11-26T02:00:00',
    ...overrides,
  };
}

describe('calculation-run-display.util', () => {
  const lookups: CalculationRunLookupMaps = {
    programVersions: new Map([['pv-1', 'v2024'], ['pv-2', 'v2026']]),
    sections: new Map([['sec-1', 'CS101-01'], ['sec-2', 'CS101-02'], ['sec-3', 'CS101-03']]),
    terms: new Map([['term-1', 'HK1-2526'], ['term-2', 'HK2-2526']]),
    courses: new Map([['course-1', 'CS101']]),
  };

  it('formatRunTimestamp định dạng DD/MM/YYYY HH:mm và xử lý chuỗi rỗng hoặc không hợp lệ', () => {
    expect(formatRunTimestamp(undefined)).toBe('');
    expect(formatRunTimestamp('   ')).toBe('');
    expect(formatRunTimestamp('not-a-date')).toBe('not-a-date');
    expect(formatRunTimestamp('2026-11-26T02:05:00')).toBe('26/11/2026 02:05');
  });

  it('formatCalculationRunOption ưu tiên trường phẳng trên DTO ngay cả khi không có lookups', () => {
    const dtoOpt = formatCalculationRunOption(
      makeRun({
        scope: 'SECTION',
        programCode: 'CNTT',
        programVersion: 'v2026',
        termCode: 'HK1-2526',
        courseCode: 'CS101',
        sectionCodes: ['CS101-01', 'CS101-02', 'CS101-03'],
      }),
      {},
    );
    expect(dtoOpt.primaryLabel).toBe('Lớp học phần · CS101-01, CS101-02 +1 · CS101 · HK1-2526 · CNTT v2026');

    const secOpt = formatCalculationRunOption(
      makeRun({
        scope: 'SECTION',
        programVersionId: 'pv-1',
        scopeRef: { sectionIds: ['sec-1', 'sec-2', 'sec-3'], termId: 'term-1' },
      }),
      lookups,
    );
    expect(secOpt.primaryLabel).toBe('Lớp học phần · CS101-01, CS101-02 +1 · HK1-2526 · CTĐT v2024');
    expect(secOpt.metaText).toBe('45 KQ SV · 6 tổng hợp');
    expect(secOpt.timeLabel).toBe('26/11/2026 02:00');
    expect(secOpt.selectLabel).toContain('Chính thức');

    const fallbackOpt = formatCalculationRunOption(
      makeRun({
        scope: 'SECTION',
        official: false,
        stale: true,
        scopeRef: { sectionIds: ['673f1234567890abcdef1234', '673f1234567890abcdef5678'] },
      }),
      {},
    );
    expect(fallbackOpt.primaryLabel).toBe('Lớp học phần · 2 lớp');
    expect(fallbackOpt.primaryLabel).not.toContain('673f1234567890abcdef1234');
    expect(fallbackOpt.selectLabel).toContain('Thử nghiệm');
    expect(fallbackOpt.selectLabel).toContain('Cần tính lại');

    const cohortOpt = formatCalculationRunOption(
      makeRun({
        scope: 'COHORT',
        programVersionId: 'pv-1',
        scopeRef: { cohorts: ['K22', 'K23'], termId: 'term-1' },
      }),
      lookups,
    );
    expect(cohortOpt.primaryLabel).toBe('Khóa tuyển sinh · K22, K23 · CTĐT v2024 · HK1-2526');

    const programOpt = formatCalculationRunOption(
      makeRun({
        scope: 'PROGRAM',
        programVersionId: 'pv-2',
        scopeRef: { cohorts: ['K24'] },
      }),
      lookups,
    );
    expect(programOpt.primaryLabel).toBe('Toàn CTĐT · CTĐT v2026 · Khóa K24');
  });

  it('formatMeasurementResultContext hiển thị ngữ cảnh đầy đủ theo cấp độ và xử lý null an toàn', () => {
    expect(formatMeasurementResultContext({
      level: 'ASSESSMENT_CLO',
      assessmentName: 'Giữa kỳ',
      assessmentType: 'MIDTERM',
      sectionCode: 'CS101-01',
      courseCode: 'CS101',
      courseName: 'Nhập môn lập trình',
      termCode: 'HK1-2526',
    })).toBe('Giữa kỳ (Giữa kỳ) · CS101-01 · CS101 — Nhập môn lập trình · HK1-2526');

    expect(formatMeasurementResultContext({
      level: 'CLO',
      assessmentName: null,
      assessmentType: null,
      sectionCode: 'CS101-01',
      courseCode: 'CS101',
      courseName: null,
      termCode: 'HK1-2526',
    })).toBe('CS101-01 · CS101 · HK1-2526');

    expect(formatMeasurementResultContext({
      level: 'PLO',
      programCode: 'CNTT',
      programVersion: 'v2024',
      scope: { cohort: 'K23' },
      sectionCode: null,
      assessmentName: null,
    })).toBe('CNTT v2024 · Khóa K23');

    expect(formatMeasurementResultContext({ level: 'PI' })).toBe('—');
  });

  it('filterCalculationRuns lọc theo CTĐT, học kỳ, lớp, học phần, khóa và loại báo cáo', () => {
    const runs: CalculationRunResponse[] = [
      makeRun({ id: 'r-sec-1', scope: 'SECTION', programVersionId: 'pv-1', scopeRef: { sectionIds: ['sec-1'], termId: 'term-1', courseIds: ['course-1'] } }),
      makeRun({ id: 'r-sec-2', scope: 'SECTION', scopeRef: { sectionIds: ['sec-2'], termId: 'term-2' } }),
      makeRun({ id: 'r-cohort', scope: 'COHORT', programVersionId: 'pv-1', scopeRef: { cohorts: ['K22', 'K23'] } }),
      makeRun({ id: 'r-prog', scope: 'PROGRAM', programVersionId: 'pv-1' }),
      makeRun({ id: 'r-failed', status: 'FAILED', scope: 'PROGRAM', programVersionId: 'pv-1' }),
    ];

    expect(filterCalculationRuns(runs, { programVersionId: 'pv-1' }).map(r => r.id)).toEqual([
      'r-sec-1',
      'r-cohort',
      'r-prog',
    ]);

    expect(filterCalculationRuns(runs, { termIds: ['term-1'] }).map(r => r.id)).toEqual([
      'r-sec-1',
      'r-cohort',
      'r-prog',
    ]);

    expect(filterCalculationRuns(runs, { sectionIds: ['sec-1'] }).map(r => r.id)).toEqual([
      'r-sec-1',
      'r-cohort',
      'r-prog',
    ]);

    expect(filterCalculationRuns(runs, { cohorts: ['k22'] }).map(r => r.id)).toEqual([
      'r-sec-1',
      'r-sec-2',
      'r-cohort',
      'r-prog',
    ]);

    expect(filterCalculationRuns(runs, { reportType: 'PROGRAM_PLO' }).map(r => r.id)).toEqual([
      'r-prog',
      'r-cohort',
      'r-sec-1',
    ]);
  });

  it('buildCalculationRunOptions sắp xếp ưu tiên theo loại báo cáo, chính thức, không cũ, mới nhất', () => {
    const runs: CalculationRunResponse[] = [
      makeRun({ id: 'trial-old', scope: 'SECTION', official: false, stale: false, startedAt: '2026-11-25T10:00:00' }),
      makeRun({ id: 'official-stale', scope: 'SECTION', official: true, stale: true, startedAt: '2026-11-26T05:00:00' }),
      makeRun({ id: 'official-fresh-old', scope: 'SECTION', official: true, stale: false, startedAt: '2026-11-25T10:00:00' }),
      makeRun({ id: 'official-fresh-new', scope: 'SECTION', official: true, stale: false, startedAt: '2026-11-26T01:00:00' }),
      makeRun({ id: 'program-run', scope: 'PROGRAM', programVersionId: 'pv-1', official: true, stale: false, startedAt: '2026-11-26T04:00:00' }),
    ];

    const sectionOrder = buildCalculationRunOptions(runs, { reportType: 'SECTION_CLO' }, lookups).map(o => o.id);
    expect(sectionOrder).toEqual([
      'official-fresh-new',
      'official-fresh-old',
      'official-stale',
      'trial-old',
      'program-run',
    ]);

    const programOrder = buildCalculationRunOptions(runs, { reportType: 'PROGRAM_PLO' }, lookups).map(o => o.id);
    expect(programOrder[0]).toBe('program-run');
  });
});

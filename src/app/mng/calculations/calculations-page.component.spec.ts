import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import {
  AggregateResultResponse,
  CalculationRunResponse,
  StudentResultResponse,
} from '@models/measurement/measurement.model';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ReportService } from '@services/measurement/report.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalculationsPageComponent } from './calculations-page.component';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true };

const sampleRuns: CalculationRunResponse[] = [
  {
    id: 'run-1',
    scope: 'SECTION',
    programVersionId: 'pv-1',
    programCode: 'CNTT',
    programName: 'Công nghệ thông tin',
    programVersion: 'v2024',
    termCode: 'HK1-2526',
    courseCode: 'CS101',
    courseName: 'Nhập môn lập trình',
    sectionCodes: ['CS101-01'],
    lockKey: 'k1',
    official: true,
    stale: false,
    status: 'SUCCESS',
    studentResultCount: 40,
    aggregateResultCount: 3,
    startedAt: '2026-11-26T02:00:00',
  },
];

const sampleAggregates: AggregateResultResponse[] = [
  {
    id: 'agg-1',
    runId: 'run-1',
    level: 'ASSESSMENT_CLO',
    subjectId: 'clo-1',
    subjectCode: 'CLO1',
    sectionCode: 'CS101-01',
    courseCode: 'CS101',
    courseName: 'Nhập môn lập trình',
    assessmentName: 'Giữa kỳ',
    assessmentType: 'MIDTERM',
    termCode: 'HK1-2526',
    counts: { enrolled: 40, passed: 32, failed: 8 },
    evaluated: 40,
    insufficientData: 0,
    mean: 0.8,
    passRate: 0.8,
    passRateOfEnrolled: 0.8,
  },
  {
    id: 'agg-2',
    runId: 'run-1',
    level: 'PLO',
    subjectId: 'plo-1',
    subjectCode: 'PLO1',
    sectionCode: null,
    assessmentName: null,
    programCode: 'CNTT',
    programName: 'Công nghệ thông tin',
    programVersion: 'v2024',
    counts: { enrolled: 40, passed: 30, failed: 10 },
    evaluated: 40,
    insufficientData: 0,
    mean: 0.75,
    passRate: 0.75,
    passRateOfEnrolled: 0.75,
  },
];

const sampleStudents: StudentResultResponse[] = [
  {
    id: 'sr-1',
    runId: 'run-1',
    level: 'ASSESSMENT_CLO',
    subjectId: 'clo-1',
    subjectCode: 'CLO1',
    sectionCode: 'CS101-01',
    courseCode: 'CS101',
    courseName: 'Nhập môn lập trình',
    assessmentName: 'Giữa kỳ',
    assessmentType: 'MIDTERM',
    termCode: 'HK1-2526',
    studentId: 'st-1',
    studentCode: 'SV001',
    status: 'COMPUTED',
    value: 0.85,
    passThreshold: 0.5,
    passed: true,
  },
];

describe('CalculationsPageComponent', () => {
  let fixture: ComponentFixture<CalculationsPageComponent>;
  let component: CalculationsPageComponent;
  let calcSvc: {
    getCalculationRuns: ReturnType<typeof vi.fn>;
    getAggregateResults: ReturnType<typeof vi.fn>;
    getStudentResults: ReturnType<typeof vi.fn>;
    triggerCalculation: ReturnType<typeof vi.fn>;
  };
  let pvSvc: { getProgramVersions: ReturnType<typeof vi.fn>; getProgramVersionById: ReturnType<typeof vi.fn>; };
  let sectionSvc: { getSections: ReturnType<typeof vi.fn>; getSection: ReturnType<typeof vi.fn>; };
  let termSvc: { getTerms: ReturnType<typeof vi.fn>; getTermById: ReturnType<typeof vi.fn>; };

  beforeEach(async () => {
    calcSvc = {
      getCalculationRuns: vi.fn(() => of({ ...emptyPage, content: sampleRuns, totalElements: 1, totalPages: 1 })),
      getAggregateResults: vi.fn(() => of({ ...emptyPage, content: sampleAggregates, totalElements: 2, totalPages: 1, last: true })),
      getStudentResults: vi.fn(() => of({ ...emptyPage, content: sampleStudents, totalElements: 1, totalPages: 1, last: true })),
      triggerCalculation: vi.fn(),
    };
    pvSvc = { getProgramVersions: vi.fn(() => of(emptyPage)), getProgramVersionById: vi.fn(() => EMPTY) };
    sectionSvc = { getSections: vi.fn(() => of(emptyPage)), getSection: vi.fn(() => EMPTY) };
    termSvc = { getTerms: vi.fn(() => of(emptyPage)), getTermById: vi.fn(() => EMPTY) };

    await TestBed.configureTestingModule({
      imports: [CalculationsPageComponent],
      providers: [
        { provide: CalculationService, useValue: calcSvc },
        { provide: ProgramVersionService, useValue: pvSvc },
        { provide: SectionService, useValue: sectionSvc },
        { provide: TermService, useValue: termSvc },
        { provide: ReportService, useValue: { traceStudentResult: vi.fn(), traceScore: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('không tải trước dropdown danh mục lúc mới vào trang và không gọi trùng aggregate-results?size=100 khi trang đầu đã đủ', () => {
    expect(pvSvc.getProgramVersions).not.toHaveBeenCalled();
    expect(sectionSvc.getSections).not.toHaveBeenCalled();
    expect(termSvc.getTerms).not.toHaveBeenCalled();

    expect(calcSvc.getAggregateResults).toHaveBeenCalledTimes(1);
    expect(calcSvc.getAggregateResults).toHaveBeenCalledWith('run-1', undefined, undefined, 0, 20);
    expect(calcSvc.getStudentResults).not.toHaveBeenCalled();
    expect(component.subjectOptions().map(o => o.id)).toEqual(['clo-1', 'plo-1']);

    component.onTabChange(1);
    fixture.detectChanges();
    expect(calcSvc.getAggregateResults).toHaveBeenCalledTimes(1);
    expect(calcSvc.getStudentResults).toHaveBeenCalledTimes(1);
  });

  it('hiển thị ngữ cảnh bài kiểm tra/lớp/học phần/CTĐT trực tiếp từ DTO trên cả 3 bảng', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lớp học phần · CS101-01 · CS101 · HK1-2526 · CNTT v2024');
    expect(text).toContain('Giữa kỳ (Giữa kỳ) · CS101-01 · CS101 — Nhập môn lập trình · HK1-2526');
    expect(text).toContain('CNTT v2024');

    component.onTabChange(1);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Giữa kỳ (Giữa kỳ) · CS101-01 · CS101 — Nhập môn lập trình');
  });
});

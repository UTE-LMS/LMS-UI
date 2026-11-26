import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { CalculationRunResponse } from '@models/measurement/measurement.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ReportService } from '@services/measurement/report.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsPageComponent } from './reports-page.component';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true };

function createAuthMock(roles: readonly string[]) {
  return {
    getRoles: () => [...roles],
    hasAnyRole: (allowed: readonly string[]) => allowed.some(r => roles.includes(r)),
  };
}

const sampleRuns: CalculationRunResponse[] = [
  {
    id: 'run-sec-1',
    scope: 'SECTION',
    scopeRef: { sectionIds: ['sec-1'], termId: 'term-1' },
    lockKey: 'k1',
    programVersionId: 'pv-1',
    programCode: 'CNTT',
    programVersion: 'v2024',
    termCode: 'HK1-2526',
    sectionCodes: ['CS101-01'],
    official: true,
    stale: false,
    status: 'SUCCESS',
    startedAt: '2026-11-26T02:00:00',
    studentResultCount: 38,
    aggregateResultCount: 4,
  },
  {
    id: 'run-sec-only',
    scope: 'SECTION',
    scopeRef: { sectionIds: ['sec-2'], termId: 'term-2' },
    lockKey: 'k2',
    termCode: 'HK2-2526',
    sectionCodes: ['CS101-02'],
    official: false,
    stale: true,
    status: 'SUCCESS',
    startedAt: '2026-11-25T15:00:00',
    studentResultCount: 30,
    aggregateResultCount: 4,
  },
  {
    id: 'run-prog-1',
    scope: 'PROGRAM',
    lockKey: 'k3',
    programVersionId: 'pv-1',
    programCode: 'CNTT',
    programVersion: 'v2024',
    official: true,
    stale: false,
    status: 'SUCCESS',
    startedAt: '2026-11-26T01:00:00',
    studentResultCount: 150,
    aggregateResultCount: 16,
  },
];

describe('ReportsPageComponent', () => {
  let fixture: ComponentFixture<ReportsPageComponent>;
  let component: ReportsPageComponent;
  let reportSvc: {
    listReports: ReturnType<typeof vi.fn>;
    generateReport: ReturnType<typeof vi.fn>;
    exportReportCsv: ReturnType<typeof vi.fn>;
    exportReportExcel: ReturnType<typeof vi.fn>;
  };
  let calcSvc: { getCalculationRuns: ReturnType<typeof vi.fn>; };
  let pvSvc: { getProgramVersions: ReturnType<typeof vi.fn>; getProgramVersionById: ReturnType<typeof vi.fn>; };
  let courseSvc: {
    getCourses: ReturnType<typeof vi.fn>;
    getProgramCourses: ReturnType<typeof vi.fn>;
    getCourseById: ReturnType<typeof vi.fn>;
  };
  let sectionSvc: { getSections: ReturnType<typeof vi.fn>; getSection: ReturnType<typeof vi.fn>; };
  let termSvc: { getTerms: ReturnType<typeof vi.fn>; getTermById: ReturnType<typeof vi.fn>; };
  let toastr: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn>; };

  async function setupWithRoles(roles: readonly string[] = ['ADMIN']): Promise<void> {
    TestBed.resetTestingModule();
    reportSvc = {
      listReports: vi.fn(() => of(emptyPage)),
      generateReport: vi.fn(),
      exportReportCsv: vi.fn(),
      exportReportExcel: vi.fn(),
    };
    calcSvc = { getCalculationRuns: vi.fn(() => of({ ...emptyPage, content: sampleRuns })) };
    pvSvc = {
      getProgramVersions: vi.fn(() => of({
        ...emptyPage,
        content: [{ id: 'pv-1', programId: 'p1', version: 'v2024', status: 'ACTIVE' }],
      })),
      getProgramVersionById: vi.fn(() => EMPTY),
    };
    courseSvc = {
      getCourses: vi.fn(() => of(emptyPage)),
      getProgramCourses: vi.fn(() => of(emptyPage)),
      getCourseById: vi.fn(() => EMPTY),
    };
    sectionSvc = {
      getSections: vi.fn(() => of({
        ...emptyPage,
        content: [
          { id: 'sec-1', code: 'CS101-01', courseId: 'c1', syllabusId: 'sy1', termId: 'term-1', lecturerIds: [], status: 'OPEN' },
          { id: 'sec-2', code: 'CS101-02', courseId: 'c1', syllabusId: 'sy1', termId: 'term-2', lecturerIds: [], status: 'OPEN' },
        ],
      })),
      getSection: vi.fn(() => EMPTY),
    };
    termSvc = {
      getTerms: vi.fn(() => of({
        ...emptyPage,
        content: [
          { id: 'term-1', code: 'HK1-2526', status: 'OPEN' },
          { id: 'term-2', code: 'HK2-2526', status: 'OPEN' },
        ],
      })),
      getTermById: vi.fn(() => EMPTY),
    };
    toastr = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ReportsPageComponent],
      providers: [
        { provide: AuthService, useValue: createAuthMock(roles) },
        { provide: ReportService, useValue: reportSvc },
        { provide: CalculationService, useValue: calcSvc },
        { provide: ProgramVersionService, useValue: pvSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: SectionService, useValue: sectionSvc },
        { provide: TermService, useValue: termSvc },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setupWithRoles(['ADMIN']);
  });

  it('hiển thị nhãn lượt tính có ngữ cảnh trực tiếp từ DTO, lazy-load dropdown và ưu tiên lượt PROGRAM cho báo cáo PROGRAM_PLO', () => {
    expect(pvSvc.getProgramVersions).not.toHaveBeenCalled();
    expect(courseSvc.getCourses).not.toHaveBeenCalled();
    expect(courseSvc.getProgramCourses).not.toHaveBeenCalled();
    expect(sectionSvc.getSections).not.toHaveBeenCalled();
    expect(termSvc.getTerms).not.toHaveBeenCalled();

    const opts = component.runOptions();
    expect(opts.map(o => o.id)).toEqual(['run-prog-1', 'run-sec-1']);

    const secOpt = opts.find(o => o.id === 'run-sec-1');
    expect(secOpt?.primaryLabel).toBe('Lớp học phần · CS101-01 · HK1-2526 · CNTT v2024');
    expect(secOpt?.metaText).toBe('38 KQ SV · 4 tổng hợp');

    component.pvSelect.onOpenChange(true);
    expect(pvSvc.getProgramVersions).toHaveBeenCalled();
  });

  it('lọc liên hoàn theo Phiên bản CTĐT và tự bỏ chọn lượt tính không còn khớp', () => {
    component.onTypeChange('SECTION_CLO');
    component.selectedRunId.set('run-sec-only');

    calcSvc.getCalculationRuns.mockReturnValue(of({
      ...emptyPage,
      content: sampleRuns.filter(r => r.programVersionId === 'pv-1'),
    }));
    component.onProgramVersionChange('pv-1');

    expect(calcSvc.getCalculationRuns).toHaveBeenCalledWith('pv-1', 0, 20);
    expect(component.runOptions().map(o => o.id)).toEqual(['run-sec-1', 'run-prog-1']);
    expect(component.selectedRunId()).toBeNull();
  });

  it('chọn SECTION_CLO và lớp học phần lọc bỏ lượt tính của lớp khác', () => {
    component.onTypeChange('SECTION_CLO');
    component.selectedRunId.set('run-sec-only');
    component.onSectionChange('sec-1');

    expect(component.runOptions().map(o => o.id)).toEqual(['run-sec-1', 'run-prog-1']);
    expect(component.selectedRunId()).toBeNull();
  });

  it('LECTURER thuần túy ẩn bộ lọc Phiên bản CTĐT, giữ ô Học phần và không gọi API theo phiên bản', async () => {
    await setupWithRoles(['LECTURER']);
    const el = fixture.nativeElement as HTMLElement;

    expect(component.canFilterProgramVersion).toBe(false);
    expect(pvSvc.getProgramVersions).not.toHaveBeenCalled();
    expect(el.querySelector('#rep-pv')).toBeNull();
    expect(el.querySelector('#rep-course')).not.toBeNull();

    component.selectedProgramVersionId.set('pv-1');
    component.courseSelect.onOpenChange(true);
    component.sectionSelect.onOpenChange(true);

    expect(courseSvc.getProgramCourses).not.toHaveBeenCalled();
    expect(courseSvc.getCourses).toHaveBeenCalledWith(0, 20, undefined);
    expect(sectionSvc.getSections).toHaveBeenCalledWith(undefined, undefined, undefined, 0, 20, undefined);
  });

  it('chọn Phiên bản CTĐT lọc Học phần và Lớp học phần liên hoàn trong Báo cáo', () => {
    courseSvc.getProgramCourses.mockReturnValue(of({
      ...emptyPage,
      content: [
        {
          id: 'pc-1',
          programVersionId: 'pv-1',
          courseId: 'c1',
          course: { id: 'c1', code: 'CS101', name: 'Nhập môn CNTT' },
        },
      ],
    }));
    component.selectedCourseId.set('old-c');
    component.selectedSectionId.set('old-sec');

    component.onProgramVersionChange('pv-1');

    expect(component.selectedCourseId()).toBeNull();
    expect(component.selectedSectionId()).toBeNull();
    expect(courseSvc.getProgramCourses).not.toHaveBeenCalled();
    expect(sectionSvc.getSections).not.toHaveBeenCalled();

    component.courseSelect.onOpenChange(true);
    expect(courseSvc.getProgramCourses).toHaveBeenCalledWith('pv-1', undefined, undefined, undefined, undefined, 0, 20);
    expect(courseSvc.getCourses).not.toHaveBeenCalled();
    expect(component.courseSelect.options().map(c => c.code)).toEqual(['CS101']);

    component.sectionSelect.onOpenChange(true);
    expect(sectionSvc.getSections).toHaveBeenCalledWith(undefined, undefined, undefined, 0, 20, 'pv-1');

    component.onTypeChange('SECTION_CLO');
    component.successRuns.set([
      { ...sampleRuns[0], scopeRef: { sectionIds: ['sec-1'], courseIds: ['c1'] } },
      { ...sampleRuns[1], programVersionId: 'pv-1', scopeRef: { sectionIds: ['sec-2'], courseIds: ['c2'] } },
    ]);
    component.onCourseChange('c1');
    expect(component.selectedSectionId()).toBeNull();
    expect(sectionSvc.getSections).toHaveBeenLastCalledWith(undefined, 'c1', undefined, 0, 20, 'pv-1');
    expect(component.runOptions().map(o => o.id)).toEqual(['run-sec-1']);

    component.onProgramVersionChange(null);
    expect(courseSvc.getCourses).toHaveBeenCalledWith(0, 20, undefined);
    expect(sectionSvc.getSections).toHaveBeenLastCalledWith(undefined, undefined, undefined, 0, 20, undefined);
  });

  it('generate() kiểm tra điều kiện bắt buộc và gửi request hợp lệ', () => {
    component.generate();
    expect(toastr.warning).toHaveBeenCalledWith('Vui lòng chọn một lượt tính toán đã hoàn tất');

    component.onTypeChange('SECTION_CLO');
    component.selectedRunId.set('run-sec-1');
    component.generate();
    expect(toastr.warning).toHaveBeenCalledWith('Báo cáo CLO theo lớp học phần yêu cầu chọn lớp học phần');

    reportSvc.generateReport.mockReturnValue(of({
      id: 'rep-1',
      type: 'SECTION_CLO',
      title: 'Báo cáo lớp CS101-01',
      runId: 'run-sec-1',
      summary: { items: [] },
    }));
    component.onSectionChange('sec-1');
    component.reportTitle.set('Báo cáo lớp CS101-01');
    component.generate();

    expect(reportSvc.generateReport).toHaveBeenCalledWith({
      type: 'SECTION_CLO',
      runId: 'run-sec-1',
      title: 'Báo cáo lớp CS101-01',
      sectionId: 'sec-1',
    });
  });

  it('exportExcel() tải tệp .xlsx và báo lỗi khi thất bại', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:xlsx');
    URL.revokeObjectURL = vi.fn();

    const rep = {
      id: 'rep-1',
      type: 'PROGRAM_PLO' as const,
      title: 'PLO 2026',
      runId: 'run-prog-1',
      summary: { items: [] },
    };

    reportSvc.exportReportExcel.mockReturnValue(of(new Blob(['pk'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })));
    component.exportExcel(rep);

    expect(reportSvc.exportReportExcel).toHaveBeenCalledWith('rep-1');
    expect(clickSpy).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalledWith('Đã xuất tệp Excel báo cáo');

    reportSvc.exportReportExcel.mockReturnValue(throwError(() => new Error('boom')));
    component.exportExcel(rep);
    expect(toastr.error).toHaveBeenCalledWith('Không thể xuất tệp Excel');

    clickSpy.mockRestore();
  });
});

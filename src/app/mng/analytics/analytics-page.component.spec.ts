import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ANALYTICS_DIMENSION_DISPLAY } from '@constants/analytics-display.constant';
import { IAnalyticsMatrix } from '@models/measurement/analytics.model';
import { CalculationRunResponse } from '@models/measurement/measurement.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { AnalyticsService } from '@services/measurement/analytics.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsPageComponent, headerLabel, LECTURER_DIMENSIONS, MAX_CHART_SERIES } from './analytics-page.component';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true };

// DỮ LIỆU THỬ NGHIỆM: giá trị chọn tay để kiểm tra hiển thị, không phải kết quả đo thật.
const matrix: IAnalyticsMatrix = {
  dimension: 'COURSE_SECTIONS',
  level: 'PI',
  runId: 'run1',
  isOfficial: false,
  isStale: false,
  columns: [{ id: 'pi1', code: 'PI1.2' }, { id: 'pi2', code: 'PI6.3' }],
  rows: [{ id: 's1', code: 'LOP-01' }, { id: 's2', code: '', name: 'Lớp không mã' }],
  matrix: [
    [
      { enrolled: 45, evaluated: 40, passed: 30, failed: 10, insufficientData: 5, mean: 0.74, passRate: 0.75,
        passRateOfEnrolled: 0.6667, isOfficial: false, isStale: false },
      { enrolled: 45, evaluated: 0, passed: 0, failed: 0, insufficientData: 45, mean: null, passRate: null,
        passRateOfEnrolled: null, isOfficial: false, isStale: false },
    ],
    [
      { enrolled: 0, evaluated: 0, passed: 0, failed: 0, insufficientData: 0, mean: null, passRate: null,
        passRateOfEnrolled: null, isOfficial: false, isStale: false },
      { enrolled: 0, evaluated: 0, passed: 0, failed: 0, insufficientData: 0, mean: null, passRate: null,
        passRateOfEnrolled: null, isOfficial: false, isStale: false },
    ],
  ],
};

function createAuthMock(roles: readonly string[]) {
  return {
    getRoles: () => [...roles],
    hasAnyRole: (allowed: readonly string[]) => allowed.some(r => roles.includes(r)),
  };
}

describe('AnalyticsPageComponent', () => {
  let fixture: ComponentFixture<AnalyticsPageComponent>;
  let component: AnalyticsPageComponent;
  let analyticsSvc: { getMatrix: ReturnType<typeof vi.fn>; exportCsv: ReturnType<typeof vi.fn>; exportExcel: ReturnType<typeof vi.fn>; };
  let programVersionSvc: { getProgramVersions: ReturnType<typeof vi.fn>; getProgramVersionById: ReturnType<typeof vi.fn>; };
  let courseSvc: {
    getCourses: ReturnType<typeof vi.fn>;
    getProgramCourses: ReturnType<typeof vi.fn>;
    getCourseById: ReturnType<typeof vi.fn>;
  };
  let sectionSvc: {
    getSections: ReturnType<typeof vi.fn>;
    getSection: ReturnType<typeof vi.fn>;
    getLecturers: ReturnType<typeof vi.fn>;
  };
  let termSvc: { getTerms: ReturnType<typeof vi.fn>; getTermById: ReturnType<typeof vi.fn>; };
  let calcSvc: { getCalculationRuns: ReturnType<typeof vi.fn>; };
  let toastr: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; };

  async function setupWithRoles(roles: readonly string[] = ['ADMIN']): Promise<void> {
    TestBed.resetTestingModule();
    analyticsSvc = { getMatrix: vi.fn(() => of(matrix)), exportCsv: vi.fn(), exportExcel: vi.fn() };
    programVersionSvc = {
      getProgramVersions: vi.fn(() => of(emptyPage)),
      getProgramVersionById: vi.fn(() => EMPTY),
    };
    courseSvc = {
      getCourses: vi.fn(() => of(emptyPage)),
      getProgramCourses: vi.fn(() => of(emptyPage)),
      getCourseById: vi.fn(() => EMPTY),
    };
    sectionSvc = {
      getSections: vi.fn(() => of(emptyPage)),
      getSection: vi.fn(() => EMPTY),
      getLecturers: vi.fn(() => of([])),
    };
    termSvc = {
      getTerms: vi.fn(() => of(emptyPage)),
      getTermById: vi.fn(() => EMPTY),
    };
    calcSvc = { getCalculationRuns: vi.fn(() => of(emptyPage)) };
    toastr = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AnalyticsPageComponent],
      providers: [
        { provide: AuthService, useValue: createAuthMock(roles) },
        { provide: AnalyticsService, useValue: analyticsSvc },
        { provide: ProgramVersionService, useValue: programVersionSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: TermService, useValue: termSvc },
        { provide: SectionService, useValue: sectionSvc },
        { provide: CalculationService, useValue: calcSvc },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setupWithRoles(['ADMIN']);
  });

  it('AC-1: chỉ gửi tham số của chiều đang chọn (khóa chỉ gửi ở chiều COHORT)', () => {
    component.cohortsText.set('K22, K23');
    expect(component.buildQuery().cohorts).toBeUndefined();
    component.selectDimension('COHORT');
    expect(component.buildQuery().cohorts).toEqual(['K22', 'K23']);
  });

  it('AC-2: ô không có dữ liệu giữ null, không vẽ như 0%', () => {
    component.analyze();
    const groups = component.chartGroups();
    expect(groups.map(g => g.label)).toEqual(['PI1.2', 'PI6.3']);
    expect(groups[0].bars[0].value).toBe(0.74);
    expect(groups[1].bars[0].value).toBeNull();
    expect(component.barWidth(null)).toBe(0);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chưa đủ dữ liệu');
  });

  it('AC-3: đổi chỉ số hiển thị lấy đúng trường do backend tính', () => {
    component.analyze();
    component.metric.set('passRateOfEnrolled');
    expect(component.chartGroups()[0].bars[0].value).toBe(0.6667);
  });

  it('AC-4: nhãn hàng/cột bỏ qua mã rỗng, rơi về tên rồi ID', () => {
    expect(headerLabel({ id: 's2', code: '', name: 'Lớp không mã' })).toBe('Lớp không mã');
    expect(headerLabel({ id: 'x' })).toBe('x');
  });

  it('AC-5: biểu đồ giới hạn số chuỗi, bảng vẫn giữ đủ', () => {
    const many = { ...matrix, rows: Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, code: `R${i}` })),
      matrix: Array.from({ length: 10 }, () => matrix.matrix[0]) };
    analyticsSvc.getMatrix.mockReturnValue(of(many));
    component.analyze();
    expect(component.chartGroups()[0].bars.length).toBe(MAX_CHART_SERIES);
    expect(component.result()?.rows.length).toBe(10);
  });

  it('AC-6: lỗi 403 hiển thị trạng thái lỗi, không giữ kết quả cũ', () => {
    component.analyze();
    analyticsSvc.getMatrix.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.analyze();
    expect(component.result()).toBeNull();
    expect(component.error()?.kind).toBe('FORBIDDEN');
  });

  it('AC-7: xuất CSV lấy tên tệp từ Content-Disposition', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    analyticsSvc.exportCsv.mockReturnValue(of(new HttpResponse({
      body: new Blob(['a']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="analytics-matrix-cohort.csv"' }),
    })));
    component.exportCsv();
    expect(clickSpy).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('xuất Excel gọi exportExcel, lấy tên tệp từ Content-Disposition và báo thành công', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:xlsx');
    URL.revokeObjectURL = vi.fn();
    analyticsSvc.exportExcel.mockReturnValue(of(new HttpResponse({
      body: new Blob(['pk']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="analytics-matrix-cohort.xlsx"' }),
    })));
    component.exportExcel();
    expect(analyticsSvc.exportExcel).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalledWith('Đã xuất tệp Excel');
    clickSpy.mockRestore();
  });

  it('B2: gửi subjectIds, passed và ẩn subjectIds khi chọn CURRICULUM_CLASSIFICATION; hiện passThreshold cạnh tên chuẩn', () => {
    component.subjectIdsText.set('PLO1, PI1.2');
    component.passedFilter.set('false');
    expect(component.buildQuery()).toMatchObject({ subjectIds: ['PLO1', 'PI1.2'], passed: false });

    component.selectDimension('CURRICULUM_CLASSIFICATION');
    expect(component.buildQuery().subjectIds).toBeUndefined();

    component.selectDimension('COURSE_LECTURER');
    component.lecturerIdsText.set('lec1');
    expect(component.buildQuery().lecturerIds).toEqual(['lec1']);

    analyticsSvc.getMatrix.mockReturnValue(of({
      dimension: 'COURSE_SECTIONS',
      level: 'PLO',
      runId: 'r1',
      isOfficial: true,
      isStale: false,
      columns: [{ id: 's1', code: 'L01' }],
      rows: [
        { id: 'p1', code: 'PLO1', passThreshold: 0.6 },
        { id: 'p2', code: 'CLO1', passThreshold: null },
      ],
      matrix: [[{ enrolled: 10, evaluated: 10, passed: 6, failed: 4, insufficientData: 0, mean: 0.65, passRate: 0.6, passRateOfEnrolled: 0.6, isOfficial: true, isStale: false }], [{ enrolled: 10, evaluated: 0, passed: 0, failed: 0, insufficientData: 10, mean: null, passRate: null, passRateOfEnrolled: null, isOfficial: true, isStale: false }]],
    }));
    component.analyze();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('ngưỡng 60%');
  });

  it('LECTURER thuần túy chỉ thấy 4 chiều trong phạm vi lớp học phần và ẩn bộ lọc cấp CTĐT', () => {
    return setupWithRoles(['LECTURER']).then(() => {
      const el = fixture.nativeElement as HTMLElement;
      const text = el.textContent ?? '';

      expect(component.canAccessAnalytics).toBe(true);
      expect(component.canAnalyzeProgramScope).toBe(false);
      expect(programVersionSvc.getProgramVersions).not.toHaveBeenCalled();
      expect(el.querySelector('#f-pv')).toBeNull();
      expect(text).toContain('Phạm vi: Lớp học phần phụ trách');

      for (const dim of LECTURER_DIMENSIONS) {
        expect(text).toContain(ANALYTICS_DIMENSION_DISPLAY[dim].label);
      }
      expect(text).not.toContain(ANALYTICS_DIMENSION_DISPLAY.COHORT.label);
      expect(text).not.toContain(ANALYTICS_DIMENSION_DISPLAY.CURRICULUM_CLASSIFICATION.label);
      expect(text).not.toContain(ANALYTICS_DIMENSION_DISPLAY.COURSE_LECTURER.label);

      component.selectDimension('COHORT');
      component.selectDimension('COURSE_LECTURER');
      expect(component.dimension()).toBe('COURSE_SECTIONS');

      component.programVersionId.set('pv-1');
      component.level.set('PLO');
      const query = component.buildQuery();
      expect(query.programVersionId).toBeUndefined();
      expect(query.level).toBeUndefined();
    });
  });

  it('PROGRAM_MANAGER thấy đủ 7 chiều, có bộ lọc Phiên bản CTĐT (lazy-load khi mở) và nhãn phạm vi Khoa', () => {
    return setupWithRoles(['PROGRAM_MANAGER']).then(() => {
      const el = fixture.nativeElement as HTMLElement;
      expect(component.canAnalyzeProgramScope).toBe(true);
      expect(programVersionSvc.getProgramVersions).not.toHaveBeenCalled();
      expect(el.querySelector('#f-pv')).not.toBeNull();
      expect(el.textContent).toContain('Phạm vi: Khoa phụ trách');
      expect(el.textContent).toContain(ANALYTICS_DIMENSION_DISPLAY.COHORT.label);
      expect(el.textContent).toContain(ANALYTICS_DIMENSION_DISPLAY.COURSE_LECTURER.label);

      component.pvSelect.onOpenChange(true);
      expect(programVersionSvc.getProgramVersions).toHaveBeenCalled();
    });
  });

  it('QA thấy đủ 7 chiều và nhãn phạm vi Toàn hệ thống', () => {
    return setupWithRoles(['QA']).then(() => {
      const el = fixture.nativeElement as HTMLElement;
      expect(component.canAnalyzeProgramScope).toBe(true);
      expect(el.textContent).toContain('Phạm vi: Toàn hệ thống');
      expect(el.textContent).toContain(ANALYTICS_DIMENSION_DISPLAY.CURRICULUM_CLASSIFICATION.label);
    });
  });

  it('resetFilters() xóa sạch bộ lọc nhưng giữ nguyên chiều phân tích đang chọn', () => {
    component.selectDimension('STUDENT');
    component.programVersionId.set('pv1');
    component.courseId.set('c1');
    component.termIds.set(['t1']);
    component.sectionIds.set(['s1']);
    component.level.set('CLO');
    component.runId.set('r1');
    component.studentIdsText.set('SV01');
    component.subjectIdsText.set('CLO1');
    component.passedFilter.set('true');

    component.resetFilters();

    expect(component.dimension()).toBe('STUDENT');
    expect(component.programVersionId()).toBeNull();
    expect(component.courseId()).toBeNull();
    expect(component.termIds()).toEqual([]);
    expect(component.sectionIds()).toEqual([]);
    expect(component.level()).toBeNull();
    expect(component.runId()).toBeNull();
    expect(component.studentIdsText()).toBe('');
    expect(component.studentSearch()).toBe('');
    expect(component.studentPage()).toBe(0);
    expect(component.subjectIdsText()).toBe('');
    expect(component.passedFilter()).toBe('ALL');
  });

  it('chiều STUDENT gửi page, size, search khi phân tích và chuyển trang sinh viên', () => {
    analyticsSvc.getMatrix.mockReturnValue(of({
      dimension: 'STUDENT',
      level: 'CLO',
      runId: 'r1',
      isOfficial: true,
      isStale: false,
      columns: [{ id: 'st1', code: '20110001', name: 'SV A' }],
      rows: [{ id: 'c1', code: 'CLO1' }],
      matrix: [[{ enrolled: 1, evaluated: 1, passed: 1, failed: 0, insufficientData: 0, mean: 0.8, passRate: 1, passRateOfEnrolled: 1, isOfficial: true, isStale: false }]],
      page: 1,
      size: 20,
      totalElements: 35,
      totalPages: 2,
      last: true,
    }));

    component.selectDimension('STUDENT');
    component.studentSearch.set('2011');
    component.onStudentPageChange(2);

    expect(analyticsSvc.getMatrix).toHaveBeenCalledWith(expect.objectContaining({
      dimension: 'STUDENT',
      page: 1,
      size: 20,
      search: '2011',
    }));
    expect(component.result()?.totalElements).toBe(35);
  });

  it('runOptions hiển thị ngữ cảnh trực tiếp từ DTO và lọc liên hoàn theo bộ lọc đang chọn', () => {
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
        studentResultCount: 40,
        aggregateResultCount: 5,
      },
      {
        id: 'run-sec-2',
        scope: 'SECTION',
        scopeRef: { sectionIds: ['sec-2'], termId: 'term-2' },
        lockKey: 'k2',
        programVersionId: 'pv-1',
        programCode: 'CNTT',
        programVersion: 'v2024',
        termCode: 'HK2-2526',
        sectionCodes: ['CS101-02'],
        official: false,
        stale: true,
        status: 'SUCCESS',
        startedAt: '2026-11-25T10:00:00',
        studentResultCount: 30,
        aggregateResultCount: 4,
      },
      {
        id: 'run-prog',
        scope: 'PROGRAM',
        lockKey: 'k3',
        programVersionId: 'pv-1',
        programCode: 'CNTT',
        programVersion: 'v2024',
        official: true,
        stale: false,
        status: 'SUCCESS',
        startedAt: '2026-11-26T01:00:00',
        studentResultCount: 200,
        aggregateResultCount: 20,
      },
    ];

    calcSvc.getCalculationRuns.mockReturnValue(of({ ...emptyPage, content: sampleRuns }));

    component.onProgramVersionChange('pv-1');

    expect(calcSvc.getCalculationRuns).toHaveBeenCalledWith('pv-1', 0, 20);
    const sec1Opt = component.runOptions().find(o => o.id === 'run-sec-1');
    expect(sec1Opt?.primaryLabel).toBe('Lớp học phần · CS101-01 · HK1-2526 · CNTT v2024');
    expect(sec1Opt?.metaText).toBe('40 KQ SV · 5 tổng hợp');
    expect(sec1Opt?.selectLabel).not.toContain('T02:00:00');

    component.runId.set('run-sec-2');
    component.onSectionIdsChange(['sec-1']);

    expect(component.runOptions().map(o => o.id)).toEqual(['run-sec-1', 'run-prog']);
    expect(component.runId()).toBeNull();
  });

  it('chọn Phiên bản CTĐT lọc Học phần qua getProgramCourses và Lớp học phần theo programVersionId', () => {
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
    component.courseId.set('old-c');
    component.sectionIds.set(['old-sec']);

    component.onProgramVersionChange('pv-1');

    expect(component.courseId()).toBeNull();
    expect(component.sectionIds()).toEqual([]);
    expect(courseSvc.getProgramCourses).not.toHaveBeenCalled();
    expect(sectionSvc.getSections).not.toHaveBeenCalled();

    component.courseSelect.onOpenChange(true);
    expect(courseSvc.getProgramCourses).toHaveBeenCalledWith('pv-1', undefined, undefined, undefined, undefined, 0, 20);
    expect(courseSvc.getCourses).not.toHaveBeenCalled();
    expect(component.courseSelect.options().map(c => c.code)).toEqual(['CS101']);

    component.sectionSelect.onOpenChange(true);
    expect(sectionSvc.getSections).toHaveBeenCalledWith(undefined, undefined, undefined, 0, 20, 'pv-1');

    component.onCourseChange('c1');
    expect(sectionSvc.getSections).toHaveBeenLastCalledWith(undefined, 'c1', undefined, 0, 20, 'pv-1');

    component.onProgramVersionChange(null);
    expect(courseSvc.getCourses).toHaveBeenCalledWith(0, 20, undefined);
    expect(sectionSvc.getSections).toHaveBeenLastCalledWith(undefined, undefined, undefined, 0, 20, undefined);
  });

  it('LECTURER không bao giờ gọi getProgramCourses hay truyền programVersionId sang getSections', async () => {
    await setupWithRoles(['LECTURER']);
    component.programVersionId.set('pv-1');

    component.courseSelect.onOpenChange(true);
    component.sectionSelect.onOpenChange(true);

    expect(courseSvc.getProgramCourses).not.toHaveBeenCalled();
    expect(courseSvc.getCourses).toHaveBeenCalledWith(0, 20, undefined);
    expect(sectionSvc.getSections).toHaveBeenCalledWith(undefined, undefined, undefined, 0, 20, undefined);
  });

  it('COURSE_LECTURER hiển thị họ tên giảng viên (thay vì username) khi giảng viên nằm ở columns', () => {
    const cell = {
      enrolled: 30, evaluated: 30, passed: 24, failed: 6, insufficientData: 0,
      mean: 0.8, passRate: 0.8, passRateOfEnrolled: 0.8, isOfficial: true, isStale: false,
    };
    analyticsSvc.getMatrix.mockReturnValue(of({
      dimension: 'COURSE_LECTURER',
      level: 'CLO',
      runId: 'r1',
      isOfficial: true,
      isStale: false,
      columns: [
        { id: 'u1', code: 'gv.an', name: 'Nguyễn Văn An' },
        { id: 'u2', code: 'gv.binh', name: 'Trần Thị Bình' },
      ],
      rows: [{ id: 'clo1', code: 'CLO1', passThreshold: 0.6 }],
      matrix: [[cell, cell]],
    }));

    component.selectDimension('COURSE_LECTURER');
    component.analyze();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.chartGroups().map(g => g.label)).toEqual(['Nguyễn Văn An', 'Trần Thị Bình']);
    expect(text).toContain('Nguyễn Văn An');
    expect(text).toContain('Trần Thị Bình');
    expect(text).not.toContain('gv.an');
    expect(text).not.toContain('gv.binh');
    expect(text).toContain('CLO1');
    expect(text).toContain('2 giảng viên · 1 chuẩn');
    expect(sectionSvc.getLecturers).not.toHaveBeenCalled();
  });

  it('COURSE_LECTURER hiển thị họ tên giảng viên (không lặp tên hay username) khi giảng viên nằm ở rows', () => {
    const cell = {
      enrolled: 25, evaluated: 25, passed: 20, failed: 5, insufficientData: 0,
      mean: 0.78, passRate: 0.8, passRateOfEnrolled: 0.8, isOfficial: true, isStale: false,
    };
    analyticsSvc.getMatrix.mockReturnValue(of({
      dimension: 'COURSE_LECTURER',
      level: 'CLO',
      runId: 'r1',
      isOfficial: true,
      isStale: false,
      columns: [{ id: 'clo1', code: 'CLO1' }],
      rows: [{ id: 'u1', code: 'gv.an', name: 'Nguyễn Văn An' }],
      matrix: [[cell]],
    }));

    component.selectDimension('COURSE_LECTURER');
    component.analyze();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.legend().map(l => l.label)).toEqual(['Nguyễn Văn An']);
    expect(component.chartGroups()[0].bars[0].label).toBe('Nguyễn Văn An');
    expect(text).toContain('Nguyễn Văn An');
    expect(text).not.toContain('gv.an');
    expect(text).toContain('1 giảng viên · 1 chuẩn');
  });

  it('COURSE_LECTURER tự tra cứu fullName từ getLecturers khi thiếu name cho ADMIN/PM nhưng không gọi với QA', async () => {
    sectionSvc.getLecturers.mockReturnValue(of([
      {
        id: 'u1', username: 'gv.an', email: 'an@fit.edu', fullName: 'Nguyễn Văn An',
        status: 'ACTIVE', roles: ['LECTURER'], createdAt: '', updatedAt: '',
      },
    ]));
    analyticsSvc.getMatrix.mockReturnValue(of({
      dimension: 'COURSE_LECTURER',
      level: 'CLO',
      runId: 'r1',
      isOfficial: false,
      isStale: false,
      columns: [{ id: 'u1', code: 'gv.an', name: 'gv.an' }],
      rows: [{ id: 'clo1', code: 'CLO1' }],
      matrix: [[{
        enrolled: 10, evaluated: 10, passed: 8, failed: 2, insufficientData: 0,
        mean: 0.8, passRate: 0.8, passRateOfEnrolled: 0.8, isOfficial: false, isStale: false,
      }]],
    }));

    component.selectDimension('COURSE_LECTURER');
    component.analyze();
    fixture.detectChanges();

    expect(sectionSvc.getLecturers).toHaveBeenCalledTimes(1);
    expect(component.chartGroups()[0].label).toBe('Nguyễn Văn An');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('gv.an');

    await setupWithRoles(['QA']);
    analyticsSvc.getMatrix.mockReturnValue(of({
      dimension: 'COURSE_LECTURER',
      level: 'CLO',
      runId: 'r1',
      isOfficial: false,
      isStale: false,
      columns: [{ id: 'u1', code: 'gv.an' }],
      rows: [{ id: 'clo1', code: 'CLO1' }],
      matrix: [[{
        enrolled: 10, evaluated: 10, passed: 8, failed: 2, insufficientData: 0,
        mean: 0.8, passRate: 0.8, passRateOfEnrolled: 0.8, isOfficial: false, isStale: false,
      }]],
    }));
    component.selectDimension('COURSE_LECTURER');
    component.analyze();
    expect(sectionSvc.getLecturers).not.toHaveBeenCalled();
    expect(component.chartGroups()[0].label).toBe('gv.an');
  });

  it('mở dropdown Giảng viên ở chiều COURSE_LECTURER tải getLecturers, gửi lecturerIds và reset đúng', () => {
    sectionSvc.getLecturers.mockReturnValue(of([
      {
        id: 'u1', username: 'gv.an', email: 'an@fit.edu', fullName: 'Nguyễn Văn An',
        status: 'ACTIVE', roles: ['LECTURER'], createdAt: '', updatedAt: '',
      },
    ]));

    component.selectDimension('COURSE_LECTURER');
    expect(sectionSvc.getLecturers).not.toHaveBeenCalled();

    component.onLecturerDropdownOpen(true);
    expect(sectionSvc.getLecturers).toHaveBeenCalledTimes(1);
    expect(component.lecturers().length).toBe(1);

    component.selectedLecturerIds.set(['u1']);
    expect(component.buildQuery().lecturerIds).toEqual(['u1']);

    component.resetFilters();
    expect(component.selectedLecturerIds()).toEqual([]);
    expect(component.buildQuery().lecturerIds).toEqual([]);
  });
});

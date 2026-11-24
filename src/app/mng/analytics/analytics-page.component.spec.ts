import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ANALYTICS_DIMENSION_DISPLAY } from '@constants/analytics-display.constant';
import { IAnalyticsMatrix } from '@models/measurement/analytics.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { AnalyticsService } from '@services/measurement/analytics.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsPageComponent, headerLabel, LECTURER_DIMENSIONS, MAX_CHART_SERIES } from './analytics-page.component';

const emptyPage = { content: [], page: 0, size: 100, totalElements: 0, totalPages: 0, last: true };

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
  let analyticsSvc: { getMatrix: ReturnType<typeof vi.fn>; exportCsv: ReturnType<typeof vi.fn>; };
  let programVersionSvc: { getProgramVersions: ReturnType<typeof vi.fn>; };
  let toastr: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; };

  async function setupWithRoles(roles: readonly string[] = ['ADMIN']): Promise<void> {
    TestBed.resetTestingModule();
    analyticsSvc = { getMatrix: vi.fn(() => of(matrix)), exportCsv: vi.fn() };
    programVersionSvc = { getProgramVersions: vi.fn(() => of(emptyPage)) };
    toastr = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AnalyticsPageComponent],
      providers: [
        { provide: AuthService, useValue: createAuthMock(roles) },
        { provide: AnalyticsService, useValue: analyticsSvc },
        { provide: ProgramVersionService, useValue: programVersionSvc },
        { provide: CourseService, useValue: { getCourses: () => of(emptyPage) } },
        { provide: TermService, useValue: { getTerms: () => of([]) } },
        { provide: SectionService, useValue: { getSections: () => of([]) } },
        { provide: CalculationService, useValue: { getCalculationRuns: () => of(emptyPage) } },
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

  it('PROGRAM_MANAGER thấy đủ 7 chiều, có bộ lọc Phiên bản CTĐT và nhãn phạm vi Khoa', () => {
    return setupWithRoles(['PROGRAM_MANAGER']).then(() => {
      const el = fixture.nativeElement as HTMLElement;
      expect(component.canAnalyzeProgramScope).toBe(true);
      expect(programVersionSvc.getProgramVersions).toHaveBeenCalled();
      expect(el.querySelector('#f-pv')).not.toBeNull();
      expect(el.textContent).toContain('Phạm vi: Khoa phụ trách');
      expect(el.textContent).toContain(ANALYTICS_DIMENSION_DISPLAY.COHORT.label);
      expect(el.textContent).toContain(ANALYTICS_DIMENSION_DISPLAY.COURSE_LECTURER.label);
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
    expect(component.subjectIdsText()).toBe('');
    expect(component.passedFilter()).toBe('ALL');
  });
});

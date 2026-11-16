import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CalculationRunResponse } from '@models/measurement/measurement.model';
import { AuthService } from '@services/auth/auth.service';
import { SectionService } from '@services/course/section.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent, latestSuccessfulRun } from './dashboard.component';

// DỮ LIỆU THỬ NGHIỆM
const run = (id: string, status: CalculationRunResponse['status'], finishedAt?: string): CalculationRunResponse => ({
  id, scope: 'SECTION', lockKey: id, official: false, stale: false, status, finishedAt,
  studentResultCount: 0, aggregateResultCount: 0,
});

describe('DashboardComponent (Tổng quan)', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let calcSvc: { getCalculationRuns: ReturnType<typeof vi.fn>; getAggregateResults: ReturnType<typeof vi.fn>; };
  let sectionSvc: { getSections: ReturnType<typeof vi.fn>; };

  async function setup(roles: string[]): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: CalculationService, useValue: calcSvc },
        { provide: SectionService, useValue: sectionSvc },
        { provide: AuthService, useValue: {
          getUsername: () => 'gv.test',
          hasAnyRole: (r: readonly string[]) => r.some(x => roles.includes(x)),
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    calcSvc = {
      getCalculationRuns: vi.fn(() => of([run('r1', 'SUCCESS', '2026-10-26T10:00:00Z'), run('r2', 'SUCCESS', '2026-10-27T10:00:00Z'),
        run('r3', 'FAILED', '2026-10-28T10:00:00Z')])),
      getAggregateResults: vi.fn(() => of([])),
    };
    sectionSvc = { getSections: vi.fn(() => of([{ id: 's1' }])) };
  });

  it('chọn lần tính xong gần nhất, bỏ qua lần lỗi', () => {
    expect(latestSuccessfulRun([run('a', 'FAILED', '2026-12-01'), run('b', 'SUCCESS', '2026-11-01')])?.id).toBe('b');
    expect(latestSuccessfulRun([])).toBeNull();
  });

  it('nạp kết quả PI và PLO của lần tính gần nhất', async () => {
    await setup(['LECTURER']);
    expect(component.latestRun()?.id).toBe('r2');
    expect(calcSvc.getAggregateResults).toHaveBeenCalledWith('r2', 'PI');
    expect(calcSvc.getAggregateResults).toHaveBeenCalledWith('r2', 'PLO');
  });

  it('lối tắt lọc theo vai trò: giảng viên không thấy Nhật ký thao tác', async () => {
    await setup(['LECTURER']);
    expect(component.quickLinks.some(l => l.title === 'Nhật ký thao tác')).toBe(false);
    expect(component.quickLinks.some(l => l.title === 'Đo lường')).toBe(true);
  });

  it('chưa có lần tính: hiện hướng dẫn, không hiện số 0 cho kết quả', async () => {
    calcSvc.getCalculationRuns.mockReturnValue(of([]));
    await setup(['ADMIN']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chưa có lần tính nào hoàn tất');
  });

  it('cả hai nguồn lỗi: hiện thông báo lỗi có thử lại', async () => {
    calcSvc.getCalculationRuns.mockReturnValue(throwError(() => new Error('x')));
    sectionSvc.getSections.mockReturnValue(throwError(() => new Error('x')));
    await setup(['ADMIN']);
    expect(component.loadFailed()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('thử lại');
  });
});

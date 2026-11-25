import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IAssessment, IAssessmentScoreItem } from '@models/assessment/assessment.model';
import { IPagedResults } from '@models/common/response-data.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentScoresComponent } from './assessment-scores.component';

describe('AssessmentScoresComponent', () => {
  let fixture: ComponentFixture<AssessmentScoresComponent>;
  let component: AssessmentScoresComponent;

  const mockAssessment: IAssessment = {
    id: 'ass1',
    syllabusId: 'syl1',
    sectionId: 'sec1',
    code: 'GK1',
    name: 'Giữa kỳ 1',
    scope: 'SECTION',
    status: 'SCORE_ENTERED',
    locked: true,
    cloWeights: [],
    items: [],
  };

  const mockScores: IAssessmentScoreItem[] = [
    {
      id: 'sc1',
      sectionId: 'sec1',
      assessmentId: 'ass1',
      studentId: 'st1',
      studentCode: '20110001',
      studentName: 'Nguyễn Văn A',
      itemId: 'i1',
      itemCode: 'Q1',
      bloomLevel: 2,
      cloId: 'c1',
      cloCode: 'CLO1',
      rawScore: 4,
      maxScore: 5,
      sourceRow: 2,
      updatedAt: '2026-11-17T03:00:00Z',
    },
    {
      id: 'sc2',
      sectionId: 'sec1',
      assessmentId: 'ass1',
      studentId: 'st1',
      studentCode: '20110001',
      studentName: 'Nguyễn Văn A',
      itemId: 'i2',
      itemCode: 'Q2',
      bloomLevel: 3,
      cloId: 'c2',
      cloCode: 'CLO2',
      rawScore: 4,
      maxScore: 5,
      sourceRow: 2,
      updatedAt: '2026-11-17T03:00:00Z',
    },
    {
      id: 'sc3',
      sectionId: 'sec1',
      assessmentId: 'ass1',
      studentId: 'st2',
      studentCode: '20110002',
      studentName: 'Trần Thị B',
      itemId: 'i1',
      itemCode: 'Q1',
      bloomLevel: 2,
      cloId: 'c1',
      cloCode: 'CLO1',
      rawScore: 3,
      maxScore: 5,
      sourceRow: 3,
      updatedAt: '2026-11-17T03:00:00Z',
    },
  ];

  const pagedScores = (content: IAssessmentScoreItem[], totalElements = 2, page = 0, size = 20): IPagedResults<IAssessmentScoreItem> => ({
    content,
    page,
    size,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
    last: (page + 1) * size >= totalElements,
  });

  const assessmentSvc = {
    getAssessment: vi.fn(() => of(mockAssessment)),
    getScores: vi.fn(() => of(pagedScores(mockScores, 2))),
    exportScores: vi.fn(() => of(new HttpResponse({
      body: new Blob(['csv']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="GK1-scores.csv"' }),
    }))),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    assessmentSvc.getAssessment.mockReturnValue(of(mockAssessment));
    assessmentSvc.getScores.mockReturnValue(of(pagedScores(mockScores, 2)));

    await TestBed.configureTestingModule({
      imports: [AssessmentScoresComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentService, useValue: assessmentSvc },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentScoresComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'ass1');
    fixture.detectChanges();
  });

  it('tải thông tin bài đánh giá và tổng hợp bảng điểm theo nhóm sinh viên (totalStudents từ totalElements)', () => {
    expect(assessmentSvc.getAssessment).toHaveBeenCalledWith('ass1');
    expect(assessmentSvc.getScores).toHaveBeenCalledWith('ass1', undefined, 0, 20);
    expect(component.totalStudents()).toBe(2);
    expect(component.uniqueStudentCount()).toBe(2);
    expect(component.matrixColumns().length).toBe(2);

    const rows = component.studentRows();
    expect(rows.length).toBe(2);
    expect(rows[0].studentCode).toBe('20110001');
    expect(rows[0].totalRaw).toBe(8);
    expect(rows[0].totalMax).toBe(10);
    expect(rows[0].percentage).toBe(80);
  });

  it('tìm kiếm server-side (debounce 300ms, reset page=0), đổi trang và xuất CSV/XLSX qua API', async () => {
    vi.useFakeTimers();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:scores');
    URL.revokeObjectURL = vi.fn();
    try {
      assessmentSvc.getScores.mockClear();
      assessmentSvc.getScores.mockReturnValue(of(pagedScores([mockScores[2]], 1, 0, 20)));

      component.onPageIndexChange(2);
      expect(assessmentSvc.getScores).toHaveBeenLastCalledWith('ass1', undefined, 1, 20);

      component.onSearchChange('Trần Thị B');
      await vi.advanceTimersByTimeAsync(350);
      expect(assessmentSvc.getScores).toHaveBeenLastCalledWith('ass1', 'Trần Thị B', 0, 20);
      expect(component.studentRows().map(r => r.studentCode)).toEqual(['20110002']);

      component.exportScores('xlsx');
      expect(assessmentSvc.exportScores).toHaveBeenCalledWith('ass1', 'xlsx', 'Trần Thị B');
      expect(clickSpy).toHaveBeenCalled();
    } finally {
      clickSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('hiển thị trạng thái lỗi khi gọi API getScores thất bại', () => {
    assessmentSvc.getScores.mockReturnValue(throwError(() => new Error('Network error')));
    component.load();
    fixture.detectChanges();
    expect(component.loadError()).not.toBeNull();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IAssessment, IAssessmentScoreItem } from '@models/assessment/assessment.model';
import { AssessmentService } from '@services/assessment/assessment.service';
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

  const assessmentSvc = {
    getAssessment: vi.fn(() => of(mockAssessment)),
    getScores: vi.fn(() => of(mockScores)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    assessmentSvc.getAssessment.mockReturnValue(of(mockAssessment));
    assessmentSvc.getScores.mockReturnValue(of(mockScores));

    await TestBed.configureTestingModule({
      imports: [AssessmentScoresComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentService, useValue: assessmentSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentScoresComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'ass1');
    fixture.detectChanges();
  });

  it('tải thông tin bài đánh giá và tổng hợp bảng điểm theo sinh viên', () => {
    expect(assessmentSvc.getAssessment).toHaveBeenCalledWith('ass1');
    expect(assessmentSvc.getScores).toHaveBeenCalledWith('ass1');
    expect(component.uniqueStudentCount()).toBe(2);
    expect(component.matrixColumns().length).toBe(2);

    const rows = component.studentRows();
    expect(rows.length).toBe(2);
    expect(rows[0].studentCode).toBe('20110001');
    expect(rows[0].totalRaw).toBe(8);
    expect(rows[0].totalMax).toBe(10);
    expect(rows[0].percentage).toBe(80);
  });

  it('lọc theo MSSV hoặc tên sinh viên', () => {
    component.searchText.set('Trần Thị B');
    expect(component.studentRows().map(r => r.studentCode)).toEqual(['20110002']);
    expect(component.filteredScores().length).toBe(1);
  });

  it('hiển thị trạng thái lỗi khi gọi API getScores thất bại', () => {
    assessmentSvc.getScores.mockReturnValue(throwError(() => new Error('Network error')));
    component.load();
    fixture.detectChanges();
    expect(component.loadError()).not.toBeNull();
  });
});

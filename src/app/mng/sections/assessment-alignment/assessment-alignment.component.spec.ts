import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IAssessmentAlignmentResponse } from '@models/assessment/assessment.model';
import { SectionService } from '@services/course/section.service';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentAlignmentComponent } from './assessment-alignment.component';

describe('AssessmentAlignmentComponent', () => {
  let fixture: ComponentFixture<AssessmentAlignmentComponent>;
  let component: AssessmentAlignmentComponent;

  const mockAlignment: IAssessmentAlignmentResponse = {
    sectionId: 'sec1',
    sectionCode: 'TEST101-01',
    courseId: 'c1',
    syllabusId: 'syl1',
    assessmentCount: 2,
    totalPoints: 20,
    cloWithWarningCount: 1,
    clos: [
      {
        cloId: 'clo1',
        cloCode: 'CLO1',
        cloBloomLevel: 4,
        points: 10,
        percentage: 50,
        totalWeight: 0.6,
        maxItemBloomLevel: 3,
        assessments: [
          {
            assessmentId: 'ass1',
            assessmentCode: 'GK1',
            type: 'MIDTERM',
            status: 'LOCKED',
            questionCount: 2,
            points: 10,
            weight: 0.6,
          },
        ],
        itemBloom: [{ bloomLevel: 3, questionCount: 2, points: 10 }],
        linkedPis: [{ piId: 'pi1', piCode: 'PI1.1', ploId: 'plo1', ploCode: 'PLO1', weight: 1 }],
        warnings: ['WEIGHT_NOT_FULL', 'BLOOM_BELOW_CLO'],
      },
      {
        cloId: 'clo2',
        cloCode: 'CLO2',
        cloBloomLevel: null,
        points: 10,
        percentage: null,
        totalWeight: 1,
        maxItemBloomLevel: null,
        assessments: [],
        itemBloom: [],
        linkedPis: [],
        warnings: [],
      },
    ],
  };

  const mockSection = { id: 'sec1', code: 'TEST101-01', courseId: 'c1', syllabusId: 'syl1', termId: 't1', lecturerIds: [], status: 'OPEN' };
  const sectionSvc = {
    getSections: vi.fn(() => of({
      content: [mockSection],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    })),
    getSection: vi.fn(() => of(mockSection)),
    getAssessmentAlignment: vi.fn(() => of(mockAlignment)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    sectionSvc.getAssessmentAlignment.mockReturnValue(of(mockAlignment));
    await TestBed.configureTestingModule({
      imports: [AssessmentAlignmentComponent],
      providers: [
        provideRouter([]),
        { provide: SectionService, useValue: sectionSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentAlignmentComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sectionId', 'sec1');
    fixture.detectChanges();
  });

  it('hiển thị tóm tắt, PI/PLO liên quan, cảnh báo và nhãn gợi ý cho BLOOM_BELOW_CLO', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('TEST101-01');
    expect(text).toContain('PI1.1 · PLO1');
    expect(text).toContain('Gợi ý: Bloom thấp hơn CLO');
    expect(text).toContain('Chưa đủ 100% tỷ lệ');
  });

  it('lọc client "Chỉ hiện CLO có cảnh báo" và xử lý trường hợp rỗng / null', () => {
    expect(component.visibleClos().length).toBe(2);
    component.onlyWarnings.set(true);
    expect(component.visibleClos().map(c => c.cloCode)).toEqual(['CLO1']);

    sectionSvc.getAssessmentAlignment.mockReturnValue(of({
      ...mockAlignment,
      assessmentCount: 0,
      totalPoints: 0,
      cloWithWarningCount: 0,
      clos: [],
    }));
    component.load();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chưa có dữ liệu');
  });

  it('hiển thị lỗi khi API trả 403/400', () => {
    sectionSvc.getAssessmentAlignment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.load();
    fixture.detectChanges();
    expect(component.loadError()?.kind).toBe('FORBIDDEN');
  });
});

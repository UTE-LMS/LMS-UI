import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { IAssessment } from '@models/assessment/assessment.model';
import { IImportBatch } from '@models/assessment/score-import.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { ScoreImportService } from '@services/assessment/score-import.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScoreImportComponent } from './score-import.component';

describe('ScoreImportComponent', () => {
  let component: ScoreImportComponent;
  let fixture: ComponentFixture<ScoreImportComponent>;
  let assessmentSvc: {
    getAssessment: ReturnType<typeof vi.fn>;
  };
  let scoreImportSvc: {
    createBatch: ReturnType<typeof vi.fn>;
    validateBatch: ReturnType<typeof vi.fn>;
    confirmBatch: ReturnType<typeof vi.fn>;
    rollbackBatch: ReturnType<typeof vi.fn>;
    getErrors: ReturnType<typeof vi.fn>;
    downloadTemplateCsv: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let toastr: {
    success: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockAssessment: IAssessment = {
    id: 'ass_1',
    syllabusId: 'syl_1',
    sectionId: 'sec_1',
    code: 'GK',
    scope: 'SECTION',
    name: 'Bài thi giữa kỳ',
    type: 'MIDTERM',
    status: 'LOCKED',
    locked: true,
    cloWeights: [{ cloId: 'clo_1', weight: 1.0 }],
    items: [
      { id: 'item_1', code: 'Q1', bloomLevel: 3, outcomeMappings: [{ cloId: 'clo_1', maxScore: 5 }] },
      { id: 'item_2', code: 'Q2', bloomLevel: 4, outcomeMappings: [{ cloId: 'clo_1', maxScore: 5 }] },
    ],
  };

  const mockBatch: IImportBatch = {
    id: 'batch_1',
    sectionId: 'sec_1',
    assessmentId: 'ass_1',
    fileName: 'diem.csv',
    status: 'VALIDATED',
    stats: {
      totalRows: 40,
      validRows: 40,
      errorRows: 0,
      scoreCount: 80,
    },
    uploadedBy: 'gv1',
    createdAt: '2026-11-13T00:00:00Z',
  };

  beforeEach(async () => {
    assessmentSvc = {
      getAssessment: vi.fn(() => of(mockAssessment)),
    };
    scoreImportSvc = {
      createBatch: vi.fn(() => of({ ...mockBatch, status: 'UPLOADED' })),
      validateBatch: vi.fn(() => of(mockBatch)),
      confirmBatch: vi.fn(() => of({ ...mockBatch, status: 'CONFIRMED' })),
      rollbackBatch: vi.fn(() => of({ ...mockBatch, status: 'ROLLED_BACK' })),
      getErrors: vi.fn(() => of({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, last: true })),
      downloadTemplateCsv: vi.fn(() => of(new Blob(['MaSV,HoTen\r\n'], { type: 'text/csv' }))),
    };
    toastr = {
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ScoreImportComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentService, useValue: assessmentSvc },
        { provide: ScoreImportService, useValue: scoreImportSvc },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreImportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'ass_1');
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('khởi tạo và nạp thông tin bài đánh giá cùng cấu trúc câu hỏi', () => {
    expect(assessmentSvc.getAssessment).toHaveBeenCalledWith('ass_1');
    expect(component.assessment()).toEqual(mockAssessment);
    expect(component.itemMappings().length).toBe(2);
    expect(component.itemMappings()[0].itemCode).toBe('Q1');
  });

  it('báo lỗi nếu chọn tệp không phải .csv', () => {
    const event = {
      target: {
        files: [new File(['foo'], 'test.xlsx', { type: 'application/vnd.ms-excel' })],
      },
    } as unknown as Event;

    component.onFileChange(event);
    expect(component.errorMessage()).toContain('.csv');
    expect(component.file()).toBeNull();
  });

  it('uploadAndValidate kiểm tra hợp lệ các cột ánh xạ trước khi gửi API', () => {
    component.file.set(new File(['MSSV,Q1,Q2\n20110001,4,4'], 'diem.csv', { type: 'text/csv' }));
    // Chưa ánh xạ câu hỏi
    component.uploadAndValidate();
    expect(component.errorMessage()).toContain('Vui lòng chọn cột');

    // Gán ánh xạ hợp lệ
    component.itemMappings.set([
      { column: 'Q1', itemId: 'item_1', itemCode: 'Q1' },
      { column: 'Q2', itemId: 'item_2', itemCode: 'Q2' },
    ]);

    component.uploadAndValidate();
    expect(scoreImportSvc.createBatch).toHaveBeenCalled();
    expect(scoreImportSvc.validateBatch).toHaveBeenCalledWith('batch_1');
    expect(component.step()).toBe('PREVIEW');
    expect(component.currentBatch()).toEqual(mockBatch);
  });

  it('xác nhận lô nhập gọi confirmBatch và điều hướng về trang chi tiết', () => {
    component.currentBatch.set(mockBatch);
    component.confirmImport();

    expect(scoreImportSvc.confirmBatch).toHaveBeenCalledWith('batch_1');
    expect(toastr.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/mng/assessments/ass_1']);
  });

  it('hủy bỏ lô nhập gọi rollbackBatch và quay về bước UPLOAD', () => {
    component.currentBatch.set(mockBatch);
    component.cancelBatch();

    expect(scoreImportSvc.rollbackBatch).toHaveBeenCalledWith('batch_1');
    expect(component.step()).toBe('UPLOAD');
    expect(component.currentBatch()).toBeNull();
  });

  it('hiển thị danh sách lỗi nếu batch có trạng thái HAS_ERRORS', () => {
    scoreImportSvc.validateBatch.mockReturnValue(of({ ...mockBatch, status: 'HAS_ERRORS' }));
    scoreImportSvc.getErrors.mockReturnValue(of({
      content: [
        { rowNumber: 2, column: 'Q1', errorType: 'SCORE_EXCEEDS_MAX', rawValue: '12', message: 'Điểm vượt quá tối đa' },
      ],
      page: 0,
      size: 50,
      totalElements: 1,
      totalPages: 1,
      last: true,
    }));

    component.file.set(new File(['MSSV,Q1,Q2\n20110001,12,4'], 'diem.csv', { type: 'text/csv' }));
    component.itemMappings.set([
      { column: 'Q1', itemId: 'item_1', itemCode: 'Q1' },
      { column: 'Q2', itemId: 'item_2', itemCode: 'Q2' },
    ]);

    component.uploadAndValidate();
    expect(scoreImportSvc.getErrors).toHaveBeenCalledWith('batch_1', 0, 100);
    expect(component.errors().length).toBe(1);
  });

  it('xử lý lỗi tải dữ liệu bài đánh giá ban đầu', () => {
    assessmentSvc.getAssessment.mockReturnValue(throwError(() => ({ status: 404 })));
    component.loadAssessment();
    expect(component.errorMessage()).toBeTruthy();
  });

  it('downloadTemplateCsv gọi API tải tệp CSV mẫu', () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    component.downloadTemplateCsv();
    expect(scoreImportSvc.downloadTemplateCsv).toHaveBeenCalledWith('ass_1');

    clickSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });
});

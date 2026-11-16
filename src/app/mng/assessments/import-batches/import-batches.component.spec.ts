import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IImportBatch } from '@models/assessment/score-import.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { ScoreImportService } from '@services/assessment/score-import.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportBatchesComponent } from './import-batches.component';

// DỮ LIỆU THỬ NGHIỆM
const batch = (id: string, status: IImportBatch['status'], createdAt: string): IImportBatch => ({
  id, sectionId: 'sec1', assessmentId: 'ass1', fileName: `${id}.csv`, status, uploadedBy: 'gv.test', createdAt,
  stats: { totalRows: 45, validRows: 39, errorRows: 6, scoreCount: 0 },
});

describe('ImportBatchesComponent (F05b lịch sử nhập điểm)', () => {
  let fixture: ComponentFixture<ImportBatchesComponent>;
  let component: ImportBatchesComponent;
  let importSvc: Record<string, ReturnType<typeof vi.fn>>;
  let modal: { confirm: ReturnType<typeof vi.fn>; };

  beforeEach(async () => {
    importSvc = {
      listBatches: vi.fn(() => of([
        batch('b1', 'CONFIRMED', '2026-10-28T09:40:00Z'),
        batch('b2', 'HAS_ERRORS', '2026-10-28T09:12:00Z'),
        batch('b3', 'ROLLED_BACK', '2026-10-29T08:00:00Z'),
      ])),
      getErrors: vi.fn(() => of({
        content: [{ rowNumber: 7, column: 'Q1', errorType: 'SCORE_OUT_OF_RANGE', rawValue: '4', message: 'Vượt tối đa' }],
        page: 0, size: 50, totalElements: 1, totalPages: 1, last: true,
      })),
      rollbackBatch: vi.fn((id: string) => of(batch(id, 'ROLLED_BACK', '2026-10-28T09:12:00Z'))),
    };
    modal = { confirm: vi.fn((opts: { nzOnOk: () => void; }) => opts.nzOnOk()) };
    await TestBed.configureTestingModule({
      imports: [ImportBatchesComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentService, useValue: { getAssessment: () => of({ id: 'ass1', sectionId: 'sec1', name: 'Giữa kỳ' }) } },
        { provide: ScoreImportService, useValue: importSvc },
        { provide: NzModalService, useValue: modal },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    })
      // NzModalModule trong imports của component tự cung cấp NzModalService; ghi đè để kiểm tra hộp xác nhận.
      .overrideProvider(NzModalService, { useValue: modal })
      .compileComponents();
    fixture = TestBed.createComponent(ImportBatchesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'ass1');
    fixture.detectChanges();
  });

  it('tải theo lớp + bài của bài đánh giá và xếp mới nhất lên đầu', () => {
    expect(importSvc['listBatches']).toHaveBeenCalledWith('sec1', 'ass1');
    expect(component.sortedBatches().map(b => b.id)).toEqual(['b3', 'b1', 'b2']);
  });

  it('chỉ cho hủy lần nhập chưa lưu (khớp rollbackBatch của backend)', () => {
    expect(component.canRollback(batch('x', 'HAS_ERRORS', ''))).toBe(true);
    expect(component.canRollback(batch('x', 'VALIDATED', ''))).toBe(true);
    expect(component.canRollback(batch('x', 'CONFIRMED', ''))).toBe(false);
    expect(component.canRollback(batch('x', 'ROLLED_BACK', ''))).toBe(false);
  });

  it('chọn lần nhập thì tải lỗi theo dòng/cột (trang 0)', () => {
    component.select(component.sortedBatches()[2]);
    expect(importSvc['getErrors']).toHaveBeenCalledWith('b2', 0, 50);
    expect(component.visibleErrors()[0].rowNumber).toBe(7);
  });

  it('hủy lần nhập phải qua hộp xác nhận rồi cập nhật trạng thái', () => {
    const b2 = component.sortedBatches()[2];
    component.confirmRollback(b2);
    expect(modal.confirm).toHaveBeenCalled();
    expect(importSvc['rollbackBatch']).toHaveBeenCalledWith('b2');
    expect(component.batches().find(b => b.id === 'b2')?.status).toBe('ROLLED_BACK');
  });

  it('không mở hộp xác nhận cho lần nhập đã lưu', () => {
    component.confirmRollback(component.sortedBatches()[1]);
    expect(modal.confirm).not.toHaveBeenCalled();
  });
});

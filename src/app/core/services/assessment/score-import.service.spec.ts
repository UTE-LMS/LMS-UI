import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { IImportBatch } from '@models/assessment/score-import.model';
import { describe, expect, it } from 'vitest';
import { ScoreImportService } from './score-import.service';

describe('ScoreImportService', () => {
  let service: ScoreImportService;
  let httpMock: HttpTestingController;

  const mockBatch: IImportBatch = {
    id: 'batch_1',
    sectionId: 'sec_1',
    assessmentId: 'ass_1',
    fileName: 'scores.csv',
    status: 'UPLOADED',
    uploadedBy: 'gv1',
    createdAt: '2026-11-13T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScoreImportService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScoreImportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gọi createBatch thành công với FormData', () => {
    const file = new File(['MSSV,Q1\n20110001,8.5'], 'scores.csv', { type: 'text/csv' });
    service.createBatch('sec_1', 'ass_1', file).subscribe(res => {
      expect(res).toEqual(mockBatch);
    });

    const req = httpMock.expectOne(UrlConstant.API.IMPORT_BATCH_CREATE('sec_1', 'ass_1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockBatch);
  });

  it('gọi listBatches thành công', () => {
    service.listBatches('sec_1', 'ass_1').subscribe(res => {
      expect(res).toEqual([mockBatch]);
    });

    const req = httpMock.expectOne(UrlConstant.API.IMPORT_BATCH_LIST('sec_1', 'ass_1'));
    expect(req.request.method).toBe('GET');
    req.flush([mockBatch]);
  });

  it('gọi getBatch thành công', () => {
    service.getBatch('batch_1').subscribe(res => {
      expect(res).toEqual(mockBatch);
    });

    const req = httpMock.expectOne(UrlConstant.API.IMPORT_BATCH_DETAIL('batch_1'));
    expect(req.request.method).toBe('GET');
    req.flush(mockBatch);
  });

  it('gọi getErrors với phân trang', () => {
    service.getErrors('batch_1', 1, 20).subscribe(res => {
      expect(res.content.length).toBe(0);
    });

    const req = httpMock.expectOne(
      r => r.url === UrlConstant.API.IMPORT_BATCH_ERRORS('batch_1') && r.params.get('page') === '1',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('gọi validateBatch thành công', () => {
    service.validateBatch('batch_1').subscribe(res => {
      expect(res.status).toBe('VALIDATED');
    });

    const req = httpMock.expectOne(UrlConstant.API.IMPORT_BATCH_VALIDATE('batch_1'));
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockBatch, status: 'VALIDATED' });
  });

  it('gọi confirmBatch thành công', () => {
    service.confirmBatch('batch_1').subscribe(res => {
      expect(res.status).toBe('CONFIRMED');
    });

    const req = httpMock.expectOne(UrlConstant.API.IMPORT_BATCH_CONFIRM('batch_1'));
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockBatch, status: 'CONFIRMED' });
  });

  it('gọi rollbackBatch thành công', () => {
    service.rollbackBatch('batch_1').subscribe(res => {
      expect(res.status).toBe('ROLLED_BACK');
    });

    const req = httpMock.expectOne(UrlConstant.API.IMPORT_BATCH_ROLLBACK('batch_1'));
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockBatch, status: 'ROLLED_BACK' });
  });
});

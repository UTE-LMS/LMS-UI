import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { UrlConstant } from '@constants/url.constant';
import {
  IProgramVersion,
  IProgramVersionStatusUpdateRequest,
} from '@models/program/program-version.model';
import { ProgramVersionService } from './program-version.service';

describe('ProgramVersionService (F02 Import CSV & Status)', () => {
  let service: ProgramVersionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProgramVersionService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProgramVersionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lấy danh sách phiên bản có phân trang và lọc theo programId', () => {
    service.getProgramVersions(0, 20, 'prog_123').subscribe(res => {
      expect(res.content.length).toBe(1);
    });

    const req = httpMock.expectOne(
      r => r.url === UrlConstant.API.PROGRAM_VERSIONS && r.params.get('programId') === 'prog_123',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [{ id: 'ver_1', programId: 'prog_123', version: '2026', status: 'ACTIVE' } as IProgramVersion],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
  });

  it('importProgramCsv gửi POST multipart tới /import', () => {
    const file = new File(['code\nPLO1'], 'program.csv', { type: 'text/csv' });

    service.importProgramCsv('prog_123', '2026-v1', file).subscribe(res => {
      expect(res.version).toBe('2026-v1');
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_IMPORT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('programId')).toBe('prog_123');
    expect(body.get('version')).toBe('2026-v1');
    req.flush({ programVersionId: 'ver_new', programId: 'prog_123', version: '2026-v1', status: 'DRAFT' });
  });

  it('confirmImport gửi POST tới endpoint confirm-import', () => {
    service.confirmImport('ver_1').subscribe(res => {
      expect(res.verificationStatus).toBe('VERIFIED');
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_CONFIRM_IMPORT('ver_1'));
    expect(req.request.method).toBe('POST');
    req.flush({ programVersionId: 'ver_1', verificationStatus: 'VERIFIED' });
  });

  it('cập nhật trạng thái phiên bản gửi PUT tới endpoint status', () => {
    const payload: IProgramVersionStatusUpdateRequest = {
      status: 'ACTIVE',
    };

    service.updateProgramVersionStatus('ver_1', payload).subscribe(res => {
      expect(res.status).toBe('ACTIVE');
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_STATUS('ver_1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'ver_1', status: 'ACTIVE' });
  });
});

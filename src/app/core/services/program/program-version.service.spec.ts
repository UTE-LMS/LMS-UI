import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { UrlConstant } from '@constants/url.constant';
import {
  IProgramVersion,
  IProgramVersionRequest,
  IProgramVersionStatusUpdateRequest,
  IProgramVersionUpdateRequest,
} from '@models/program/program-version.model';
import { ProgramVersionService } from './program-version.service';

describe('ProgramVersionService (F02 US-05, ADR 0005)', () => {
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

  it('tạo phiên bản mới gửi method POST', () => {
    const payload: IProgramVersionRequest = {
      programId: 'prog_123',
      version: 'BM7A-2.8-Draft',
      totalCredits: 132,
      durationYears: 4,
    };

    service.createProgramVersion(payload).subscribe(res => {
      expect(res.version).toBe('BM7A-2.8-Draft');
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSIONS);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'ver_new', ...payload, status: 'DRAFT' });
  });

  it('cập nhật thông tin phiên bản gửi method PUT', () => {
    const payload: IProgramVersionUpdateRequest = {
      version: 'BM7A-2.8-Updated',
      totalCredits: 130,
    };

    service.updateProgramVersion('ver_1', payload).subscribe(res => {
      expect(res.version).toBe('BM7A-2.8-Updated');
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_DETAIL('ver_1'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 'ver_1', ...payload });
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

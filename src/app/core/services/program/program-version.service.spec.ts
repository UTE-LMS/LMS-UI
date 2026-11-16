import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  IProgramVersion,
  IProgramVersionStatusUpdateRequest,
} from '@models/program/program-version.model';
import { ProgramVersionService } from './program-version.service';

describe('ProgramVersionService (F02 Import CSV, Status & Lock)', () => {
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

  it('lấy danh sách phiên bản với đầy đủ bộ lọc facultyId, cohort, status, search (đã trim)', () => {
    service.getProgramVersions(0, 10, 'prog_123', 'fac_fit', '2026', 'ACTIVE', '  K26  ').subscribe();

    const req = httpMock.expectOne(r => r.url === UrlConstant.API.PROGRAM_VERSIONS);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('programId')).toBe('prog_123');
    expect(req.request.params.get('facultyId')).toBe('fac_fit');
    expect(req.request.params.get('cohort')).toBe('2026');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    expect(req.request.params.get('search')).toBe('K26');
    req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });
  });

  it('previewImportProgramCsv gửi POST multipart tới /import/preview kèm metadata phiên bản', () => {
    const file = new File(['code\nPLO1'], 'program.csv', { type: 'text/csv' });

    service
      .previewImportProgramCsv('prog_123', '2026-v1', file, {
        totalCredits: 150,
        durationYears: 4,
        applicableCohort: 'K2024',
      })
      .subscribe(res => {
        expect(res.version).toBe('2026-v1');
      });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_IMPORT_PREVIEW);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('programId')).toBe('prog_123');
    expect(body.get('version')).toBe('2026-v1');
    expect(body.get('totalCredits')).toBe('150');
    expect(body.get('durationYears')).toBe('4');
    expect(body.get('applicableCohort')).toBe('K2024');
    req.flush({
      programVersionId: 'ver_new',
      programId: 'prog_123',
      version: '2026-v1',
      totalCredits: 150,
      durationYears: 4,
      applicableCohort: 'K2024',
      status: 'DRAFT',
      verificationStatus: 'VERIFIED',
      ploCount: 1,
      piCount: 2,
      courseCount: 3,
      warnings: [],
      plos: [],
      pis: [],
    });
  });

  it('lockProgramVersion gửi PUT tới /lock và chuyển trạng thái sang ARCHIVED', () => {
    service.lockProgramVersion('ver_1').subscribe(res => {
      expect(res.status).toBe('ARCHIVED');
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_LOCK('ver_1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ id: 'ver_1', programId: 'prog_123', version: '2026', status: 'ARCHIVED' });
  });

  it('importProgramCsv gửi POST multipart tới /import kèm metadata phiên bản', () => {
    const file = new File(['code\nPLO1'], 'program.csv', { type: 'text/csv' });

    service
      .importProgramCsv('prog_123', '2026-v1', file, {
        totalCredits: 145,
        durationYears: 4.5,
        applicableCohort: 'K2025',
      })
      .subscribe(res => {
        expect(res.version).toBe('2026-v1');
      });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_IMPORT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('programId')).toBe('prog_123');
    expect(body.get('version')).toBe('2026-v1');
    expect(body.get('totalCredits')).toBe('145');
    expect(body.get('durationYears')).toBe('4.5');
    expect(body.get('applicableCohort')).toBe('K2025');
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

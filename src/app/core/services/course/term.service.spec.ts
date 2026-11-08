import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ITermRequest, ITermStatusUpdateRequest, ITermUpdateRequest } from '@models/course/term.model';
import { TermService } from './term.service';

describe('TermService (F05a US-18)', () => {
  let service: TermService;
  let http: HttpTestingController;
  const base = UrlConstant.API.TERMS;
  const termId = '671dcba5f123456789abcde0';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TermService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getTerms gọi GET /api/v1/terms', () => {
    service.getTerms().subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getTermById gọi GET /api/v1/terms/{id} kèm INLINE_ERRORS', () => {
    service.getTermById(termId).subscribe();
    const req = http.expectOne(UrlConstant.API.TERM_DETAIL(termId));
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('createTerm gửi đúng body qua POST /api/v1/terms', () => {
    const body: ITermRequest = {
      code: '2026-HK1',
      academicYear: '2026-2027',
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
    };
    service.createTerm(body).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('updateTerm gửi đúng body qua PUT /api/v1/terms/{id}', () => {
    const body: ITermUpdateRequest = {
      academicYear: '2026-2027',
    };
    service.updateTerm(termId, body).subscribe();
    const req = http.expectOne(UrlConstant.API.TERM_DETAIL(termId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('updateTermStatus gửi trạng thái và lý do qua PUT /api/v1/terms/{id}/status', () => {
    const body: ITermStatusUpdateRequest = {
      status: 'OPEN',
      reason: 'Mở lại sổ điểm để bổ sung điểm phúc khảo',
    };
    service.updateTermStatus(termId, body).subscribe();
    const req = http.expectOne(UrlConstant.API.TERM_STATUS(termId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('deleteTerm gọi DELETE /api/v1/terms/{id}', () => {
    service.deleteTerm(termId).subscribe();
    const req = http.expectOne(UrlConstant.API.TERM_DETAIL(termId));
    expect(req.request.method).toBe('DELETE');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush(null);
  });
});

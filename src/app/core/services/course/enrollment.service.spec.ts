import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS, REQUEST_TIMEOUT_MS } from '@interceptors/http-context.token';
import { EnrollmentService } from './enrollment.service';

/** DỮ LIỆU THỬ NGHIỆM: ID và mã sinh viên giả. */
describe('EnrollmentService (F05a US-20)', () => {
  let service: EnrollmentService;
  let http: HttpTestingController;
  const sectionId = '671dcba5f123456789abcd01';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EnrollmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getEnrollments không lọc: GET /sections/{id}/enrollments không có status', () => {
    service.getEnrollments(sectionId).subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTION_ENROLLMENTS(sectionId));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ sectionId, enrolled: 0, withdrawn: 0, enrollments: [] });
  });

  it('getEnrollments gửi status khi lọc', () => {
    service.getEnrollments(sectionId, 'WITHDRAWN').subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTION_ENROLLMENTS(sectionId));
    expect(req.request.params.get('status')).toBe('WITHDRAWN');
    req.flush({});
  });

  it('US-20/AC-1: importEnrollments gửi multipart với trường "file" và tắt hết-thời-gian mặc định', () => {
    const file = new File(['studentRef\nSV-0001\n'], 'lop.csv', { type: 'text/csv' });
    service.importEnrollments(sectionId, file).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_ENROLLMENT_IMPORT(sectionId));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBeInstanceOf(File);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    expect(req.request.context.get(REQUEST_TIMEOUT_MS)).toBe(0);
    req.flush({});
  });

  it('US-20/AC-4: updateStatus gửi status qua PUT /enrollments/{id}/status (rút và ghi danh lại)', () => {
    service.updateStatus('e1', 'WITHDRAWN').subscribe();
    const first = http.expectOne(UrlConstant.API.ENROLLMENT_STATUS('e1'));
    expect(first.request.method).toBe('PUT');
    expect(first.request.body).toEqual({ status: 'WITHDRAWN' });
    first.flush({});

    service.updateStatus('e1', 'ENROLLED').subscribe();
    const second = http.expectOne(UrlConstant.API.ENROLLMENT_STATUS('e1'));
    expect(second.request.body).toEqual({ status: 'ENROLLED' });
    second.flush({});
  });
});

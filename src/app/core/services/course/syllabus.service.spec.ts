import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { SyllabusService } from './syllabus.service';

describe('SyllabusService (F03 Import CSV & Status)', () => {
  let service: SyllabusService;
  let http: HttpTestingController;
  const courseId = '671dcba5f123456789abcde1';
  const syllabusId = '671dcba5f123456789abcde2';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SyllabusService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getSyllabiByCourse gọi GET /api/v1/courses/{courseId}/syllabi', () => {
    service.getSyllabiByCourse(courseId).subscribe();
    const req = http.expectOne(UrlConstant.API.COURSE_SYLLABI(courseId));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getSyllabusById gọi GET /api/v1/syllabi/{id}', () => {
    service.getSyllabusById(syllabusId).subscribe();
    const req = http.expectOne(UrlConstant.API.SYLLABUS_DETAIL(syllabusId));
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('importSyllabusCsv gửi POST multipart tới /import', () => {
    const file = new File(['code,bloomLevel\nCLO1,3'], 'syllabus.csv', { type: 'text/csv' });
    service.importSyllabusCsv(courseId, '2026-v1', 'pv_1', file).subscribe();
    const req = http.expectOne(UrlConstant.API.COURSE_SYLLABI_IMPORT(courseId));
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('version')).toBe('2026-v1');
    expect(body.get('programVersionId')).toBe('pv_1');
    req.flush({});
  });

  it('confirmImport gửi POST tới /syllabi/{id}/confirm-import', () => {
    service.confirmImport(syllabusId).subscribe();
    const req = http.expectOne(UrlConstant.API.SYLLABUS_CONFIRM_IMPORT(syllabusId));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('updateSyllabusStatus gửi PUT /api/v1/syllabi/{id}/status', () => {
    service.updateSyllabusStatus(syllabusId, 'CONFIRMED').subscribe();
    const req = http.expectOne(UrlConstant.API.SYLLABUS_STATUS(syllabusId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'CONFIRMED' });
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });
});

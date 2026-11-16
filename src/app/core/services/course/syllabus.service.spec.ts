import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { SyllabusService } from './syllabus.service';

describe('SyllabusService (F03 Import CSV, Status & Lock)', () => {
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
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('effectiveFromTermId')).toBe(false);
    expect(req.request.params.has('search')).toBe(false);
    req.flush([]);
  });

  it('getSyllabiByCourse gửi đúng query params status, effectiveFromTermId và search (đã trim)', () => {
    service.getSyllabiByCourse(courseId, 'CONFIRMED', 'term_2026_1', '  v1.0  ').subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.COURSE_SYLLABI(courseId));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('CONFIRMED');
    expect(req.request.params.get('effectiveFromTermId')).toBe('term_2026_1');
    expect(req.request.params.get('search')).toBe('v1.0');
    req.flush([]);
  });

  it('getSyllabiByProgramVersion gọi GET /api/v1/program-versions/{pvId}/syllabi kèm query params', () => {
    const pvId = 'pv_2026_se';
    service.getSyllabiByProgramVersion(pvId, courseId, 'CONFIRMED', 'term_2026_1', '  v2  ').subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.PROGRAM_VERSION_SYLLABI(pvId));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('courseId')).toBe(courseId);
    expect(req.request.params.get('status')).toBe('CONFIRMED');
    expect(req.request.params.get('effectiveFromTermId')).toBe('term_2026_1');
    expect(req.request.params.get('search')).toBe('v2');
    req.flush([]);
  });

  it('getSyllabusById gọi GET /api/v1/syllabi/{id}', () => {
    service.getSyllabusById(syllabusId).subscribe();
    const req = http.expectOne(UrlConstant.API.SYLLABUS_DETAIL(syllabusId));
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('previewImportSyllabusCsv gửi POST multipart tới /import/preview', () => {
    const file = new File(['code,bloomLevel\nCLO1,3'], 'syllabus.csv', { type: 'text/csv' });
    service.previewImportSyllabusCsv(courseId, '2026-v1', 'pv_1', file, 'term_2026_1').subscribe();
    const req = http.expectOne(UrlConstant.API.COURSE_SYLLABI_IMPORT_PREVIEW(courseId));
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('version')).toBe('2026-v1');
    expect(body.get('programVersionId')).toBe('pv_1');
    expect(body.get('effectiveFromTermId')).toBe('term_2026_1');
    expect(body.get('file')).toBe(file);
    req.flush({ syllabusId, courseId, version: '2026-v1', status: 'DRAFT', verificationStatus: 'VERIFIED', cloCount: 1, linkCount: 1, warnings: [], clos: [], links: [] });
  });

  it('lockSyllabus gửi PUT tới /syllabi/{id}/lock và đổi trạng thái sang ARCHIVED', () => {
    service.lockSyllabus(syllabusId).subscribe(res => {
      expect(res.status).toBe('ARCHIVED');
    });
    const req = http.expectOne(UrlConstant.API.SYLLABUS_LOCK(syllabusId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ id: syllabusId, courseId, version: '2026-v1', status: 'ARCHIVED' });
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

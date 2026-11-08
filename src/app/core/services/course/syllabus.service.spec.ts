import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ISyllabusRequest } from '@models/course/syllabus.model';
import { SyllabusService } from './syllabus.service';

describe('SyllabusService (F03 US-10, ADR 0010)', () => {
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

  it('createSyllabus gửi POST /api/v1/courses/{courseId}/syllabi', () => {
    const body: ISyllabusRequest = {
      version: '2026-v1',
      effectiveFromTermId: '671dcba5f123456789abcde0',
      effectiveToTermId: null,
    };
    service.createSyllabus(courseId, body).subscribe();
    const req = http.expectOne(UrlConstant.API.COURSE_SYLLABI(courseId));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
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

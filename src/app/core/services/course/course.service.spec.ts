import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ICourseRequest, ICourseUpdateRequest } from '@models/course/course.model';
import { CourseService } from './course.service';

describe('CourseService (F03 US-09)', () => {
  let service: CourseService;
  let http: HttpTestingController;
  const base = UrlConstant.API.COURSES;
  const courseId = '671dcba5f123456789abcde1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CourseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getCourses gửi params page, size và search (khi có)', () => {
    service.getCourses(0, 10, '  OOPR230279  ').subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('search')).toBe('OOPR230279');
    req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });
  });

  it('getCourses không gửi param search khi rỗng', () => {
    service.getCourses(1, 20, '   ').subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('createCourse gửi đúng body qua POST /api/v1/courses', () => {
    const body: ICourseRequest = {
      code: 'OOPR230279',
      name: 'Lập trình hướng đối tượng',
      credits: 3,
    };
    service.createCourse(body).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('updateCourse và deleteCourse gọi đúng URL /api/v1/courses/{id}', () => {
    const body: ICourseUpdateRequest = {
      name: 'Lập trình hướng đối tượng (Cập nhật)',
      credits: 4,
    };
    service.updateCourse(courseId, body).subscribe();
    const putReq = http.expectOne(UrlConstant.API.COURSE_DETAIL(courseId));
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual(body);
    putReq.flush({});

    service.deleteCourse(courseId).subscribe();
    const delReq = http.expectOne(UrlConstant.API.COURSE_DETAIL(courseId));
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
  });

  it('importCourses gửi FormData chứa tệp qua POST /api/v1/courses/import', () => {
    const file = new File(['code,name,credits\nCS101,Toan,3'], 'courses.csv', { type: 'text/csv' });
    service.importCourses(file).subscribe();

    const req = http.expectOne(UrlConstant.API.COURSE_IMPORT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBe(file);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] });
  });
});

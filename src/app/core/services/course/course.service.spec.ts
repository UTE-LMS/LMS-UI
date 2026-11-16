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

  it('getCourses gửi đúng filter facultyId và isActive', () => {
    service.getCourses(0, 10, undefined, 'fac_fit', true).subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('facultyId')).toBe('fac_fit');
    expect(req.request.params.get('isActive')).toBe('true');
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

  it('importCourses gửi FormData chứa tệp và facultyId qua POST /api/v1/courses/import', () => {
    const file = new File(['code,name,credits\nCS101,Toan,3'], 'courses.csv', { type: 'text/csv' });
    service.importCourses(file, 'fac_fit').subscribe();

    const req = http.expectOne(UrlConstant.API.COURSE_IMPORT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('facultyId')).toBe('fac_fit');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] });
  });

  it('getProgramCourses gửi đúng query params semester, type, category, search (đã trim)', () => {
    const pvId = 'pv_123';
    service.getProgramCourses(pvId, 1, 'COMPULSORY', 'FOUNDATION', '  Toán  ').subscribe();

    const req = http.expectOne(r => r.url === UrlConstant.API.PROGRAM_COURSES(pvId));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('semester')).toBe('1');
    expect(req.request.params.get('type')).toBe('COMPULSORY');
    expect(req.request.params.get('category')).toBe('FOUNDATION');
    expect(req.request.params.get('search')).toBe('Toán');
    req.flush([]);
  });

  it('downloadProgramCoursesImportTemplate và importProgramCoursesCsv gọi đúng endpoint mới', () => {
    const pvId = 'pv_123';
    service.downloadProgramCoursesImportTemplate(pvId).subscribe();
    const tplReq = http.expectOne(UrlConstant.API.PROGRAM_COURSE_IMPORT_TEMPLATE(pvId));
    expect(tplReq.request.method).toBe('GET');
    expect(tplReq.request.responseType).toBe('blob');
    tplReq.flush(new Blob(['courseCode,semester\n'], { type: 'text/csv' }));

    const file = new File(['courseCode,semester\nOOP,2'], 'pc.csv', { type: 'text/csv' });
    service.importProgramCoursesCsv(pvId, file).subscribe();
    const importReq = http.expectOne(UrlConstant.API.PROGRAM_COURSE_IMPORT(pvId));
    expect(importReq.request.method).toBe('POST');
    expect(importReq.request.body instanceof FormData).toBe(true);
    expect((importReq.request.body as FormData).get('file')).toBe(file);
    importReq.flush({ programVersionId: pvId, importedCount: 1, updatedCount: 0, warnings: [], courses: [] });
  });

  it('downloadCoursesImportTemplate và importCourses gửi đúng endpoint và facultyId tùy chọn', () => {
    service.downloadCoursesImportTemplate().subscribe();
    const tplReq = http.expectOne(UrlConstant.API.COURSE_IMPORT_TEMPLATE);
    expect(tplReq.request.method).toBe('GET');
    expect(tplReq.request.responseType).toBe('blob');
    tplReq.flush(new Blob(['code,name,credits,facultyCode\n'], { type: 'text/csv' }));

    const file = new File(['code,name,credits\nCS101,Toán,3'], 'courses.csv', { type: 'text/csv' });
    service.importCourses(file, 'fac_1').subscribe();
    const importReq = http.expectOne(UrlConstant.API.COURSE_IMPORT);
    expect(importReq.request.method).toBe('POST');
    expect(importReq.request.body instanceof FormData).toBe(true);
    const body = importReq.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('facultyId')).toBe('fac_1');
    importReq.flush({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] });
  });
});

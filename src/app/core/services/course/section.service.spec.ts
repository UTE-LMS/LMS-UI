import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ISectionRequest } from '@models/course/section.model';
import { SectionService } from './section.service';

/** DỮ LIỆU THỬ NGHIỆM: ID và mã giả. */
describe('SectionService (F05a US-19)', () => {
  let service: SectionService;
  let http: HttpTestingController;
  const sectionId = '671dcba5f123456789abcd01';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SectionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('US-19/AC-4: getSections mặc định gửi page=0, size=20 khi không lọc và trả PageResponse', () => {
    service.getSections().subscribe(res => {
      expect(res.totalElements).toBe(0);
      expect(res.content).toEqual([]);
    });
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('termId')).toBe(false);
    expect(req.request.params.has('courseId')).toBe(false);
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('programVersionId')).toBe(false);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('getSections gửi termId, courseId, search (đã trim), page và size khi có lọc', () => {
    service.getSections('t1', 'c1', '  LOP01 ', 1, 50).subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req.request.params.get('termId')).toBe('t1');
    expect(req.request.params.get('courseId')).toBe('c1');
    expect(req.request.params.get('search')).toBe('LOP01');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('50');
    req.flush({ content: [], page: 1, size: 50, totalElements: 0, totalPages: 0, last: true });
  });

  it('getSections gửi programVersionId đã trim và bỏ qua khi rỗng', () => {
    service.getSections('t1', 'c1', 'LOP01', 0, 20, '  pv-1  ').subscribe();
    const req1 = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req1.request.params.get('programVersionId')).toBe('pv-1');
    req1.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });

    service.getSections(undefined, undefined, undefined, 0, 20, '   ').subscribe();
    const req2 = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req2.request.params.has('programVersionId')).toBe(false);
    req2.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('getSections bỏ qua bộ lọc rỗng (chuỗi rỗng không thành query)', () => {
    service.getSections('', undefined, '   ').subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req.request.params.keys()).toEqual(['page', 'size']);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('getSection gọi GET /sections/{id} và nhận lecturers nạp sẵn từ SectionResponse', () => {
    let actual: unknown = null;
    service.getSection(sectionId).subscribe(res => {
      actual = res;
    });
    const req = http.expectOne(UrlConstant.API.SECTION_DETAIL(sectionId));
    expect(req.request.method).toBe('GET');
    const mockSection = {
      id: sectionId,
      code: 'TEST101-01',
      courseId: 'c1',
      syllabusId: 's1',
      termId: 't1',
      lecturerIds: ['u1'],
      lecturers: [{ id: 'u1', username: 'gv1', fullName: 'Nguyễn Văn A' }],
      enrolledCount: 10,
      status: 'OPEN',
    };
    req.flush(mockSection);
    expect(actual).toEqual(mockSection);
  });

  it('US-19/AC-1: createSection gửi đúng body qua POST /sections', () => {
    const body: ISectionRequest = {
      code: 'TEST101-01', courseId: 'c1', syllabusId: 's1', termId: 't1', lecturerIds: ['u1'],
    };
    service.createSection(body).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTIONS);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('updateLecturers chỉ gửi lecturerIds qua PUT /sections/{id}', () => {
    service.updateLecturers(sectionId, { lecturerIds: ['u1', 'u2'] }).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_DETAIL(sectionId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ lecturerIds: ['u1', 'u2'] });
    req.flush({});
  });

  it('updateStatus gửi status và lý do qua PUT /sections/{id}/status', () => {
    service.updateStatus(sectionId, { status: 'OPEN', reason: 'Sửa điểm nhập sai' }).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_STATUS(sectionId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'OPEN', reason: 'Sửa điểm nhập sai' });
    req.flush({});
  });

  it('downloadImportTemplate tải file mẫu CSV qua GET /sections/import-template', () => {
    service.downloadImportTemplate().subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_IMPORT_TEMPLATE);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['code,courseCode\n'], { type: 'text/csv' }));
  });

  it('importSections gửi multipart CSV qua POST /sections/import', () => {
    const file = new File(['code\nSEC1\n'], 'sections.csv', { type: 'text/csv' });
    service.importSections(file).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_IMPORT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBeInstanceOf(File);
    req.flush({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] });
  });

  it('getAssessmentAlignment gọi GET /sections/{sectionId}/assessment-alignment', () => {
    service.getAssessmentAlignment(sectionId).subscribe(res => {
      expect(res.sectionId).toBe(sectionId);
    });
    const req = http.expectOne(UrlConstant.API.SECTION_ASSESSMENT_ALIGNMENT(sectionId));
    expect(req.request.method).toBe('GET');
    req.flush({ sectionId, sectionCode: 'TEST101-01', courseId: 'c1', syllabusId: 's1', assessmentCount: 0, totalPoints: 0, cloWithWarningCount: 0, clos: [] });
  });

  it('getLecturers gọi GET /sections/lecturers và gửi facultyId khi được truyền', () => {
    service.getLecturers().subscribe(list => {
      expect(list.length).toBe(1);
    });
    const req1 = http.expectOne(r => r.url === UrlConstant.API.SECTION_LECTURERS);
    expect(req1.request.method).toBe('GET');
    expect(req1.request.params.keys()).toEqual([]);
    req1.flush([{ id: 'u1', username: 'gv1', fullName: 'Nguyễn Văn A' }]);

    service.getLecturers('fac-1').subscribe();
    const req2 = http.expectOne(r => r.url === UrlConstant.API.SECTION_LECTURERS);
    expect(req2.request.params.get('facultyId')).toBe('fac-1');
    req2.flush([]);
  });
});

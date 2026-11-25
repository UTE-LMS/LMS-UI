import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS, REQUEST_TIMEOUT_MS } from '@interceptors/http-context.token';
import { StudentService } from './student.service';

/** DỮ LIỆU THỬ NGHIỆM: ID và MSSV giả. */
describe('StudentService (ADMIN)', () => {
  let service: StudentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StudentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getStudents mặc định: gửi page=0, size=20 và bỏ qua bộ lọc rỗng', () => {
    service.getStudents(0, 20, { search: '   ', cohort: '', status: null }).subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.STUDENTS);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('cohort')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('getStudents có bộ lọc: trim search, cohort và gắn status', () => {
    service.getStudents(1, 50, { search: '  SV001  ', cohort: ' K2023 ', status: 'SUSPENDED' }).subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.STUDENTS);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('50');
    expect(req.request.params.get('search')).toBe('SV001');
    expect(req.request.params.get('cohort')).toBe('K2023');
    expect(req.request.params.get('status')).toBe('SUSPENDED');
    req.flush({ content: [], page: 1, size: 50, totalElements: 0, totalPages: 0, last: true });
  });

  it('downloadImportTemplate tải mẫu CSV và Excel với query format', () => {
    service.downloadImportTemplate('csv').subscribe();
    const csvReq = http.expectOne(r => r.url === UrlConstant.API.STUDENT_IMPORT_TEMPLATE);
    expect(csvReq.request.method).toBe('GET');
    expect(csvReq.request.responseType).toBe('blob');
    expect(csvReq.request.params.get('format')).toBe('csv');
    csvReq.flush(new Blob(['studentCode,fullName,cohort\n'], { type: 'text/csv' }));

    service.downloadImportTemplate('xlsx').subscribe();
    const xlsxReq = http.expectOne(r => r.url === UrlConstant.API.STUDENT_IMPORT_TEMPLATE);
    expect(xlsxReq.request.params.get('format')).toBe('xlsx');
    xlsxReq.flush(new Blob(['PK'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  });

  it('importStudents gửi multipart field "file" và tắt timeout mặc định', () => {
    const file = new File(['studentCode,fullName,cohort\nSV001,Nguyen A,K2023\n'], 'students.csv', { type: 'text/csv' });
    service.importStudents(file).subscribe();
    const req = http.expectOne(UrlConstant.API.STUDENT_IMPORT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBeInstanceOf(File);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    expect(req.request.context.get(REQUEST_TIMEOUT_MS)).toBe(0);
    req.flush({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] });
  });

  it('updateStatus gửi PUT /students/{id}/status với body { status }', () => {
    service.updateStatus('stu1', 'GRADUATED').subscribe();
    const req = http.expectOne(UrlConstant.API.STUDENT_STATUS('stu1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'GRADUATED' });
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({
      id: 'stu1', studentCode: 'SV001', fullName: 'A', cohort: 'K2021', status: 'GRADUATED', createdAt: null, updatedAt: null,
    });
  });

  it('batchUpdateStatus gửi PUT /students/status với studentIds và status', () => {
    service.batchUpdateStatus(['stu1', 'stu2'], 'DROPPED_OUT').subscribe();
    const req = http.expectOne(UrlConstant.API.STUDENT_BATCH_STATUS);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ studentIds: ['stu1', 'stu2'], status: 'DROPPED_OUT' });
    req.flush({ requestedCount: 2, updatedCount: 2, status: 'DROPPED_OUT', students: [] });
  });

  it('downloadStatusImportTemplate và importStudentStatuses gọi đúng endpoint', () => {
    service.downloadStatusImportTemplate('xlsx').subscribe();
    const tplReq = http.expectOne(r => r.url === UrlConstant.API.STUDENT_STATUS_IMPORT_TEMPLATE);
    expect(tplReq.request.method).toBe('GET');
    expect(tplReq.request.responseType).toBe('blob');
    expect(tplReq.request.params.get('format')).toBe('xlsx');
    tplReq.flush(new Blob(['PK']));

    const file = new File(['studentCode,status\nSV001,SUSPENDED\n'], 'status.csv', { type: 'text/csv' });
    service.importStudentStatuses(file).subscribe();
    const impReq = http.expectOne(UrlConstant.API.STUDENT_STATUS_IMPORT);
    expect(impReq.request.method).toBe('POST');
    expect(impReq.request.body).toBeInstanceOf(FormData);
    expect((impReq.request.body as FormData).get('file')).toBeInstanceOf(File);
    expect(impReq.request.context.get(REQUEST_TIMEOUT_MS)).toBe(0);
    impReq.flush({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] });
  });
});

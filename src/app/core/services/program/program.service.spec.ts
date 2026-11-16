import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IProgramRequest } from '@models/program/program.model';
import { ProgramService } from './program.service';

describe('ProgramService (F02 US-05, ADR 0005)', () => {
  let service: ProgramService;
  let http: HttpTestingController;
  const base = UrlConstant.API.PROGRAMS;
  const programId = '671dcba5f123456789abcde2';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProgramService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getPrograms gửi params page và size', () => {
    service.getPrograms(0, 20).subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('facultyId')).toBe(false);
    expect(req.request.params.has('level')).toBe(false);
    expect(req.request.params.has('degree')).toBe(false);
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('getPrograms gửi đúng các bộ lọc facultyId, level, degree, search (đã trim)', () => {
    service.getPrograms(1, 10, 'fac_fit', 'Đại học', 'Kỹ sư', '  Công nghệ  ').subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('facultyId')).toBe('fac_fit');
    expect(req.request.params.get('level')).toBe('Đại học');
    expect(req.request.params.get('degree')).toBe('Kỹ sư');
    expect(req.request.params.get('search')).toBe('Công nghệ');
    req.flush({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, last: true });
  });

  it('getPrograms không gửi param search khi rỗng hoặc khoảng trắng', () => {
    service.getPrograms(0, 20, undefined, undefined, undefined, '   ').subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('getProgramById gọi GET /programs/{id}', () => {
    service.getProgramById(programId).subscribe();
    const req = http.expectOne(`${base}/${programId}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('createProgram gửi đúng body qua POST /programs', () => {
    const body: IProgramRequest = {
      code: 'CNTT',
      name: 'Công nghệ thông tin',
      level: 'Đại học',
      degree: 'Kỹ sư',
    };
    service.createProgram(body).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('updateProgram gọi PUT /programs/{id}', () => {
    const body: IProgramRequest = {
      code: 'CNTT',
      name: 'Công nghệ thông tin - Cập nhật',
      level: 'Đại học',
      degree: 'Kỹ sư',
    };
    service.updateProgram(programId, body).subscribe();
    const req = http.expectOne(`${base}/${programId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });
});

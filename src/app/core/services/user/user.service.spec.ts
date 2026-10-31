import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IUserCreateDTO } from '@models/user/user.model';
import { UserService } from './user.service';

describe('UserService (API-CONTRACT.md §5.3)', () => {
  let service: UserService;
  let http: HttpTestingController;
  const base = UrlConstant.API.USERS;
  const userId = '671dcba5f123456789abcde1';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('US-02/AC-6: filter gửi page và size, không gửi sort/column/search', () => {
    service.filter(0, 20).subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.keys().sort()).toEqual(['page', 'size']);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('getById gọi GET /users/{id}', () => {
    service.getById(userId).subscribe();
    const req = http.expectOne(`${base}/${userId}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('create gửi đúng body và để màn hình tự hiển thị lỗi (INLINE_ERRORS)', () => {
    const body: IUserCreateDTO = {
      username: 'gv_tranthib',
      email: 'tranthib@hcmute.edu.vn',
      password: 'Password123!',
      fullName: 'Trần Thị B',
      roleAssignments: [{ role: 'ADMIN', scope: null }],
    };
    service.create(body).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('update dùng PUT /users/{id}', () => {
    service.update({ email: 'a@b.vn', fullName: 'A', roleAssignments: [{ role: 'VIEWER', scope: null }] }, userId).subscribe();
    const req = http.expectOne(`${base}/${userId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('US-01/AC-5: updateStatus gửi {status} tới /users/{id}/status', () => {
    service.updateStatus(userId, 'LOCKED').subscribe();
    const req = http.expectOne(`${base}/${userId}/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'LOCKED' });
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });
});

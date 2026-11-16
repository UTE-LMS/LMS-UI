import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService (F01 nhật ký)', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gửi page/size và chỉ các điều kiện lọc có giá trị', () => {
    service.filter({ action: 'LOGIN', entity: '', from: '2026-11-01T00:00:00.000Z' }, 0, 20).subscribe();
    const req = httpMock.expectOne(r => r.url === UrlConstant.API.AUDIT_LOGS);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('action')).toBe('LOGIN');
    expect(req.request.params.get('from')).toBe('2026-11-01T00:00:00.000Z');
    expect(req.request.params.has('entity')).toBe(false);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });
});

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { UrlConstant } from '@constants/url.constant';
import { PloPiService } from './plo-pi.service';

describe('PloPiService (F02 - chỉ đọc)', () => {
  let service: PloPiService;
  let httpMock: HttpTestingController;
  const versionId = '671dcba5f123456789abcdef';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PloPiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PloPiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lấy danh sách PLO gửi GET request', () => {
    service.getPlos(versionId).subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(UrlConstant.API.PLOS(versionId));
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'plo_1', code: 'PLO1', displayOrder: 1 }]);
  });

  it('lấy danh sách PI gửi GET request', () => {
    service.getPis(versionId).subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(UrlConstant.API.PIS(versionId));
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'pi_1', code: 'PI1.1', displayOrder: 1 }]);
  });

  it('lấy danh sách môn học thuộc CTĐT gửi GET request kèm page, size và trả PageResponse', () => {
    service.getProgramCourses(versionId).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url === UrlConstant.API.PROGRAM_COURSES(versionId));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({
      content: [{ id: 'pc_1', courseId: 'c_1' }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
  });
});

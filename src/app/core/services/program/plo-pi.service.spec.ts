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

  it('lấy danh sách môn học thuộc CTĐT gửi GET request', () => {
    service.getProgramCourses(versionId).subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_COURSES(versionId));
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'pc_1', courseId: 'c_1' }]);
  });
});

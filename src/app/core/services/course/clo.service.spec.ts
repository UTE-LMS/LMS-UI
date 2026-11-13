import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { CloService } from './clo.service';

describe('CloService (Read-only + QA Verification)', () => {
  let service: CloService;
  let http: HttpTestingController;
  const syllabusId = '671dcba5f123456789abcde2';
  const pvId = '671dcba5f123456789abcdef';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CloService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getClosBySyllabus gọi GET /api/v1/syllabi/{syllabusId}/clos', () => {
    service.getClosBySyllabus(syllabusId).subscribe();
    const req = http.expectOne(UrlConstant.API.SYLLABUS_CLOS(syllabusId));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getCloPiMatrix truyền query param programVersionId', () => {
    service.getCloPiMatrix(syllabusId, pvId).subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SYLLABUS_CLO_PI_MATRIX(syllabusId));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('programVersionId')).toBe(pvId);
    req.flush({ syllabusId, programVersionId: pvId, clos: [], pis: [], links: [] });
  });
});

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { UrlConstant } from '@constants/url.constant';
import {
  ICoursePiContributionRequest,
  IPiRequest,
  IPloRequest,
} from '@models/program/plo-pi.model';
import { PloPiService } from './plo-pi.service';

describe('PloPiService (F02 US-06, US-07)', () => {
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

  it('tạo PLO gửi POST request', () => {
    const payload: IPloRequest = {
      code: 'PLO1',
      displayOrder: 1,
      category: 'GENERAL',
      capabilityLevelRaw: 3,
    };

    service.createPlo(versionId, payload).subscribe(res => {
      expect(res.code).toBe('PLO1');
    });

    const req = httpMock.expectOne(UrlConstant.API.PLOS(versionId));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'plo_1', programVersionId: versionId, ...payload });
  });

  it('tạo PI gửi POST request', () => {
    const payload: IPiRequest = {
      ploId: 'plo_1',
      code: 'PI1.1',
      displayOrder: 1,
      capabilityLevelRaw: 3,
    };

    service.createPi(versionId, payload).subscribe(res => {
      expect(res.code).toBe('PI1.1');
    });

    const req = httpMock.expectOne(UrlConstant.API.PIS(versionId));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'pi_1', programVersionId: versionId, ...payload });
  });

  it('tạo đóng góp I/R/M gửi POST request', () => {
    const payload: ICoursePiContributionRequest = {
      courseId: 'course_1',
      piId: 'pi_1',
      contribution: 'I',
    };

    service.createContribution(versionId, payload).subscribe(res => {
      expect(res.contribution).toBe('I');
    });

    const req = httpMock.expectOne(UrlConstant.API.PI_CONTRIBUTIONS(versionId));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'contrib_1', programVersionId: versionId, ...payload });
  });

  it('xóa đóng góp I/R/M gửi DELETE request', () => {
    service.deleteContribution(versionId, 'contrib_1').subscribe();

    const req = httpMock.expectOne(UrlConstant.API.PI_CONTRIBUTION_DETAIL(versionId, 'contrib_1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});

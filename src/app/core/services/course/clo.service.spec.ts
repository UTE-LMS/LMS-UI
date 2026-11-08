import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ICloPiLinkRequest, ICloRequest } from '@models/course/clo.model';
import { CloService } from './clo.service';

describe('CloService (F03 US-11, US-12, ADR 0010, ADR 0004)', () => {
  let service: CloService;
  let http: HttpTestingController;
  const syllabusId = '671dcba5f123456789abcde2';
  const cloId = '671dcba5f123456789abcde3';
  const pvId = '671dcba5f123456789abcdef';
  const linkId = '671dcba5f123456789abcde4';

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

  it('createClo, updateClo và deleteClo gọi đúng hợp đồng CLO', () => {
    const body: ICloRequest = {
      code: 'CLO1',
      bloomLevel: 3,
      bloomNote: 'Áp dụng thiết kế hướng đối tượng',
      contentOriginal: 'Áp dụng các nguyên lý OOP để giải quyết bài toán.',
      measurement: null,
    };
    service.createClo(syllabusId, body).subscribe();
    const postReq = http.expectOne(UrlConstant.API.SYLLABUS_CLOS(syllabusId));
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(body);
    expect(postReq.request.context.get(INLINE_ERRORS)).toBe(true);
    postReq.flush({});

    service.updateClo(cloId, body).subscribe();
    const putReq = http.expectOne(UrlConstant.API.CLO_DETAIL(cloId));
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual(body);
    putReq.flush({});

    service.deleteClo(cloId).subscribe();
    const delReq = http.expectOne(UrlConstant.API.CLO_DETAIL(cloId));
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
  });

  it('getCloPiMatrix truyền query param programVersionId', () => {
    service.getCloPiMatrix(syllabusId, pvId).subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SYLLABUS_CLO_PI_MATRIX(syllabusId));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('programVersionId')).toBe(pvId);
    req.flush({ syllabusId, programVersionId: pvId, clos: [], pis: [], links: [] });
  });

  it('createCloPiLink, deleteCloPiLink và verifyCloPiLink gọi đúng endpoint clo_pi_links', () => {
    const linkBody: ICloPiLinkRequest = {
      programVersionId: pvId,
      cloId,
      piId: '671dcba5f123456789abcde5',
      weight: null,
    };
    service.createCloPiLink(syllabusId, linkBody).subscribe();
    const postReq = http.expectOne(UrlConstant.API.SYLLABUS_CLO_PI_LINKS(syllabusId));
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(linkBody);
    postReq.flush({});

    service.verifyCloPiLink(linkId, { status: 'VERIFIED', note: 'Hợp lệ' }).subscribe();
    const verifyReq = http.expectOne(UrlConstant.API.CLO_PI_LINK_VERIFY(linkId));
    expect(verifyReq.request.method).toBe('PUT');
    expect(verifyReq.request.body).toEqual({ status: 'VERIFIED', note: 'Hợp lệ' });
    verifyReq.flush({});

    service.deleteCloPiLink(linkId).subscribe();
    const delReq = http.expectOne(UrlConstant.API.CLO_PI_LINK_DETAIL(linkId));
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
  });
});

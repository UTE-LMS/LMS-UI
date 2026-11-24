import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  IFacultyAssignPmRequest,
  IFacultyRequest,
  IFacultyStatusUpdateRequest,
  IFacultyTransferPmRequest,
  IFacultyUpdateRequest,
} from '@models/faculty/faculty.model';
import { FacultyService } from './faculty.service';

describe('FacultyService (M01 Core Infrastructure)', () => {
  let service: FacultyService;
  let http: HttpTestingController;
  const base = UrlConstant.API.FACULTIES;
  const facultyId = '671dcba5f123456789abcde0';
  const userId = '671dcba5f123456789abcd01';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FacultyService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FacultyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getFaculties', () => {
    it('gửi đúng params page và size khi không truyền search và isActive', () => {
      service.getFaculties(0, 10).subscribe();
      const req = http.expectOne(r => r.url === base);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('10');
      expect(req.request.params.has('search')).toBe(false);
      expect(req.request.params.has('isActive')).toBe(false);
      req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });
    });

    it('gửi param search đã trim khi có search hợp lệ', () => {
      service.getFaculties(0, 10, '  Công nghệ thông tin  ').subscribe();
      const req = http.expectOne(r => r.url === base);
      expect(req.request.params.get('search')).toBe('Công nghệ thông tin');
      req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });
    });

    it('không gửi param search khi chuỗi search rỗng hoặc toàn khoảng trắng', () => {
      service.getFaculties(0, 10, '   ').subscribe();
      const req = http.expectOne(r => r.url === base);
      expect(req.request.params.has('search')).toBe(false);
      req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });
    });

    it('gửi param isActive=true khi isActive = true', () => {
      service.getFaculties(0, 10, undefined, true).subscribe();
      const req = http.expectOne(r => r.url === base);
      expect(req.request.params.get('isActive')).toBe('true');
      req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });
    });

    it('gửi param isActive=false khi isActive = false', () => {
      service.getFaculties(0, 10, undefined, false).subscribe();
      const req = http.expectOne(r => r.url === base);
      expect(req.request.params.get('isActive')).toBe('false');
      req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });
    });

    it('gửi đồng thời cả search và isActive khi cả hai được cung cấp', () => {
      service.getFaculties(1, 20, 'Cơ khí', true).subscribe();
      const req = http.expectOne(r => r.url === base);
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('size')).toBe('20');
      expect(req.request.params.get('search')).toBe('Cơ khí');
      expect(req.request.params.get('isActive')).toBe('true');
      req.flush({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, last: true });
    });
    it('chuẩn hóa trường active: true từ Jackson thành isActive: true', () => {
      let mappedActive = false;
      service.getFaculties(0, 10).subscribe(res => {
        mappedActive = res.content[0].isActive;
      });
      const req = http.expectOne(r => r.url === base);
      req.flush({
        content: [{ id: facultyId, code: 'FIT', name: 'Khoa CNTT', active: true }],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        last: true,
      });
      expect(mappedActive).toBe(true);
    });
  });

  describe('getFacultyById', () => {
    it('gọi GET /api/v1/faculties/{id} kèm INLINE_ERRORS', () => {
      service.getFacultyById(facultyId).subscribe(res => {
        expect(res.id).toBe(facultyId);
      });
      const req = http.expectOne(UrlConstant.API.FACULTY_DETAIL(facultyId));
      expect(req.request.method).toBe('GET');
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush({ id: facultyId, code: 'FIT', name: 'Khoa CNTT', isActive: true });
    });

    it('chuyển tiếp lỗi khi backend trả về HTTP 404 Not Found', () => {
      let statusCode = 0;
      service.getFacultyById('not-found-id').subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          statusCode = err.status;
        },
      });
      const req = http.expectOne(UrlConstant.API.FACULTY_DETAIL('not-found-id'));
      req.flush({ message: 'Không tìm thấy Khoa' }, { status: 404, statusText: 'Not Found' });
      expect(statusCode).toBe(404);
    });
  });

  describe('createFaculty', () => {
    it('gửi đúng body qua POST /api/v1/faculties kèm INLINE_ERRORS', () => {
      const dto: IFacultyRequest = {
        code: 'FME',
        name: 'Khoa Cơ khí Chế tạo máy',
        description: 'Khoa Cơ khí',
      };
      service.createFaculty(dto).subscribe(res => {
        expect(res.code).toBe('FME');
      });
      const req = http.expectOne(base);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush({ id: facultyId, ...dto, isActive: true });
    });
  });

  describe('updateFaculty', () => {
    it('gửi đúng body qua PUT /api/v1/faculties/{id} kèm INLINE_ERRORS', () => {
      const dto: IFacultyUpdateRequest = {
        name: 'Khoa Cơ khí Chế tạo máy - Cập nhật',
        description: 'Mô tả cập nhật',
        isActive: true,
      };
      service.updateFaculty(facultyId, dto).subscribe(res => {
        expect(res.name).toBe(dto.name);
      });
      const req = http.expectOne(UrlConstant.API.FACULTY_DETAIL(facultyId));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush({ id: facultyId, code: 'FME', ...dto });
    });
  });

  describe('updateFacultyStatus', () => {
    it('gửi đúng body qua PUT /api/v1/faculties/{id}/status kèm INLINE_ERRORS', () => {
      const dto: IFacultyStatusUpdateRequest = {
        isActive: false,
        reason: 'Tạm ngưng tuyển sinh',
      };
      service.updateFacultyStatus(facultyId, dto).subscribe(res => {
        expect(res.isActive).toBe(false);
      });
      const req = http.expectOne(UrlConstant.API.FACULTY_STATUS(facultyId));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush({ id: facultyId, code: 'FME', name: 'Khoa Cơ khí', isActive: false });
    });

    it('chuyển tiếp lỗi khi backend trả về HTTP 422 Unprocessable Entity (Khoa có CTĐT ban hành)', () => {
      let errorCode = '';
      service.updateFacultyStatus(facultyId, { isActive: false }).subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          errorCode = (err.error as { code?: string; } | null)?.code ?? '';
        },
      });
      const req = http.expectOne(UrlConstant.API.FACULTY_STATUS(facultyId));
      req.flush(
        { code: 'FACULTY_LOCKED_BY_PROGRAM_VERSION', message: 'Không thể khóa Khoa đã có CTĐT ACTIVE' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(errorCode).toBe('FACULTY_LOCKED_BY_PROGRAM_VERSION');
    });
  });

  describe('Quản trị Program Manager theo Khoa', () => {
    it('getProgramManagers gọi GET /api/v1/faculties/{facultyId}/program-managers kèm INLINE_ERRORS', () => {
      service.getProgramManagers(facultyId).subscribe(res => {
        expect(res.length).toBe(1);
        expect(res[0].id).toBe(userId);
      });
      const req = http.expectOne(UrlConstant.API.FACULTY_PMS(facultyId));
      expect(req.request.method).toBe('GET');
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush([{ id: userId, username: 'pm_fit', fullName: 'Trưởng bộ môn FIT', email: '', status: 'ACTIVE', roleAssignments: [], createdAt: '', updatedAt: '' }]);
    });

    it('assignProgramManager gửi POST /api/v1/faculties/{facultyId}/program-managers kèm INLINE_ERRORS', () => {
      const dto: IFacultyAssignPmRequest = { userId };
      service.assignProgramManager(facultyId, dto).subscribe();
      const req = http.expectOne(UrlConstant.API.FACULTY_PMS(facultyId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush(null);
    });

    it('assignProgramManager chuyển tiếp lỗi HTTP 409 Conflict khi PM đã thuộc Khoa khác', () => {
      let statusCode = 0;
      service.assignProgramManager(facultyId, { userId }).subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          statusCode = err.status;
        },
      });
      const req = http.expectOne(UrlConstant.API.FACULTY_PMS(facultyId));
      req.flush({ message: 'User đã thuộc Khoa khác' }, { status: 409, statusText: 'Conflict' });
      expect(statusCode).toBe(409);
    });

    it('removeProgramManager gọi DELETE /api/v1/faculties/{facultyId}/program-managers/{userId} kèm INLINE_ERRORS', () => {
      service.removeProgramManager(facultyId, userId).subscribe();
      const req = http.expectOne(UrlConstant.API.FACULTY_PM_DETAIL(facultyId, userId));
      expect(req.request.method).toBe('DELETE');
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush(null);
    });

    it('transferProgramManager gửi POST /api/v1/faculties/transfer-program-manager kèm INLINE_ERRORS', () => {
      const dto: IFacultyTransferPmRequest = {
        userId,
        targetFacultyId: '671dcba5f123456789abcde9',
        transferReason: 'Điều chuyển công tác sang khoa mới',
      };
      service.transferProgramManager(dto).subscribe();
      const req = http.expectOne(UrlConstant.API.FACULTY_TRANSFER_PM);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
      req.flush(null);
    });

    it('downloadImportTemplate và importFaculties gọi đúng endpoint import Khoa', () => {
      service.downloadImportTemplate().subscribe();
      const tplReq = http.expectOne(UrlConstant.API.FACULTY_IMPORT_TEMPLATE);
      expect(tplReq.request.method).toBe('GET');
      expect(tplReq.request.params.keys()).toEqual([]);
      expect(tplReq.request.responseType).toBe('blob');
      tplReq.flush(new Blob(['code,name,description\n'], { type: 'text/csv' }));

      service.downloadImportTemplate('xlsx').subscribe();
      const xlsxReq = http.expectOne(r => r.url === UrlConstant.API.FACULTY_IMPORT_TEMPLATE);
      expect(xlsxReq.request.method).toBe('GET');
      expect(xlsxReq.request.params.get('format')).toBe('xlsx');
      expect(xlsxReq.request.responseType).toBe('blob');
      xlsxReq.flush(new Blob(['x']));

      const file = new File(['code,name,description\nFIT,CNTT,Mo ta'], 'faculties.csv', { type: 'text/csv' });
      service.importFaculties(file).subscribe(res => {
        expect(res.successCount).toBe(1);
      });
      const importReq = http.expectOne(UrlConstant.API.FACULTY_IMPORT);
      expect(importReq.request.method).toBe('POST');
      expect((importReq.request.body as FormData).get('file')).toBe(file);
      importReq.flush({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] });
    });
  });
});

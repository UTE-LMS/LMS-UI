import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemConstant } from '@constants/system.constant';
import { ICourseImportResultResponse } from '@models/course/course.model';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { FacultyService } from '@services/faculty/faculty.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { CourseImportModalComponent } from './course-import-modal.component';

describe('CourseImportModalComponent (F03 US-09/AC-4)', () => {
  let fixture: ComponentFixture<CourseImportModalComponent>;
  let component: CourseImportModalComponent;

  const courseSvc = {
    downloadCoursesImportTemplate: vi.fn(() => of(new Blob(['code,name,credits,facultyCode\n'], { type: 'text/csv' }))),
    importCourses: vi.fn(),
  };

  const facultySvc = {
    getFaculties: vi.fn(() => of({
      content: [{ id: 'fac_1', code: 'FIT', name: 'Khoa CNTT', isActive: true }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      last: true,
    })),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.ADMIN]),
  };

  const toastrSvc = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.ADMIN]);

    await TestBed.configureTestingModule({
      imports: [CourseImportModalComponent],
      providers: [
        { provide: CourseService, useValue: courseSvc },
        { provide: FacultyService, useValue: facultySvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: toastrSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CourseImportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo component thành công với trạng thái ban đầu sạch sẽ', () => {
    expect(component).toBeTruthy();
    expect(component.selectedFile()).toBeNull();
    expect(component.isLoading()).toBe(false);
    expect(component.importResult()).toBeNull();
    expect(component.errorMessage()).toBeNull();
  });

  it('từ chối tệp không có đuôi .csv và thông báo lỗi', () => {
    const invalidFile = new File(['dummy'], 'courses.xlsx', { type: 'application/vnd.ms-excel' });
    const event = {
      target: {
        files: [invalidFile],
      },
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toContain('chỉ chọn tệp CSV (.csv)');
  });

  it('từ chối tệp rỗng dung lượng 0 bytes', () => {
    const emptyFile = new File([], 'courses.csv', { type: 'text/csv' });
    const event = {
      target: {
        files: [emptyFile],
      },
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toContain('Tệp CSV đã chọn rỗng');
  });

  it('chấp nhận tệp .csv hợp lệ và lưu vào signal selectedFile', () => {
    const validFile = new File(['code,name,credits\nCS101,Toan,3'], 'courses.csv', {
      type: 'text/csv',
    });
    const event = {
      target: {
        files: [validFile],
      },
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.selectedFile()).toBe(validFile);
    expect(component.errorMessage()).toBeNull();
  });

  it('gỡ bỏ tệp đã chọn khi nhấn removeSelectedFile', () => {
    const validFile = new File(['code,name,credits\nCS101,Toan,3'], 'courses.csv', {
      type: 'text/csv',
    });
    component.selectedFile.set(validFile);

    component.removeSelectedFile();

    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toBeNull();
    expect(component.importResult()).toBeNull();
  });

  it('tải tệp mẫu CSV từ backend khi gọi downloadTemplate()', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    component.downloadTemplate();

    expect(courseSvc.downloadCoursesImportTemplate).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');
    createElementSpy.mockRestore();
  });

  it('ADMIN chọn Khoa mặc định thì gửi kèm facultyId khi importCourses', () => {
    const validFile = new File(['code,name,credits\nCS101,Toan,3'], 'courses.csv', {
      type: 'text/csv',
    });
    component.selectedFile.set(validFile);
    component.selectedFacultyId.set('fac_1');
    courseSvc.importCourses.mockReturnValue(of({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] }));

    component.submitImport();

    expect(courseSvc.importCourses).toHaveBeenCalledWith(validFile, 'fac_1');
  });

  it('nạp dữ liệu thành công theo cơ chế Best-effort, phát emit importSuccess và hiển thị toastr', () => {
    const validFile = new File(['code,name,credits\nCS101,Toan,3'], 'courses.csv', {
      type: 'text/csv',
    });
    component.selectedFile.set(validFile);

    const mockResult: ICourseImportResultResponse = {
      totalRows: 3,
      successCount: 2,
      failureCount: 1,
      errors: [
        {
          row: 3,
          code: 'CS102',
          message: 'Mã học phần đã tồn tại',
        },
      ],
    };

    courseSvc.importCourses.mockReturnValue(of(mockResult));
    const importSuccessSpy = vi.spyOn(component.importSuccess, 'emit');

    component.submitImport();

    expect(courseSvc.importCourses).toHaveBeenCalledWith(validFile);
    expect(component.isLoading()).toBe(false);
    expect(component.importResult()).toEqual(mockResult);
    expect(toastrSvc.success).toHaveBeenCalledWith(expect.stringContaining('2/3 học phần'));
    expect(importSuccessSpy).toHaveBeenCalled();
  });

  it('xử lý lỗi khi API trả về lỗi HTTP và hiển thị toastr error', () => {
    const validFile = new File(['code,name,credits\nCS101,Toan,3'], 'courses.csv', {
      type: 'text/csv',
    });
    component.selectedFile.set(validFile);

    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Tệp CSV thiếu các cột bắt buộc',
      },
    });
    courseSvc.importCourses.mockReturnValue(throwError(() => errorResponse));

    component.submitImport();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Tệp CSV thiếu các cột bắt buộc');
    expect(toastrSvc.error).toHaveBeenCalled();
  });

  it('đóng modal và reset trạng thái khi gọi handleCancel()', () => {
    const isVisibleChangeSpy = vi.spyOn(component.isVisibleChange, 'emit');
    component.selectedFile.set(new File(['data'], 'test.csv'));

    component.handleCancel();

    expect(component.selectedFile()).toBeNull();
    expect(isVisibleChangeSpy).toHaveBeenCalledWith(false);
  });
});

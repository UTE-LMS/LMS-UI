import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ICsvImportResultResponse } from '@models/common/response-data.model';
import { ImportTemplateFormat } from '@services/common/import-file.util';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { CsvImportModalComponent } from './csv-import-modal.component';

describe('CsvImportModalComponent (nhập .csv và .xlsx, ADR 0015)', () => {
  let fixture: ComponentFixture<CsvImportModalComponent>;
  let component: CsvImportModalComponent;
  let downloadFn: ReturnType<typeof vi.fn>;
  let importFn: ReturnType<typeof vi.fn>;
  let anchorDownloadNames: string[];

  const toastStub = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };

  const pick = (file: File): void => {
    component.onFileSelected({ target: { files: [file] } } as unknown as Event);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    downloadFn = vi.fn((): Observable<Blob> => of(new Blob(['x'])));
    importFn = vi.fn((): Observable<ICsvImportResultResponse> => of({ totalRows: 1, successCount: 1, failureCount: 0, errors: [] } as unknown as ICsvImportResultResponse));
    anchorDownloadNames = [];
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      anchorDownloadNames.push(this.getAttribute('download') ?? '');
    });

    await TestBed.configureTestingModule({
      imports: [CsvImportModalComponent],
      providers: [{ provide: ToastrService, useValue: toastStub }],
    }).compileComponents();
    fixture = TestBed.createComponent(CsvImportModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('nzTitle', 'Import khoa');
    fixture.componentRef.setInput('templateFileName', 'faculties-template.csv');
    fixture.componentRef.setInput('downloadTemplateFn', downloadFn as (f: ImportTemplateFormat) => Observable<Blob>);
    fixture.componentRef.setInput('importFileFn', importFn);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('nhận tệp .csv và .xlsx (không phân biệt hoa thường)', () => {
    for (const name of ['khoa.csv', 'KHOA.XLSX', 'khoa.xlsx']) {
      const file = new File(['a'], name);
      pick(file);
      expect(component.selectedFile()).toBe(file);
      expect(component.errorMessage()).toBeNull();
    }
  });

  it('tệp .xls (Excel cũ) bị từ chối kèm hướng dẫn, đuôi lạ bị từ chối', () => {
    pick(new File(['a'], 'khoa.xls'));
    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toContain('.xls');

    pick(new File(['a'], 'khoa.pdf'));
    expect(component.errorMessage()).toContain('.csv hoặc .xlsx');
  });

  it('tệp rỗng và tệp quá 10MB bị từ chối dù đuôi hợp lệ', () => {
    pick(new File([], 'khoa.xlsx'));
    expect(component.errorMessage()).toContain('rỗng');
    expect(component.selectedFile()).toBeNull();

    const big = new File(['a'], 'khoa.xlsx');
    Object.defineProperty(big, 'size', { value: (10 * 1024 * 1024) + 1 });
    pick(big);
    expect(component.errorMessage()).toContain('10MB');
  });

  it('tải mẫu CSV: gọi service với format csv và lưu đúng tên .csv', () => {
    component.downloadTemplate('csv');

    expect(downloadFn).toHaveBeenCalledWith('csv');
    expect(anchorDownloadNames).toEqual(['faculties-template.csv']);
  });

  it('tải mẫu Excel: gọi service với format xlsx và lưu tên đổi sang .xlsx', () => {
    component.downloadTemplate('xlsx');

    expect(downloadFn).toHaveBeenCalledWith('xlsx');
    expect(anchorDownloadNames).toEqual(['faculties-template.xlsx']);
  });

  it('gọi downloadTemplate() không đối số vẫn là bản CSV (tương thích cũ)', () => {
    component.downloadTemplate();

    expect(downloadFn).toHaveBeenCalledWith('csv');
  });

  it('import tệp .xlsx đã chọn gửi đúng tệp đó lên importFileFn', () => {
    const file = new File(['PK'], 'khoa.xlsx');
    pick(file);

    component.submitImport();

    expect(importFn).toHaveBeenCalledWith(file);
    expect(toastStub.success).toHaveBeenCalled();
  });

  it('import khi chưa chọn tệp báo lỗi và không gọi API', () => {
    component.submitImport();

    expect(importFn).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('.csv hoặc .xlsx');
  });

  it('hiện khung xem trước dữ liệu khi đã chọn tệp hợp lệ', () => {
    fixture.componentRef.setInput('isVisible', true);
    fixture.componentRef.setInput('requiredColumns', ['code', 'name']);
    pick(new File(['code,name\nFIT,Khoa CNTT\n'], 'faculties.csv', { type: 'text/csv' }));
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Xem trước dữ liệu trước khi nhập');
  });

  it('hiển thị đầy đủ thống kê và bảng errors[] (row, key, message) khi có dòng bị từ chối', () => {
    fixture.componentRef.setInput('isVisible', true);
    fixture.componentRef.setInput('keyColumnLabel', 'Mã lớp / MSSV');
    importFn.mockReturnValue(of({
      totalRows: 3,
      successCount: 1,
      failureCount: 2,
      errors: [
        { row: 2, key: 'SEC1 / SV-9999', message: 'Sinh viên chưa tồn tại trong hệ thống' },
        { row: 3, key: 'SEC1 / SV-0002', message: 'Sinh viên không ở trạng thái ACTIVE' },
      ],
    }));

    pick(new File(['sectionCode,studentCode\nSEC1,SV-0001\n'], 'bulk.csv', { type: 'text/csv' }));
    component.submitImport();
    fixture.detectChanges();

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Chi tiết các dòng lỗi (2)');
    expect(bodyText).toContain('SEC1 / SV-9999');
    expect(bodyText).toContain('Sinh viên chưa tồn tại trong hệ thống');
    expect(bodyText).toContain('SEC1 / SV-0002');
    expect(bodyText).toContain('Sinh viên không ở trạng thái ACTIVE');
  });

  it('hiển thị nguyên văn thông báo lỗi 422 BUSINESS_RULE_VIOLATION khi tệp thiếu cột bắt buộc (fullName / cohort)', () => {
    fixture.componentRef.setInput('isVisible', true);
    const backendMessage = 'Tệp import sinh viên thiếu cột bắt buộc: fullName, cohort';
    importFn.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: backendMessage },
    })));

    pick(new File(['studentCode\nSV-0001\n'], 'students.csv', { type: 'text/csv' }));
    component.submitImport();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(backendMessage);
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(backendMessage);
    expect(toastStub.error).toHaveBeenCalledWith(backendMessage);
  });

  it('hiển thị nguyên văn lỗi từng dòng khi trống fullName hoặc trống cohort trong CsvImportResultResponse.errors[]', () => {
    fixture.componentRef.setInput('isVisible', true);
    fixture.componentRef.setInput('keyColumnLabel', 'MSSV');
    importFn.mockReturnValue(of({
      totalRows: 2,
      successCount: 0,
      failureCount: 2,
      errors: [
        { row: 2, key: 'SV-0001', message: 'Thiếu họ và tên (fullName)' },
        { row: 3, key: 'SV-0002', message: 'Thiếu khóa (cohort)' },
      ],
    }));

    pick(new File(['studentCode,fullName,cohort\nSV-0001,,K2023\n'], 'students.csv', { type: 'text/csv' }));
    component.submitImport();
    fixture.detectChanges();

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Thiếu họ và tên (fullName)');
    expect(bodyText).toContain('Thiếu khóa (cohort)');
  });
});

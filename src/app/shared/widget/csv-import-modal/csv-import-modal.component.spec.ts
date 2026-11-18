import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ICsvImportResultResponse } from '@models/common/response-data.model';
import { ImportTemplateFormat } from '@services/common/import-file.util';
import { ToastrService } from 'ngx-toastr';
import { Observable, of } from 'rxjs';
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
});

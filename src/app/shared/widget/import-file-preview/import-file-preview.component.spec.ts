import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportFilePreviewComponent } from './import-file-preview.component';

describe('ImportFilePreviewComponent', () => {
  let fixture: ComponentFixture<ImportFilePreviewComponent>;
  let component: ImportFilePreviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFilePreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportFilePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('không hiển thị khi chưa chọn tệp', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="import-file-preview"]')).toBeNull();
  });

  it('hiển thị bảng xem trước cột/dòng và cảnh báo thiếu cột bắt buộc rồi xóa khi bỏ tệp', async () => {
    const file = new File(['code,description\nFIT,Khoa CNTT\n'], 'khoa.csv', { type: 'text/csv' });
    fixture.componentRef.setInput('requiredColumns', ['code', 'name']);
    fixture.componentRef.setInput('file', file);
    fixture.detectChanges();

    await vi.waitFor(() => {
      expect(component.loading()).toBe(false);
      expect(component.preview()).not.toBeNull();
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(el.querySelector('[data-testid="import-file-preview"]')).not.toBeNull();
    expect(text).toContain('2 cột · 1 dòng dữ liệu');
    expect(text).toContain('FIT');
    expect(text).toContain('Khoa CNTT');
    expect(text).toContain('Thiếu cột bắt buộc so với tệp mẫu');
    expect(text).toContain('name');

    fixture.componentRef.setInput('file', null);
    fixture.detectChanges();
    expect(component.preview()).toBeNull();
    expect(el.querySelector('[data-testid="import-file-preview"]')).toBeNull();
  });
});

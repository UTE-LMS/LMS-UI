import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnofficialLabelComponent } from './unofficial-label.component';

describe('UnofficialLabelComponent - nhãn "Không chính thức" (rule 02)', () => {
  let fixture: ComponentFixture<UnofficialLabelComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => (host().textContent ?? '').replace(/\s+/g, ' ').trim();

  const render = (isOfficial: boolean | null | undefined, reasons?: readonly string[] | null): void => {
    fixture = TestBed.createComponent(UnofficialLabelComponent);
    fixture.componentRef.setInput('isOfficial', isOfficial);
    fixture.componentRef.setInput('reasons', reasons);
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [UnofficialLabelComponent] }));

  it('isOfficial = false: hiện nhãn nổi bật có chữ, biểu tượng và kiểu viền (không chỉ màu)', () => {
    render(false);
    const chip = host().querySelector<HTMLElement>('.status-chip');
    expect(text()).toContain('Không chính thức');
    expect(chip?.getAttribute('data-emphasis')).toBe('strong');
    expect(chip?.getAttribute('data-line')).toBe('dashed');
    expect(host().querySelector('i.fa-triangle-exclamation')).not.toBeNull();
  });

  it('isOfficial = true: không hiện nhãn', () => {
    render(true);
    expect(text()).toBe('');
    expect(host().querySelector('.status-chip')).toBeNull();
  });

  it.each([null, undefined])('isOfficial = %s (chưa biết): coi là chưa chính thức nên vẫn hiện nhãn', value => {
    render(value);
    expect(text()).toContain('Không chính thức');
  });

  it('quy tắc DRAFT: nêu lý do bằng chữ', () => {
    render(false, ['RULE_DRAFT']);
    expect(host().querySelector('.unofficial-reasons')?.textContent).toContain('bản nháp (DRAFT)');
  });

  it('liên kết CLO–PI chưa VERIFIED: nêu lý do bằng chữ', () => {
    render(false, ['LINK_NOT_VERIFIED']);
    expect(host().querySelector('.unofficial-reasons')?.textContent).toContain('Liên kết CLO–PI chưa được xác minh');
  });

  it('nhiều lý do: hiện từng lý do một lần (loại trùng)', () => {
    render(false, ['RULE_DRAFT', 'LINK_NOT_VERIFIED', 'RULE_DRAFT']);
    expect(host().querySelectorAll('.unofficial-reasons li')).toHaveLength(2);
  });

  it('mã lý do lạ vẫn được hiển thị an toàn và rút gọn; khóa của Object.prototype không bị coi là hợp lệ', () => {
    render(false, ['SOMETHING_NEW', 'constructor', 'X'.repeat(500)]);
    const items = Array.from(host().querySelectorAll('.unofficial-reasons li')).map(li => li.textContent ?? '');
    expect(items[0]).toContain('SOMETHING_NEW');
    expect(items[1]).toContain('constructor');
    expect(items[1]).toContain('Lý do khác');
    expect(items[2].length).toBeLessThan(100);
  });

  it('danh sách lý do rỗng/null/chuỗi trống: vẫn hiện nhãn, không hiện danh sách', () => {
    for (const reasons of [[], null, undefined, ['', '  ']]) {
      render(false, reasons);
      expect(text()).toContain('Không chính thức');
      expect(host().querySelector('.unofficial-reasons')).toBeNull();
    }
  });

  it('chú thích giải thích rằng chỉ kết quả chính thức mới là kết luận', () => {
    render(false);
    expect(text()).toContain('chưa phải kết luận chính thức');
  });
});

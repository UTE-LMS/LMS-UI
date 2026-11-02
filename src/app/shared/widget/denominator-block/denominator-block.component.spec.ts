import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IAggregateDenominator } from '@models/measurement/aggregate-result.model';
import { DenominatorBlockComponent } from './denominator-block.component';

/** Ví dụ minh họa (không phải kết quả đo thật): 45 ghi danh, 40 đủ dữ liệu, 29 đạt, 11 chưa đạt, 5 chưa đủ dữ liệu. */
const SAMPLE: IAggregateDenominator = {
  counts: { enrolled: 45, evaluable: 40, passed: 29, failed: 11, insufficientData: 5 },
  passRate: 0.725,
  passRateOfEnrolled: 0.6444,
  dataCompleteness: 0.8889,
};

describe('DenominatorBlockComponent - khối mẫu số (US-29, rule 02: tỷ lệ luôn kèm mẫu số)', () => {
  let fixture: ComponentFixture<DenominatorBlockComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const normalize = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();
  const count = (key: string): string => normalize(host().querySelector(`.count-item[data-key="${key}"] dd`)?.textContent);
  const rate = (key: string): string => normalize(host().querySelector(`.rate-item[data-key="${key}"] .rate-text`)?.textContent);
  const basis = (key: string): string => normalize(host().querySelector(`.rate-item[data-key="${key}"] .rate-basis`)?.textContent);
  const state = (key: string): string | null => host().querySelector(`.rate-item[data-key="${key}"]`)?.getAttribute('data-state') ?? null;

  const render = (value: IAggregateDenominator | null | undefined): void => {
    fixture = TestBed.createComponent(DenominatorBlockComponent);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [DenominatorBlockComponent] }));

  it('US-29/AC-1: hiển thị đủ năm số đếm đúng như API trả', () => {
    render(SAMPLE);
    expect(count('enrolled')).toBe('45');
    expect(count('evaluable')).toBe('40');
    expect(count('passed')).toBe('29');
    expect(count('failed')).toBe('11');
    expect(count('insufficientData')).toBe('5');
  });

  it('US-29/AC-2: hiển thị ba tỷ lệ API trả (chỉ định dạng) kèm mẫu số bằng chữ', () => {
    render(SAMPLE);
    expect(rate('passRate')).toBe('72,5%');
    expect(rate('passRateOfEnrolled')).toBe('64,4%');
    expect(rate('dataCompleteness')).toBe('88,9%');
    expect(basis('passRate')).toBe('Mẫu số: đạt 29 / đủ dữ liệu 40');
    expect(basis('passRateOfEnrolled')).toBe('Mẫu số: đạt 29 / ghi danh 45');
    expect(basis('dataCompleteness')).toBe('Mẫu số: đủ dữ liệu 40 / ghi danh 45');
  });

  it('UI không tự tính: số đếm "không khớp" vẫn được hiển thị nguyên văn, không sửa lại', () => {
    render({ counts: { enrolled: 10, evaluable: 99, passed: 1, failed: 2, insufficientData: 3 }, passRate: 0.5, passRateOfEnrolled: 0.3, dataCompleteness: 0.7 });
    expect(count('evaluable')).toBe('99');
    expect(rate('passRate')).toBe('50%');
    expect(rate('passRateOfEnrolled')).toBe('30%');
    expect(rate('dataCompleteness')).toBe('70%');
  });

  it('phân biệt "Chưa đạt" với "Chưa đủ dữ liệu" bằng nhãn và lời giải thích', () => {
    render(SAMPLE);
    const text = normalize(host().textContent);
    expect(text).toContain('Chưa đạt');
    expect(text).toContain('Chưa đủ dữ liệu');
    expect(text).toContain('không phải “Chưa đạt”');
  });

  it('US-29/AC-2: không ai đủ dữ liệu (evaluable = 0, tỷ lệ null): "Chưa đủ dữ liệu", không "0%"', () => {
    render({
      counts: { enrolled: 45, evaluable: 0, passed: 0, failed: 0, insufficientData: 45 },
      passRate: null, passRateOfEnrolled: 0, dataCompleteness: 0,
    });
    expect(rate('passRate')).toBe('Chưa đủ dữ liệu');
    expect(state('passRate')).toBe('insufficient');
    // 0% ở hai tỷ lệ còn lại là 0 thật trên mẫu số ghi danh 45 > 0, nên được phép và luôn kèm mẫu số
    expect(rate('passRateOfEnrolled')).toBe('0%');
    expect(basis('passRateOfEnrolled')).toBe('Mẫu số: đạt 0 / ghi danh 45');
    expect(normalize(host().querySelector('.rate-item[data-key="passRate"]')?.textContent)).not.toContain('0%');
  });

  it('mẫu số 0 nhưng API gửi nhầm tỷ lệ 0: vẫn không hiển thị "0%"', () => {
    render({
      counts: { enrolled: 0, evaluable: 0, passed: 0, failed: 0, insufficientData: 0 },
      passRate: 0, passRateOfEnrolled: 0, dataCompleteness: 0,
    });
    expect(rate('passRate')).toBe('Chưa đủ dữ liệu');
    expect(rate('passRateOfEnrolled')).toBe('Chưa có');
    expect(rate('dataCompleteness')).toBe('Chưa có');
    expect(normalize(host().textContent)).not.toContain('%');
    expect(count('enrolled')).toBe('0'); // số đếm 0 thật vẫn là 0
  });

  it('tỷ lệ 0 thật (có mẫu số dương, không ai đạt) hiển thị 0% kèm mẫu số', () => {
    render({
      counts: { enrolled: 45, evaluable: 40, passed: 0, failed: 40, insufficientData: 5 },
      passRate: 0, passRateOfEnrolled: 0, dataCompleteness: 0.8889,
    });
    expect(rate('passRate')).toBe('0%');
    expect(basis('passRate')).toBe('Mẫu số: đạt 0 / đủ dữ liệu 40');
  });

  it('thiếu toàn bộ dữ liệu (null/undefined): mọi ô là "Chưa có", không có số 0 hay %', () => {
    for (const value of [null, undefined]) {
      render(value);
      for (const key of ['enrolled', 'evaluable', 'passed', 'failed', 'insufficientData']) {
        expect(count(key)).toBe('Chưa có');
      }
      expect(rate('passRate')).toBe('Chưa có');
      expect(rate('passRateOfEnrolled')).toBe('Chưa có');
      expect(rate('dataCompleteness')).toBe('Chưa có');
      expect(host().textContent).not.toContain('%');
    }
  });

  it('thiếu từng khoản đếm: khoản thiếu là "Chưa có" chứ không là 0', () => {
    render({ counts: { enrolled: 45 }, passRate: null, passRateOfEnrolled: null, dataCompleteness: null });
    expect(count('enrolled')).toBe('45');
    expect(count('passed')).toBe('Chưa có');
    expect(rate('passRate')).toBe('Chưa có');
    expect(basis('passRate')).toBe('Mẫu số: đạt Chưa có / đủ dữ liệu Chưa có');
  });

  it('tỷ lệ có nhưng thiếu số đếm làm mẫu số: không hiển thị tỷ lệ không kèm mẫu số', () => {
    render({ counts: null, passRate: 0.9, passRateOfEnrolled: 0.9, dataCompleteness: 0.9 });
    expect(rate('passRate')).toBe('Chưa có');
    expect(host().textContent).not.toContain('90%');
  });

  it('tỷ lệ ngoài 0–1 (ví dụ 72 thay vì 0,72) bị báo không hợp lệ, không hiển thị 7200%', () => {
    render({ ...SAMPLE, passRate: 72 });
    expect(rate('passRate')).toBe('Không hợp lệ');
    expect(state('passRate')).toBe('invalid');
  });

  it('số đếm rất lớn hiển thị đủ chữ số', () => {
    render({ ...SAMPLE, counts: { ...SAMPLE.counts, enrolled: 1234567 } });
    expect(count('enrolled').replace(/\D/g, '')).toBe('1234567');
  });

  it('tiêu đề tùy chỉnh được dùng làm nhãn vùng', () => {
    fixture = TestBed.createComponent(DenominatorBlockComponent);
    fixture.componentRef.setInput('value', SAMPLE);
    fixture.componentRef.setInput('heading', 'Kết quả CLO1 (ví dụ minh họa)');
    fixture.detectChanges();
    expect(host().querySelector('section')?.getAttribute('aria-label')).toBe('Kết quả CLO1 (ví dụ minh họa)');
  });
});

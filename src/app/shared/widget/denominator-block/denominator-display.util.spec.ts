import { asCount, displayRate, formatCount, formatRatePercent } from './denominator-display.util';

describe('asCount / formatCount - chỉ nhận số đếm hợp lệ', () => {
  it.each([0, 1, 45])('số nguyên không âm %i hợp lệ', value => {
    expect(asCount(value)).toBe(value);
  });

  it.each([null, undefined, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '5', {}])('%j không phải số đếm: Chưa có', value => {
    expect(asCount(value)).toBeNull();
    expect(formatCount(value)).toBe('Chưa có');
  });

  it('số đếm 0 thật hiển thị 0 (khác với thiếu)', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('số lớn có phân cách hàng nghìn theo vi-VN', () => {
    expect(formatCount(1234567).replace(/\D/g, '')).toBe('1234567');
    expect(formatCount(1234567)).not.toBe('1234567'); // có ký tự phân cách nhóm
  });
});

describe('formatRatePercent - chỉ định dạng, không tính lại', () => {
  // Giá trị đầu vào là ví dụ minh họa; kỳ vọng tính tay độc lập: 0,725 → 72,5%.
  it.each([
    [0.725, '72,5%'],
    [0.72, '72%'],
    [0.5, '50%'],
    [1, '100%'],
    [0, '0%'],
    [0.001, '0,1%'],
    [0.9990, '99,9%'],
  ])('%d → %s', (rate, expected) => {
    expect(formatRatePercent(rate)).toBe(expected);
  });

  it('giá trị rất nhỏ nhưng khác 0 không bị làm tròn thành "0%"', () => {
    expect(formatRatePercent(0.0001)).toBe('< 0,1%');
  });

  it('giá trị sát 100% nhưng chưa đủ không bị làm tròn thành "100%"', () => {
    expect(formatRatePercent(0.9999)).toBe('> 99,9%');
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.01, 72, '0.5'])('%j không hợp lệ: null', rate => {
    expect(formatRatePercent(rate)).toBeNull();
  });
});

describe('displayRate - tỷ lệ luôn xét theo mẫu số', () => {
  it('mẫu số 0 của tỷ lệ trên số đủ dữ liệu: "Chưa đủ dữ liệu", dù API gửi nhầm 0', () => {
    expect(displayRate(0, 0, 'Chưa đủ dữ liệu')).toEqual({ state: 'insufficient', text: 'Chưa đủ dữ liệu' });
    expect(displayRate(null, 0, 'Chưa đủ dữ liệu')).toEqual({ state: 'insufficient', text: 'Chưa đủ dữ liệu' });
  });

  it('mẫu số 0 của tỷ lệ khác: "Chưa có", dù API gửi nhầm 0', () => {
    expect(displayRate(0, 0, 'Chưa có')).toEqual({ state: 'none', text: 'Chưa có' });
  });

  it('mẫu số chưa biết: "Chưa có", kể cả khi có tỷ lệ (tỷ lệ không mẫu số không được hiển thị)', () => {
    expect(displayRate(0.9, null, 'Chưa có')).toEqual({ state: 'none', text: 'Chưa có' });
    expect(displayRate(0.9, undefined, 'Chưa có')).toEqual({ state: 'none', text: 'Chưa có' });
  });

  it('mẫu số dương nhưng API trả tỷ lệ null: "Chưa có"', () => {
    expect(displayRate(null, 40, 'Chưa có')).toEqual({ state: 'none', text: 'Chưa có' });
    expect(displayRate(undefined, 40, 'Chưa có')).toEqual({ state: 'none', text: 'Chưa có' });
  });

  it('mẫu số dương, tỷ lệ 0 thật: hiển thị 0%', () => {
    expect(displayRate(0, 40, 'Chưa có')).toEqual({ state: 'value', text: '0%' });
  });

  it('tỷ lệ ngoài khoảng 0–1: "Không hợp lệ"', () => {
    expect(displayRate(1.5, 40, 'Chưa có')).toEqual({ state: 'invalid', text: 'Không hợp lệ' });
    expect(displayRate(Number.NaN, 40, 'Chưa có')).toEqual({ state: 'invalid', text: 'Không hợp lệ' });
  });
});

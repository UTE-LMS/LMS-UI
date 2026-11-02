import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SCORE_STATUS_DISPLAY } from '@constants/measurement-display.constant';
import { ScoreStatus } from '@models/measurement/score-status.model';
import { ScoreStatusBadgeComponent } from './score-status-badge.component';

const ALL_STATUSES: ScoreStatus[] = ['SCORED', 'BLANK', 'ABSENT', 'NOT_GRADED', 'EXEMPT', 'MISSING'];

describe('ScoreStatusBadgeComponent - huy hiệu trạng thái điểm (rule 02, bất biến "thiếu dữ liệu ≠ 0")', () => {
  let fixture: ComponentFixture<ScoreStatusBadgeComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => (host().textContent ?? '').replace(/\s+/g, ' ').trim();
  const chip = (): HTMLElement | null => host().querySelector<HTMLElement>('.status-chip');

  /** Điểm dùng trong test là ví dụ minh họa, không phải kết quả đo thật. */
  const render = (status: string | null | undefined, rawScore?: number | null, maxScore?: number | null): void => {
    fixture = TestBed.createComponent(ScoreStatusBadgeComponent);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('rawScore', rawScore);
    fixture.componentRef.setInput('maxScore', maxScore);
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [ScoreStatusBadgeComponent] }));

  it.each(ALL_STATUSES)('%s: có nhãn chữ, biểu tượng và chú thích riêng (không chỉ màu)', status => {
    render(status, null);
    const display = SCORE_STATUS_DISPLAY[status];
    expect(text()).toContain(display.label);
    expect(host().querySelector('i.fa-solid')?.classList.contains(display.icon)).toBe(true);
    expect(text()).toContain(display.description); // chú thích có sẵn cho trình đọc màn hình
  });

  it('sáu trạng thái có sáu nhãn khác nhau, và bộ (biểu tượng, kiểu viền, sắc thái) không trùng nhau', () => {
    const labels = new Set(ALL_STATUSES.map(s => SCORE_STATUS_DISPLAY[s].label));
    const icons = new Set(ALL_STATUSES.map(s => SCORE_STATUS_DISPLAY[s].icon));
    expect(labels.size).toBe(6);
    expect(icons.size).toBe(6);
  });

  it('BLANK khác MISSING: khác nhãn, khác biểu tượng, khác kiểu viền; BLANK hiện 0 còn MISSING không', () => {
    render('BLANK', 0);
    const blankText = text();
    const blankLine = chip()?.getAttribute('data-line');
    render('MISSING', null);
    const missingText = text();
    expect(blankText).toContain('Bỏ trống');
    expect(blankText).toContain('0');
    expect(missingText).toContain('Thiếu dữ liệu');
    expect(missingText).not.toMatch(/(^|\s)0(\s|$)/);
    expect(blankLine).not.toBe(chip()?.getAttribute('data-line'));
    expect(SCORE_STATUS_DISPLAY.BLANK.icon).not.toBe(SCORE_STATUS_DISPLAY.MISSING.icon);
  });

  it('SCORED hiện điểm kèm điểm tối đa theo định dạng vi-VN', () => {
    render('SCORED', 7.5, 10);
    expect(host().querySelector('.score-value')?.textContent?.trim()).toBe('7,5 / 10');
  });

  it('SCORED không có điểm tối đa: chỉ hiện điểm', () => {
    render('SCORED', 8, null);
    expect(host().querySelector('.score-value')?.textContent?.trim()).toBe('8');
  });

  it('SCORED có điểm 0 thật: hiện 0 (điểm 0 đã chấm là số liệu hợp lệ)', () => {
    render('SCORED', 0, 10);
    expect(host().querySelector('.score-value')?.textContent?.trim()).toBe('0 / 10');
  });

  it('SCORED nhưng rawScore null: không bịa số 0, nói rõ thiếu giá trị điểm', () => {
    render('SCORED', null, 10);
    expect(host().querySelector('.score-value')).toBeNull();
    expect(host().querySelector('.score-missing')?.textContent).toContain('thiếu giá trị điểm');
  });

  it.each(['ABSENT', 'NOT_GRADED', 'EXEMPT', 'MISSING'])('%s: KHÔNG hiện số kể cả khi API gửi nhầm rawScore = 0', status => {
    render(status, 0, 10);
    expect(host().querySelector('.score-value')).toBeNull();
    expect(text()).not.toMatch(/(^|\s)0(\s|$)/);
  });

  it('BLANK với rawScore khác 0 (dữ liệu sai hợp đồng): không hiện số', () => {
    render('BLANK', 3);
    expect(host().querySelector('.score-value')).toBeNull();
  });

  it('BLANK không có rawScore: chỉ hiện nhãn, không bịa 0', () => {
    render('BLANK', null);
    expect(host().querySelector('.score-value')).toBeNull();
  });

  it('rawScore NaN/Infinity bị coi là không có giá trị', () => {
    render('SCORED', Number.NaN, 10);
    expect(host().querySelector('.score-value')).toBeNull();
    render('SCORED', Number.POSITIVE_INFINITY, 10);
    expect(host().querySelector('.score-value')).toBeNull();
  });

  it('điểm tối đa 0 hoặc không hợp lệ không được hiện như mẫu số', () => {
    render('SCORED', 5, 0);
    expect(host().querySelector('.score-value')?.textContent?.trim()).toBe('5');
  });

  it('thiếu trạng thái (null/undefined): "Chưa có trạng thái", không hiện số', () => {
    render(null, 0);
    expect(text()).toContain('Chưa có trạng thái');
    expect(host().querySelector('.score-value')).toBeNull();
    render(undefined);
    expect(text()).toContain('Chưa có trạng thái');
  });

  it('enum lạ: "Không xác định" kèm giá trị lạ trong chú thích, không hiện số', () => {
    render('PARTIALLY_GRADED', 5, 10);
    expect(text()).toContain('Không xác định');
    expect(text()).toContain('PARTIALLY_GRADED');
    expect(host().querySelector('.score-value')).toBeNull();
  });

  it('enum lạ rất dài: được rút gọn, bố cục cho phép ngắt chữ', () => {
    render('LONG_'.repeat(400));
    expect(text().length).toBeLessThan(400);
    expect(chip()).not.toBeNull();
  });

  it('chuỗi chứa HTML từ API được escape', () => {
    render('<img src=x onerror=alert(1)>');
    expect(host().querySelector('img')).toBeNull();
  });
});

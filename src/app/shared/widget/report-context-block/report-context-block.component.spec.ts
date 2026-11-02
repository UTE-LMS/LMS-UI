import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IReportContext } from '@models/measurement/report-context.model';
import { ReportContextBlockComponent } from './report-context-block.component';

/** Ví dụ minh họa (không phải báo cáo thật). */
const CONTEXT: IReportContext = {
  scope: { type: 'SECTION', label: 'Lớp ví dụ minh họa 01', refId: '671dcba5f123456789abcde1', cohort: null, termId: null },
  rule: { code: 'QT-VÍ-DỤ', version: '0.1-DRAFT', status: 'DRAFT' },
  programVersionId: '671dcba5f123456789abcdef',
  runId: '671dcba5f123456789abcd01',
  calculatedAt: '2026-10-27T05:00:00Z',
  isOfficial: false,
  isStale: true,
  staleReason: 'Điểm bị sửa sau lần tính (ví dụ minh họa)',
  limitations: ['Kết quả không chính thức: quy tắc còn là bản nháp.', 'Chưa đủ dữ liệu để kết luận toàn chương trình.'],
};

describe('ReportContextBlockComponent - phạm vi, quy tắc, phiên bản, limitations (US-31, rule 02)', () => {
  let fixture: ComponentFixture<ReportContextBlockComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();
  const field = (name: string): string => norm(host().querySelector(`[data-field="${name}"]`)?.textContent);

  const render = (context: IReportContext | null | undefined): void => {
    fixture = TestBed.createComponent(ReportContextBlockComponent);
    fixture.componentRef.setInput('context', context);
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [ReportContextBlockComponent] }));

  it('US-31/AC-1: hiển thị phạm vi, quy tắc + phiên bản + trạng thái, phiên bản CTĐT, lần tính', () => {
    render(CONTEXT);
    expect(field('scope')).toBe('Lớp học phần: Lớp ví dụ minh họa 01');
    expect(field('rule')).toContain('QT-VÍ-DỤ, phiên bản 0.1-DRAFT');
    expect(field('rule')).toContain('Bản nháp');
    expect(field('programVersion')).toBe('671dcba5f123456789abcdef');
    expect(field('run')).toBe('671dcba5f123456789abcd01');
  });

  it('thời điểm tính hiển thị theo giờ Việt Nam (UTC+7): 05:00 UTC là 12:00', () => {
    render(CONTEXT);
    expect(field('calculatedAt')).toMatch(/12:00/);
    expect(field('calculatedAt')).toMatch(/27\/10\/2026|27\/10\/26/);
  });

  it('US-31/AC-2: kết quả chưa chính thức có nhãn "Không chính thức" kèm lý do DRAFT', () => {
    render(CONTEXT);
    const text = norm(host().textContent);
    expect(text).toContain('Không chính thức');
    expect(text).toContain('bản nháp (DRAFT)');
  });

  it('US-31/AC-2: lần chạy isStale hiện cảnh báo "Điểm đã thay đổi sau lần tính" kèm lý do', () => {
    render(CONTEXT);
    expect(norm(host().textContent)).toContain('Điểm đã thay đổi sau lần tính');
    expect(norm(host().querySelector('.stale-reason')?.textContent)).toContain('Điểm bị sửa sau lần tính');
  });

  it('US-32/AC-2: hiển thị từng limitations', () => {
    render(CONTEXT);
    const items = Array.from(host().querySelectorAll('.limitations li')).map(li => norm(li.textContent));
    expect(items).toEqual(['Kết quả không chính thức: quy tắc còn là bản nháp.', 'Chưa đủ dữ liệu để kết luận toàn chương trình.']);
  });

  it('kết quả chính thức, không cũ: không có nhãn "Không chính thức" và không có cảnh báo cũ', () => {
    render({
      ...CONTEXT,
      rule: { code: 'QT-VÍ-DỤ', version: '1.0', status: 'CONFIRMED' },
      isOfficial: true,
      isStale: false,
      limitations: [],
    });
    const text = norm(host().textContent);
    expect(text).not.toContain('Không chính thức');
    expect(text).not.toContain('Điểm đã thay đổi sau lần tính');
    expect(field('rule')).toContain('Đã xác nhận');
  });

  it('limitations rỗng/null: nói rõ chưa có giới hạn nào được trả về và không khẳng định không có giới hạn', () => {
    for (const limitations of [[], null]) {
      render({ ...CONTEXT, limitations });
      expect(host().querySelector('.limitations')).toBeNull();
      expect(norm(host().querySelector('.limitations-empty')?.textContent)).toContain('chưa trả về giới hạn nào');
      expect(norm(host().querySelector('.limitations-empty')?.textContent)).toContain('không có nghĩa là kết quả không có giới hạn');
    }
  });

  it('context null/undefined: mọi khoản "Chưa có" và vẫn hiện nhãn "Không chính thức" (chưa biết ≠ chính thức)', () => {
    for (const context of [null, undefined]) {
      render(context);
      for (const name of ['scope', 'rule', 'programVersion', 'run', 'calculatedAt']) {
        expect(field(name)).toBe('Chưa có');
      }
      expect(norm(host().textContent)).toContain('Không chính thức');
      expect(norm(host().textContent)).not.toContain('Điểm đã thay đổi sau lần tính');
    }
  });

  it('isOfficial null: hiện nhãn "Không chính thức"', () => {
    render({ ...CONTEXT, isOfficial: null, rule: null });
    expect(norm(host().textContent)).toContain('Không chính thức');
  });

  it('lý do chưa chính thức bổ sung từ API (liên kết CLO–PI chưa VERIFIED) được nêu', () => {
    render({ ...CONTEXT, rule: { code: 'QT', version: '1.0', status: 'CONFIRMED' }, unofficialReasons: ['LINK_NOT_VERIFIED'] });
    const reasons = norm(host().querySelector('.unofficial-reasons')?.textContent);
    expect(reasons).toContain('Liên kết CLO–PI chưa được xác minh');
    expect(reasons).not.toContain('bản nháp');
  });

  it('phạm vi lạ, thiếu tên, có khóa và học kỳ', () => {
    render({ ...CONTEXT, scope: { type: 'COHORT', label: null, refId: null, cohort: 'K2022', termId: 'HK1-2026' } });
    expect(field('scope')).toBe('Khóa: khóa K2022, học kỳ HK1-2026');
    render({ ...CONTEXT, scope: { type: 'SOMETHING_NEW' as 'COURSE', label: 'Tên' } });
    expect(field('scope')).toBe('SOMETHING_NEW: Tên');
    render({ ...CONTEXT, scope: { type: 'PROGRAM' } });
    expect(field('scope')).toBe('Chương trình đào tạo');
  });

  it('trạng thái quy tắc lạ: hiển thị "Không xác định", không coi là đã xác nhận', () => {
    render({ ...CONTEXT, rule: { code: 'QT', version: '1', status: 'WEIRD' as 'DRAFT' }, isOfficial: false });
    expect(field('rule')).toContain('Không xác định');
    expect(field('rule')).not.toContain('Đã xác nhận');
  });

  it('thời điểm tính không hợp lệ: "Không hợp lệ", không ném lỗi', () => {
    render({ ...CONTEXT, calculatedAt: 'không phải ngày' });
    expect(field('calculatedAt')).toBe('Không hợp lệ');
    render({ ...CONTEXT, calculatedAt: '' });
    expect(field('calculatedAt')).toBe('Chưa có');
  });

  it('ID, giới hạn và tên rất dài bị rút gọn, không làm vỡ bố cục', () => {
    render({
      ...CONTEXT,
      runId: 'a'.repeat(5000),
      limitations: ['L'.repeat(5000), '   ', ''],
      scope: { type: 'COURSE', label: 'T'.repeat(5000) },
    });
    expect(field('run').length).toBeLessThanOrEqual(200);
    expect(host().querySelectorAll('.limitations li')).toHaveLength(1);
    expect(norm(host().querySelector('.limitations li')?.textContent).length).toBeLessThanOrEqual(500);
    expect(field('scope').length).toBeLessThan(260);
  });

  it('nội dung từ API được escape, không chèn HTML', () => {
    render({ ...CONTEXT, limitations: ['<img src=x onerror=alert(1)>'] });
    expect(host().querySelector('img')).toBeNull();
  });
});

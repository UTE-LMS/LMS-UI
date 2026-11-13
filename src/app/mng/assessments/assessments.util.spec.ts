import { IAssessmentItem } from '@models/assessment/assessment.model';
import {
  cleanOptional, describeMappings, formatNumber, hasDuplicates, isStructureEditable, lockHints, lockReason, meterWidth,
  nextItemCode, renumber, sumCloWeights, sumItemMaxScores, sumOutcomeScores,
} from './assessments.util';

/** DỮ LIỆU THỬ NGHIỆM: mã câu và CLO giả. */
const item = (code: string, maxScore: number): IAssessmentItem => ({
  code, bloomLevel: 3, outcomeMappings: [{ cloId: 'c1', maxScore }],
});

describe('assessments.util (F04, ADR 0014)', () => {
  describe('sumOutcomeScores & sumCloWeights', () => {
    it('cộng điểm tối đa của outcomeMappings', () => {
      expect(sumOutcomeScores([{ maxScore: 2 }, { maxScore: 3 }])).toBe(5);
      expect(sumOutcomeScores([{ maxScore: null }, { maxScore: 1.5 }])).toBe(1.5);
    });

    it('cộng trọng số CLO', () => {
      expect(sumCloWeights([{ weight: 0.4 }, { weight: 0.6 }])).toBe(1.0);
      expect(sumCloWeights([{ weight: null }, { weight: 0.5 }])).toBe(0.5);
    });
  });

  it('sumItemMaxScores cộng điểm tối đa các phần tử (2 + 3 = 5)', () => {
    expect(sumItemMaxScores([item('C1', 2), item('C2', 3)])).toBe(5);
    expect(sumItemMaxScores([])).toBe(0);
  });

  describe('formatNumber', () => {
    it('dùng dấu phẩy thập phân kiểu Việt Nam, tối đa 4 chữ số', () => {
      expect(formatNumber(0.5)).toBe('0,5');
      expect(formatNumber(10)).toBe('10');
      expect(formatNumber(0.33333333)).toBe('0,3333');
    });

    it('thiếu dữ liệu hiện "—", không phải 0', () => {
      expect(formatNumber(null)).toBe('—');
      expect(formatNumber(undefined)).toBe('—');
      expect(formatNumber(Number.NaN)).toBe('—');
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('isStructureEditable và lockReason (ADR 0014)', () => {
    it('sửa được khi ở Nháp và chưa khóa', () => {
      expect(isStructureEditable({ scope: 'SECTION', status: 'DRAFT', locked: false })).toBe(true);
      expect(lockReason({ scope: 'SECTION', status: 'DRAFT', locked: false })).toBeNull();
    });

    it('bị khóa khi locked=true hoặc trạng thái không phải DRAFT', () => {
      expect(isStructureEditable({ scope: 'SECTION', status: 'LOCKED', locked: true })).toBe(false);
      expect(isStructureEditable({ scope: 'SECTION', status: 'SCORE_ENTERED', locked: true })).toBe(false);
      expect(isStructureEditable({ scope: 'SECTION', status: 'DRAFT', locked: true })).toBe(false);
    });

    it('lý do khóa nêu rõ trạng thái', () => {
      expect(lockReason({ scope: 'SECTION', status: 'LOCKED', locked: true })).toContain('đã được khóa');
      expect(lockReason({ scope: 'SECTION', status: 'SCORE_ENTERED', locked: true })).toContain('nhập điểm');
    });
  });

  describe('lockHints (ADR 0014)', () => {
    it('không có gợi ý chặn nào khi cấu trúc hợp lệ và khớp CLO', () => {
      const hints = lockHints(
        { cloWeights: [{ cloId: 'c1', weight: 1.0 }] },
        [item('C1', 5)],
        false,
      );
      expect(hints).toEqual([]);
    });

    it('chặn khi chưa có câu hỏi nào', () => {
      const hints = lockHints({ cloWeights: [] }, [], false);
      expect(hints.some(h => h.blocking && h.message.includes('Chưa có câu hỏi'))).toBe(true);
    });

    it('chặn khi còn thay đổi chưa lưu', () => {
      const hints = lockHints({ cloWeights: [{ cloId: 'c1', weight: 1.0 }] }, [item('C1', 5)], true);
      expect(hints[0].blocking).toBe(true);
      expect(hints[0].message).toContain('chưa lưu');
    });

    it('báo lỗi khi CLO trong câu hỏi chưa có trong cloWeights', () => {
      const hints = lockHints({ cloWeights: [] }, [item('C1', 5)], false);
      expect(hints.some(h => h.message.includes('khai báo trọng số'))).toBe(true);
    });
  });

  it('renumber gán orderIndex 1..n theo vị trí và không sửa mảng gốc', () => {
    const original = [item('A', 1), item('B', 1)];
    const result = renumber(original);
    expect(result.map(i => i.orderIndex)).toEqual([1, 2]);
    expect(original[0].orderIndex).toBeUndefined();
  });

  describe('meterWidth (chỉ hiển thị phần trăm do API trả)', () => {
    it('giữ nguyên phần trăm hợp lệ', () => {
      expect(meterWidth(30)).toBe('30%');
      expect(meterWidth(0)).toBe('0%');
      expect(meterWidth(100)).toBe('100%');
    });

    it('kẹp giá trị ngoài 0–100 và xử lý thiếu dữ liệu', () => {
      expect(meterWidth(120)).toBe('100%');
      expect(meterWidth(-5)).toBe('0%');
      expect(meterWidth(null)).toBe('0%');
      expect(meterWidth(Number.NaN)).toBe('0%');
    });
  });

  it('describeMappings hiện mã CLO và điểm tối đa', () => {
    const labels = describeMappings(
      { outcomeMappings: [{ cloId: 'c1', maxScore: 2.5 }, { cloId: 'zz', maxScore: 1.5 }] },
      new Map([['c1', 'CLO3']]),
    );
    expect(labels).toEqual(['CLO3 (2,5 đ)', 'CLO ? (1,5 đ)']);
  });

  it('nextItemCode chọn số nhỏ nhất chưa dùng, không phân biệt hoa thường', () => {
    expect(nextItemCode([])).toBe('C1');
    expect(nextItemCode(['C1', 'C2'])).toBe('C3');
    expect(nextItemCode(['c2'])).toBe('C3');
    expect(nextItemCode(['C2', 'X'])).toBe('C3');
  });

  it('hasDuplicates và cleanOptional', () => {
    expect(hasDuplicates(['a', 'b'])).toBe(false);
    expect(hasDuplicates(['a', 'a'])).toBe(true);
    expect(cleanOptional('  chủ đề  ')).toBe('chủ đề');
    expect(cleanOptional('   ')).toBeUndefined();
    expect(cleanOptional(null)).toBeUndefined();
  });
});

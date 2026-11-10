import { IAssessmentItem } from '@models/assessment/assessment.model';
import {
  cleanOptional, describeMappings, formatNumber, hasDuplicates, isStructureEditable, lockReason, meterWidth,
  nextItemCode, renumber, submitHints, sumMaxScores, sumWeights, totalPointsMatches, weightSumMatches,
} from './assessments.util';

/** DỮ LIỆU THỬ NGHIỆM: mã câu và CLO giả; kỳ vọng tính tay. */
const item = (code: string, maxScore: number): IAssessmentItem => ({
  code, kind: 'QUESTION', maxScore, outcomeMappings: [{ cloId: 'c1', weight: 1 }],
});

describe('assessments.util (F04)', () => {
  describe('weightSumMatches (US-15/AC-2, gợi ý phía client; backend quyết định)', () => {
    it('đúng khi tổng bằng 1: 1; 0,5 + 0,5; 0,3 + 0,3 + 0,4', () => {
      expect(weightSumMatches(sumWeights([{ weight: 1 }]))).toBe(true);
      expect(weightSumMatches(sumWeights([{ weight: 0.5 }, { weight: 0.5 }]))).toBe(true);
      expect(weightSumMatches(sumWeights([{ weight: 0.3 }, { weight: 0.3 }, { weight: 0.4 }]))).toBe(true);
    });

    it('sai khi tổng 0,9 hoặc 1,01', () => {
      expect(weightSumMatches(sumWeights([{ weight: 0.5 }, { weight: 0.4 }]))).toBe(false);
      expect(weightSumMatches(1.01)).toBe(false);
    });

    it('biên: sai lệch đúng sai số 0,0001 chấp nhận, hơn một chút thì không', () => {
      expect(weightSumMatches(1.0001)).toBe(true);
      expect(weightSumMatches(1.00011)).toBe(false);
      expect(weightSumMatches(0.99995)).toBe(true);
    });

    it('ô phần điểm chưa nhập (null) không được tính thành 0,5: tổng thiếu thì không khớp', () => {
      expect(weightSumMatches(sumWeights([{ weight: 0.5 }, { weight: null }]))).toBe(false);
    });
  });

  describe('totalPointsMatches (NEW-01/AC-2)', () => {
    it('khớp khi lệch dưới 0,001', () => {
      expect(totalPointsMatches(10, 10)).toBe(true);
      expect(totalPointsMatches(10, 10.0009)).toBe(true);
    });

    it('lệch từ 0,001 trở lên thì không khớp', () => {
      expect(totalPointsMatches(10, 10.0011)).toBe(false);
      expect(totalPointsMatches(10, 9)).toBe(false);
    });

    it('null khi chưa khai báo tổng điểm (không đối chiếu được, khác với 0)', () => {
      expect(totalPointsMatches(null, 0)).toBeNull();
      expect(totalPointsMatches(undefined, 5)).toBeNull();
      expect(totalPointsMatches(0, 0)).toBe(true);
    });
  });

  it('sumMaxScores cộng điểm tối đa các phần tử (2 + 2 + 3 + 3 = 10)', () => {
    expect(sumMaxScores([item('C1', 2), item('C2', 2), item('C3', 3), item('C4', 3)])).toBe(10);
    expect(sumMaxScores([])).toBe(0);
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

  describe('isStructureEditable và lockReason (US-15/AC-5, khóa sửa khi locked)', () => {
    it('khung theo đề cương luôn sửa được', () => {
      expect(isStructureEditable({ scope: 'SYLLABUS_TEMPLATE', status: 'DRAFT', locked: false })).toBe(true);
      expect(lockReason({ scope: 'SYLLABUS_TEMPLATE', status: 'DRAFT', locked: false })).toBeNull();
    });

    it('bản lớp sửa được ở Nháp và Bị từ chối', () => {
      expect(isStructureEditable({ scope: 'SECTION', status: 'DRAFT', locked: false })).toBe(true);
      expect(isStructureEditable({ scope: 'SECTION', status: 'REJECTED', locked: false })).toBe(true);
    });

    it('bản lớp bị khóa từ Đã gửi duyệt trở đi', () => {
      for (const status of ['SUBMITTED', 'APPROVED', 'SCORE_ENTERED', 'LOCKED'] as const) {
        expect(isStructureEditable({ scope: 'SECTION', status, locked: status !== 'SUBMITTED' })).toBe(false);
      }
    });

    it('cờ locked=true khóa dù trạng thái là Nháp (không tin riêng trạng thái)', () => {
      expect(isStructureEditable({ scope: 'SECTION', status: 'DRAFT', locked: true })).toBe(false);
    });

    it('lý do khóa khác nhau giữa chờ duyệt và đã duyệt', () => {
      expect(lockReason({ scope: 'SECTION', status: 'SUBMITTED', locked: false })).toContain('chờ Trưởng bộ môn');
      expect(lockReason({ scope: 'SECTION', status: 'APPROVED', locked: true })).toContain('đã được duyệt');
    });
  });

  describe('submitHints (NEW-01/AC-2)', () => {
    it('không có gợi ý nào khi đủ điều kiện', () => {
      expect(submitHints({ totalPoints: 4 }, [item('C1', 1), item('C2', 3)], false)).toEqual([]);
    });

    it('chặn khi chưa có phần tử', () => {
      const hints = submitHints({ totalPoints: 0 }, [], false);
      expect(hints.some(h => h.blocking && h.message.includes('Chưa có câu hỏi'))).toBe(true);
    });

    it('chặn khi chưa khai báo tổng điểm', () => {
      const hints = submitHints({ totalPoints: null }, [item('C1', 1)], false);
      expect(hints.map(h => h.message)).toContain('Chưa khai báo tổng điểm của bài.');
    });

    it('chặn khi tổng điểm lệch, nêu rõ cả hai giá trị', () => {
      const hints = submitHints({ totalPoints: 10 }, [item('C1', 4), item('C2', 5)], false);
      expect(hints.length).toBe(1);
      expect(hints[0].message).toContain('(10)');
      expect(hints[0].message).toContain('(9)');
    });

    it('chặn khi còn thay đổi chưa lưu', () => {
      const hints = submitHints({ totalPoints: 1 }, [item('C1', 1)], true);
      expect(hints[0].message).toContain('chưa lưu');
      expect(hints[0].blocking).toBe(true);
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

  it('describeMappings hiện mã CLO và phần điểm; CLO không tra được thì "CLO ?"', () => {
    const labels = describeMappings(
      { outcomeMappings: [{ cloId: 'c1', weight: 0.5 }, { cloId: 'zz', weight: 0.5 }] },
      new Map([['c1', 'CLO3']]),
    );
    expect(labels).toEqual(['CLO3 (0,5)', 'CLO ? (0,5)']);
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
    expect(cleanOptional('  chủ đề ')).toBe('chủ đề');
    expect(cleanOptional('   ')).toBeUndefined();
    expect(cleanOptional(null)).toBeUndefined();
  });
});

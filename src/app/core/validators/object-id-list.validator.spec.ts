import { FormControl } from '@angular/forms';
import { objectIdListValidator } from './object-id-list.validator';

const check = (value: unknown) => objectIdListValidator(new FormControl(value));

describe('objectIdListValidator (API-CONTRACT.md §1.3)', () => {
  it('danh sách rỗng hoặc không phải mảng thì hợp lệ', () => {
    expect(check([])).toBeNull();
    expect(check(null)).toBeNull();
  });

  it('chấp nhận ObjectId 24 ký tự hex, không phân biệt hoa thường', () => {
    expect(check(['671dcba5f123456789abcd01', '671DCBA5F123456789ABCD02'])).toBeNull();
  });

  it('từ chối chuỗi sai độ dài hoặc có ký tự ngoài hex và trả về giá trị sai', () => {
    expect(check(['671dcba5f123456789abcd0'])).toEqual({ invalidObjectId: { values: ['671dcba5f123456789abcd0'] } }); // 23 ký tự
    expect(check(['671dcba5f123456789abcdzz'])).not.toBeNull(); // có ký tự z
    expect(check(['OOPR230279'])).not.toBeNull(); // mã học phần không phải ObjectId
  });

  it('một phần tử sai làm cả danh sách sai', () => {
    const result = check(['671dcba5f123456789abcd01', 'abc']);
    expect(result).toEqual({ invalidObjectId: { values: ['abc'] } });
  });
});

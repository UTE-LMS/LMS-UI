import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PLACEHOLDER } from '@constants/measurement-display.constant';
import { IAggregateCounts, IAggregateDenominator } from '@models/measurement/aggregate-result.model';
import { displayRate, formatCount, IRateDisplay } from './denominator-display.util';

interface ICountItem {
  key: keyof IAggregateCounts;
  label: string;
  text: string;
}

interface IRateItem extends IRateDisplay {
  key: 'passRate' | 'passRateOfEnrolled' | 'dataCompleteness';
  label: string;
  /** Công thức hiển thị bằng chữ kèm số đếm tương ứng, để tỷ lệ luôn đi kèm mẫu số. */
  basis: string;
}

const COUNT_LABELS: readonly (readonly [keyof IAggregateCounts, string])[] = [
  ['enrolled', 'Ghi danh'],
  ['evaluable', 'Đủ dữ liệu'],
  ['passed', 'Đạt'],
  ['failed', 'Chưa đạt'],
  ['insufficientData', 'Chưa đủ dữ liệu'],
];

/**
 * Khối mẫu số của kết quả tổng hợp: năm số đếm (ghi danh, đủ dữ liệu, đạt, chưa đạt, chưa đủ dữ liệu) và ba tỷ lệ
 * do API tính sẵn. Component CHỈ HIỂN THỊ: không chia, không cộng, không suy ra số nào từ số nào.
 * Giá trị thiếu hoặc mẫu số 0 hiện "Chưa có"/"Chưa đủ dữ liệu", không bao giờ "0%".
 */
@Component({
  selector: 'app-denominator-block',
  templateUrl: './denominator-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenominatorBlockComponent {
  readonly value = input<IAggregateDenominator | null | undefined>();
  readonly heading = input('Mẫu số và tỷ lệ đạt');

  protected readonly countItems = computed<ICountItem[]>(() => {
    const counts = this.value()?.counts;
    return COUNT_LABELS.map(([key, label]) => ({ key, label, text: formatCount(counts?.[key]) }));
  });

  protected readonly rateItems = computed<IRateItem[]>(() => {
    const value = this.value();
    const counts = value?.counts;
    const passed = formatCount(counts?.passed);
    const evaluable = formatCount(counts?.evaluable);
    const enrolled = formatCount(counts?.enrolled);
    return [
      {
        key: 'passRate',
        label: 'Tỷ lệ đạt trên số có đủ dữ liệu',
        basis: `đạt ${passed} / đủ dữ liệu ${evaluable}`,
        ...displayRate(value?.passRate, counts?.evaluable, PLACEHOLDER.INSUFFICIENT),
      },
      {
        key: 'passRateOfEnrolled',
        label: 'Tỷ lệ đạt trên số ghi danh',
        basis: `đạt ${passed} / ghi danh ${enrolled}`,
        ...displayRate(value?.passRateOfEnrolled, counts?.enrolled, PLACEHOLDER.NONE),
      },
      {
        key: 'dataCompleteness',
        label: 'Độ đầy đủ dữ liệu',
        basis: `đủ dữ liệu ${evaluable} / ghi danh ${enrolled}`,
        ...displayRate(value?.dataCompleteness, counts?.enrolled, PLACEHOLDER.NONE),
      },
    ];
  });
}

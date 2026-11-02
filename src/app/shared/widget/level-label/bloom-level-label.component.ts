import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BLOOM_LEVEL_SCALE } from '@constants/measurement-display.constant';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { BLOOM_KIND, describeLevel } from './level-label.util';

/** Nhãn mức Bloom (1–6) của nhiệm vụ. Chỉ là phân loại, không phải điểm và không quy đổi sang rubric. */
@Component({
  selector: 'app-bloom-level-label',
  imports: [StatusChipComponent],
  template: `<app-status-chip [label]="display().label" [description]="display().description" [icon]="display().icon"
    [tone]="display().tone" [lineStyle]="display().lineStyle" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BloomLevelLabelComponent {
  readonly level = input<number | null | undefined>();
  protected readonly display = computed(() => describeLevel(BLOOM_KIND, BLOOM_LEVEL_SCALE, this.level()));
}

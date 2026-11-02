import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RUBRIC_LEVEL_SCALE } from '@constants/measurement-display.constant';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { describeLevel, RUBRIC_KIND } from './level-label.util';

/** Nhãn mức rubric (1–4) của sinh viên ở một tiêu chí. Khác Bloom về nhãn, biểu tượng, màu và kiểu viền. */
@Component({
  selector: 'app-rubric-level-label',
  imports: [StatusChipComponent],
  template: `<app-status-chip [label]="display().label" [description]="display().description" [icon]="display().icon"
    [tone]="display().tone" [lineStyle]="display().lineStyle" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubricLevelLabelComponent {
  readonly level = input<number | null | undefined>();
  protected readonly display = computed(() => describeLevel(RUBRIC_KIND, RUBRIC_LEVEL_SCALE, this.level()));
}

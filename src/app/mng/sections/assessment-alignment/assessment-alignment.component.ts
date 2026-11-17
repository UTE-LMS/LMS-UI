import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ASSESSMENT_STATUS_DISPLAY, ASSESSMENT_TYPE_LABEL } from '@constants/assessment-display.constant';
import { UrlConstant } from '@constants/url.constant';
import {
  AlignmentWarning, AssessmentType, IAssessmentAlignmentResponse, ICloAlignment,
} from '@models/assessment/assessment.model';
import { IUserError } from '@models/common/user-error.model';
import { ISection } from '@models/course/section.model';
import { toUserError } from '@services/common/api-error.util';
import { SectionService } from '@services/course/section.service';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { catchError, of } from 'rxjs';

export interface IAlignmentWarningMeta {
  label: string;
  description: string;
  color: string;
}

export const ALIGNMENT_WARNING_META: Record<AlignmentWarning, IAlignmentWarningMeta> = {
  NOT_ASSESSED: {
    label: 'Chưa có câu hỏi',
    description: 'CLO chưa có câu hỏi nào trong các bài của lớp.',
    color: 'orange',
  },
  WEIGHT_NOT_FULL: {
    label: 'Chưa đủ 100% tỷ lệ',
    description: 'Tổng tỷ lệ đóng góp các bài chưa bằng 100%. (Giữa học kỳ khi chưa đủ bài thì cảnh báo này là bình thường.)',
    color: 'gold',
  },
  BLOOM_BELOW_CLO: {
    label: 'Gợi ý: Bloom thấp hơn CLO',
    description: 'Gợi ý: mức Bloom cao nhất của câu hỏi thấp hơn mức Bloom của CLO (quy tắc đề xuất chưa được GVHD xác nhận).',
    color: 'blue',
  },
  BLOOM_UNDECLARED: {
    label: 'Chưa khai báo Bloom',
    description: 'Câu hỏi hoặc CLO chưa khai báo mức Bloom.',
    color: 'default',
  },
};

@Component({
  selector: 'app-assessment-alignment',
  templateUrl: './assessment-alignment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe, FormsModule, RouterLink,
    NzButtonModule, NzCheckboxModule, NzSelectModule, NzTableModule, NzTagModule,
    BloomLevelLabelComponent, DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent,
  ],
})
export class AssessmentAlignmentComponent implements OnInit {
  private readonly sectionSvc = inject(SectionService);
  private readonly router = inject(Router);

  readonly sectionId = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = ASSESSMENT_STATUS_DISPLAY;
  protected readonly warningMeta = ALIGNMENT_WARNING_META;

  readonly sections = signal<ISection[]>([]);
  readonly alignment = signal<IAssessmentAlignmentResponse | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly onlyWarnings = signal(false);

  readonly visibleClos = computed<ICloAlignment[]>(() => {
    const clos = this.alignment()?.clos ?? [];
    return this.onlyWarnings() ? clos.filter(c => c.warnings.length > 0) : clos;
  });

  constructor() {
    effect(() => {
      const id = this.sectionId();
      if (id) {
        this.loadAlignment(id);
      }
    });
  }

  ngOnInit(): void {
    this.sectionSvc.getSections().pipe(catchError(() => of([] as ISection[]))).subscribe(list => {
      this.sections.set(list ?? []);
    });
  }

  load(): void {
    this.loadAlignment(this.sectionId());
  }

  private loadAlignment(sectionId: string): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.sectionSvc.getAssessmentAlignment(sectionId).subscribe({
      next: res => {
        this.alignment.set(res);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  onSectionChange(newSectionId: string): void {
    if (newSectionId && newSectionId !== this.sectionId()) {
      void this.router.navigateByUrl(this.urlConst.SECTION_ASSESSMENT_ALIGNMENT(newSectionId));
    }
  }

  typeLabel(type: string): string {
    return ASSESSMENT_TYPE_LABEL[type as AssessmentType] ?? type;
  }

  barWidth(percentage: number | null | undefined): number {
    if (percentage === null || percentage === undefined) {
      return 0;
    }
    return Math.max(0, Math.min(100, percentage));
  }
}

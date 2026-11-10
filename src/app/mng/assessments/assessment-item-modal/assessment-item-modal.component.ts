import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BLOOM_LEVEL_OPTIONS, ITEM_KIND_LABEL } from '@constants/assessment-display.constant';
import { IAssessmentItem, IRubricLevel, ItemKind } from '@models/assessment/assessment.model';
import { IClo } from '@models/course/clo.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { cleanOptional, formatNumber, hasDuplicates, nextItemCode, sumWeights, weightSumMatches } from '../assessments.util';

const CODE_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
const RUBRIC_LEVELS = [1, 2, 3, 4] as const;

/**
 * Modal thêm/sửa một câu hỏi hoặc tiêu chí của bài đánh giá (F04 US-15, US-16). Chỉ sửa danh sách trong bộ nhớ
 * của màn hình cha; cấu trúc chỉ được ghi khi người dùng bấm "Lưu cấu trúc" (PUT items thay toàn bộ).
 * - Mỗi phần tử đo ≥ 1 CLO, phần điểm trong (0, 1], tổng bằng 1, không trùng CLO (ADR 0011). PI không khai báo ở đây.
 * - Rubric mức 1–4 TÁCH KHỎI mức Bloom 1–6: hai trường độc lập, nhãn khác nhau.
 * Các kiểm tra ở đây chỉ để phản hồi nhanh; backend kiểm tra lại và quyết định (422).
 */
@Component({
  selector: 'app-assessment-item-modal',
  templateUrl: './assessment-item-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, NzModalModule, NzButtonModule, NzSelectModule],
})
export class AssessmentItemModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly isVisible = input(false);
  /** null: thêm mới; có giá trị: sửa phần tử đó (giữ nguyên `id`). */
  readonly item = input<IAssessmentItem | null>(null);
  readonly clos = input<IClo[]>([]);
  /** Mã của các phần tử khác trong bài, để báo trùng mã. */
  readonly otherCodes = input<string[]>([]);
  readonly disabled = input(false);

  readonly visibleChange = output<boolean>();
  readonly saved = output<IAssessmentItem>();

  protected readonly bloomOptions = BLOOM_LEVEL_OPTIONS;
  protected readonly kindOptions: { value: ItemKind; label: string; }[] = [
    { value: 'QUESTION', label: ITEM_KIND_LABEL.QUESTION },
    { value: 'CRITERION', label: ITEM_KIND_LABEL.CRITERION },
  ];
  protected readonly rubricLevels = RUBRIC_LEVELS;
  protected readonly formatNumber = formatNumber;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(CODE_PATTERN)]],
    title: ['', [Validators.maxLength(300)]],
    kind: this.fb.control<ItemKind>('QUESTION'),
    maxScore: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    bloomLevel: [null as number | null],
    topic: ['', [Validators.maxLength(200)]],
    externalRef: ['', [Validators.maxLength(100)]],
    mappings: this.fb.array([this.newMapping()]),
    rubric: this.fb.array(RUBRIC_LEVELS.map(level => this.newRubricRow(level))),
  });

  readonly attempted = signal(false);
  /** Phần tử đang sửa đã có rubric: vẫn hiện ô rubric dù loại là Câu hỏi để không làm mất dữ liệu âm thầm. */
  private readonly hadRubric = signal(false);

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly showRubric = computed(() => this.values().kind === 'CRITERION' || this.hadRubric());

  readonly weightSum = computed(() => sumWeights((this.values().mappings ?? []).map(m => ({ weight: m.weight ?? null }))));

  readonly weightSumInvalid = computed(() => !weightSumMatches(this.weightSum()));

  /** Các lỗi gợi ý theo thứ tự đọc; rỗng nghĩa là có thể lưu. Backend vẫn kiểm tra lại. */
  readonly issues = computed<string[]>(() => {
    const v = this.values();
    const issues: string[] = [];
    const code = (v.code ?? '').trim();
    if (!code) {
      issues.push('Nhập mã phần tử.');
    } else if (!CODE_PATTERN.test(code)) {
      issues.push('Mã phần tử chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới (1–40 ký tự).');
    } else if (this.otherCodes().some(c => c.toLowerCase() === code.toLowerCase())) {
      issues.push(`Mã ${code} đã dùng cho phần tử khác trong bài.`);
    }
    if (typeof v.maxScore !== 'number' || v.maxScore <= 0) {
      issues.push('Điểm tối đa phải lớn hơn 0.');
    }
    const mappings = v.mappings ?? [];
    if (mappings.length === 0 || mappings.some(m => !m.cloId)) {
      issues.push('Mỗi phần tử phải đo ít nhất một CLO: chọn CLO cho mọi dòng.');
    }
    if (hasDuplicates(mappings.map(m => m.cloId ?? '').filter(id => id !== ''))) {
      issues.push('Một CLO chỉ được khai báo một lần trong cùng phần tử.');
    }
    if (mappings.some(m => typeof m.weight !== 'number' || m.weight <= 0 || m.weight > 1)) {
      issues.push('Phần điểm của mỗi CLO phải lớn hơn 0 và không quá 1.');
    } else if (!weightSumMatches(this.weightSum())) {
      issues.push(`Tổng phần điểm là ${formatNumber(this.weightSum())}, cần bằng 1.`);
    }
    if (this.showRubric()) {
      const max = typeof v.maxScore === 'number' ? v.maxScore : Number.POSITIVE_INFINITY;
      for (const row of v.rubric ?? []) {
        if (typeof row.score === 'number' && row.score > max) {
          issues.push(`Điểm của mức rubric ${row.level} vượt điểm tối đa ${formatNumber(max)}.`);
        }
        if (typeof row.score === 'number' && row.score < 0) {
          issues.push(`Điểm của mức rubric ${row.level} không được âm.`);
        }
        if (cleanOptional(row.description) && typeof row.score !== 'number') {
          issues.push(`Mức rubric ${row.level} có mô tả nhưng thiếu điểm.`);
        }
      }
    }
    return issues;
  });

  constructor() {
    effect(() => {
      if (this.isVisible()) {
        const current = this.item();
        untracked(() => this.reset(current));
      }
    });
  }

  protected get mappings() {
    return this.form.controls.mappings;
  }

  protected get rubric() {
    return this.form.controls.rubric;
  }

  addMapping(): void {
    this.mappings.push(this.newMapping());
  }

  removeMapping(index: number): void {
    if (this.mappings.length > 1) {
      this.mappings.removeAt(index);
    }
  }

  handleCancel(): void {
    this.visibleChange.emit(false);
  }

  save(): void {
    this.attempted.set(true);
    if (this.disabled() || this.issues().length > 0) {
      return;
    }
    const v = this.form.getRawValue();
    const rubricLevels: IRubricLevel[] = this.showRubric()
      ? v.rubric
        .filter(row => typeof row.score === 'number')
        .map(row => ({ level: row.level, score: row.score as number, description: cleanOptional(row.description) }))
      : [];
    const current = this.item();
    const result: IAssessmentItem = {
      ...(current?.id ? { id: current.id } : {}),
      code: v.code.trim(),
      title: cleanOptional(v.title),
      kind: v.kind,
      maxScore: v.maxScore as number,
      bloomLevel: v.bloomLevel,
      topic: cleanOptional(v.topic),
      externalRef: cleanOptional(v.externalRef),
      outcomeMappings: v.mappings.map(m => ({ cloId: m.cloId, weight: m.weight as number })),
      rubric: rubricLevels.length > 0 ? { levels: rubricLevels } : undefined,
    };
    this.saved.emit(result);
    this.visibleChange.emit(false);
  }

  private reset(current: IAssessmentItem | null): void {
    this.attempted.set(false);
    this.hadRubric.set(!!current?.rubric?.levels?.length);
    this.mappings.clear();
    const mappings = current?.outcomeMappings?.length ? current.outcomeMappings : [{ cloId: '', weight: null }];
    mappings.forEach(m => this.mappings.push(this.newMapping(m.cloId, m.weight)));
    this.rubric.controls.forEach(row => {
      const found = current?.rubric?.levels?.find(l => l.level === row.controls.level.value);
      row.patchValue({ description: found?.description ?? '', score: found?.score ?? null });
    });
    this.form.patchValue({
      code: current?.code ?? nextItemCode(this.otherCodes()),
      title: current?.title ?? '',
      kind: current?.kind ?? 'QUESTION',
      maxScore: current?.maxScore ?? null,
      bloomLevel: current?.bloomLevel ?? null,
      topic: current?.topic ?? '',
      externalRef: current?.externalRef ?? '',
    });
    this.form.markAsPristine();
    // Bài đã khóa: mở để xem, mọi ô bị vô hiệu hóa (đặt sau khi nạp để issues() vẫn đọc đủ giá trị)
    if (this.disabled()) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  private newMapping(cloId = '', weight: number | null = null) {
    return this.fb.group({
      cloId: [cloId, [Validators.required]],
      weight: [weight, [Validators.required, Validators.min(0.0001), Validators.max(1)]],
    });
  }

  private newRubricRow(level: number) {
    return this.fb.group({
      level: [level],
      description: ['', [Validators.maxLength(500)]],
      score: [null as number | null, [Validators.min(0)]],
    });
  }
}

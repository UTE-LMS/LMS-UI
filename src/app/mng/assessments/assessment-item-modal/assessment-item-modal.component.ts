import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BLOOM_LEVEL_OPTIONS } from '@constants/assessment-display.constant';
import { IAssessmentItem } from '@models/assessment/assessment.model';
import { IClo } from '@models/course/clo.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { formatNumber, hasDuplicates, nextItemCode, sumOutcomeScores } from '../assessments.util';

const CODE_PATTERN = /^[A-Za-z0-9._ -]{1,40}$/;

/**
 * Modal thêm/sửa một câu hỏi của bài đánh giá (ADR 0014, Schema v0.7).
 * - Mỗi câu hỏi đo ≥ 1 CLO, điểm tối đa maxScore > 0 cho từng CLO.
 * - Mức Bloom 1–6 (bắt buộc).
 * - Rubric đã được loại bỏ hoàn toàn theo ADR 0014.
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
  /** null: thêm mới; có giá trị: sửa câu hỏi đó (giữ nguyên `id`). */
  readonly item = input<IAssessmentItem | null>(null);
  readonly clos = input<IClo[]>([]);
  /** Mã của các câu hỏi khác trong bài, để báo trùng mã. */
  readonly otherCodes = input<string[]>([]);
  readonly disabled = input(false);

  readonly visibleChange = output<boolean>();
  readonly saved = output<IAssessmentItem>();

  protected readonly bloomOptions = BLOOM_LEVEL_OPTIONS;
  protected readonly formatNumber = formatNumber;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(CODE_PATTERN)]],
    bloomLevel: [null as number | null, [Validators.required, Validators.min(1), Validators.max(6)]],
    mappings: this.fb.array([this.newMapping()]),
  });

  readonly attempted = signal(false);

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  get mappings() {
    return this.form.controls.mappings;
  }

  readonly duplicateCode = computed(() => {
    const raw = this.values().code?.trim().toLowerCase();
    if (!raw) {
      return false;
    }
    const target = this.item()?.code.trim().toLowerCase();
    return this.otherCodes().map(c => c.trim().toLowerCase()).some(c => c === raw && c !== target);
  });

  readonly totalItemScore = computed(() => {
    const m = (this.values().mappings ?? []).map(r => ({ maxScore: r.maxScore ?? null }));
    return sumOutcomeScores(m);
  });

  readonly duplicateClo = computed(() => {
    const ids = (this.values().mappings ?? []).map(r => r.cloId).filter((id): id is string => Boolean(id));
    return hasDuplicates(ids);
  });

  readonly hasMissingCloOrScore = computed(() => {
    const m = this.values().mappings ?? [];
    if (m.length === 0) return true;
    return m.some(row => !row.cloId || typeof row.maxScore !== 'number' || row.maxScore <= 0);
  });

  constructor() {
    effect(() => {
      const visible = this.isVisible();
      const current = this.item();
      const codes = this.otherCodes();
      const cloList = this.clos();
      if (!visible) {
        untracked(() => this.attempted.set(false));
        return;
      }
      untracked(() => {
        this.attempted.set(false);
        if (current) {
          this.form.reset({
            code: current.code,
            bloomLevel: current.bloomLevel,
          });
          this.mappings.clear();
          for (const m of current.outcomeMappings) {
            this.mappings.push(this.newMapping(m.cloId, m.maxScore));
          }
          if (this.mappings.length === 0) {
            this.mappings.push(this.newMapping());
          }
        } else {
          this.form.reset({
            code: nextItemCode(codes),
            bloomLevel: 3,
          });
          this.mappings.clear();
          const firstCloId = cloList[0]?.id ?? '';
          this.mappings.push(this.newMapping(firstCloId, 1.0));
        }
      });
    });
  }

  addMapping(): void {
    const existing = new Set(this.mappings.controls.map(c => c.controls.cloId.value));
    const nextClo = this.clos().find(c => !existing.has(c.id));
    this.mappings.push(this.newMapping(nextClo?.id ?? '', 1.0));
  }

  removeMapping(index: number): void {
    if (this.mappings.length <= 1) {
      return;
    }
    this.mappings.removeAt(index);
  }

  handleCancel(): void {
    this.visibleChange.emit(false);
  }

  handleSave(): void {
    this.attempted.set(true);
    if (this.disabled()) {
      return;
    }
    if (this.form.invalid || this.duplicateCode() || this.duplicateClo() || this.hasMissingCloOrScore()) {
      return;
    }
    const raw = this.form.getRawValue();
    const outcomeMappings = raw.mappings.map(m => ({
      cloId: m.cloId,
      maxScore: Number(m.maxScore),
    }));

    const result: IAssessmentItem = {
      ...(this.item()?.id ? { id: this.item()!.id } : {}),
      code: raw.code.trim(),
      orderIndex: this.item()?.orderIndex ?? null,
      bloomLevel: Number(raw.bloomLevel),
      outcomeMappings,
    };

    this.saved.emit(result);
    this.visibleChange.emit(false);
  }

  private newMapping(cloId = '', maxScore: number | null = null) {
    return this.fb.group({
      cloId: [cloId, [Validators.required]],
      maxScore: [maxScore, [Validators.required, Validators.min(0.01)]],
    });
  }
}

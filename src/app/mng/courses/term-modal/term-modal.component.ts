import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ITerm, ITermRequest, ITermUpdateRequest } from '@models/course/term.model';
import { toApiError } from '@services/common/api-error.util';
import { TermService } from '@services/course/term.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string | null;
  const end = group.get('endDate')?.value as string | null;
  if (start && end && new Date(start).getTime() > new Date(end).getTime()) {
    return { dateRangeInvalid: true };
  }
  return null;
}

/**
 * Modal Thêm / Sửa Học kỳ (F05a US-18, phục vụ mốc hiệu lực đề cương F03 US-10).
 */
@Component({
  selector: 'app-term-modal',
  template: `
    <nz-modal
      [nzVisible]="isVisible()"
      [nzTitle]="editingTerm() ? 'Cập nhật thông tin học kỳ' : 'Thêm học kỳ mới'"
      [nzFooter]="modalFooterTpl"
      [nzWidth]="520"
      (nzOnCancel)="handleCancel()"
      (nzVisibleChange)="onVisibleChange($event)"
    >
      <ng-container *nzModalContent>
        <form [formGroup]="termForm" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired nzFor="termCode">Mã học kỳ</nz-form-label>
            <nz-form-control nzErrorTip="Mã học kỳ từ 2–30 ký tự (chữ, số, gạch ngang, gạch dưới)">
              <input
                nz-input
                id="termCode"
                formControlName="code"
                placeholder="Ví dụ: 2026-HK1, 2026-HK2..."
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzFor="academicYear">Năm học</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                id="academicYear"
                formControlName="academicYear"
                placeholder="Ví dụ: 2026-2027"
              />
            </nz-form-control>
          </nz-form-item>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <nz-form-item>
              <nz-form-label nzFor="startDate">Ngày bắt đầu</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  type="date"
                  id="startDate"
                  formControlName="startDate"
                />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzFor="endDate">Ngày kết thúc</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  type="date"
                  id="endDate"
                  formControlName="endDate"
                />
              </nz-form-control>
            </nz-form-item>
          </div>

          @if (termForm.hasError('dateRangeInvalid')) {
          <div class="text-rose-600 text-xs mt-1" role="alert">
            Ngày kết thúc học kỳ không được trước ngày bắt đầu (US-18/AC-1).
          </div>
          }
        </form>
      </ng-container>

      <ng-template #modalFooterTpl>
        <div class="flex items-center justify-end gap-2.5">
          <button
            nz-button
            nzType="default"
            type="button"
            [disabled]="isSubmitting()"
            (click)="handleCancel()"
          >
            Hủy
          </button>
          <button
            nz-button
            nzType="primary"
            type="button"
            [nzLoading]="isSubmitting()"
            [disabled]="isSubmitting()"
            (click)="submitTerm()"
          >
            {{ editingTerm() ? 'Lưu thay đổi' : 'Tạo học kỳ' }}
          </button>
        </div>
      </ng-template>
    </nz-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
  ],
})
export class TermModalComponent {
  private readonly termSvc = inject(TermService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);

  readonly isVisible = input<boolean>(false);
  readonly editingTerm = input<ITerm | null>(null);

  readonly visibleChange = output<boolean>();
  readonly savedSuccess = output<ITerm>();

  readonly isSubmitting = signal(false);

  readonly termForm: FormGroup = this.fb.group(
    {
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{2,30}$/)]],
      academicYear: [''],
      startDate: [''],
      endDate: [''],
    },
    { validators: [dateRangeValidator] },
  );

  constructor() {
    effect(() => {
      const visible = this.isVisible();
      const current = this.editingTerm();
      if (visible) {
        untracked(() => {
          if (current) {
            this.termForm.reset({
              code: current.code,
              academicYear: current.academicYear ?? '',
              startDate: current.startDate ? current.startDate.slice(0, 10) : '',
              endDate: current.endDate ? current.endDate.slice(0, 10) : '',
            });
            this.termForm.get('code')?.disable();
          } else {
            this.termForm.reset({
              code: '',
              academicYear: '',
              startDate: '',
              endDate: '',
            });
            this.termForm.get('code')?.enable();
          }
        });
      }
    });
  }

  onVisibleChange(visible: boolean): void {
    if (!visible && this.isVisible()) {
      this.visibleChange.emit(false);
    }
  }

  handleCancel(): void {
    this.visibleChange.emit(false);
  }

  submitTerm(): void {
    if (this.termForm.invalid) {
      Object.values(this.termForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const raw = this.termForm.getRawValue() as {
      code: string;
      academicYear: string;
      startDate: string;
      endDate: string;
    };
    const startIso = raw.startDate ? `${raw.startDate}T00:00:00Z` : undefined;
    const endIso = raw.endDate ? `${raw.endDate}T23:59:59Z` : undefined;
    const yearTrimmed = raw.academicYear?.trim() || undefined;

    this.isSubmitting.set(true);
    const current = this.editingTerm();

    if (current) {
      const updatePayload: ITermUpdateRequest = {
        academicYear: yearTrimmed,
        startDate: startIso,
        endDate: endIso,
      };
      this.termSvc.updateTerm(current.id, updatePayload).subscribe({
        next: saved => {
          this.isSubmitting.set(false);
          this.alert.success('Cập nhật học kỳ thành công');
          this.visibleChange.emit(false);
          this.savedSuccess.emit(saved);
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể cập nhật học kỳ');
        },
      });
    } else {
      const createPayload: ITermRequest = {
        code: raw.code.trim().toUpperCase(),
        academicYear: yearTrimmed,
        startDate: startIso,
        endDate: endIso,
      };
      this.termSvc.createTerm(createPayload).subscribe({
        next: saved => {
          this.isSubmitting.set(false);
          this.alert.success('Tạo học kỳ mới thành công');
          this.visibleChange.emit(false);
          this.savedSuccess.emit(saved);
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể tạo học kỳ');
        },
      });
    }
  }
}

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
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ICourse, ICourseRequest, ICourseUpdateRequest } from '@models/course/course.model';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';

/**
 * Modal Thêm / Sửa Học phần trong Kho cấp trường (F03 US-09/AC-1, ADR 0010 - chỉ dành cho ADMIN).
 */
@Component({
  selector: 'app-course-modal',
  template: `
    <nz-modal
      [nzVisible]="isVisible()"
      [nzTitle]="editingCourse() ? 'Cập nhật học phần cấp trường' : 'Thêm học phần mới vào kho trường'"
      [nzFooter]="modalFooterTpl"
      [nzWidth]="520"
      (nzOnCancel)="handleCancel()"
      (nzVisibleChange)="onVisibleChange($event)"
    >
      <ng-container *nzModalContent>
        <form [formGroup]="courseForm" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired nzFor="courseCode">Mã học phần</nz-form-label>
            <nz-form-control nzErrorTip="Mã học phần bắt buộc, tối đa 64 ký tự (chữ, số, dấu gạch dưới, gạch ngang, dấu chấm)">
              <input
                nz-input
                id="courseCode"
                formControlName="code"
                placeholder="Ví dụ: OOPR230279, APCM220307..."
              />
              <small class="text-xs text-slate-500 mt-1 block">
                {{ editingCourse() ? 'Mã học phần là định danh bất biến sau khi khởi tạo.' : 'Định dạng chuẩn Phòng Đào tạo, duy nhất toàn trường.' }}
              </small>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired nzFor="courseName">Tên học phần</nz-form-label>
            <nz-form-control nzErrorTip="Tên học phần không được để trống (tối đa 255 ký tự)">
              <input
                nz-input
                id="courseName"
                formControlName="name"
                placeholder="Ví dụ: Lập trình hướng đối tượng..."
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzFor="courseCredits">Số tín chỉ chuẩn</nz-form-label>
            <nz-form-control nzErrorTip="Số tín chỉ phải là số nguyên không âm">
              <input
                nz-input
                type="number"
                min="0"
                step="1"
                id="courseCredits"
                formControlName="credits"
                placeholder="Để trống nếu chưa quy định (không tự gán 0)"
              />
            </nz-form-control>
          </nz-form-item>
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
            (click)="submitCourse()"
          >
            {{ editingCourse() ? 'Lưu thay đổi' : 'Thêm học phần' }}
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
export class CourseModalComponent {
  private readonly courseSvc = inject(CourseService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);

  readonly isVisible = input<boolean>(false);
  readonly editingCourse = input<ICourse | null>(null);

  readonly visibleChange = output<boolean>();
  readonly savedSuccess = output<ICourse>();

  readonly isSubmitting = signal(false);

  readonly courseForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(64), Validators.pattern(/^[A-Za-z0-9_.-]+$/)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    credits: [null as number | null, [Validators.min(0)]],
  });

  constructor() {
    effect(() => {
      const visible = this.isVisible();
      const current = this.editingCourse();
      if (visible) {
        untracked(() => {
          if (current) {
            this.courseForm.reset({
              code: current.code,
              name: current.name,
              credits: current.credits ?? null,
            });
            this.courseForm.get('code')?.disable();
          } else {
            this.courseForm.reset({
              code: '',
              name: '',
              credits: null,
            });
            this.courseForm.get('code')?.enable();
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

  submitCourse(): void {
    if (this.courseForm.invalid) {
      Object.values(this.courseForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const raw = this.courseForm.getRawValue() as {
      code: string;
      name: string;
      credits: number | string | null;
    };
    const parsedCredits =
      raw.credits !== null && raw.credits !== '' && raw.credits !== undefined
        ? Number(raw.credits)
        : undefined;

    this.isSubmitting.set(true);
    const current = this.editingCourse();

    if (current) {
      const updatePayload: ICourseUpdateRequest = {
        name: raw.name.trim(),
        credits: parsedCredits,
      };
      this.courseSvc.updateCourse(current.id, updatePayload).subscribe({
        next: saved => {
          this.isSubmitting.set(false);
          this.alert.success('Cập nhật học phần thành công');
          this.visibleChange.emit(false);
          this.savedSuccess.emit(saved);
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể cập nhật học phần');
        },
      });
    } else {
      const createPayload: ICourseRequest = {
        code: raw.code.trim().toUpperCase(),
        name: raw.name.trim(),
        credits: parsedCredits,
      };
      this.courseSvc.createCourse(createPayload).subscribe({
        next: saved => {
          this.isSubmitting.set(false);
          this.alert.success('Thêm học phần mới thành công');
          this.visibleChange.emit(false);
          this.savedSuccess.emit(saved);
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể thêm học phần');
        },
      });
    }
  }
}

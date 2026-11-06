import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { VerificationStatus } from '@models/program/program-verification.model';
import { ProgramVerificationService } from '@services/program/program-verification.service';
import { toApiError } from '@services/common/api-error.util';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { ToastrService } from 'ngx-toastr';

/**
 * Modal Thẩm định ĐBCL (US-08, ADR 0004) dành riêng cho QA_OFFICER.
 */
@Component({
  selector: 'app-verification-action-modal',
  template: `
    <nz-modal
      [nzVisible]="isVisible()"
      nzTitle="Thẩm định Chuẩn đầu ra & CTĐT (QA Officer)"
      (nzOnCancel)="handleCancel()"
      (nzOnOk)="submitVerification()"
      [nzOkLoading]="isSubmitting()"
      nzOkText="Xác nhận thẩm định"
      nzCancelText="Hủy"
    >
      <ng-container *nzModalContent>
        <form [formGroup]="verifyForm" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Kết luận thẩm định</nz-form-label>
            <nz-form-control>
              <nz-radio-group formControlName="status" class="flex flex-col gap-2">
                <label nz-radio nzValue="VERIFIED" class="text-green-700 font-medium">
                  ĐÃ XÁC NHẬN (Đạt yêu cầu đối chiếu tài liệu gốc)
                </label>
                <label nz-radio nzValue="NEEDS_CLARIFICATION" class="text-amber-700 font-medium">
                  CẦN LÀM RÕ (Yêu cầu Ban biên soạn bổ sung / giải trình)
                </label>
                <label nz-radio nzValue="UNVERIFIED" class="text-slate-600">
                  CHƯA XÁC NHẬN (Trả về trạng thái chờ thẩm định)
                </label>
              </nz-radio-group>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzFor="note">Ghi chú / Nhận xét thẩm định</nz-form-label>
            <nz-form-control nzErrorTip="Ghi chú tối đa 2000 ký tự">
              <textarea
                nz-input
                id="note"
                formControlName="note"
                rows="4"
                placeholder="Nhập nhận xét về nội dung PLO/PI hoặc yêu cầu điều chỉnh..."
              ></textarea>
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>
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
    NzRadioModule,
  ],
})
export class VerificationActionModalComponent {
  private readonly verifySvc = inject(ProgramVerificationService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);

  readonly versionId = input.required<string>();
  readonly isVisible = input<boolean>(false);
  readonly currentStatus = input<VerificationStatus>('UNVERIFIED');
  readonly currentNote = input<string>('');

  readonly visibleChange = output<boolean>();
  readonly verifiedSuccess = output<void>();

  readonly isSubmitting = signal(false);

  verifyForm: FormGroup = this.fb.group({
    status: ['VERIFIED', [Validators.required]],
    note: ['', [Validators.maxLength(2000)]],
  });

  handleCancel(): void {
    this.visibleChange.emit(false);
  }

  submitVerification(): void {
    if (this.verifyForm.invalid) {
      return;
    }

    const formVal = this.verifyForm.getRawValue() as { status: VerificationStatus; note?: string | null; };
    const noteTrimmed = formVal.note ? formVal.note.trim() : undefined;
    this.isSubmitting.set(true);

    this.verifySvc
      .verifyVersion(this.versionId(), {
        status: formVal.status,
        note: noteTrimmed,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.alert.success('Cập nhật kết quả thẩm định ĐBCL thành công');
          this.visibleChange.emit(false);
          this.verifiedSuccess.emit();
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể cập nhật thẩm định');
        },
      });
  }
}

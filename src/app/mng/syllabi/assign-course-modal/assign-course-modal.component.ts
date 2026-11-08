import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { IUser } from '@models/user/user.model';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ToastrService } from 'ngx-toastr';

/**
 * Modal Trưởng bộ môn (DEPARTMENT_HEAD) phân công / gỡ phân công học phần cho Giảng viên
 * thuộc phạm vi Khoa/Ngành (scope.programIds) theo ADR 0010 (Thu hồi quyền ADMIN).
 */
@Component({
  selector: 'app-assign-course-modal',
  template: `
    <nz-modal
      [nzVisible]="isVisible()"
      (nzVisibleChange)="onVisibleChange($event)"
      nzTitle="Phân công Giảng viên biên soạn Đề cương (ADR 0010)"
      [nzWidth]="560"
      (nzOnCancel)="handleCancel()"
      (nzOnOk)="submitAssignment()"
      [nzOkLoading]="isSubmitting()"
      nzOkText="Thực hiện"
      nzCancelText="Đóng"
    >
      <ng-container *nzModalContent>
        <div class="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
          <div><strong>Học phần:</strong> {{ course()?.code }} — {{ course()?.name }}</div>
          <div class="mt-1 text-blue-700">
            Danh sách chỉ hiển thị các Giảng viên (LECTURER) thuộc cùng phạm vi Khoa/Ngành
            (<code>scope.programIds</code>) với Bộ môn.
          </div>
        </div>

        <form [formGroup]="assignForm" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Thao tác phân quyền biên soạn</nz-form-label>
            <nz-form-control>
              <nz-radio-group formControlName="mode" class="flex flex-col gap-2">
                <label nz-radio nzValue="ASSIGN" class="font-medium text-emerald-700">
                  Cấp quyền biên soạn đề cương & CLO cho Giảng viên (assign-course)
                </label>
                <label nz-radio nzValue="UNASSIGN" class="font-medium text-rose-700">
                  Thu hồi quyền biên soạn học phần khỏi Giảng viên (unassign-course)
                </label>
              </nz-radio-group>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired nzFor="lecturerSelect">
              Chọn Giảng viên trong Bộ môn / Khoa ({{ lecturers().length }} giảng viên)
            </nz-form-label>
            <nz-form-control nzErrorTip="Vui lòng chọn Giảng viên cần phân công hoặc thu hồi quyền">
              <nz-select
                id="lecturerSelect"
                class="w-full"
                nzShowSearch
                nzAllowClear
                [nzLoading]="isLoadingLecturers()"
                nzPlaceHolder="Tìm theo họ tên, username hoặc email giảng viên..."
                formControlName="lecturerId"
              >
                @for (lec of lecturers(); track lec.id) {
                <nz-option
                  [nzValue]="lec.id"
                  [nzLabel]="formatLecturerLabel(lec)"
                />
                }
              </nz-select>
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
    NzSelectModule,
  ],
})
export class AssignCourseModalComponent {
  private readonly courseSvc = inject(CourseService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);

  readonly isVisible = input<boolean>(false);
  readonly course = input<ICourse | null>(null);
  readonly canLoadUsers = input<boolean>(true);

  readonly visibleChange = output<boolean>();
  readonly assignedSuccess = output<IUser>();

  readonly lecturers = signal<IUser[]>([]);
  readonly isLoadingLecturers = signal(false);
  readonly isSubmitting = signal(false);

  readonly assignForm: FormGroup = this.fb.group({
    mode: ['ASSIGN', [Validators.required]],
    lecturerId: ['', [Validators.required, Validators.pattern(SystemConstant.OBJECT_ID_REGEX)]],
  });

  constructor() {
    effect(() => {
      const visible = this.isVisible();
      const currentCourse = this.course();
      if (visible && this.canLoadUsers()) {
        this.assignForm.reset({
          mode: 'ASSIGN',
          lecturerId: '',
        });
        this.loadLecturers(currentCourse?.id);
      }
    });
  }

  private loadLecturers(courseId?: string): void {
    this.isLoadingLecturers.set(true);
    this.courseSvc.getDepartmentLecturers(courseId).subscribe({
      next: list => {
        this.lecturers.set(list || []);
        this.isLoadingLecturers.set(false);
      },
      error: () => {
        this.lecturers.set([]);
        this.isLoadingLecturers.set(false);
      },
    });
  }

  isAssignedToCurrentCourse(lec: IUser): boolean {
    const cid = this.course()?.id;
    if (!cid) {
      return false;
    }
    return (
      lec.roleAssignments?.some(
        r => r.role === SystemConstant.ROLE.LECTURER && (r.scope?.courseIds ?? []).includes(cid),
      ) ?? false
    );
  }

  formatLecturerLabel(lec: IUser): string {
    const statusTag = this.isAssignedToCurrentCourse(lec) ? ' [Đã phân công môn này]' : '';
    return `${lec.fullName} (${lec.username} - ${lec.email})${statusTag}`;
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.visibleChange.emit(false);
    }
  }

  handleCancel(): void {
    this.visibleChange.emit(false);
  }

  submitAssignment(): void {
    const selectedCourse = this.course();
    if (!selectedCourse) {
      return;
    }
    if (this.assignForm.invalid) {
      Object.values(this.assignForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const raw = this.assignForm.getRawValue() as {
      mode: 'ASSIGN' | 'UNASSIGN';
      lecturerId: string;
    };
    const payload = {
      courseId: selectedCourse.id,
      lecturerId: raw.lecturerId.trim(),
    };

    this.isSubmitting.set(true);
    const req$ =
      raw.mode === 'ASSIGN'
        ? this.courseSvc.assignCourseToLecturer(payload)
        : this.courseSvc.unassignCourseFromLecturer(payload);

    req$.subscribe({
      next: updatedUser => {
        this.isSubmitting.set(false);
        this.alert.success(
          raw.mode === 'ASSIGN'
            ? `Đã phân công học phần ${selectedCourse.code} cho giảng viên ${updatedUser.fullName}`
            : `Đã thu hồi phân công học phần ${selectedCourse.code} khỏi giảng viên ${updatedUser.fullName}`,
        );
        this.visibleChange.emit(false);
        this.assignedSuccess.emit(updatedUser);
      },
      error: err => {
        this.isSubmitting.set(false);
        this.alert.error(toApiError(err)?.message ?? 'Thao tác phân công thất bại');
      },
    });
  }
}

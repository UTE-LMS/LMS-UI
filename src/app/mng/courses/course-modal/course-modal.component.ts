import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';
import { ICourse, ICourseRequest, ICourseUpdateRequest } from '@models/course/course.model';
import { IFaculty } from '@models/faculty/faculty.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { FacultyService } from '@services/faculty/faculty.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ToastrService } from 'ngx-toastr';

/**
 * Modal Thêm / Sửa Học phần trong Kho cấp trường / theo Khoa (F03 US-09/AC-1, M4 PM Decentralization).
 */
@Component({
  selector: 'app-course-modal',
  templateUrl: './course-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
  ],
})
export class CourseModalComponent implements OnInit {
  private readonly courseSvc = inject(CourseService);
  private readonly facultySvc = inject(FacultyService, { optional: true });
  private readonly authSvc = inject(AuthService, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);
  private readonly nzModalSvc = inject(NzModalService, { optional: true });

  readonly isVisible = input<boolean>(false);
  readonly editingCourse = input<ICourse | null>(null);

  readonly visibleChange = output<boolean>();
  readonly savedSuccess = output<ICourse>();

  readonly isSubmitting = signal(false);
  readonly faculties = signal<IFaculty[]>([]);

  readonly courseForm: FormGroup = this.fb.group({
    facultyId: [''],
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
          const roles = this.authSvc?.getRoles?.() ?? [];
          const isPmOnly =
            roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)
            && !roles.includes(SystemConstant.ROLE.ADMIN);
          const pmFacultyId = this.authSvc?.getFacultyId?.() ?? '';

          if (current) {
            this.courseForm.reset({
              facultyId: current.facultyId ?? (isPmOnly ? pmFacultyId : ''),
              code: current.code,
              name: current.name,
              credits: current.credits ?? null,
            });
            this.courseForm.get('code')?.disable();
          } else {
            this.courseForm.reset({
              facultyId: isPmOnly ? pmFacultyId : '',
              code: '',
              name: '',
              credits: null,
            });
            this.courseForm.get('code')?.enable();
          }
          if (isPmOnly) {
            this.courseForm.get('facultyId')?.disable();
          } else {
            this.courseForm.get('facultyId')?.enable();
          }
        });
      }
    });
  }

  ngOnInit(): void {
    this.facultySvc?.getFaculties(0, 100, undefined, true).subscribe({
      next: res => this.faculties.set(res.content || []),
      error: () => undefined,
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
      facultyId: string;
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
        ...(raw.facultyId ? { facultyId: raw.facultyId } : {}),
      };
      this.courseSvc.updateCourse(current.id, updatePayload).subscribe({
        next: saved => {
          this.isSubmitting.set(false);
          this.alert.success('Cập nhật học phần thành công');
          this.visibleChange.emit(false);
          this.savedSuccess.emit(saved);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          if (this.handleLockedCourseError(err)) {
            return;
          }
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể cập nhật học phần');
        },
      });
    } else {
      const createPayload: ICourseRequest = {
        code: raw.code.trim().toUpperCase(),
        name: raw.name.trim(),
        credits: parsedCredits,
        ...(raw.facultyId ? { facultyId: raw.facultyId } : {}),
      };
      this.courseSvc.createCourse(createPayload).subscribe({
        next: saved => {
          this.isSubmitting.set(false);
          this.alert.success('Thêm học phần mới thành công');
          this.visibleChange.emit(false);
          this.savedSuccess.emit(saved);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          if (this.handleLockedCourseError(err)) {
            return;
          }
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể thêm học phần');
        },
      });
    }
  }

  private handleLockedCourseError(err: unknown): boolean {
    const apiErr = toApiError(err);
    const httpErr = err as HttpErrorResponse | undefined;
    const errBody = httpErr?.error as { code?: string; message?: string; } | undefined;
    const code = apiErr?.code ?? errBody?.code;
    const status = apiErr?.status ?? httpErr?.status;
    if (status === 422 || code === 'COURSE_LOCKED_BY_PROGRAM_VERSION') {
      const rawMsg = (apiErr?.message ?? errBody?.message ?? '').trim();
      const msg =
        rawMsg.length > 0
          ? rawMsg
          : 'Học phần đã thuộc về phiên bản CTĐT đang áp dụng hoặc lưu trữ. Không được chỉnh sửa.';
      this.nzModalSvc?.warning({
        nzTitle: 'Không thể chỉnh sửa học phần',
        nzContent: msg,
        nzOkText: 'Đã hiểu',
        nzWidth: 460,
      });
      return true;
    }
    return false;
  }
}

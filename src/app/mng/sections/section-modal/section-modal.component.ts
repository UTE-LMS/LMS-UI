import {
  ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { ISection } from '@models/course/section.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IUser } from '@models/user/user.model';
import { toUserError } from '@services/common/api-error.util';
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ToastrService } from 'ngx-toastr';

/**
 * Modal mở lớp học phần mới hoặc đổi giảng viên phụ trách (F05a US-19).
 * - `section = null`: mở lớp (mã lớp, học kỳ OPEN, học phần, đề cương CONFIRMED, giảng viên).
 * - `section != null`: chỉ đổi giảng viên; học phần, đề cương, học kỳ là bất biến (backend D3).
 * Kiểm tra ở đây chỉ để phản hồi nhanh; backend quyết định và lỗi 409/422 của nó được hiển thị nguyên văn.
 */
@Component({
  selector: 'app-section-modal',
  templateUrl: './section-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, NzModalModule, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule],
})
export class SectionModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly sectionSvc = inject(SectionService);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly alert = inject(ToastrService);

  readonly isVisible = input(false);
  readonly section = input<ISection | null>(null);
  readonly terms = input<ITerm[]>([]);
  readonly courses = input<ICourse[]>([]);
  /** Giảng viên chọn được (đã lọc vai trò LECTURER, ACTIVE). Rỗng khi người dùng không có quyền tải danh sách. */
  readonly lecturerOptions = input<IUser[]>([]);
  /** false: không có danh sách giảng viên để chọn, người dùng dán ID (ObjectId) thay thế. */
  readonly lecturerListAvailable = input(true);

  readonly visibleChange = output<boolean>();
  readonly saved = output<ISection>();

  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly syllabi = signal<ISyllabus[]>([]);
  readonly isLoadingSyllabi = signal(false);

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{2,40}$/)]],
    termId: ['', [Validators.required]],
    courseId: ['', [Validators.required]],
    syllabusId: ['', [Validators.required]],
    lecturerIds: [[] as string[], [Validators.required, Validators.minLength(1)]],
  });

  constructor() {
    effect(() => {
      if (this.isVisible()) {
        const current = this.section();
        untracked(() => this.resetForm(current));
      }
    });
  }

  protected isEditMode(): boolean {
    return this.section() !== null;
  }

  onCourseChange(courseId: string): void {
    this.form.controls.syllabusId.setValue('');
    this.syllabi.set([]);
    if (!courseId) {
      return;
    }
    this.isLoadingSyllabi.set(true);
    this.syllabusSvc.getSyllabiByCourse(courseId).subscribe({
      next: list => {
        this.syllabi.set(list ?? []);
        this.isLoadingSyllabi.set(false);
      },
      error: () => this.isLoadingSyllabi.set(false),
    });
  }

  lecturerOptionLabel(user: IUser): string {
    return `${user.fullName} (${user.username})`;
  }

  handleCancel(): void {
    if (!this.isSubmitting()) {
      this.visibleChange.emit(false);
    }
  }

  submit(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.submitError.set(null);
    const lecturerIds = this.cleanIds(this.form.controls.lecturerIds.value);
    const idsValid = lecturerIds.length > 0 && lecturerIds.every(id => SystemConstant.OBJECT_ID_REGEX.test(id));
    const current = this.section();
    const controls = this.form.controls;

    const relevant = current ? [controls.lecturerIds] : Object.values(controls);
    relevant.forEach(c => {
      c.markAsDirty();
      c.markAsTouched();
      c.updateValueAndValidity({ onlySelf: true });
    });
    if (!idsValid) {
      this.submitError.set('Cần chọn ít nhất một giảng viên; mỗi ID giảng viên gồm 24 ký tự hex.');
      return;
    }
    if (!current && this.form.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const request$ = current
      ? this.sectionSvc.updateLecturers(current.id, { lecturerIds })
      : this.sectionSvc.createSection({
        code: controls.code.value.trim(),
        courseId: controls.courseId.value,
        syllabusId: controls.syllabusId.value,
        termId: controls.termId.value,
        lecturerIds,
      });
    request$.subscribe({
      next: saved => {
        this.isSubmitting.set(false);
        this.alert.success(current ? 'Đã cập nhật giảng viên phụ trách' : `Đã mở lớp ${saved.code}`);
        this.visibleChange.emit(false);
        this.saved.emit(saved);
      },
      error: err => {
        this.isSubmitting.set(false);
        // 409 (trùng mã lớp) và 422 (tham chiếu sai, học kỳ/đề cương không hợp lệ): giữ dữ liệu, hiện thông điệp backend
        this.submitError.set(toUserError(err).message);
      },
    });
  }

  private resetForm(current: ISection | null): void {
    this.submitError.set(null);
    this.syllabi.set([]);
    this.form.reset({
      code: current?.code ?? '',
      termId: current?.termId ?? '',
      courseId: current?.courseId ?? '',
      syllabusId: current?.syllabusId ?? '',
      lecturerIds: current ? [...current.lecturerIds] : [],
    });
  }

  private cleanIds(ids: readonly string[]): string[] {
    return [...new Set(ids.map(id => id.trim()).filter(id => id.length > 0))];
  }
}

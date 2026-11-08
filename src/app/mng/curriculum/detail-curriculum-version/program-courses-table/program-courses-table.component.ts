import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  CourseCategory,
  CourseType,
  ICourse,
  IProgramCourse,
  IProgramCourseRequest,
  IProgramCourseUpdateRequest,
} from '@models/course/course.model';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';

/**
 * Custom validator chặn xung đột học phần tiên quyết & học trước (US-09/AC-3):
 * 1. Không cho phép học phần tự tham chiếu chính nó (selfReferenceConflict).
 * 2. Không cho phép một học phần xuất hiện đồng thời ở cả prerequisiteCourseIds và previousCourseIds (prereqPrevConflict).
 */
export function programCourseRelationsValidator(group: AbstractControl): ValidationErrors | null {
  const courseId = group.get('courseId')?.value as string | null;
  const prereqs = (group.get('prerequisiteCourseIds')?.value as string[] | null) ?? [];
  const prevs = (group.get('previousCourseIds')?.value as string[] | null) ?? [];

  if (courseId && (prereqs.includes(courseId) || prevs.includes(courseId))) {
    return { selfReferenceConflict: true };
  }

  const prevSet = new Set(prevs);
  const overlapping = prereqs.filter(id => prevSet.has(id));
  if (overlapping.length > 0) {
    return { prereqPrevConflict: true };
  }

  return null;
}

@Component({
  selector: 'app-program-courses-table',
  template: `
    <div class="section-card">
      <div class="section-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 class="section-title text-base font-bold text-slate-900 m-0">
            Kế hoạch Học phần trong Chương trình Đào tạo (US-09)
          </h2>
          <div class="section-description text-xs text-slate-500 mt-0.5">
            Cấu hình học kỳ dự kiến, khối kiến thức, điều kiện học phần tiên quyết và học phần học trước
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <nz-select
            class="w-40"
            nzAllowClear
            nzPlaceHolder="Lọc theo Học kỳ"
            [ngModel]="filterSemester()"
            (ngModelChange)="filterSemester.set($event)"
          >
            @for (sem of semesterOptions; track sem) {
            <nz-option [nzValue]="sem" [nzLabel]="'Học kỳ ' + sem" />
            }
          </nz-select>

          <nz-select
            class="w-48"
            nzAllowClear
            nzPlaceHolder="Lọc theo Khối kiến thức"
            [ngModel]="filterCategory()"
            (ngModelChange)="filterCategory.set($event)"
          >
            @for (cat of categoryOptions; track cat.value) {
            <nz-option [nzValue]="cat.value" [nzLabel]="cat.label" />
            }
          </nz-select>

          @if (canManage()) {
          <button
            nz-button
            nzType="primary"
            class="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white rounded-md font-medium"
            (click)="openCreateModal()"
          >
            <i class="fa-solid fa-plus mr-1.5"></i>Gán học phần vào CTĐT
          </button>
          }
        </div>
      </div>

      <nz-table
        #pcTable
        [nzData]="filteredProgramCourses()"
        [nzShowPagination]="false"
        [nzFrontPagination]="false"
        [nzScroll]="{ x: '960px' }"
      >
        <thead>
          <tr>
            <th nzWidth="24%">Mã & Tên học phần</th>
            <th nzWidth="9%" nzAlign="center">Học kỳ</th>
            <th nzWidth="9%" nzAlign="center">Tín chỉ</th>
            <th nzWidth="12%" nzAlign="center">Loại / Khối</th>
            <th nzWidth="15%">Học phần tiên quyết</th>
            <th nzWidth="15%">Học phần học trước</th>
            <th nzWidth="16%" nzAlign="right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          @for (pc of filteredProgramCourses(); track pc.id) {
          <tr>
            <td>
              <div class="font-bold text-slate-900">{{ getCourseCode(pc) }}</div>
              <div class="text-xs text-slate-600">{{ getCourseName(pc) }}</div>
            </td>
            <td nzAlign="center">
              <span>{{ pc.semester !== undefined && pc.semester !== null ? 'HK ' + pc.semester : '—' }}</span>
            </td>
            <td nzAlign="center">
              <span class="font-semibold">{{ pc.credits ?? pc.course?.credits ?? '—' }}</span>
            </td>
            <td nzAlign="center">
              <div class="flex flex-col items-center gap-1">
                @if (pc.type === 'COMPULSORY') {
                <span class="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Bắt buộc
                </span>
                } @else if (pc.type === 'ELECTIVE') {
                <span class="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  Tự chọn
                </span>
                } @else {
                <span class="text-slate-400 text-xs">—</span>
                }
                @if (pc.category) {
                <span class="text-xs text-slate-500">{{ getCategoryLabel(pc.category) }}</span>
                }
              </div>
            </td>
            <td>
              <div class="flex flex-wrap gap-1">
                @for (reqId of pc.prerequisiteCourseIds ?? []; track reqId) {
                <span class="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                  {{ getCourseCodeById(reqId) }}
                </span>
                } @empty {
                <span class="text-slate-400 text-xs">—</span>
                }
              </div>
            </td>
            <td>
              <div class="flex flex-wrap gap-1">
                @for (prevId of pc.previousCourseIds ?? []; track prevId) {
                <span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  {{ getCourseCodeById(prevId) }}
                </span>
                } @empty {
                <span class="text-slate-400 text-xs">—</span>
                }
              </div>
            </td>
            <td nzAlign="right">
              <div class="inline-flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  class="text-indigo-600 hover:underline text-xs font-medium bg-transparent border-0 cursor-pointer"
                  (click)="openCloPiMatrix.emit(pc.courseId)"
                >
                  Liên kết CLO–PI
                </button>
                @if (canManage()) {
                <button
                  type="button"
                  class="text-blue-600 hover:underline text-xs font-medium bg-transparent border-0 cursor-pointer"
                  (click)="openEditModal(pc)"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  class="text-rose-600 hover:underline text-xs font-medium bg-transparent border-0 cursor-pointer"
                  (click)="confirmRemoveCourse(pc)"
                >
                  Gỡ
                </button>
                }
              </div>
            </td>
          </tr>
          } @empty {
          <tr>
            <td colspan="7" class="text-center py-8 text-slate-400">
              Chưa có học phần nào khớp điều kiện trong phiên bản chương trình đào tạo này
            </td>
          </tr>
          }
        </tbody>
      </nz-table>
    </div>

    <!-- Modal Gán / Sửa Học phần trong CTĐT -->
    <nz-modal
      [nzVisible]="isModalVisible()"
      [nzTitle]="editingProgramCourse() ? 'Cập nhật cấu hình Học phần trong CTĐT' : 'Gán Học phần từ Kho trường vào CTĐT'"
      [nzWidth]="600"
      (nzOnCancel)="isModalVisible.set(false)"
      (nzOnOk)="submitProgramCourse()"
      [nzOkLoading]="isSubmitting()"
      [nzOkText]="editingProgramCourse() ? 'Lưu cấu hình' : 'Gán học phần'"
      nzCancelText="Hủy"
    >
      <ng-container *nzModalContent>
        <form [formGroup]="pcForm" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired nzFor="courseSelect">Học phần từ kho trường</nz-form-label>
            <nz-form-control nzErrorTip="Vui lòng chọn học phần">
              <nz-select
                id="courseSelect"
                formControlName="courseId"
                nzShowSearch
                nzPlaceHolder="Chọn học phần..."
                class="w-full"
              >
                @for (c of allCourses(); track c.id) {
                <nz-option
                  [nzValue]="c.id"
                  [nzLabel]="c.code + ' — ' + c.name + (c.credits !== undefined ? ' (' + c.credits + ' TC)' : '')"
                />
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <nz-form-item>
              <nz-form-label nzRequired nzFor="courseType">Loại học phần</nz-form-label>
              <nz-form-control>
                <nz-select id="courseType" formControlName="type" class="w-full">
                  <nz-option nzValue="COMPULSORY" nzLabel="Bắt buộc (COMPULSORY)" />
                  <nz-option nzValue="ELECTIVE" nzLabel="Tự chọn (ELECTIVE)" />
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzFor="courseCategory">Khối kiến thức</nz-form-label>
              <nz-form-control>
                <nz-select
                  id="courseCategory"
                  formControlName="category"
                  nzAllowClear
                  nzPlaceHolder="Chọn khối kiến thức..."
                  class="w-full"
                >
                  @for (cat of categoryOptions; track cat.value) {
                  <nz-option [nzValue]="cat.value" [nzLabel]="cat.label" />
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <nz-form-item>
              <nz-form-label nzFor="semesterInput">Học kỳ dự kiến (≥ 1)</nz-form-label>
              <nz-form-control nzErrorTip="Học kỳ phải lớn hơn hoặc bằng 1">
                <input
                  nz-input
                  type="number"
                  min="1"
                  id="semesterInput"
                  formControlName="semester"
                  placeholder="Ví dụ: 1, 2, 3..."
                />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzFor="creditsInput">Số tín chỉ áp dụng (≥ 0)</nz-form-label>
              <nz-form-control nzErrorTip="Số tín chỉ phải không âm">
                <input
                  nz-input
                  type="number"
                  min="0"
                  id="creditsInput"
                  formControlName="credits"
                  placeholder="Ví dụ: 3"
                />
              </nz-form-control>
            </nz-form-item>
          </div>

          <nz-form-item>
            <nz-form-label nzFor="prereqSelect">Học phần tiên quyết (Prerequisite Courses)</nz-form-label>
            <nz-form-control>
              <nz-select
                id="prereqSelect"
                formControlName="prerequisiteCourseIds"
                nzMode="multiple"
                nzShowSearch
                nzPlaceHolder="Chọn các học phần tiên quyết (nếu có)..."
                class="w-full"
              >
                @for (c of candidateRelationCourses(); track c.id) {
                <nz-option [nzValue]="c.id" [nzLabel]="c.code + ' — ' + c.name" />
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzFor="prevSelect">Học phần học trước (Previous Courses)</nz-form-label>
            <nz-form-control>
              <nz-select
                id="prevSelect"
                formControlName="previousCourseIds"
                nzMode="multiple"
                nzShowSearch
                nzPlaceHolder="Chọn các học phần học trước (nếu có)..."
                class="w-full"
              >
                @for (c of candidateRelationCourses(); track c.id) {
                <nz-option [nzValue]="c.id" [nzLabel]="c.code + ' — ' + c.name" />
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          @if (pcForm.hasError('selfReferenceConflict')) {
          <div class="text-rose-600 text-xs mt-1 font-medium" role="alert">
            Học phần không thể tự làm học phần tiên quyết hoặc học trước của chính nó (US-09/AC-3).
          </div>
          }
          @if (pcForm.hasError('prereqPrevConflict')) {
          <div class="text-rose-600 text-xs mt-1 font-medium" role="alert">
            Một học phần không được xuất hiện đồng thời ở cả danh sách Tiên quyết và Học trước (PREREQUISITE_AND_PREVIOUS_CONFLICT).
          </div>
          }
        </form>
      </ng-container>
    </nz-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzSelectModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
  ],
})
export class ProgramCoursesTableComponent implements OnInit {
  private readonly courseSvc = inject(CourseService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);
  private readonly nzModal = inject(NzModalService);

  readonly versionId = input.required<string>();
  readonly programCourses = input<IProgramCourse[]>([]);
  readonly canManage = input<boolean>(false);

  readonly changed = output<void>();
  readonly openCloPiMatrix = output<string>();

  readonly allCourses = signal<ICourse[]>([]);
  readonly filterSemester = signal<number | null>(null);
  readonly filterCategory = signal<CourseCategory | null>(null);

  readonly isModalVisible = signal(false);
  readonly editingProgramCourse = signal<IProgramCourse | null>(null);
  readonly isSubmitting = signal(false);

  readonly semesterOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly categoryOptions: { value: CourseCategory; label: string; }[] = [
    { value: 'FOUNDATION', label: 'Đại cương (FOUNDATION)' },
    { value: 'MAJOR_FOUNDATION', label: 'Cơ sở ngành (MAJOR_FOUNDATION)' },
    { value: 'SPECIALIZED', label: 'Chuyên ngành (SPECIALIZED)' },
    { value: 'CAPSTONE_PROJECT', label: 'Đồ án / Thực tập (CAPSTONE_PROJECT)' },
    { value: 'THESIS', label: 'Khóa luận tốt nghiệp (THESIS)' },
  ];

  private readonly categoryLabelMap: Record<string, string> = {
    FOUNDATION: 'Đại cương',
    MAJOR_FOUNDATION: 'Cơ sở ngành',
    SPECIALIZED: 'Chuyên ngành',
    CAPSTONE_PROJECT: 'Đồ án / Thực tập',
    THESIS: 'Khóa luận TN',
  };

  readonly filteredProgramCourses = computed(() => {
    const sem = this.filterSemester();
    const cat = this.filterCategory();
    return this.programCourses().filter(pc => {
      if (sem !== null && pc.semester !== sem) {
        return false;
      }
      if (cat !== null && pc.category !== cat) {
        return false;
      }
      return true;
    });
  });

  readonly pcForm: FormGroup = this.fb.group(
    {
      courseId: ['', [Validators.required]],
      type: ['COMPULSORY' as CourseType, [Validators.required]],
      category: [null as CourseCategory | null],
      semester: [1 as number | null, [Validators.min(1)]],
      credits: [3 as number | null, [Validators.min(0)]],
      prerequisiteCourseIds: [[] as string[]],
      previousCourseIds: [[] as string[]],
    },
    { validators: [programCourseRelationsValidator] },
  );

  ngOnInit(): void {
    this.courseSvc.getCourses(0, 100).subscribe({
      next: page => this.allCourses.set(page.content || []),
      error: () => undefined,
    });
  }

  /** Loại bỏ chính học phần đang chọn khỏi danh sách tiên quyết / học trước */
  candidateRelationCourses(): ICourse[] {
    const currentId = this.pcForm.get('courseId')?.value as string | null;
    return this.allCourses().filter(c => c.id !== currentId);
  }

  getCategoryLabel(cat?: string): string {
    if (!cat) {
      return '—';
    }
    return this.categoryLabelMap[cat] ?? cat;
  }

  getCourseCode(pc: IProgramCourse): string {
    return pc.course?.code ?? this.getCourseCodeById(pc.courseId);
  }

  getCourseName(pc: IProgramCourse): string {
    return (
      pc.course?.name
      ?? this.allCourses().find(c => c.id === pc.courseId)?.name
      ?? '—'
    );
  }

  getCourseCodeById(courseId: string): string {
    const fromPc = this.programCourses().find(p => p.courseId === courseId)?.course?.code;
    if (fromPc) {
      return fromPc;
    }
    return this.allCourses().find(c => c.id === courseId)?.code ?? courseId;
  }

  openCreateModal(): void {
    if (!this.canManage()) {
      return;
    }
    this.editingProgramCourse.set(null);
    this.pcForm.reset({
      courseId: '',
      type: 'COMPULSORY',
      category: null,
      semester: 1,
      credits: 3,
      prerequisiteCourseIds: [],
      previousCourseIds: [],
    });
    this.pcForm.get('courseId')?.enable();
    this.isModalVisible.set(true);
  }

  openEditModal(pc: IProgramCourse): void {
    if (!this.canManage()) {
      return;
    }
    this.editingProgramCourse.set(pc);
    this.pcForm.reset({
      courseId: pc.courseId,
      type: (pc.type as CourseType) || 'COMPULSORY',
      category: (pc.category as CourseCategory) || null,
      semester: pc.semester ?? null,
      credits: pc.credits ?? pc.course?.credits ?? null,
      prerequisiteCourseIds: pc.prerequisiteCourseIds ?? [],
      previousCourseIds: pc.previousCourseIds ?? [],
    });
    this.pcForm.get('courseId')?.disable();
    this.isModalVisible.set(true);
  }

  submitProgramCourse(): void {
    if (!this.canManage()) {
      return;
    }
    if (this.pcForm.invalid) {
      Object.values(this.pcForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const raw = this.pcForm.getRawValue() as {
      courseId: string;
      type: CourseType;
      category: CourseCategory | null;
      semester: number | string | null;
      credits: number | string | null;
      prerequisiteCourseIds: string[];
      previousCourseIds: string[];
    };

    const parsedSemester =
      raw.semester !== null && raw.semester !== '' && raw.semester !== undefined
        ? Number(raw.semester)
        : undefined;
    const parsedCredits =
      raw.credits !== null && raw.credits !== '' && raw.credits !== undefined
        ? Number(raw.credits)
        : undefined;

    this.isSubmitting.set(true);
    const current = this.editingProgramCourse();

    if (current) {
      const updatePayload: IProgramCourseUpdateRequest = {
        type: raw.type,
        category: raw.category ?? undefined,
        semester: parsedSemester,
        credits: parsedCredits,
        prerequisiteCourseIds: raw.prerequisiteCourseIds || [],
        previousCourseIds: raw.previousCourseIds || [],
      };
      this.courseSvc
        .updateProgramCourse(this.versionId(), current.courseId, updatePayload)
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.isModalVisible.set(false);
            this.alert.success('Cập nhật học phần trong CTĐT thành công');
            this.changed.emit();
          },
          error: err => {
            this.isSubmitting.set(false);
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể cập nhật học phần trong CTĐT');
          },
        });
    } else {
      const createPayload: IProgramCourseRequest = {
        courseId: raw.courseId,
        type: raw.type,
        category: raw.category ?? undefined,
        semester: parsedSemester,
        credits: parsedCredits,
        prerequisiteCourseIds: raw.prerequisiteCourseIds || [],
        previousCourseIds: raw.previousCourseIds || [],
      };
      this.courseSvc.addCourseToProgramVersion(this.versionId(), createPayload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isModalVisible.set(false);
          this.alert.success('Đã gán học phần vào phiên bản CTĐT');
          this.changed.emit();
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể gán học phần vào CTĐT');
        },
      });
    }
  }

  confirmRemoveCourse(pc: IProgramCourse): void {
    if (!this.canManage()) {
      return;
    }
    const code = this.getCourseCode(pc);
    this.nzModal.confirm({
      nzTitle: `Gỡ học phần ${code} khỏi CTĐT?`,
      nzContent: `Bạn có chắc chắn muốn gỡ học phần "${this.getCourseName(pc)}" khỏi phiên bản CTĐT này?`,
      nzOkText: 'Gỡ khỏi CTĐT',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.courseSvc.removeCourseFromProgramVersion(this.versionId(), pc.courseId).subscribe({
          next: () => {
            this.alert.success(`Đã gỡ học phần ${code} khỏi CTĐT`);
            this.changed.emit();
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể gỡ học phần khỏi CTĐT');
          },
        });
      },
    });
  }
}

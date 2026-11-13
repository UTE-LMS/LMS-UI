import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CourseCategory,
  ICourse,
  IProgramCourse,
} from '@models/course/course.model';
import { CourseService } from '@services/course/course.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';

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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzTableModule,
    NzButtonModule,
    NzSelectModule,
  ],
})
export class ProgramCoursesTableComponent implements OnInit {
  private readonly courseSvc = inject(CourseService);

  readonly versionId = input.required<string>();
  readonly programCourses = input<IProgramCourse[]>([]);
  readonly canManage = input<boolean>(false);

  readonly changed = output<void>();
  readonly openCloPiMatrix = output<string>();

  readonly allCourses = signal<ICourse[]>([]);
  readonly filterSemester = signal<number | null>(null);
  readonly filterCategory = signal<CourseCategory | null>(null);

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

  ngOnInit(): void {
    this.courseSvc.getCourses(0, 100).subscribe({
      next: page => this.allCourses.set(page.content || []),
      error: () => undefined,
    });
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
}

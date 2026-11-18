import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CourseCategory,
  ICourse,
  IProgramCourse,
  IProgramCourseCsvImportResponse,
} from '@models/course/course.model';
import { ProgramVersionStatus } from '@models/program/program-version.model';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { ImportTemplateFormat, saveBlobAs, templateFileNameFor } from '@services/common/import-file.util';

@Component({
  selector: 'app-program-courses-table',
  templateUrl: './program-courses-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzTableModule,
    NzButtonModule,
    NzSelectModule,
    NzModalModule,
  ],
})
export class ProgramCoursesTableComponent implements OnInit {
  private readonly courseSvc = inject(CourseService);
  private readonly alert = inject(ToastrService, { optional: true });

  readonly versionId = input.required<string>();
  readonly versionStatus = input<ProgramVersionStatus | undefined>(undefined);
  readonly programCourses = input<IProgramCourse[]>([]);
  readonly canManage = input<boolean>(false);
  readonly canImportCourses = input<boolean>(false);

  readonly changed = output<void>();
  readonly openCloPiMatrix = output<string>();

  readonly allCourses = signal<ICourse[]>([]);
  readonly filterSemester = signal<number | null>(null);
  readonly filterCategory = signal<CourseCategory | null>(null);

  // Modal Import Khung học phần CSV
  readonly isImportModalVisible = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly isImporting = signal(false);
  readonly importResult = signal<IProgramCourseCsvImportResponse | null>(null);
  readonly importErrorMsg = signal<string | null>(null);

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

  openImportModal(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.importErrorMsg.set(null);
    this.isImportModalVisible.set(true);
  }

  closeImportModal(): void {
    if (this.isImporting()) {
      return;
    }
    this.isImportModalVisible.set(false);
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.importResult.set(null);
    this.importErrorMsg.set(null);
  }

  downloadImportTemplate(format: ImportTemplateFormat = 'csv'): void {
    this.courseSvc.downloadProgramCoursesImportTemplate(this.versionId(), format).subscribe({
      next: blob => saveBlobAs(blob, templateFileNameFor('program-courses-template.csv', format)),
      error: err => {
        const apiErr = toApiError(err);
        this.alert?.error(apiErr?.message ?? 'Không thể tải tệp mẫu');
      },
    });
  }

  submitImport(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }
    this.isImporting.set(true);
    this.importErrorMsg.set(null);
    this.importResult.set(null);

    this.courseSvc.importProgramCoursesCsv(this.versionId(), file).subscribe({
      next: res => {
        this.isImporting.set(false);
        this.importResult.set(res);
        this.alert?.success(`Import thành công: ${res.importedCount} thêm mới, ${res.updatedCount} cập nhật`);
        this.changed.emit();
      },
      error: err => {
        this.isImporting.set(false);
        const apiErr = toApiError(err);
        const msg = apiErr?.message ?? 'Import khung học phần thất bại';
        this.importErrorMsg.set(msg);
        this.alert?.error(msg);
      },
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

  getCourseTooltip(courseId: string): string {
    const fromPc = this.programCourses().find(p => p.courseId === courseId)?.course;
    const found = fromPc ?? this.allCourses().find(c => c.id === courseId);
    if (!found) {
      return courseId;
    }
    return `${found.code} — ${found.name}`;
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, effect, OnInit, computed, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  CourseCategory,
  CourseType,
  ICourse,
  IProgramCourse,
  IProgramCourseCsvImportResponse,
} from '@models/course/course.model';
import { ProgramVersionStatus } from '@models/program/program-version.model';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import {
  ImportTemplateFormat, importFileNameError, saveBlobAs, templateFileNameFor,
} from '@services/common/import-file.util';
import { ImportFilePreviewComponent } from '@widget/import-file-preview/import-file-preview.component';
import { debounceTime, distinctUntilChanged, map, Subject } from 'rxjs';

@Component({
  selector: 'app-program-courses-table',
  templateUrl: './program-courses-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzModalModule,
    ImportFilePreviewComponent,
  ],
})
export class ProgramCoursesTableComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly courseSvc = inject(CourseService);
  private readonly alert = inject(ToastrService, { optional: true });

  readonly versionId = input.required<string>();
  readonly versionStatus = input<ProgramVersionStatus | undefined>(undefined);
  readonly programCourses = input<IProgramCourse[]>([]);
  readonly canManage = input<boolean>(false);
  readonly canImportCourses = input<boolean>(false);

  readonly changed = output<void>();
  readonly totalChange = output<number>();
  readonly openCloPiMatrix = output<string>();

  readonly allCourses = signal<ICourse[]>([]);
  readonly filterSemester = signal<number | null>(null);
  readonly filterType = signal<CourseType | null>(null);
  readonly filterCategory = signal<CourseCategory | null>(null);
  readonly filterSearch = signal('');

  readonly page = signal(0);
  readonly size = signal(20);
  readonly totalElements = signal(0);
  readonly pagedCourses = signal<IProgramCourse[]>([]);
  readonly hasLoadedServerPage = signal(false);
  readonly isLoading = signal(false);
  private readonly searchSubject$ = new Subject<string>();

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

  readonly filteredProgramCourses = computed(() => (
    this.hasLoadedServerPage() ? this.pagedCourses() : this.programCourses()
  ));

  constructor() {
    effect(() => {
      const vId = this.versionId();
      if (vId) {
        untracked(() => {
          this.page.set(0);
          this.loadProgramCourses();
        });
      }
    });
  }

  ngOnInit(): void {
    this.searchSubject$
      .pipe(
        map(q => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(0);
        this.loadProgramCourses();
      });

    this.courseSvc.getCourses(0, 100).subscribe({
      next: page => this.allCourses.set(page.content || []),
      error: () => undefined,
    });
  }

  loadProgramCourses(): void {
    const vId = this.versionId();
    if (!vId || typeof this.courseSvc.getProgramCourses !== 'function') {
      return;
    }
    this.isLoading.set(true);
    this.courseSvc
      .getProgramCourses(
        vId,
        this.filterSemester() ?? undefined,
        this.filterType() ?? undefined,
        this.filterCategory() ?? undefined,
        this.filterSearch().trim() || undefined,
        this.page(),
        this.size(),
      )
      .subscribe({
        next: res => {
          const content = res?.content ?? [];
          this.pagedCourses.set(content);
          this.totalElements.set(res?.totalElements ?? content.length);
          this.page.set(res?.page ?? this.page());
          this.size.set(res?.size ?? this.size());
          this.hasLoadedServerPage.set(true);
          this.isLoading.set(false);
          this.totalChange.emit(res?.totalElements ?? content.length);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onSemesterChange(sem: number | null): void {
    this.filterSemester.set(sem);
    this.page.set(0);
    this.loadProgramCourses();
  }

  onTypeChange(type: CourseType | null): void {
    this.filterType.set(type);
    this.page.set(0);
    this.loadProgramCourses();
  }

  onCategoryChange(cat: CourseCategory | null): void {
    this.filterCategory.set(cat);
    this.page.set(0);
    this.loadProgramCourses();
  }

  onSearchChange(keyword: string): void {
    this.filterSearch.set(keyword);
    this.searchSubject$.next(keyword);
  }

  onPageIndexChange(page1Indexed: number): void {
    this.page.set(Math.max(0, page1Indexed - 1));
    this.loadProgramCourses();
  }

  onPageSizeChange(newSize: number): void {
    this.size.set(newSize);
    this.page.set(0);
    this.loadProgramCourses();
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
    this.importResult.set(null);
    if (!file) {
      this.selectedFile.set(null);
      this.importErrorMsg.set(null);
      return;
    }
    const nameError = importFileNameError(file.name);
    if (nameError) {
      this.selectedFile.set(null);
      this.importErrorMsg.set(nameError);
      return;
    }
    this.selectedFile.set(file);
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
        this.loadProgramCourses();
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
    const fromPc =
      this.filteredProgramCourses().find(p => p.courseId === courseId)?.course?.code
      ?? this.programCourses().find(p => p.courseId === courseId)?.course?.code;
    if (fromPc) {
      return fromPc;
    }
    return this.allCourses().find(c => c.id === courseId)?.code ?? courseId;
  }

  getCourseTooltip(courseId: string): string {
    const fromPc =
      this.filteredProgramCourses().find(p => p.courseId === courseId)?.course
      ?? this.programCourses().find(p => p.courseId === courseId)?.course;
    const found = fromPc ?? this.allCourses().find(c => c.id === courseId);
    if (!found) {
      return courseId;
    }
    return `${found.code} — ${found.name}`;
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { ISyllabus, ISyllabusCsvImportResponse } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { ImportTemplateFormat, saveBlobAs, templateFileNameFor } from '@services/common/import-file.util';

@Component({
  selector: 'app-list-syllabi',
  templateUrl: './list-syllabi.component.html',
  styleUrl: './list-syllabi.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzSelectModule,
    NzModalModule,
    NzInputModule,
    StatusChipComponent,
  ],
})
export class ListSyllabiComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly courseSvc = inject(CourseService);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly programVersionSvc = inject(ProgramVersionService);
  private readonly termSvc = inject(TermService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);
  private readonly modal = inject(NzModalService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchCourseSubject$ = new Subject<string>();
  readonly isSearchingCourse = signal(false);
  readonly isLoadingMoreCourses = signal(false);

  readonly coursePageSize = 100;
  readonly coursePage = signal(0);
  readonly courseTotalPages = signal(1);
  readonly isCourseLastPage = signal(true);
  readonly currentCourseSearch = signal('');

  readonly userRoles = signal<string[]>([]);
  readonly pmFacultyId = signal<string | undefined>(undefined);
  readonly showAllCourses = signal(false);

  readonly allCourses = signal<ICourse[]>([]);
  readonly scopedCourses = computed(() => {
    const fid = this.pmFacultyId();
    return fid ? this.allCourses().filter(c => c.facultyId === fid) : [];
  });
  readonly terms = signal<ITerm[]>([]);
  readonly programVersions = signal<IProgramVersion[]>([]);
  readonly selectedCourseId = signal<string>('');
  readonly syllabi = signal<ISyllabus[]>([]);
  readonly isLoadingSyllabi = signal(false);
  readonly hasError = signal(false);

  /** Modal Import CSV Đề cương 2 bước (Chọn tệp -> Xem trước & Xác nhận Import) */
  readonly isImportModalVisible = signal(false);
  readonly importStep = signal<1 | 2>(1);
  readonly importVersion = signal('');
  readonly importProgramVersionId = signal('');
  readonly importEffectiveFromTermId = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly importPreview = signal<ISyllabusCsvImportResponse | null>(null);
  readonly isImporting = signal(false);
  readonly isConfirmingImport = signal(false);

  readonly isAdmin = computed(() => this.userRoles().includes(SystemConstant.ROLE.ADMIN));

  readonly filteredCourses = computed(() => {
    const fid = this.pmFacultyId();
    if (this.showAllCourses() || this.isAdmin() || !fid) {
      return this.allCourses();
    }
    const facultyCourses = this.scopedCourses();
    return facultyCourses.length > 0 ? facultyCourses : this.allCourses();
  });

  readonly selectedCourse = computed(() => {
    const id = this.selectedCourseId();
    if (!id) {
      return null;
    }
    return this.allCourses().find(c => c.id === id) ?? null;
  });

  /** Kiểm tra môn đang chọn có thuộc Khoa phụ trách của PM hay không */
  readonly isCourseInScope = computed(() => {
    const cid = this.selectedCourseId();
    if (!cid || !this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    const pmFacId = this.pmFacultyId();
    const courseFacId = this.selectedCourse()?.facultyId;
    if (pmFacId && courseFacId) {
      return pmFacId === courseFacId;
    }
    return Boolean(pmFacId);
  });

  /**
   * Quyền Import CSV đề cương: chỉ PROGRAM_MANAGER (QA và ADMIN chỉ đọc).
   */
  readonly canImportSyllabus = computed(() => {
    if (!this.selectedCourseId() || this.isAdmin()) {
      return false;
    }
    return this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER);
  });

  isActiveOrConfirmed(s: ISyllabus): boolean {
    return (s.status as string) === 'ACTIVE' || s.status === 'CONFIRMED';
  }

  canLockSyllabus(s: ISyllabus): boolean {
    if (this.isAdmin() || !this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    if (!this.isCourseInScope()) {
      return false;
    }
    return this.isActiveOrConfirmed(s);
  }

  confirmLockSyllabus(s: ISyllabus): void {
    if (!this.canLockSyllabus(s)) {
      return;
    }
    this.modal?.confirm({
      nzTitle: 'Khóa phiên bản đề cương học phần',
      nzContent: `Bạn có chắc chắn muốn khóa phiên bản đề cương [${s.version}]? Sau khi khóa, đề cương sẽ chuyển sang trạng thái Lưu trữ (ARCHIVED), ngăn chặn hoàn toàn việc nhập điểm và không thể chỉnh sửa.`,
      nzOkText: 'Khóa đề cương',
      nzOkDanger: true,
      nzOnOk: () => {
        this.syllabusSvc.lockSyllabus(s.id).subscribe({
          next: () => {
            this.alert.success(`Phiên bản đề cương [${s.version}] đã được khóa (ARCHIVED).`);
            this.loadSyllabi(this.selectedCourseId());
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể khóa phiên bản đề cương');
          },
        });
      },
    });
  }

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());
    this.pmFacultyId.set(this.authSvc.getFacultyId?.());

    const queryCourseId = this.route.snapshot.queryParamMap.get('courseId');
    if (queryCourseId) {
      this.showAllCourses.set(true);
    }

    this.searchCourseSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(keyword => {
          this.isSearchingCourse.set(true);
          this.currentCourseSearch.set(keyword);
          this.coursePage.set(0);
          return this.courseSvc.getCourses(0, this.coursePageSize, keyword).pipe(
            catchError(() => of({
              content: [],
              page: 0,
              size: this.coursePageSize,
              totalElements: 0,
              totalPages: 0,
              last: true,
            })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: page => {
          const searchResults = page.content || [];
          const current = this.selectedCourse();
          const merged = [...searchResults];
          if (current && !merged.some(c => c.id === current.id)) {
            merged.unshift(current);
          }
          this.allCourses.set(merged);
          this.courseTotalPages.set(page.totalPages || 0);
          this.isCourseLastPage.set(page.last ?? (1 >= (page.totalPages || 1)));
          this.isSearchingCourse.set(false);
        },
        error: () => {
          this.isSearchingCourse.set(false);
        },
      });

    this.loadInitialCatalog(queryCourseId);
  }

  loadInitialCatalog(preferredCourseId: string | null): void {
    this.termSvc.getTerms().subscribe({
      next: list => this.terms.set(list || []),
      error: () => undefined,
    });

    this.programVersionSvc.getProgramVersions(0, 100).subscribe({
      next: page => this.programVersions.set(page.content || []),
      error: () => undefined,
    });

    this.coursePage.set(0);
    this.currentCourseSearch.set('');
    this.courseSvc.getCourses(0, this.coursePageSize).subscribe({
      next: page => {
        const list = page.content || [];
        this.courseTotalPages.set(page.totalPages || 1);
        this.isCourseLastPage.set(page.last ?? (1 >= (page.totalPages || 1)));
        if (preferredCourseId && !list.some(c => c.id === preferredCourseId)) {
          this.courseSvc.getCourseById(preferredCourseId).subscribe({
            next: preferredCourse => {
              this.allCourses.set([preferredCourse, ...list]);
              this.onCourseChange(preferredCourseId);
            },
            error: () => {
              this.allCourses.set(list);
              this.selectDefaultCourse(preferredCourseId);
            },
          });
        } else {
          this.allCourses.set(list);
          this.selectDefaultCourse(preferredCourseId);
        }
      },
      error: () => {
        this.hasError.set(true);
      },
    });
  }

  private selectDefaultCourse(preferredCourseId: string | null): void {
    if (this.selectedCourseId()) {
      return;
    }
    if (preferredCourseId) {
      this.onCourseChange(preferredCourseId);
      return;
    }
    const scoped = this.scopedCourses();
    if (!this.showAllCourses() && scoped.length > 0) {
      this.onCourseChange(scoped[0].id);
      return;
    }
    const candidates = this.filteredCourses();
    const initialId = candidates[0]?.id ?? this.allCourses()[0]?.id ?? '';
    if (initialId) {
      this.onCourseChange(initialId);
    }
  }

  onSearchCourse(keyword: string): void {
    const trimmed = keyword?.trim() ?? '';
    if (trimmed && !this.showAllCourses()) {
      this.showAllCourses.set(true);
    }
    this.searchCourseSubject$.next(keyword);
  }

  onCourseChange(courseId: string): void {
    this.selectedCourseId.set(courseId);
    if (!courseId) {
      this.syllabi.set([]);
      return;
    }
    this.loadSyllabi(courseId);
  }

  loadSyllabi(courseId = this.selectedCourseId()): void {
    if (!courseId) {
      return;
    }
    this.isLoadingSyllabi.set(true);
    this.hasError.set(false);
    this.syllabusSvc.getSyllabiByCourse(courseId).subscribe({
      next: list => {
        this.isLoadingSyllabi.set(false);
        this.syllabi.set(list || []);
      },
      error: () => {
        this.isLoadingSyllabi.set(false);
        this.hasError.set(true);
      },
    });
  }

  getTermCode(termId?: string | null): string {
    if (!termId) {
      return '—';
    }
    const term = this.terms().find(t => t.id === termId || t.code === termId);
    if (!term) {
      return termId;
    }
    return term.academicYear ? `${term.code} (${term.academicYear})` : term.code;
  }

  toggleShowAllCourses(): void {
    const nextVal = !this.showAllCourses();
    this.showAllCourses.set(nextVal);

    if (!nextVal) {
      const scoped = this.scopedCourses();
      if (scoped.length > 0 && !this.isCourseInScope()) {
        this.onCourseChange(scoped[0].id);
      }
    } else if (this.allCourses().length === 0) {
      this.coursePage.set(0);
      this.currentCourseSearch.set('');
      this.courseSvc.getCourses(0, this.coursePageSize).subscribe({
        next: page => {
          this.allCourses.set(page.content || []);
          this.courseTotalPages.set(page.totalPages || 1);
          this.isCourseLastPage.set(page.last ?? (1 >= (page.totalPages || 1)));
        },
        error: () => undefined,
      });
    }
  }

  onCourseScrollToBottom(): void {
    if (!this.showAllCourses() && !this.isAdmin() && Boolean(this.pmFacultyId())) {
      return;
    }
    if (
      this.isLoadingMoreCourses()
      || this.isSearchingCourse()
      || this.isCourseLastPage()
      || this.coursePage() + 1 >= this.courseTotalPages()
    ) {
      return;
    }

    const nextPage = this.coursePage() + 1;
    this.isLoadingMoreCourses.set(true);

    this.courseSvc
      .getCourses(nextPage, this.coursePageSize, this.currentCourseSearch())
      .pipe(
        catchError(() => of({
          content: [],
          page: nextPage,
          size: this.coursePageSize,
          totalElements: 0,
          totalPages: this.courseTotalPages(),
          last: true,
        })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: page => {
          const newItems = page.content || [];
          if (newItems.length > 0) {
            const currentCourses = this.allCourses();
            const existingIds = new Set(currentCourses.map(c => c.id));
            const distinctNew = newItems.filter(c => !existingIds.has(c.id));
            this.allCourses.set([...currentCourses, ...distinctNew]);
          }
          this.coursePage.set(nextPage);
          this.courseTotalPages.set(page.totalPages || this.courseTotalPages());
          this.isCourseLastPage.set(page.last ?? (nextPage + 1 >= (page.totalPages || 1)));
          this.isLoadingMoreCourses.set(false);
        },
        error: () => {
          this.isLoadingMoreCourses.set(false);
        },
      });
  }

  openImportModal(): void {
    this.importStep.set(1);
    this.importVersion.set('');
    this.importProgramVersionId.set(this.programVersions()[0]?.id ?? '');
    this.importEffectiveFromTermId.set(null);
    this.selectedFile.set(null);
    this.importPreview.set(null);
    this.isImportModalVisible.set(true);
  }

  closeImportModal(): void {
    this.isImportModalVisible.set(false);
  }

  downloadCsvTemplate(format: ImportTemplateFormat = 'csv'): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return;
    }
    this.syllabusSvc.downloadImportTemplate(courseId, format).subscribe({
      next: blob => saveBlobAs(
        blob,
        templateFileNameFor(`syllabus-template-${this.selectedCourse()?.code ?? 'course'}.csv`, format),
      ),
      error: () => {
        this.alert.error('Không thể tải tệp mẫu đề cương');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  previewImportStep(): void {
    const courseId = this.selectedCourseId();
    const version = this.importVersion().trim();
    const pvId = this.importProgramVersionId();
    const file = this.selectedFile();
    if (!courseId || !version || !pvId || !file) {
      this.alert.warning('Vui lòng chọn Phiên bản CTĐT, nhập mã phiên bản đề cương và chọn tệp CSV');
      return;
    }

    this.isImporting.set(true);
    this.syllabusSvc
      .previewImportSyllabusCsv(courseId, version, pvId, file, this.importEffectiveFromTermId() ?? undefined)
      .subscribe({
        next: res => {
          this.isImporting.set(false);
          this.importPreview.set(res);
          this.importStep.set(2);
        },
        error: err => {
          this.isImporting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Xem trước CSV đề cương thất bại');
        },
      });
  }

  runImportStep(): void {
    this.previewImportStep();
  }

  confirmImportStep(): void {
    const courseId = this.selectedCourseId();
    const version = this.importVersion().trim();
    const pvId = this.importProgramVersionId();
    const file = this.selectedFile();
    if (!courseId || !version || !pvId || !file) {
      this.alert.warning('Thông tin import không hợp lệ');
      return;
    }

    this.isConfirmingImport.set(true);
    this.syllabusSvc
      .importSyllabusCsv(courseId, version, pvId, file, this.importEffectiveFromTermId())
      .subscribe({
        next: () => {
          this.isConfirmingImport.set(false);
          this.isImportModalVisible.set(false);
          this.alert.success('Import đề cương thành công (Đã kích hoạt & Xác nhận)');
          this.loadSyllabi(this.selectedCourseId());
        },
        error: err => {
          this.isConfirmingImport.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Import đề cương thất bại');
        },
      });
  }
}

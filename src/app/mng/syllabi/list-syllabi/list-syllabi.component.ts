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
import { IRoleAssignment } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  of,
  Subject,
  switchMap,
} from 'rxjs';

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
  readonly scopeCourseIds = signal<string[]>([]);
  readonly scopeProgramIds = signal<string[]>([]);
  readonly showAllCourses = signal(false);

  readonly allCourses = signal<ICourse[]>([]);
  readonly scopedCourses = signal<ICourse[]>([]);
  readonly terms = signal<ITerm[]>([]);
  readonly programVersions = signal<IProgramVersion[]>([]);
  readonly selectedCourseId = signal<string>('');
  readonly syllabi = signal<ISyllabus[]>([]);
  readonly isLoadingSyllabi = signal(false);
  readonly hasError = signal(false);

  /** Modal Import CSV Đề cương 3 bước (Chọn tệp -> Kiểm tra -> Lưu và xác nhận) */
  readonly isImportModalVisible = signal(false);
  readonly importStep = signal<1 | 2 | 3>(1);
  readonly importVersion = signal('');
  readonly importProgramVersionId = signal('');
  readonly importEffectiveFromTermId = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly importPreview = signal<ISyllabusCsvImportResponse | null>(null);
  readonly isImporting = signal(false);
  readonly isConfirmingImport = signal(false);

  readonly isAdmin = computed(() => this.userRoles().includes(SystemConstant.ROLE.ADMIN));

  readonly filteredCourses = computed(() => {
    const scopedIds = this.scopeCourseIds();
    if (this.showAllCourses() || this.isAdmin() || scopedIds.length === 0) {
      return this.allCourses();
    }
    const scoped = this.scopedCourses();
    if (scoped.length > 0) {
      return scoped;
    }
    return this.allCourses().filter(c => scopedIds.includes(c.id));
  });

  readonly selectedCourse = computed(() => {
    const id = this.selectedCourseId();
    if (!id) {
      return null;
    }
    return (
      this.scopedCourses().find(c => c.id === id)
      ?? this.allCourses().find(c => c.id === id)
      ?? null
    );
  });

  /** Kiểm tra môn đang chọn có nằm trong scope của người dùng không */
  readonly isCourseInScope = computed(() => {
    const cid = this.selectedCourseId();
    return !!cid && (this.scopeCourseIds().includes(cid) || this.scopeProgramIds().length > 0);
  });

  /**
   * Quyền Import CSV đề cương: chỉ PROGRAM_MANAGER (không còn phân công GV bộ môn).
   */
  readonly canImportSyllabus = computed(() => {
    if (!this.selectedCourseId() || this.isAdmin()) {
      return false;
    }
    return this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER);
  });

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());
    const assignments = this.authSvc.getRoleAssignments();
    const courseIds = new Set<string>();
    const programIds = new Set<string>();
    assignments.forEach((a: IRoleAssignment) => {
      (a.scope?.courseIds ?? []).forEach(id => courseIds.add(id));
      (a.scope?.programIds ?? []).forEach(id => programIds.add(id));
    });
    this.scopeCourseIds.set(Array.from(courseIds));
    this.scopeProgramIds.set(Array.from(programIds));

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

    const scopedIds = this.scopeCourseIds();
    if (scopedIds.length > 0) {
      const requests = scopedIds.map(id => this.courseSvc.getCourseById(id).pipe(catchError(() => of(null))));
      forkJoin(requests).subscribe(results => {
        const validScoped = results.filter((c): c is ICourse => c !== null);
        this.scopedCourses.set(validScoped);

        const currentAll = this.allCourses();
        const existingIds = new Set(currentAll.map(c => c.id));
        const missing = validScoped.filter(c => !existingIds.has(c.id));
        if (missing.length > 0) {
          this.allCourses.set([...missing, ...currentAll]);
        }

        if (!preferredCourseId && !this.showAllCourses() && validScoped.length > 0) {
          this.onCourseChange(validScoped[0].id);
        }
      });
    }

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
          const currentScoped = this.scopedCourses();
          const listIds = new Set(list.map(c => c.id));
          const missingScoped = currentScoped.filter(c => !listIds.has(c.id));
          this.allCourses.set([...missingScoped, ...list]);
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
    return this.terms().find(t => t.id === termId)?.code ?? termId;
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
    if (!this.showAllCourses() && !this.isAdmin() && this.scopeCourseIds().length > 0) {
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

  downloadCsvTemplate(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return;
    }
    this.syllabusSvc.downloadImportTemplate(courseId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `syllabus-template-${this.selectedCourse()?.code ?? 'course'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.alert.error('Không thể tải tệp CSV mẫu đề cương');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  runImportStep(): void {
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
      .importSyllabusCsv(courseId, version, pvId, file, this.importEffectiveFromTermId())
      .subscribe({
        next: res => {
          this.isImporting.set(false);
          this.importPreview.set(res);
          this.importStep.set(2);
        },
        error: err => {
          this.isImporting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Import CSV đề cương thất bại');
        },
      });
  }

  proceedToConfirmStep(): void {
    this.importStep.set(3);
  }

  confirmImportStep(): void {
    const preview = this.importPreview();
    if (!preview) {
      return;
    }
    this.isConfirmingImport.set(true);
    this.syllabusSvc.confirmImport(preview.syllabusId).subscribe({
      next: () => {
        this.isConfirmingImport.set(false);
        this.isImportModalVisible.set(false);
        this.alert.success('Import và xác nhận đề cương thành công');
        this.loadSyllabi(this.selectedCourseId());
      },
      error: err => {
        this.isConfirmingImport.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể xác nhận dữ liệu import đề cương');
      },
    });
  }
}

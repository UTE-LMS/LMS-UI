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
import { createPaginatedSelect } from '@builder/paginated-select.builder';
import { SystemConstant } from '@constants/system.constant';
import { IPagedResults } from '@models/common/response-data.model';
import { ICourse } from '@models/course/course.model';
import { ISyllabus, ISyllabusCsvImportResponse } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IProgramVersion, formatProgramVersionLabel } from '@models/program/program-version.model';
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
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { ImportTemplateFormat, saveBlobAs, templateFileNameFor } from '@services/common/import-file.util';
import { ImportFilePreviewComponent } from '@widget/import-file-preview/import-file-preview.component';

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
    NzSpinModule,
    NzModalModule,
    NzInputModule,
    StatusChipComponent,
    ImportFilePreviewComponent,
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

  readonly coursePageSize = 20;
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
  protected readonly formatProgramVersionLabel = formatProgramVersionLabel;
  readonly termSelect = createPaginatedSelect<ITerm>({
    fetchPage: ({ page, size, search }) => this.termSvc.getTerms(search, undefined, page, size),
    getId: t => t.id,
    fetchById: id => (this.termSvc.getTermById ? this.termSvc.getTermById(id) : EMPTY),
  });
  readonly pvSelect = createPaginatedSelect<IProgramVersion>({
    fetchPage: ({ page, size, search }) => this.programVersionSvc.getProgramVersions(page, size, undefined, undefined, undefined, undefined, search),
    getId: pv => pv.id,
    fetchById: id => this.programVersionSvc.getProgramVersionById(id),
  });
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
    return this.scopedCourses();
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
      nzContent: `Bạn có chắc chắn muốn khóa phiên bản đề cương [${s.version}]? Sau khi khóa, đề cương sẽ chuyển sang trạng thái Lưu trữ, ngăn chặn hoàn toàn việc nhập điểm và không thể chỉnh sửa.`,
      nzOkText: 'Khóa đề cương',
      nzOkDanger: true,
      nzOnOk: () => {
        this.syllabusSvc.lockSyllabus(s.id).subscribe({
          next: () => {
            this.alert.success(`Phiên bản đề cương [${s.version}] đã được khóa.`);
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

    this.searchCourseSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(keyword => {
          this.isSearchingCourse.set(true);
          this.currentCourseSearch.set(keyword);
          this.coursePage.set(0);
          return this.fetchCoursesPage(0, keyword).pipe(
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
    this.coursePage.set(0);
    this.currentCourseSearch.set('');
    this.fetchCoursesPage(0).subscribe({
      next: page => {
        const list = page.content || [];
        this.courseTotalPages.set(page.totalPages || 1);
        this.isCourseLastPage.set(page.last ?? (1 >= (page.totalPages || 1)));
        if (preferredCourseId) {
          const found = list.find(c => c.id === preferredCourseId);
          if (found) {
            if (this.isOutsideFaculty(found)) {
              this.showAllCourses.set(true);
            }
            this.allCourses.set(list);
            this.selectDefaultCourse(preferredCourseId);
            return;
          }
          this.courseSvc.getCourseById(preferredCourseId).subscribe({
            next: preferredCourse => {
              if (this.isOutsideFaculty(preferredCourse)) {
                this.showAllCourses.set(true);
                this.allCourses.set([preferredCourse, ...list]);
                this.onCourseChange(preferredCourseId);
                this.fetchCoursesPage(0).subscribe({
                  next: fullPage => {
                    const fullList = fullPage.content || [];
                    const merged = fullList.some(c => c.id === preferredCourse.id)
                      ? fullList
                      : [preferredCourse, ...fullList];
                    this.allCourses.set(merged);
                    this.courseTotalPages.set(fullPage.totalPages || 1);
                    this.isCourseLastPage.set(fullPage.last ?? (1 >= (fullPage.totalPages || 1)));
                  },
                  error: () => undefined,
                });
                return;
              }
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

  private activeFacultyFilter(): string | undefined {
    if (this.showAllCourses() || this.isAdmin()) {
      return undefined;
    }
    return this.pmFacultyId();
  }

  private isOutsideFaculty(course: ICourse | null | undefined): boolean {
    const fid = this.pmFacultyId();
    return Boolean(!this.isAdmin() && fid && course?.facultyId && course.facultyId !== fid);
  }

  private fetchCoursesPage(page: number, search?: string): Observable<IPagedResults<ICourse>> {
    const facultyId = this.activeFacultyFilter();
    if (facultyId) {
      return this.courseSvc.getCourses(page, this.coursePageSize, search, facultyId);
    }
    return search !== undefined
      ? this.courseSvc.getCourses(page, this.coursePageSize, search)
      : this.courseSvc.getCourses(page, this.coursePageSize);
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
        const safeList = list || [];
        this.syllabi.set(safeList);
      },
      error: () => {
        this.isLoadingSyllabi.set(false);
        this.hasError.set(true);
      },
    });
  }

  toggleShowAllCourses(): void {
    const nextVal = !this.showAllCourses();
    this.showAllCourses.set(nextVal);

    this.coursePage.set(0);
    this.currentCourseSearch.set('');
    const current = this.selectedCourse();
    this.fetchCoursesPage(0).subscribe({
      next: page => {
        const list = page.content || [];
        const merged = nextVal && current && !list.some(c => c.id === current.id)
          ? [current, ...list]
          : list;
        this.allCourses.set(merged);
        this.courseTotalPages.set(page.totalPages || 1);
        this.isCourseLastPage.set(page.last ?? (1 >= (page.totalPages || 1)));

        if (!nextVal) {
          const scoped = this.scopedCourses();
          if (scoped.length > 0 && !this.isCourseInScope()) {
            this.onCourseChange(scoped[0].id);
          }
        }
      },
      error: () => undefined,
    });
  }

  onCourseScrollToBottom(): void {
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

    this.fetchCoursesPage(nextPage, this.currentCourseSearch())
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

  /** Nhãn học phần trong ô chọn: chỉ ghi "(n TC)" khi đã có số tín chỉ (API trả null nếu chưa khai). */
  courseLabel(course: ICourse): string {
    const credits = course.credits ?? undefined;
    return `${course.code} — ${course.name}${credits === undefined ? '' : ` (${credits} TC)`}`;
  }

  openImportModal(): void {
    this.importStep.set(1);
    this.importVersion.set('');
    this.pvSelect.loadInitial();
    this.termSelect.loadInitial();
    const defaultPvId = this.pvSelect.options()[0]?.id ?? '';
    this.importProgramVersionId.set(defaultPvId);
    this.pvSelect.syncSelected(defaultPvId);
    this.importEffectiveFromTermId.set(null);
    this.termSelect.syncSelected(null);
    this.selectedFile.set(null);
    this.importPreview.set(null);
    this.isImportModalVisible.set(true);
  }

  onImportPvChange(pvId: string): void {
    this.importProgramVersionId.set(pvId);
    this.pvSelect.syncSelected(pvId);
  }

  onImportTermChange(termId: string | null): void {
    this.importEffectiveFromTermId.set(termId);
    this.termSelect.syncSelected(termId);
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
      this.alert.warning('Vui lòng chọn Phiên bản CTĐT, nhập mã phiên bản đề cương và chọn tệp (.csv hoặc .xlsx)');
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

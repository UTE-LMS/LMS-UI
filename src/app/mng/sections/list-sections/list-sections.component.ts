import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { createPaginatedSelect } from '@builder/paginated-select.builder';
import {
  SECTION_STATUS_DISPLAY, SYLLABUS_STATUS_DISPLAY,
} from '@constants/academic-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IUserError } from '@models/common/user-error.model';
import { ICourse } from '@models/course/course.model';
import { ISection } from '@models/course/section.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IUser } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { EnrollmentService } from '@services/course/enrollment.service';
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { ImportTemplateFormat } from '@services/common/import-file.util';
import { CsvImportModalComponent } from '@widget/csv-import-modal/csv-import-modal.component';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, forkJoin, map, Observable, of, Subject } from 'rxjs';
import { SectionModalComponent } from '../section-modal/section-modal.component';
import { displayEnrolledCount, sectionLecturersText } from '../sections.util';

/**
 * Danh sách lớp học phần (F05a US-19). Giảng viên chỉ thấy lớp mình phụ trách: do API lọc, UI không tự lọc quyền.
 * Tên giảng viên hiển thị trực tiếp từ `section.lecturers` do backend nạp sẵn; danh sách giảng viên ACTIVE chỉ tải cho ADMIN/PROGRAM_MANAGER khi mở hoặc sửa lớp.
 */
@Component({
  selector: 'app-list-sections',
  templateUrl: './list-sections.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, NzTableModule, NzButtonModule, NzSelectModule, NzSpinModule,
    CsvImportModalComponent, DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent, SectionModalComponent,
  ],
})
export class ListSectionsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly sectionSvc = inject(SectionService);
  private readonly enrollmentSvc = inject(EnrollmentService);
  private readonly termSvc = inject(TermService);
  private readonly courseSvc = inject(CourseService);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly authSvc = inject(AuthService);

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly sectionStatusDisplay = SECTION_STATUS_DISPLAY;
  protected readonly syllabusStatusDisplay = SYLLABUS_STATUS_DISPLAY;

  readonly roles = signal<string[]>([]);
  readonly currentUserId = signal('');
  readonly currentUserName = signal('');
  readonly termCache = signal<ReadonlyMap<string, ITerm>>(new Map());
  readonly courseCache = signal<ReadonlyMap<string, ICourse>>(new Map());
  readonly syllabi = signal<ReadonlyMap<string, ISyllabus>>(new Map());
  readonly lecturers = signal<IUser[]>([]);
  readonly sections = signal<ISection[]>([]);

  readonly termFilter = signal<string | null>(null);
  readonly courseFilter = signal<string | null>(null);
  readonly codeSearch = signal('');
  readonly page = signal(0);
  readonly size = signal(20);
  readonly totalElements = signal(0);

  readonly termSelect = createPaginatedSelect<ITerm>({
    fetchPage: ({ page, size, search }) => this.termSvc.getTerms(search, undefined, page, size),
    getId: t => t.id,
    fetchById: id => (this.termSvc.getTermById ? this.termSvc.getTermById(id) : EMPTY),
  });

  readonly courseSelect = createPaginatedSelect<ICourse>({
    fetchPage: ({ page, size, search }) => this.courseSvc.getCourses(page, size, search),
    getId: c => c.id,
    fetchById: id => (this.courseSvc.getCourseById ? this.courseSvc.getCourseById(id) : EMPTY),
  });

  private readonly searchSubject$ = new Subject<string>();

  readonly isLoading = signal(false);
  readonly loadError = signal<IUserError | null>(null);
  readonly isModalVisible = signal(false);
  readonly isSectionImportVisible = signal(false);
  readonly isBulkEnrollmentImportVisible = signal(false);

  /** Chỉ để ẩn nút: ADMIN hoặc PROGRAM_MANAGER mở lớp; backend kiểm tra lại đúng phạm vi CTĐT (D1). */
  readonly canCreate = computed(() => {
    const roles = this.roles();
    return roles.includes(SystemConstant.ROLE.ADMIN) || roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER);
  });

  readonly canBulkImportEnrollments = computed(() => {
    const roles = this.roles();
    return roles.includes(SystemConstant.ROLE.ADMIN)
      || roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)
      || roles.includes(SystemConstant.ROLE.LECTURER);
  });

  readonly isProgramManagerOnly = computed(() => {
    const roles = this.roles();
    return roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER) && !roles.includes(SystemConstant.ROLE.ADMIN);
  });

  readonly sectionImportGuideText = computed(() => {
    const base = 'Các cột: code, courseCode, syllabusVersion, termCode, lecturerUsernames (nhiều giảng viên ngăn cách bằng dấu ;).';
    return this.isProgramManagerOnly()
      ? `${base} Lưu ý: Trưởng chương trình đào tạo chỉ được import lớp cho các học phần thuộc khoa của mình.`
      : base;
  });

  readonly bulkEnrollmentGuideText
    = 'Các cột: sectionCode, studentCode, cohort. Sinh viên phải đã được ADMIN import vào hệ thống và đang ở trạng thái ACTIVE (Đang học); các dòng có studentCode chưa tồn tại hoặc ở trạng thái SUSPENDED / GRADUATED / DROPPED_OUT sẽ bị báo lỗi và không được ghi danh.';

  readonly downloadSectionTemplateFn = (format: ImportTemplateFormat) => this.sectionSvc.downloadImportTemplate(format);
  readonly importSectionsFn = (file: File) => this.sectionSvc.importSections(file);
  readonly downloadBulkEnrollmentTemplateFn = (format: ImportTemplateFormat) => this.enrollmentSvc.downloadBulkImportTemplate(format);
  readonly importBulkEnrollmentsFn = (file: File) => this.enrollmentSvc.importEnrollmentsBulk(file);

  /** Giảng viên chọn được khi mở lớp: người dùng LECTURER đang ACTIVE. */
  readonly lecturerOptions = computed(() => this.lecturers().filter(user => user.status === 'ACTIVE' && user.roles.includes(SystemConstant.ROLE.LECTURER)));

  readonly lecturerListAvailable = signal(false);

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.currentUserId.set(this.authSvc.getUserId());
    this.currentUserName.set(this.authSvc.getNameOfLogin?.() ?? '');

    this.searchSubject$
      .pipe(
        map(q => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(0);
        this.loadSections();
      });

    this.loadCatalogs();
    this.loadSections();
  }

  loadCatalogs(): void {
    this.termSelect.loadInitial();
    this.courseSelect.loadInitial();
    if (this.canCreate() && typeof this.sectionSvc.getLecturers === 'function') {
      this.sectionSvc.getLecturers().pipe(catchError(() => of(null))).subscribe(list => {
        this.lecturers.set(list ?? []);
        this.lecturerListAvailable.set(list !== null);
      });
    }
  }

  loadSections(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.sectionSvc.getSections(
      this.termFilter() ?? undefined,
      this.courseFilter() ?? undefined,
      this.codeSearch().trim() || undefined,
      this.page(),
      this.size(),
    ).subscribe({
      next: res => {
        const list = res.content ?? [];
        this.sections.set(list);
        this.totalElements.set(res.totalElements ?? list.length);
        this.page.set(res.page ?? this.page());
        this.size.set(res.size ?? this.size());
        this.isLoading.set(false);
        this.hydrateReferences(list);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  onTermFilterChange(termId: string | null): void {
    this.termFilter.set(termId);
    this.termSelect.syncSelected(termId);
    this.page.set(0);
    this.loadSections();
  }

  onCourseFilterChange(courseId: string | null): void {
    this.courseFilter.set(courseId);
    this.courseSelect.syncSelected(courseId);
    this.page.set(0);
    this.loadSections();
  }

  onCodeSearchChange(keyword: string): void {
    this.codeSearch.set(keyword);
    this.searchSubject$.next(keyword);
  }

  onPageIndexChange(page1Indexed: number): void {
    this.page.set(Math.max(0, page1Indexed - 1));
    this.loadSections();
  }

  onPageSizeChange(newSize: number): void {
    this.size.set(newSize);
    this.page.set(0);
    this.loadSections();
  }

  termCode(termId: string): string {
    return this.termSelect.options().find(t => t.id === termId)?.code
      ?? this.termCache().get(termId)?.code
      ?? '—';
  }

  courseOf(courseId: string): ICourse | undefined {
    return this.courseSelect.options().find(c => c.id === courseId)
      ?? this.courseCache().get(courseId);
  }

  syllabusOf(syllabusId: string): ISyllabus | undefined {
    return this.syllabi().get(syllabusId);
  }

  enrolledText(section: ISection): string {
    return displayEnrolledCount(section.enrolledCount);
  }

  lecturersText(section: ISection): string {
    return sectionLecturersText(section, this.currentUserId(), this.currentUserName());
  }

  onSaved(): void {
    this.loadSections();
  }

  /** Tra thêm các học kỳ/học phần/đề cương chưa có trong bộ nhớ đệm. */
  private hydrateReferences(list: ISection[]): void {
    const missingTermIds = [...new Set(list.map(s => s.termId))].filter(
      id => !this.termSelect.options().some(t => t.id === id) && !this.termCache().has(id),
    );
    if (missingTermIds.length > 0 && typeof this.termSvc.getTermById === 'function') {
      this.fetchAll(missingTermIds.map(id => this.termSvc.getTermById(id))).subscribe(found => {
        if (found.length > 0) {
          this.termCache.update(current => new Map([...current, ...found.map(t => [t.id, t] as const)]));
        }
      });
    }
    const missingCourseIds = [...new Set(list.map(s => s.courseId))].filter(id => !this.courseOf(id));
    if (missingCourseIds.length > 0) {
      this.fetchAll(missingCourseIds.map(id => this.courseSvc.getCourseById(id))).subscribe(found => {
        if (found.length > 0) {
          this.courseCache.update(current => new Map([...current, ...found.map(c => [c.id, c] as const)]));
        }
      });
    }
    const syllabusIds = [...new Set(list.map(s => s.syllabusId))].filter(id => !this.syllabi().has(id));
    if (syllabusIds.length > 0) {
      this.fetchAll(syllabusIds.map(id => this.syllabusSvc.getSyllabusById(id))).subscribe(found => {
        if (found.length > 0) {
          this.syllabi.update(current => new Map([...current, ...found.map(s => [s.id, s] as const)]));
        }
      });
    }
  }

  /** Gọi song song, lỗi một phần tử bị bỏ qua (khi đó giao diện hiện mã thay vì tên). */
  private fetchAll<T>(requests: Observable<T>[]): Observable<T[]> {
    return forkJoin(requests.map(r => r.pipe(catchError(() => of(null))))).pipe(
      map(values => values.filter((v): v is T => v !== null)),
    );
  }
}

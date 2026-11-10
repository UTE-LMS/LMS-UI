import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ACADEMIC_TERMS_TAB_QUERY, SECTION_STATUS_DISPLAY, SYLLABUS_STATUS_DISPLAY,
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
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { UserService } from '@services/user/user.service';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { SectionModalComponent } from '../section-modal/section-modal.component';
import { displayEnrolledCount, lecturerLabel } from '../sections.util';

/**
 * Danh sách lớp học phần (F05a US-19). Giảng viên chỉ thấy lớp mình phụ trách: do API lọc, UI không tự lọc quyền.
 * Backend chỉ trả ID của học phần, đề cương, giảng viên nên màn hình tra thêm tên/phiên bản để hiển thị.
 */
@Component({
  selector: 'app-list-sections',
  templateUrl: './list-sections.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, NzTableModule, NzButtonModule, NzSelectModule,
    DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent, SectionModalComponent,
  ],
})
export class ListSectionsComponent implements OnInit {
  private readonly sectionSvc = inject(SectionService);
  private readonly termSvc = inject(TermService);
  private readonly courseSvc = inject(CourseService);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly userSvc = inject(UserService);
  private readonly authSvc = inject(AuthService);

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly termsTabQuery = ACADEMIC_TERMS_TAB_QUERY;
  protected readonly sectionStatusDisplay = SECTION_STATUS_DISPLAY;
  protected readonly syllabusStatusDisplay = SYLLABUS_STATUS_DISPLAY;

  readonly roles = signal<string[]>([]);
  readonly currentUserId = signal('');
  readonly terms = signal<ITerm[]>([]);
  readonly courses = signal<ICourse[]>([]);
  readonly syllabi = signal<ReadonlyMap<string, ISyllabus>>(new Map());
  readonly users = signal<IUser[]>([]);
  readonly sections = signal<ISection[]>([]);

  readonly termFilter = signal<string | null>(null);
  readonly courseFilter = signal<string | null>(null);
  readonly codeSearch = signal('');

  readonly isLoading = signal(false);
  readonly loadError = signal<IUserError | null>(null);
  readonly isModalVisible = signal(false);

  /** Chỉ để ẩn nút: ADMIN hoặc PROGRAM_MANAGER mở lớp; backend kiểm tra lại đúng phạm vi CTĐT (D1). */
  readonly canCreate = computed(() => {
    const roles = this.roles();
    return roles.includes(SystemConstant.ROLE.ADMIN) || roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER);
  });

  readonly lecturerNames = computed<ReadonlyMap<string, string>>(
    () => new Map(this.users().map(user => [user.id, user.username])),
  );

  /** Giảng viên chọn được khi mở lớp: người dùng LECTURER đang ACTIVE (danh sách chỉ ADMIN tải được). */
  readonly lecturerOptions = computed(() => this.users().filter(user => user.status === 'ACTIVE' && user.roleAssignments.some(a => a.role === SystemConstant.ROLE.LECTURER)));

  readonly lecturerListAvailable = signal(false);

  /** Lọc theo mã lớp chỉ để hiển thị (không gọi lại API). */
  readonly visibleSections = computed(() => {
    const needle = this.codeSearch().trim().toLowerCase();
    return needle ? this.sections().filter(s => s.code.toLowerCase().includes(needle)) : this.sections();
  });

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.currentUserId.set(this.authSvc.getUserId());
    this.loadCatalogs();
    this.loadSections();
  }

  loadCatalogs(): void {
    this.termSvc.getTerms().pipe(catchError(() => of([] as ITerm[]))).subscribe(list => this.terms.set(list ?? []));
    this.courseSvc.getCourses(0, 100).pipe(catchError(() => of(null))).subscribe(page => this.courses.set(page?.content ?? []));
    if (this.roles().includes(SystemConstant.ROLE.ADMIN)) {
      this.userSvc.filter(0, 100).pipe(catchError(() => of(null))).subscribe(page => {
        this.users.set(page?.content ?? []);
        this.lecturerListAvailable.set(page !== null);
      });
    }
  }

  loadSections(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.sectionSvc.getSections(this.termFilter() ?? undefined, this.courseFilter() ?? undefined).subscribe({
      next: list => {
        this.sections.set(list ?? []);
        this.isLoading.set(false);
        this.hydrateReferences(list ?? []);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  applyFilters(): void {
    this.loadSections();
  }

  termCode(termId: string): string {
    return this.terms().find(t => t.id === termId)?.code ?? '—';
  }

  courseOf(courseId: string): ICourse | undefined {
    return this.courses().find(c => c.id === courseId);
  }

  syllabusOf(syllabusId: string): ISyllabus | undefined {
    return this.syllabi().get(syllabusId);
  }

  enrolledText(section: ISection): string {
    return displayEnrolledCount(section.enrolledCount);
  }

  lecturersText(section: ISection): string {
    return section.lecturerIds.map(id => lecturerLabel(id, this.lecturerNames(), this.currentUserId())).join(', ');
  }

  onSaved(): void {
    this.loadSections();
  }

  /** Tra thêm các học phần/đề cương chưa có trong danh mục đã tải (danh mục học phần phân trang tối đa 100). */
  private hydrateReferences(list: ISection[]): void {
    const missingCourseIds = [...new Set(list.map(s => s.courseId))].filter(id => !this.courseOf(id));
    if (missingCourseIds.length > 0) {
      this.fetchAll(missingCourseIds.map(id => this.courseSvc.getCourseById(id))).subscribe(found => this.courses.update(current => [...current, ...found]));
    }
    const syllabusIds = [...new Set(list.map(s => s.syllabusId))].filter(id => !this.syllabi().has(id));
    if (syllabusIds.length > 0) {
      this.fetchAll(syllabusIds.map(id => this.syllabusSvc.getSyllabusById(id))).subscribe(found => this.syllabi.update(current => new Map([...current, ...found.map(s => [s.id, s] as const)])));
    }
  }

  /** Gọi song song, lỗi một phần tử bị bỏ qua (khi đó giao diện hiện mã thay vì tên). */
  private fetchAll<T>(requests: Observable<T>[]): Observable<T[]> {
    return forkJoin(requests.map(r => r.pipe(catchError(() => of(null))))).pipe(
      map(values => values.filter((v): v is T => v !== null)),
    );
  }
}

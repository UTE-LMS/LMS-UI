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
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { ISyllabus, ISyllabusRequest } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IRoleAssignment } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { VerificationBadgeComponent } from '@widget/verification-badge/verification-badge.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
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
import { AssignCourseModalComponent } from '../assign-course-modal/assign-course-modal.component';

@Component({
  selector: 'app-list-syllabi',
  templateUrl: './list-syllabi.component.html',
  styleUrl: './list-syllabi.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzSelectModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    StatusChipComponent,
    VerificationBadgeComponent,
    AssignCourseModalComponent,
  ],
})
export class ListSyllabiComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly courseSvc = inject(CourseService);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly termSvc = inject(TermService);
  private readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);
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
  readonly showAllCourses = signal(false);

  readonly allCourses = signal<ICourse[]>([]);
  readonly scopedCourses = signal<ICourse[]>([]);
  readonly terms = signal<ITerm[]>([]);
  readonly selectedCourseId = signal<string>('');
  readonly syllabi = signal<ISyllabus[]>([]);
  readonly isLoadingSyllabi = signal(false);
  readonly hasError = signal(false);

  /** Modal tạo phiên bản đề cương mới */
  readonly isCreateModalVisible = signal(false);
  readonly isSubmitting = signal(false);

  /** Modal Trưởng bộ môn phân công giảng viên */
  readonly isAssignModalVisible = signal(false);

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

  /** Kiểm tra môn đang chọn có nằm trong scope.courseIds của người dùng không */
  readonly isCourseInScope = computed(() => {
    const cid = this.selectedCourseId();
    return !!cid && this.scopeCourseIds().includes(cid);
  });

  /**
   * Quyền phân công giảng viên: Chỉ duy nhất PROGRAM_MANAGER có môn học trong scope.courseIds (ADR 0014).
   */
  readonly canAssignCourse = computed(() => {
    if (!this.selectedCourseId() || this.isAdmin()) {
      return false;
    }
    return (
      this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER) && this.isCourseInScope()
    );
  });

  /**
   * Quyền tạo phiên bản đề cương DRAFT: LECTURER hoặc PROGRAM_MANAGER trong scope (ADR 0014).
   * ADMIN không có thẩm quyền học thuật để biên soạn đề cương.
   */
  readonly canCreateSyllabus = computed(() => {
    if (!this.selectedCourseId() || this.isAdmin()) {
      return false;
    }
    const roles = this.userRoles();
    const isAuthorRole =
      roles.includes(SystemConstant.ROLE.LECTURER)
      || roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER);
    return isAuthorRole && this.isCourseInScope();
  });

  readonly syllabusForm: FormGroup = this.fb.group(
    {
      version: ['', [Validators.required]],
      effectiveFromTermId: [null as string | null],
      effectiveToTermId: [null as string | null],
    },
    { validators: [this.termOrderValidator.bind(this)] },
  );

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());
    const assignments = this.authSvc.getRoleAssignments();
    const courseIds = new Set<string>();
    assignments.forEach((a: IRoleAssignment) => {
      (a.scope?.courseIds ?? []).forEach(id => courseIds.add(id));
    });
    this.scopeCourseIds.set(Array.from(courseIds));

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

  private termOrderValidator(group: AbstractControl): ValidationErrors | null {
    const fromId = group.get('effectiveFromTermId')?.value as string | null;
    const toId = group.get('effectiveToTermId')?.value as string | null;
    if (!fromId || !toId) {
      return null;
    }
    const termList = this.terms();
    const fromTerm = termList.find(t => t.id === fromId);
    const toTerm = termList.find(t => t.id === toId);
    if (fromTerm?.startDate && toTerm?.startDate) {
      if (new Date(toTerm.startDate).getTime() < new Date(fromTerm.startDate).getTime()) {
        return { termOrderInvalid: true };
      }
    }
    return null;
  }

  loadInitialCatalog(preferredCourseId: string | null): void {
    this.termSvc.getTerms().subscribe({
      next: list => this.terms.set(list || []),
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

  openCreateSyllabusModal(): void {
    this.syllabusForm.reset({
      version: '',
      effectiveFromTermId: null,
      effectiveToTermId: null,
    });
    this.isCreateModalVisible.set(true);
  }

  submitCreateSyllabus(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return;
    }
    if (this.syllabusForm.invalid) {
      Object.values(this.syllabusForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const raw = this.syllabusForm.getRawValue() as {
      version: string;
      effectiveFromTermId: string | null;
      effectiveToTermId: string | null;
    };
    const payload: ISyllabusRequest = {
      version: raw.version.trim(),
      effectiveFromTermId: raw.effectiveFromTermId ?? null,
      effectiveToTermId: raw.effectiveToTermId ?? null,
    };

    this.isSubmitting.set(true);
    this.syllabusSvc.createSyllabus(courseId, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isCreateModalVisible.set(false);
        this.alert.success('Khởi tạo phiên bản đề cương DRAFT thành công');
        this.loadSyllabi(courseId);
      },
      error: err => {
        this.isSubmitting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể tạo phiên bản đề cương');
      },
    });
  }
}

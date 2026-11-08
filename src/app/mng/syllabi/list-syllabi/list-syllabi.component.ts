import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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

  readonly userRoles = signal<string[]>([]);
  readonly scopeCourseIds = signal<string[]>([]);
  readonly showAllCourses = signal(false);

  readonly allCourses = signal<ICourse[]>([]);
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
    const courses = this.allCourses();
    const scopedIds = this.scopeCourseIds();
    if (this.showAllCourses() || this.isAdmin() || scopedIds.length === 0) {
      return courses;
    }
    return courses.filter(c => scopedIds.includes(c.id));
  });

  readonly selectedCourse = computed(
    () => this.allCourses().find(c => c.id === this.selectedCourseId()) ?? null,
  );

  /** Kiểm tra môn đang chọn có nằm trong scope.courseIds của người dùng không */
  readonly isCourseInScope = computed(() => {
    const cid = this.selectedCourseId();
    return !!cid && this.scopeCourseIds().includes(cid);
  });

  /**
   * Quyền phân công giảng viên: Chỉ duy nhất DEPARTMENT_HEAD có môn học trong scope.courseIds (ADR 0010).
   * Thu hồi quyền ADMIN khỏi các endpoint phân công bộ môn.
   */
  readonly canAssignCourse = computed(() => {
    if (!this.selectedCourseId() || this.isAdmin()) {
      return false;
    }
    return (
      this.userRoles().includes(SystemConstant.ROLE.DEPARTMENT_HEAD) && this.isCourseInScope()
    );
  });

  /**
   * Quyền tạo phiên bản đề cương DRAFT: LECTURER hoặc DEPARTMENT_HEAD trong scope.courseIds (ADR 0010).
   * ADMIN không có thẩm quyền học thuật để biên soạn đề cương (Thu hồi quyền ADMIN theo ADR 0010).
   */
  readonly canCreateSyllabus = computed(() => {
    if (!this.selectedCourseId() || this.isAdmin()) {
      return false;
    }
    const roles = this.userRoles();
    const isAuthorRole =
      roles.includes(SystemConstant.ROLE.LECTURER)
      || roles.includes(SystemConstant.ROLE.DEPARTMENT_HEAD);
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

    this.courseSvc.getCourses(0, 100).subscribe({
      next: page => {
        const list = page.content || [];
        this.allCourses.set(list);
        const candidates = this.filteredCourses();
        const initialId =
          preferredCourseId && list.some(c => c.id === preferredCourseId)
            ? preferredCourseId
            : (candidates[0]?.id ?? list[0]?.id ?? '');
        if (initialId) {
          this.onCourseChange(initialId);
        }
      },
      error: () => {
        this.hasError.set(true);
      },
    });
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
    this.showAllCourses.update(v => !v);
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

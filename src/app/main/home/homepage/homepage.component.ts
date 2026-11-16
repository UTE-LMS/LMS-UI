import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ICloPiLinkCell, ICloPiMatrix } from '@models/course/clo.model';
import { CourseCategory, IProgramCourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { IFaculty } from '@models/faculty/faculty.model';
import { IPi, IPlo } from '@models/program/plo-pi.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { IProgram } from '@models/program/program.model';
import { CloService } from '@services/course/clo.service';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { FacultyService } from '@services/faculty/faculty.service';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

export type HomepageViewMode = 'PROGRAMS' | 'VERSIONS' | 'SYLLABI';
export type AcademicTabKey = 'PLO_PI' | 'COURSES' | 'CLO_PI_MATRIX';

export interface IPloTreeRow {
  id: string;
  isPlo: boolean;
  code: string;
  categoryLabel?: string;
  content: string;
  original?: string;
  capabilityLevel?: number;
  piCount?: number;
  targetPassRate?: number;
  sourceLabel?: string;
}

export interface ISemesterSummary {
  semesterLabel: string;
  semesterNumber: number | null;
  courseCount: number;
  totalCredits: number;
}

@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css',
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzTableModule,
    NzButtonModule,
    NzSpinModule,
    NzEmptyModule,
    NzTooltipModule,
    NzTagModule,
    StatusChipComponent,
    BloomLevelLabelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomepageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  private readonly facultyService = inject(FacultyService);
  private readonly programService = inject(ProgramService);
  private readonly versionService = inject(ProgramVersionService);
  private readonly ploPiService = inject(PloPiService);
  private readonly courseService = inject(CourseService);
  private readonly syllabusService = inject(SyllabusService);
  private readonly cloService = inject(CloService);

  // --- View Mode ('PROGRAMS' = Trang chính chỉ hiển thị CTĐT đang áp dụng, 'VERSIONS' = Xem phiên bản CTĐT, 'SYLLABI' = Xem đề cương) ---
  readonly viewMode = signal<HomepageViewMode>('PROGRAMS');

  // --- Statistics Counters ---
  readonly facultyCount = signal<number>(0);
  readonly programCount = signal<number>(0);
  readonly courseCount = signal<number>(0);
  readonly publishedVersionCount = signal<number>(0);
  readonly isLoadingStats = signal<boolean>(false);

  // --- Trang chính: Danh sách Chương trình đào tạo đang còn áp dụng ---
  readonly activeProgramsList = signal<IProgram[]>([]);
  readonly isLoadingActivePrograms = signal<boolean>(false);

  // --- Cascading Filter State (dùng trong giao diện VERSIONS và SYLLABI) ---
  readonly faculties = signal<IFaculty[]>([]);
  readonly selectedFacultyId = signal<string | null>(null);

  readonly programs = signal<IProgram[]>([]);
  readonly selectedProgramId = signal<string | null>(null);

  readonly versions = signal<IProgramVersion[]>([]);
  readonly selectedCohort = signal<string | null>(null);
  readonly selectedVersionId = signal<string | null>(null);

  readonly programCourses = signal<IProgramCourse[]>([]);
  readonly selectedCourseId = signal<string | null>(null);

  readonly syllabi = signal<ISyllabus[]>([]);
  readonly selectedSyllabusId = signal<string | null>(null);

  // --- Loading & Error Indicators ---
  readonly isLoadingFaculties = signal<boolean>(false);
  readonly isLoadingPrograms = signal<boolean>(false);
  readonly isLoadingVersions = signal<boolean>(false);
  readonly isLoadingDetails = signal<boolean>(false);
  readonly isLoadingMatrix = signal<boolean>(false);

  readonly hasErrorFaculties = signal<boolean>(false);
  readonly hasErrorDetails = signal<boolean>(false);
  readonly hasErrorMatrix = signal<boolean>(false);

  // --- Tab 1: PLO / PI Data ---
  readonly plos = signal<IPlo[]>([]);
  readonly pis = signal<IPi[]>([]);

  // --- Tab 2: Course Filter Options ---
  readonly filterSemester = signal<number | null>(null);
  readonly filterCategory = signal<CourseCategory | null>(null);
  readonly courseSearchQuery = signal<string>('');

  readonly semesterOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly categoryOptions: { value: CourseCategory; label: string; }[] = [
    { value: 'FOUNDATION', label: 'Đại cương' },
    { value: 'MAJOR_FOUNDATION', label: 'Cơ sở ngành' },
    { value: 'SPECIALIZED', label: 'Chuyên ngành' },
    { value: 'CAPSTONE_PROJECT', label: 'Đồ án / Thực tập' },
    { value: 'THESIS', label: 'Khóa luận tốt nghiệp' },
  ];

  private readonly categoryLabelMap: Record<string, string> = {
    FOUNDATION: 'Đại cương',
    MAJOR_FOUNDATION: 'Cơ sở ngành',
    SPECIALIZED: 'Chuyên ngành',
    CAPSTONE_PROJECT: 'Đồ án / Thực tập',
    THESIS: 'Khóa luận TN',
  };

  private readonly ploCategoryLabels: Record<string, string> = {
    GENERAL: 'Đại cương',
    SPECIALIZED: 'Chuyên ngành',
  };

  // --- Tab 3: CLO-PI Matrix Data ---
  readonly matrixData = signal<ICloPiMatrix | null>(null);

  // --- Active Tab ---
  readonly activeTab = signal<AcademicTabKey>('PLO_PI');

  // --- Computed Active Programs on Main Page (chỉ hiển thị các CTĐT đang còn áp dụng) ---
  readonly activePrograms = computed<IProgram[]>(() => {
    return this.activeProgramsList().filter(p => p.isActive !== false);
  });

  // --- Computed Selections ---
  readonly selectedFaculty = computed(
    () => this.faculties().find(f => f.id === this.selectedFacultyId()) ?? null,
  );

  readonly selectedProgram = computed(
    () => this.programs().find(p => p.id === this.selectedProgramId()) ?? null,
  );

  readonly availableCohorts = computed<string[]>(() => {
    const cohortSet = new Set<string>();
    for (const ver of this.versions()) {
      const c = ver.applicableCohort?.trim();
      if (c) {
        cohortSet.add(c);
      }
    }
    return Array.from(cohortSet);
  });

  readonly filteredVersions = computed<IProgramVersion[]>(() => {
    const cohort = this.selectedCohort();
    const allVers = this.versions();
    if (!cohort) {
      return allVers;
    }
    return allVers.filter(v => v.applicableCohort?.trim() === cohort);
  });

  readonly selectedVersion = computed(
    () => this.versions().find(v => v.id === this.selectedVersionId()) ?? null,
  );

  readonly selectedSyllabus = computed(
    () => this.syllabi().find(s => s.id === this.selectedSyllabusId()) ?? null,
  );

  // --- Computed Tree Rows for Tab 1 (sorted by displayOrder ascending) ---
  readonly sortedPlos = computed<IPlo[]>(() => {
    const list = [...this.plos()];
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  });

  readonly treeRows = computed<IPloTreeRow[]>(() => {
    const rows: IPloTreeRow[] = [];
    const currentPlos = this.sortedPlos();
    const currentPis = this.pis();

    for (const plo of currentPlos) {
      const childPis = currentPis
        .filter(pi => pi.ploId === plo.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const summary = plo.contentSummary ?? plo.contentOriginal ?? '';
      const original = plo.contentOriginal !== plo.contentSummary ? plo.contentOriginal : undefined;

      rows.push({
        id: `plo-${plo.id}`,
        isPlo: true,
        code: plo.code,
        categoryLabel: plo.category ? this.ploCategoryLabels[plo.category] : undefined,
        content: summary,
        original,
        capabilityLevel: plo.capabilityLevelRaw,
        piCount: childPis.length,
        sourceLabel: plo.contentOriginal ? 'Đã đối chiếu bản gốc' : 'Chuẩn đầu ra CTĐT',
      });

      for (const pi of childPis) {
        rows.push({
          id: `pi-${pi.id}`,
          isPlo: false,
          code: pi.code,
          content: pi.contentShort ?? pi.contentOriginal ?? '',
          capabilityLevel: pi.capabilityLevelRaw,
          targetPassRate: pi.targetPassRate,
        });
      }
    }
    return rows;
  });

  // --- Computed Filtered Courses & Credits for Tab 2 ---
  readonly filteredCourses = computed<IProgramCourse[]>(() => {
    const semester = this.filterSemester();
    const category = this.filterCategory();
    const search = this.courseSearchQuery().trim().toLowerCase();

    return this.programCourses().filter(pc => {
      if (semester !== null && pc.semester !== semester) {
        return false;
      }
      if (category !== null && pc.category !== category) {
        return false;
      }
      if (search) {
        const code = (pc.course?.code ?? pc.courseId).toLowerCase();
        const name = (pc.course?.name ?? '').toLowerCase();
        if (!code.includes(search) && !name.includes(search)) {
          return false;
        }
      }
      return true;
    });
  });

  readonly totalCourseCredits = computed<number>(() => {
    return this.programCourses().reduce((sum, pc) => {
      const cred = pc.credits ?? pc.course?.credits ?? 0;
      return sum + cred;
    }, 0);
  });

  readonly filteredCourseCredits = computed<number>(() => {
    return this.filteredCourses().reduce((sum, pc) => {
      const cred = pc.credits ?? pc.course?.credits ?? 0;
      return sum + cred;
    }, 0);
  });

  readonly semesterSummaries = computed<ISemesterSummary[]>(() => {
    const groups = new Map<number | null, { count: number; credits: number; }>();
    for (const pc of this.programCourses()) {
      const sem = pc.semester ?? null;
      const existing = groups.get(sem) ?? { count: 0, credits: 0 };
      const cred = pc.credits ?? pc.course?.credits ?? 0;
      groups.set(sem, {
        count: existing.count + 1,
        credits: existing.credits + cred,
      });
    }
    const result: ISemesterSummary[] = [];
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === null) {
        return 1;
      }
      if (b === null) {
        return -1;
      }
      return a - b;
    });
    for (const key of sortedKeys) {
      const item = groups.get(key);
      if (item) {
        result.push({
          semesterNumber: key,
          semesterLabel: key !== null ? `Học kỳ ${key}` : 'Chưa xếp kỳ',
          courseCount: item.count,
          totalCredits: item.credits,
        });
      }
    }
    return result;
  });

  // --- Computed Matrix Helpers for Tab 3 ---
  readonly matrixClos = computed(() => this.matrixData()?.clos ?? []);
  readonly matrixPis = computed(() => this.matrixData()?.pis ?? []);

  ngOnInit(): void {
    this.loadGlobalStatistics();
    this.loadFaculties();
    this.loadActiveProgramsForHome();

    if (this.route?.queryParamMap) {
      this.route.queryParamMap
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(params => {
          const view = params.get('view');
          if (view === 'versions') {
            this.viewMode.set('VERSIONS');
            if (this.activeTab() === 'CLO_PI_MATRIX') {
              this.activeTab.set('PLO_PI');
            }
          } else if (view === 'syllabi') {
            this.viewMode.set('SYLLABI');
            this.activeTab.set('CLO_PI_MATRIX');
          } else {
            this.viewMode.set('PROGRAMS');
          }
        });
    }
  }

  switchView(mode: HomepageViewMode, updateUrl = true): void {
    this.viewMode.set(mode);
    if (mode === 'SYLLABI') {
      this.activeTab.set('CLO_PI_MATRIX');
    } else if (mode === 'VERSIONS' && this.activeTab() === 'CLO_PI_MATRIX') {
      this.activeTab.set('PLO_PI');
    }
    if (updateUrl && this.router) {
      const viewParam = mode === 'VERSIONS' ? 'versions' : mode === 'SYLLABI' ? 'syllabi' : null;
      void this.router.navigate([], {
        queryParams: { view: viewParam },
        queryParamsHandling: 'merge',
      });
    }
  }

  openProgramVersions(prog: IProgram): void {
    this.switchView('VERSIONS');
    if (prog.facultyId) {
      this.onSelectFaculty(prog.facultyId);
    }
    this.onSelectProgram(prog.id);
  }

  openProgramSyllabi(prog: IProgram): void {
    this.switchView('SYLLABI');
    if (prog.facultyId) {
      this.onSelectFaculty(prog.facultyId);
    }
    this.onSelectProgram(prog.id);
  }

  getFacultyName(facultyId?: string, fallbackName?: string): string {
    if (fallbackName) {
      return fallbackName;
    }
    if (!facultyId) {
      return '—';
    }
    const found = this.faculties().find(f => f.id === facultyId);
    return found ? `${found.code} — ${found.name}` : facultyId;
  }

  loadActiveProgramsForHome(): void {
    this.isLoadingActivePrograms.set(true);
    this.programService
      .getPrograms(0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const items = (res.content ?? []).filter(p => p.isActive !== false);
          this.activeProgramsList.set(items);
          this.isLoadingActivePrograms.set(false);
        },
        error: () => {
          this.activeProgramsList.set([]);
          this.isLoadingActivePrograms.set(false);
        },
      });
  }

  // --- Step 1: Faculties ---
  loadFaculties(): void {
    this.isLoadingFaculties.set(true);
    this.hasErrorFaculties.set(false);
    this.facultyService
      .getFaculties(0, 100, undefined, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const items = res.content ?? [];
          this.faculties.set(items);
          this.facultyCount.set(res.totalElements ?? items.length);
          this.isLoadingFaculties.set(false);
        },
        error: () => {
          this.faculties.set([]);
          this.isLoadingFaculties.set(false);
          this.hasErrorFaculties.set(true);
        },
      });
  }

  onSelectFaculty(facultyId: string | null): void {
    if (this.viewMode() === 'PROGRAMS' && facultyId) {
      this.viewMode.set('VERSIONS');
    }
    this.selectedFacultyId.set(facultyId);
    this.selectedProgramId.set(null);
    this.selectedCohort.set(null);
    this.selectedVersionId.set(null);
    this.selectedCourseId.set(null);
    this.selectedSyllabusId.set(null);
    this.programs.set([]);
    this.versions.set([]);
    this.resetVersionDetails();

    if (facultyId) {
      this.loadPrograms(facultyId);
    }
  }

  // --- Step 2: Programs ---
  loadPrograms(facultyId: string): void {
    this.isLoadingPrograms.set(true);
    this.programService
      .getPrograms(0, 100, facultyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.programs.set(res.content ?? []);
          this.isLoadingPrograms.set(false);
        },
        error: () => {
          this.programs.set([]);
          this.isLoadingPrograms.set(false);
        },
      });
  }

  onSelectProgram(programId: string | null): void {
    if (this.viewMode() === 'PROGRAMS' && programId) {
      this.viewMode.set('VERSIONS');
    }
    this.selectedProgramId.set(programId);
    this.selectedCohort.set(null);
    this.selectedVersionId.set(null);
    this.selectedCourseId.set(null);
    this.selectedSyllabusId.set(null);
    this.versions.set([]);
    this.resetVersionDetails();

    if (programId) {
      this.loadVersions(programId);
    }
  }

  // --- Step 3: Versions & Cohorts ---
  loadVersions(programId: string): void {
    this.isLoadingVersions.set(true);
    this.versionService
      .getProgramVersions(0, 100, programId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const list = res.content ?? [];
          this.versions.set(list);
          this.isLoadingVersions.set(false);
          const activeVer = list.find(v => v.status === 'ACTIVE') ?? list[0];
          if (activeVer) {
            this.onSelectVersion(activeVer.id);
          }
        },
        error: () => {
          this.versions.set([]);
          this.isLoadingVersions.set(false);
        },
      });
  }

  onSelectCohort(cohort: string | null): void {
    this.selectedCohort.set(cohort);
    const matching = this.filteredVersions();
    const currentId = this.selectedVersionId();
    if (currentId && matching.some(v => v.id === currentId)) {
      return;
    }
    const nextVer = matching.find(v => v.status === 'ACTIVE') ?? matching[0] ?? null;
    this.onSelectVersion(nextVer ? nextVer.id : null);
  }

  onSelectVersion(versionId: string | null): void {
    this.selectedVersionId.set(versionId);
    this.selectedCourseId.set(null);
    this.selectedSyllabusId.set(null);
    this.resetVersionDetails();

    if (versionId) {
      this.loadVersionDetails(versionId);
    }
  }

  // --- Version Inspection Data (Tabs 1, 2, 3) ---
  loadVersionDetails(versionId: string): void {
    this.isLoadingDetails.set(true);
    this.hasErrorDetails.set(false);

    this.ploPiService
      .getPlos(versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: plos => this.plos.set(plos ?? []),
        error: () => {
          this.plos.set([]);
          this.hasErrorDetails.set(true);
        },
      });

    this.ploPiService
      .getPis(versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pis => this.pis.set(pis ?? []),
        error: () => {
          this.pis.set([]);
          this.hasErrorDetails.set(true);
        },
      });

    this.courseService
      .getProgramCourses(versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: courses => {
          const courseList = courses ?? [];
          this.programCourses.set(courseList);
          this.isLoadingDetails.set(false);
          if (courseList.length > 0) {
            this.onSelectCourse(courseList[0].courseId);
          }
        },
        error: () => {
          this.programCourses.set([]);
          this.isLoadingDetails.set(false);
          this.hasErrorDetails.set(true);
        },
      });
  }

  retryLoadVersionDetails(): void {
    const versionId = this.selectedVersionId();
    if (versionId) {
      this.loadVersionDetails(versionId);
    }
  }

  // --- Step 4 & Tab 3: Course & Syllabus Selection ---
  onSelectCourse(courseId: string | null): void {
    this.selectedCourseId.set(courseId);
    this.selectedSyllabusId.set(null);
    this.matrixData.set(null);
    this.syllabi.set([]);
    this.hasErrorMatrix.set(false);

    if (!courseId) {
      return;
    }

    this.syllabusService
      .getSyllabiByCourse(courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          const items = list ?? [];
          this.syllabi.set(items);
          const activeSyl = items.find(s => s.status === 'CONFIRMED') ?? items[0];
          if (activeSyl) {
            this.onSelectSyllabus(activeSyl.id);
          }
        },
        error: () => {
          this.syllabi.set([]);
        },
      });
  }

  onSelectSyllabus(syllabusId: string | null): void {
    this.selectedSyllabusId.set(syllabusId);
    this.matrixData.set(null);
    this.hasErrorMatrix.set(false);
    const versionId = this.selectedVersionId();

    if (!syllabusId || !versionId) {
      return;
    }

    this.loadMatrix(syllabusId, versionId);
  }

  loadMatrix(syllabusId: string, versionId: string): void {
    this.isLoadingMatrix.set(true);
    this.hasErrorMatrix.set(false);
    this.cloService
      .getCloPiMatrix(syllabusId, versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: matrix => {
          this.matrixData.set(matrix);
          this.isLoadingMatrix.set(false);
        },
        error: () => {
          this.matrixData.set(null);
          this.isLoadingMatrix.set(false);
          this.hasErrorMatrix.set(true);
        },
      });
  }

  retryLoadMatrix(): void {
    const sylId = this.selectedSyllabusId();
    const verId = this.selectedVersionId();
    if (sylId && verId) {
      this.loadMatrix(sylId, verId);
    }
  }

  // --- Invariant Q22 Cell Resolver ---
  getMatrixCell(cloId: string, piId: string): ICloPiLinkCell | undefined {
    return this.matrixData()?.links?.find(c => c.cloId === cloId && c.piId === piId);
  }

  // --- View & Formatting Helpers ---
  getCategoryLabel(category?: string): string {
    if (!category) {
      return '—';
    }
    return this.categoryLabelMap[category] ?? category;
  }

  getCourseCodeById(courseId: string): string {
    const found = this.programCourses().find(p => p.courseId === courseId);
    return found?.course?.code ?? courseId;
  }

  formatCohorts(cohort?: string): string {
    const trimmed = cohort?.trim();
    if (!trimmed) {
      return '—';
    }
    return trimmed;
  }

  switchTab(tab: AcademicTabKey): void {
    this.activeTab.set(tab);
    if (tab === 'CLO_PI_MATRIX') {
      this.viewMode.set('SYLLABI');
    } else {
      this.viewMode.set('VERSIONS');
    }
  }

  scrollToCatalog(): void {
    const el = document.getElementById('catalog-explorer');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  quickJumpToFeature(tab: AcademicTabKey): void {
    this.switchTab(tab);
    this.scrollToCatalog();
  }

  inspectCourseMatrix(courseId: string): void {
    this.onSelectCourse(courseId);
    this.switchTab('CLO_PI_MATRIX');
    this.scrollToCatalog();
  }

  private resetVersionDetails(): void {
    this.plos.set([]);
    this.pis.set([]);
    this.programCourses.set([]);
    this.syllabi.set([]);
    this.matrixData.set(null);
    this.hasErrorDetails.set(false);
    this.hasErrorMatrix.set(false);
    this.filterSemester.set(null);
    this.filterCategory.set(null);
    this.courseSearchQuery.set('');
  }

  private loadGlobalStatistics(): void {
    this.isLoadingStats.set(true);

    this.programService
      .getPrograms(0, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.programCount.set(res.totalElements ?? 0),
        error: () => undefined,
      });

    this.courseService
      .getCourses(0, 1, undefined, undefined, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.courseCount.set(res.totalElements ?? 0),
        error: () => undefined,
      });

    this.versionService
      .getProgramVersions(0, 1, undefined, undefined, undefined, 'ACTIVE')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.publishedVersionCount.set(res.totalElements ?? 0);
          this.isLoadingStats.set(false);
        },
        error: () => this.isLoadingStats.set(false),
      });
  }
}

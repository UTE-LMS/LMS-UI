import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IPagedResults } from '@models/common/response-data.model';
import { ICloPiMatrix } from '@models/course/clo.model';
import { ICourse, IProgramCourse } from '@models/course/course.model';
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
import { of, throwError } from 'rxjs';
import { HomepageComponent } from './homepage.component';

describe('HomepageComponent — M2 Public Homepage (R1, Q22)', () => {
  const facultyId1 = 'fac_fit_01';
  const facultyId2 = 'fac_fme_02';
  const programId1 = 'prog_se_01';
  const versionId1 = 'ver_2024_active';
  const versionId2 = 'ver_2022_archived';
  const courseId1 = 'course_oop_01';
  const courseId2 = 'course_dsa_02';
  const syllabusId1 = 'syl_oop_v1';

  const mockFaculties: IFaculty[] = [
    { id: facultyId1, code: 'FIT', name: 'Khoa Công nghệ Thông tin', isActive: true },
    { id: facultyId2, code: 'FME', name: 'Khoa Cơ khí Chế tạo máy', isActive: true },
  ];

  const mockPrograms: IProgram[] = [
    {
      id: programId1,
      code: '7480103',
      name: 'Kỹ thuật Phần mềm',
      level: 'Đại học',
      degree: 'Kỹ sư',
      facultyId: facultyId1,
      isActive: true,
    },
    {
      id: 'prog_inactive_02',
      code: '7480199',
      name: 'Chương trình đã ngưng áp dụng',
      level: 'Đại học',
      degree: 'Kỹ sư',
      facultyId: facultyId1,
      isActive: false,
    },
  ];

  const mockVersions: IProgramVersion[] = [
    {
      id: versionId1,
      programId: programId1,
      version: '2024-v1',
      totalCredits: 150,
      durationYears: 4,
      applicableCohort: 'K23',
      status: 'ACTIVE',
      facultyId: facultyId1,
    },
    {
      id: versionId2,
      programId: programId1,
      version: '2022-v1',
      totalCredits: 145,
      durationYears: 4,
      applicableCohort: 'K22',
      status: 'ARCHIVED',
      facultyId: facultyId1,
    },
  ];

  const mockPlos: IPlo[] = [
    {
      id: 'plo_2',
      programVersionId: versionId1,
      code: 'PLO2',
      displayOrder: 2,
      category: 'SPECIALIZED',
      contentOriginal: 'Thiết kế hệ thống phần mềm phức tạp',
      contentSummary: 'Thiết kế hệ thống phần mềm',
      capabilityLevelRaw: 4,
    },
    {
      id: 'plo_1',
      programVersionId: versionId1,
      code: 'PLO1',
      displayOrder: 1,
      category: 'GENERAL',
      contentOriginal: 'Áp dụng kiến thức toán và khoa học cơ bản',
      capabilityLevelRaw: 3,
    },
  ];

  const mockPis: IPi[] = [
    {
      id: 'pi_1_2',
      programVersionId: versionId1,
      ploId: 'plo_1',
      code: 'PI1.2',
      displayOrder: 2,
      contentShort: 'Giải quyết bài toán kỹ thuật',
      capabilityLevelRaw: 3,
      targetPassRate: 0.75,
    },
    {
      id: 'pi_1_1',
      programVersionId: versionId1,
      ploId: 'plo_1',
      code: 'PI1.1',
      displayOrder: 1,
      contentShort: 'Mô hình hóa toán học',
      capabilityLevelRaw: 2,
      targetPassRate: 0.7,
    },
    {
      id: 'pi_2_1',
      programVersionId: versionId1,
      ploId: 'plo_2',
      code: 'PI2.1',
      displayOrder: 1,
      contentShort: 'Đặc tả kiến trúc phần mềm',
      capabilityLevelRaw: 4,
      targetPassRate: 0.8,
    },
  ];

  const mockProgramCourses: IProgramCourse[] = [
    {
      id: 'pc_1',
      programVersionId: versionId1,
      courseId: courseId1,
      semester: 2,
      credits: 3,
      type: 'COMPULSORY',
      category: 'MAJOR_FOUNDATION',
      course: { id: courseId1, code: 'OOPR230279', name: 'Lập trình hướng đối tượng', credits: 3 },
    },
    {
      id: 'pc_2',
      programVersionId: versionId1,
      courseId: courseId2,
      semester: 3,
      credits: 4,
      type: 'ELECTIVE',
      category: 'SPECIALIZED',
      prerequisiteCourseIds: [courseId1],
      course: { id: courseId2, code: 'DSAL240379', name: 'Cấu trúc dữ liệu và giải thuật', credits: 4 },
    },
  ];

  const mockSyllabi: ISyllabus[] = [
    {
      id: syllabusId1,
      courseId: courseId1,
      version: '2024-HK1',
      status: 'CONFIRMED',
    },
  ];

  const mockMatrix: ICloPiMatrix = {
    syllabusId: syllabusId1,
    programVersionId: versionId1,
    clos: [
      {
        id: 'clo_1',
        syllabusId: syllabusId1,
        courseId: courseId1,
        code: 'CLO1',
        bloomLevel: 3,
        contentOriginal: 'Vận dụng tính đóng gói, kế thừa và đa hình',
      },
      {
        id: 'clo_2',
        syllabusId: syllabusId1,
        courseId: courseId1,
        code: 'CLO2',
        bloomLevel: 4,
        contentOriginal: 'Thiết kế các mẫu thiết kế hướng đối tượng',
      },
    ],
    pis: [mockPis[1], mockPis[2]],
    links: [
      {
        cloId: 'clo_1',
        piId: 'pi_1_1',
        linkId: 'link_1',
        weight: 0.5,
      },
      {
        cloId: 'clo_2',
        piId: 'pi_2_1',
        linkId: 'link_2',
        weight: null,
      },
    ],
  };

  const makePaged = <T>(items: T[], total = items.length): IPagedResults<T> => ({
    content: items,
    page: 0,
    size: 100,
    totalElements: total,
    totalPages: 1,
    last: true,
  });

  const facultyServiceMock = {
    getFaculties: vi.fn(() => of(makePaged<IFaculty>(mockFaculties, 12))),
  };

  const programServiceMock = {
    getPrograms: vi.fn(() => of(makePaged<IProgram>(mockPrograms, 35))),
  };

  const versionServiceMock = {
    getProgramVersions: vi.fn(() => of(makePaged<IProgramVersion>(mockVersions, 48))),
  };

  const ploPiServiceMock = {
    getPlos: vi.fn(() => of(mockPlos)),
    getPis: vi.fn(() => of(mockPis)),
    getProgramCourses: vi.fn(() => of(mockProgramCourses)),
  };

  const courseServiceMock = {
    getCourses: vi.fn(() => of(makePaged<ICourse>([], 420))),
    getProgramCourses: vi.fn(() => of(mockProgramCourses)),
  };

  const syllabusServiceMock = {
    getSyllabiByCourse: vi.fn(() => of(mockSyllabi)),
  };

  const cloServiceMock = {
    getCloPiMatrix: vi.fn(() => of(mockMatrix)),
  };

  const createComponent = (): {
    fixture: ComponentFixture<HomepageComponent>;
    component: HomepageComponent;
    compiled: HTMLElement;
  } => {
    const fixture = TestBed.createComponent(HomepageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    return { fixture, component, compiled };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    facultyServiceMock.getFaculties.mockImplementation(() => of(makePaged<IFaculty>(mockFaculties, 12)));
    programServiceMock.getPrograms.mockImplementation(() => of(makePaged<IProgram>(mockPrograms, 35)));
    versionServiceMock.getProgramVersions.mockImplementation(() => of(makePaged<IProgramVersion>(mockVersions, 48)));
    ploPiServiceMock.getPlos.mockImplementation(() => of(mockPlos));
    ploPiServiceMock.getPis.mockImplementation(() => of(mockPis));
    courseServiceMock.getCourses.mockImplementation(() => of(makePaged<ICourse>([], 420)));
    courseServiceMock.getProgramCourses.mockImplementation(() => of(mockProgramCourses));
    syllabusServiceMock.getSyllabiByCourse.mockImplementation(() => of(mockSyllabi));
    cloServiceMock.getCloPiMatrix.mockImplementation(() => of(mockMatrix));

    await TestBed.configureTestingModule({
      imports: [HomepageComponent],
      providers: [
        { provide: FacultyService, useValue: facultyServiceMock },
        { provide: ProgramService, useValue: programServiceMock },
        { provide: ProgramVersionService, useValue: versionServiceMock },
        { provide: PloPiService, useValue: ploPiServiceMock },
        { provide: CourseService, useValue: courseServiceMock },
        { provide: SyllabusService, useValue: syllabusServiceMock },
        { provide: CloService, useValue: cloServiceMock },
      ],
    }).compileComponents();
  });

  describe('1. Initial anonymous load & Main view with active programs only', () => {
    it('loads faculties, global statistics, and displays ONLY active programs on the main page', () => {
      const { component, compiled } = createComponent();

      expect(facultyServiceMock.getFaculties).toHaveBeenCalledWith(0, 100, undefined, true);
      expect(programServiceMock.getPrograms).toHaveBeenCalledWith(0, 1);
      expect(programServiceMock.getPrograms).toHaveBeenCalledWith(0, 100);
      expect(courseServiceMock.getCourses).toHaveBeenCalledWith(0, 1, undefined, undefined, true);
      expect(versionServiceMock.getProgramVersions).toHaveBeenCalledWith(
        0,
        1,
        undefined,
        undefined,
        undefined,
        'ACTIVE',
      );

      expect(component.viewMode()).toBe('PROGRAMS');
      expect(component.activePrograms().length).toBe(1);
      expect(component.activePrograms()[0].code).toBe('7480103');

      expect(compiled.querySelector('h1')?.textContent).toContain(
        'HỆ THỐNG QUẢN LÝ & ĐO LƯỜNG CHUẨN ĐẦU RA (OBE)',
      );
      expect(compiled.querySelector('[data-testid="view-active-programs"]')).not.toBeNull();
      expect(compiled.querySelectorAll('.active-program-row').length).toBe(1);
      expect(compiled.textContent).toContain('Kỹ thuật Phần mềm');
      expect(compiled.textContent).not.toContain('Chương trình đã ngưng áp dụng');
    });
  });

  describe('2. Cascading selector in VERSIONS/SYLLABI views & downstream reset logic', () => {
    it('cascades Khoa -> CTĐT -> Phiên bản -> Học phần & Đề cương and resets downstream state on upstream change', () => {
      const { fixture, component } = createComponent();

      // Step 1: Select Faculty (switches to VERSIONS view)
      component.onSelectFaculty(facultyId1);
      expect(component.viewMode()).toBe('VERSIONS');
      expect(component.selectedFacultyId()).toBe(facultyId1);
      expect(programServiceMock.getPrograms).toHaveBeenCalledWith(0, 100, facultyId1);
      expect(component.programs().length).toBe(2);

      // Step 2: Select Program -> auto-loads versions and selects ACTIVE version
      component.onSelectProgram(programId1);
      expect(component.selectedProgramId()).toBe(programId1);
      expect(versionServiceMock.getProgramVersions).toHaveBeenCalledWith(0, 100, programId1);
      expect(component.versions().length).toBe(2);
      expect(component.availableCohorts()).toEqual(['K23', 'K22']);
      expect(component.selectedVersionId()).toBe(versionId1);

      // Step 3 auto-triggered Tab 1, Tab 2, and Step 4 course selection
      expect(ploPiServiceMock.getPlos).toHaveBeenCalledWith(versionId1);
      expect(ploPiServiceMock.getPis).toHaveBeenCalledWith(versionId1);
      expect(courseServiceMock.getProgramCourses).toHaveBeenCalledWith(versionId1);
      expect(component.selectedCourseId()).toBe(courseId1);
      expect(syllabusServiceMock.getSyllabiByCourse).toHaveBeenCalledWith(courseId1);
      expect(component.selectedSyllabusId()).toBe(syllabusId1);
      expect(cloServiceMock.getCloPiMatrix).toHaveBeenCalledWith(syllabusId1, versionId1);

      // Cohort filter switches version if current version does not match cohort
      component.onSelectCohort('K22');
      expect(component.selectedCohort()).toBe('K22');
      expect(component.filteredVersions().length).toBe(1);
      expect(component.selectedVersionId()).toBe(versionId2);

      // Changing Faculty resets Program, Cohort, Version, Course, Syllabus, and Tab data
      component.onSelectFaculty(facultyId2);
      fixture.detectChanges();
      expect(component.selectedFacultyId()).toBe(facultyId2);
      expect(component.selectedProgramId()).toBeNull();
      expect(component.selectedCohort()).toBeNull();
      expect(component.selectedVersionId()).toBeNull();
      expect(component.selectedCourseId()).toBeNull();
      expect(component.selectedSyllabusId()).toBeNull();
      expect(component.plos()).toEqual([]);
      expect(component.pis()).toEqual([]);
      expect(component.programCourses()).toEqual([]);
      expect(component.matrixData()).toBeNull();
    });
  });

  describe('3. Tab 1: Khung Chuẩn đầu ra (PLO/PI Tree & Bloom levels)', () => {
    it('renders PLOs and nested PIs sorted by displayOrder ascending with Bloom level badges', () => {
      const { fixture, component, compiled } = createComponent();

      component.onSelectFaculty(facultyId1);
      component.onSelectProgram(programId1);
      fixture.detectChanges();

      const rows = component.treeRows();
      expect(rows.map(r => r.code)).toEqual(['PLO1', 'PI1.1', 'PI1.2', 'PLO2', 'PI2.1']);

      const ploRows = compiled.querySelectorAll('.plo-row');
      const piRows = compiled.querySelectorAll('.pi-row');
      expect(ploRows.length).toBe(2);
      expect(piRows.length).toBe(3);

      expect(ploRows[0]?.textContent).toContain('PLO1');
      expect(ploRows[0]?.textContent).toContain('Đại cương');
      expect(ploRows[1]?.textContent).toContain('PLO2');
      expect(ploRows[1]?.textContent).toContain('Chuyên ngành');
      expect(piRows[0]?.textContent).toContain('PI1.1');
      expect(piRows[0]?.textContent).toContain('Mục tiêu: 70%');
      expect(compiled.querySelectorAll('app-bloom-level-label').length).toBeGreaterThan(0);
    });
  });

  describe('4. Tab 2: Kế hoạch Đào tạo & Học phần (Semester table & Credit summation)', () => {
    it('calculates total credits, filters courses by semester/category/search, and jumps to syllabus matrix', () => {
      const { fixture, component, compiled } = createComponent();

      component.onSelectFaculty(facultyId1);
      component.onSelectProgram(programId1);
      component.switchTab('COURSES');
      fixture.detectChanges();

      expect(component.totalCourseCredits()).toBe(7);
      expect(component.semesterSummaries().length).toBe(2);
      expect(compiled.querySelector('[data-testid="total-course-credits"]')?.textContent).toContain('7 TC');

      const courseRows = compiled.querySelectorAll('.course-row');
      expect(courseRows.length).toBe(2);
      expect(courseRows[1]?.textContent).toContain('OOPR230279');

      // Filter by semester 2
      component.filterSemester.set(2);
      fixture.detectChanges();
      expect(component.filteredCourses().length).toBe(1);
      expect(component.filteredCourseCredits()).toBe(3);

      // Jump to syllabus matrix for courseId2
      component.inspectCourseMatrix(courseId2);
      fixture.detectChanges();
      expect(component.viewMode()).toBe('SYLLABI');
      expect(component.activeTab()).toBe('CLO_PI_MATRIX');
      expect(component.selectedCourseId()).toBe(courseId2);
    });
  });

  describe('5. Giao diện Đề cương (SYLLABI): Ma trận Ánh xạ CLO × PI & Invariant Q22 enforcement', () => {
    it('strictly displays dash (—) and NEVER numeric 0 for unlinked cells or null weights (Q22)', () => {
      const { fixture, component, compiled } = createComponent();

      component.onSelectFaculty(facultyId1);
      component.onSelectProgram(programId1);
      component.switchTab('CLO_PI_MATRIX');
      fixture.detectChanges();

      expect(component.viewMode()).toBe('SYLLABI');
      expect(component.activeTab()).toBe('CLO_PI_MATRIX');
      expect(component.matrixClos().length).toBe(2);
      expect(component.matrixPis().length).toBe(2);

      // Verify cell resolution
      const linkedWithWeight = component.getMatrixCell('clo_1', 'pi_1_1');
      const unlinked1 = component.getMatrixCell('clo_1', 'pi_2_1');
      const unlinked2 = component.getMatrixCell('clo_2', 'pi_1_1');
      const linkedNullWeight = component.getMatrixCell('clo_2', 'pi_2_1');

      expect(linkedWithWeight?.weight).toBe(0.5);
      expect(unlinked1).toBeUndefined();
      expect(unlinked2).toBeUndefined();
      expect(linkedNullWeight?.weight).toBeNull();

      // Verify DOM output adheres strictly to Q22
      const unlinkedCells = Array.from(compiled.querySelectorAll('.matrix-cell-unlinked'));
      expect(unlinkedCells.length).toBe(2);
      for (const cellEl of unlinkedCells) {
        const text = (cellEl.textContent ?? '').trim();
        expect(text).toBe('—');
        expect(text).not.toContain('0');
      }

      const linkedCells = Array.from(compiled.querySelectorAll('.matrix-cell-linked'));
      expect(linkedCells.length).toBe(2);
      expect(linkedCells[0]?.textContent).toContain('W: 0.5');
      expect(linkedCells[1]?.textContent).toContain('W: —');
      expect(linkedCells[1]?.textContent).not.toContain('W: 0');
    });
  });

  describe('6. Error handling & retry resilience', () => {
    it('displays error banner when faculty or matrix API fails and recovers on retry', () => {
      facultyServiceMock.getFaculties.mockImplementationOnce(() => throwError(() => new Error('Network error')));

      const { fixture, component, compiled } = createComponent();

      expect(component.hasErrorFaculties()).toBe(true);
      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
        'Không thể tải danh sách Khoa đào tạo',
      );

      // Retry faculties load
      component.loadFaculties();
      fixture.detectChanges();
      expect(component.hasErrorFaculties()).toBe(false);
      expect(component.faculties().length).toBe(2);

      // Matrix error & retry
      cloServiceMock.getCloPiMatrix.mockImplementationOnce(() => throwError(() => new Error('Server 500 error')));
      component.onSelectFaculty(facultyId1);
      component.onSelectProgram(programId1);
      component.switchTab('CLO_PI_MATRIX');
      fixture.detectChanges();

      expect(component.hasErrorMatrix()).toBe(true);
      const retryBtn = compiled.querySelector<HTMLButtonElement>('[data-testid="retry-matrix-btn"]');
      expect(retryBtn).not.toBeNull();

      retryBtn?.click();
      fixture.detectChanges();
      expect(component.hasErrorMatrix()).toBe(false);
      expect(component.matrixData()?.clos.length).toBe(2);
    });
  });

  describe('7. Component-based interactive cards (Programs, Versions, Syllabi)', () => {
    it('filters active program cards by search query and navigates to VERSIONS/SYLLABI on card button click', () => {
      const { fixture, component, compiled } = createComponent();

      const searchInput = compiled.querySelector<HTMLInputElement>(
        'input[aria-label="Tìm kiếm chương trình đào tạo"]',
      );
      expect(searchInput).not.toBeNull();
      if (searchInput) {
        searchInput.value = 'không tồn tại';
        searchInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      }
      expect(compiled.querySelectorAll('.active-program-row').length).toBe(0);

      if (searchInput) {
        searchInput.value = 'Phần mềm';
        searchInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      }
      expect(compiled.querySelectorAll('.active-program-row').length).toBe(1);

      const openVersionsBtn = compiled.querySelector<HTMLButtonElement>('[data-testid="btn-open-versions"]');
      expect(openVersionsBtn).not.toBeNull();
      openVersionsBtn?.click();
      fixture.detectChanges();
      expect(component.viewMode()).toBe('VERSIONS');
      expect(component.selectedProgramId()).toBe(programId1);

      component.switchView('PROGRAMS');
      fixture.detectChanges();
      const openSyllabiBtn = compiled.querySelector<HTMLButtonElement>('[data-testid="btn-open-syllabi"]');
      expect(openSyllabiBtn).not.toBeNull();
      openSyllabiBtn?.click();
      fixture.detectChanges();
      expect(component.viewMode()).toBe('SYLLABI');
      expect(component.selectedProgramId()).toBe(programId1);
    });

    it('renders clickable cohort pills and version cards in VERSIONS view', () => {
      const { fixture, component, compiled } = createComponent();

      component.onSelectFaculty(facultyId1);
      component.onSelectProgram(programId1);
      fixture.detectChanges();

      const versionCards = compiled.querySelectorAll<HTMLButtonElement>('.version-select-card');
      expect(versionCards.length).toBe(2);
      expect(versionCards[0]?.getAttribute('aria-pressed')).toBe('true');

      versionCards[1]?.click();
      fixture.detectChanges();
      expect(component.selectedVersionId()).toBe(versionId2);

      const cohortPills = compiled.querySelectorAll<HTMLButtonElement>('.cohort-pill');
      expect(cohortPills.length).toBe(3);
      cohortPills[1]?.click();
      fixture.detectChanges();
      expect(component.selectedCohort()).toBe('K23');
      expect(component.selectedVersionId()).toBe(versionId1);
    });

    it('renders clickable course cards and syllabus cards in SYLLABI view', () => {
      const { fixture, component, compiled } = createComponent();

      component.onSelectFaculty(facultyId1);
      component.onSelectProgram(programId1);
      component.switchTab('CLO_PI_MATRIX');
      fixture.detectChanges();

      const courseCards = compiled.querySelectorAll<HTMLButtonElement>('.course-select-card');
      expect(courseCards.length).toBe(2);
      expect(courseCards[0]?.getAttribute('aria-pressed')).toBe('true');

      courseCards[1]?.click();
      fixture.detectChanges();
      expect(component.selectedCourseId()).toBe(courseId2);

      const syllabusCards = compiled.querySelectorAll<HTMLButtonElement>('.syllabus-select-card');
      expect(syllabusCards.length).toBe(1);
      expect(syllabusCards[0]?.getAttribute('aria-pressed')).toBe('true');
    });
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';
import { IAuthData } from '@models/auth/auth.model';
import { IClo, ICloPiLinkCell, ICloPiMatrix } from '@models/course/clo.model';
import { ICourse, IProgramCourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { IPi, IPlo } from '@models/program/plo-pi.model';
import { IProgram } from '@models/program/program.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { IUser } from '@models/user/user.model';
import { of } from 'rxjs';
import { vi } from 'vitest';

// ============================================================================
// 1. Domain Interfaces (PROJECT.md & TEST_INFRA.md contracts)
// ============================================================================

export interface IFaculty {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  programManagerCount?: number;
  programManagers?: IUser[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IFacultyRequest {
  code: string;
  name: string;
  description?: string;
}

export interface IFacultyUpdateRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface IFacultyStatusUpdateRequest {
  isActive: boolean;
  reason?: string;
}

export interface IFacultyAssignPmRequest {
  userId: string;
}

export interface IFacultyTransferPmRequest {
  userId: string;
  targetFacultyId: string;
  transferReason: string;
}

// Re-export models for convenience in specs
export type {
  IClo,
  ICloPiLinkCell,
  ICloPiMatrix,
  ICourse,
  IPi,
  IPlo,
  IProgram,
  IProgramCourse,
  IProgramVersion,
  ISyllabus,
  IUser,
};

// ============================================================================
// 2. Auth Mock Factories
// ============================================================================

export interface IMockAuthOptions {
  role?: string;
  facultyId?: string;
  user?: Partial<IUser>;
  isAuthenticated?: boolean;
}

export function createMockAuthService(options: IMockAuthOptions = {}) {
  const currentRole = options.role;
  const facultyId = options.facultyId ?? (currentRole === SystemConstant.ROLE.PROGRAM_MANAGER ? 'fac_cntt_01' : undefined);
  const isAuth = options.isAuthenticated ?? Boolean(currentRole);

  const user: IUser = {
    id: options.user?.id ?? 'usr_test_default',
    username: options.user?.username ?? (currentRole ? `${currentRole.toLowerCase()}_user` : 'guest'),
    email: options.user?.email ?? 'tester@hcmute.edu.vn',
    fullName: options.user?.fullName ?? (currentRole ? `Người dùng ${currentRole}` : 'Khách vãng lai'),
    status: options.user?.status ?? 'ACTIVE',
    roles: currentRole
      ? [currentRole as (typeof SystemConstant.ROLE)[keyof typeof SystemConstant.ROLE]]
      : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...options.user,
  };

  const authData: IAuthData = {
    avatar: '',
    expired: Date.now() + 3600000,
    roles: currentRole ? [currentRole] : [],
    fullName: user.fullName,
    userId: user.id,
    username: user.username,
    facultyId,
  };

  return {
    isAuthenticated: vi.fn(() => isAuth),
    getRoles: vi.fn(() => (currentRole ? [currentRole] : [])),
    getFacultyId: vi.fn(() => facultyId),
    isProgramManager: vi.fn(() => currentRole === SystemConstant.ROLE.PROGRAM_MANAGER),
    isAdmin: vi.fn(() => currentRole === SystemConstant.ROLE.ADMIN),
    isQA: vi.fn(() => currentRole === SystemConstant.ROLE.QA),
    isLecturer: vi.fn(() => currentRole === SystemConstant.ROLE.LECTURER),
    getUser: vi.fn(() => user),
    getAuthData: vi.fn(() => (isAuth ? authData : null)),
    getNameOfLogin: vi.fn(() => user.fullName),
    getUserId: vi.fn(() => user.id),
    getUsername: vi.fn(() => user.username),
    hasAnyRole: vi.fn((roles: readonly string[]) => roles.length === 0 || (currentRole ? roles.includes(currentRole) : false)),
    logout: vi.fn(() => of(undefined)),
    clearSession: vi.fn(),
  };
}

export function createAnonymousAuthService() {
  return createMockAuthService({
    role: undefined,
    isAuthenticated: false,
    facultyId: undefined,
  });
}

export function createAdminAuthService(user?: Partial<IUser>) {
  return createMockAuthService({
    role: SystemConstant.ROLE.ADMIN,
    facultyId: undefined,
    user,
  });
}

export function createPmAuthService(facultyId = 'fac_cntt_01', user?: Partial<IUser>) {
  return createMockAuthService({
    role: SystemConstant.ROLE.PROGRAM_MANAGER,
    facultyId,
    user,
  });
}

export function createQaAuthService(user?: Partial<IUser>) {
  return createMockAuthService({
    role: SystemConstant.ROLE.QA,
    facultyId: undefined,
    user,
  });
}

export function getRootElement(fixture: { nativeElement: unknown; }): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

// ============================================================================
// 3. Mock Data Generators
// ============================================================================

export function createMockFaculty(overrides: Partial<IFaculty> = {}): IFaculty {
  return {
    id: overrides.id ?? 'fac_cntt_01',
    code: overrides.code ?? 'FIT',
    name: overrides.name ?? 'Khoa Công nghệ Thông tin',
    description: overrides.description ?? 'Khoa CNTT - Trường ĐH Sư phạm Kỹ thuật TP.HCM',
    isActive: overrides.isActive ?? true,
    programManagerCount: overrides.programManagerCount ?? 1,
    programManagers: overrides.programManagers ?? [],
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

export function createMockFacultyList(): IFaculty[] {
  return [
    createMockFaculty({
      id: 'fac_cntt_01',
      code: 'FIT',
      name: 'Khoa Công nghệ Thông tin',
      programManagerCount: 1,
      isActive: true,
    }),
    createMockFaculty({
      id: 'fac_ckct_02',
      code: 'FME',
      name: 'Khoa Cơ khí Chế tạo máy',
      programManagerCount: 1,
      isActive: true,
    }),
    createMockFaculty({
      id: 'fac_ddt_03',
      code: 'FEE',
      name: 'Khoa Điện - Điện tử',
      programManagerCount: 0,
      isActive: true,
    }),
    createMockFaculty({
      id: 'fac_nn_04',
      code: 'FFL',
      name: 'Khoa Ngoại ngữ',
      programManagerCount: 0,
      isActive: false,
    }),
  ];
}

export function createMockProgram(
  overrides: Partial<IProgram & { facultyId?: string; isActive?: boolean; }> = {},
): IProgram & { facultyId: string; isActive: boolean; } {
  return {
    id: overrides.id ?? 'prog_se_01',
    code: overrides.code ?? '7480103',
    name: overrides.name ?? 'Kỹ thuật Phần mềm',
    level: overrides.level ?? 'Đại học chính quy',
    degree: overrides.degree ?? 'Kỹ sư',
    facultyId: overrides.facultyId ?? 'fac_cntt_01',
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

export function createMockProgramVersion(overrides: Partial<IProgramVersion> = {}): IProgramVersion {
  return {
    id: overrides.id ?? 'pv_se_2024',
    programId: overrides.programId ?? 'prog_se_01',
    version: overrides.version ?? '2024-v1',
    totalCredits: overrides.totalCredits ?? 150,
    durationYears: overrides.durationYears ?? 4,
    applicableCohort: overrides.applicableCohort ?? '2024',
    status: overrides.status ?? 'ACTIVE',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

export function createMockCourse(
  overrides: Partial<ICourse & { facultyId?: string; isActive?: boolean; }> = {},
): ICourse & { facultyId: string; isActive: boolean; } {
  return {
    id: overrides.id ?? 'crs_oop_01',
    code: overrides.code ?? 'OOPR230279',
    name: overrides.name ?? 'Lập trình hướng đối tượng',
    credits: overrides.credits ?? 3,
    facultyId: overrides.facultyId ?? 'fac_cntt_01',
    isActive: overrides.isActive ?? true,
  };
}

export function createMockSyllabus(overrides: Partial<ISyllabus> = {}): ISyllabus {
  return {
    id: overrides.id ?? 'syl_oop_2024',
    courseId: overrides.courseId ?? 'crs_oop_01',
    version: overrides.version ?? '2024-v1',
    status: overrides.status ?? 'CONFIRMED',
    effectiveFromTermId: overrides.effectiveFromTermId ?? 'term_2024_1',
    verification: overrides.verification ?? { status: 'VERIFIED' },
  };
}

export function createMockPlo(overrides: Partial<IPlo> = {}): IPlo {
  return {
    id: overrides.id ?? 'plo_01',
    programVersionId: overrides.programVersionId ?? 'pv_se_2024',
    code: overrides.code ?? 'PLO1',
    displayOrder: overrides.displayOrder ?? 1,
    category: overrides.category ?? 'SPECIALIZED',
    contentSummary: overrides.contentSummary ?? 'Khả năng áp dụng kiến thức kỹ thuật phần mềm',
    contentOriginal: overrides.contentOriginal ?? 'Khả năng áp dụng kiến thức kỹ thuật phần mềm vào việc phân tích và thiết kế hệ thống.',
    capabilityLevelRaw: overrides.capabilityLevelRaw ?? 4,
    passThreshold: overrides.passThreshold ?? 50,
  };
}

export function createMockPi(overrides: Partial<IPi> = {}): IPi {
  return {
    id: overrides.id ?? 'pi_01_1',
    programVersionId: overrides.programVersionId ?? 'pv_se_2024',
    ploId: overrides.ploId ?? 'plo_01',
    code: overrides.code ?? 'PI1.1',
    displayOrder: overrides.displayOrder ?? 1,
    contentShort: overrides.contentShort ?? 'Thiết kế kiến trúc phần mềm',
    contentOriginal: overrides.contentOriginal ?? 'Thiết kế cấu trúc và kiến trúc phần mềm đáp ứng yêu cầu người dùng.',
    capabilityLevelRaw: overrides.capabilityLevelRaw ?? 3,
    targetPassRate: overrides.targetPassRate ?? 70,
  };
}

export function createMockClo(overrides: Partial<IClo> = {}): IClo {
  return {
    id: overrides.id ?? 'clo_01',
    syllabusId: overrides.syllabusId ?? 'syl_oop_2024',
    courseId: overrides.courseId ?? 'crs_oop_01',
    code: overrides.code ?? 'CLO1',
    contentOriginal: overrides.contentOriginal ?? 'Hiểu và vận dụng 4 tính chất cốt lõi của OOP.',
    bloomLevel: overrides.bloomLevel ?? 3,
    bloomNote: overrides.bloomNote ?? 'Áp dụng',
  };
}

export function createMockCloPiMatrix(options: {
  cloCount?: number;
  piCount?: number;
  linkedPairs?: { cloIndex: number; piIndex: number; weight?: number | null; }[];
} = {}): ICloPiMatrix {
  const cloCount = options.cloCount ?? 3;
  const piCount = options.piCount ?? 3;
  const linkedPairs = options.linkedPairs ?? [
    { cloIndex: 0, piIndex: 0, weight: 2 },
    { cloIndex: 1, piIndex: 1, weight: null },
  ];

  const clos: IClo[] = Array.from({ length: cloCount }, (_, i) => ({
    id: `clo_${i + 1}`,
    syllabusId: 'syl_oop_2024',
    courseId: 'crs_oop_01',
    code: `CLO${i + 1}`,
    bloomLevel: (i % 4) + 1,
    contentOriginal: `Chuẩn đầu ra học phần CLO ${i + 1}`,
  }));

  const pis: IPi[] = Array.from({ length: piCount }, (_, j) => ({
    id: `pi_${j + 1}`,
    programVersionId: 'pv_se_2024',
    ploId: 'plo_01',
    code: `PI1.${j + 1}`,
    displayOrder: j + 1,
    contentShort: `Chỉ số thực hiện PI 1.${j + 1}`,
  }));

  const links: ICloPiLinkCell[] = linkedPairs.map((pair, idx) => ({
    cloId: clos[pair.cloIndex]?.id ?? 'clo_1',
    piId: pis[pair.piIndex]?.id ?? 'pi_1',
    linkId: `link_${idx + 1}`,
    weight: pair.weight !== undefined ? pair.weight : null,
    verification: { status: 'VERIFIED' },
  }));

  return {
    syllabusId: 'syl_oop_2024',
    programVersionId: 'pv_se_2024',
    clos,
    pis,
    links,
  };
}

// ============================================================================
// 4. HttpErrorResponse Simulators
// ============================================================================

export function createCourseLockedError(message?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 422,
    statusText: 'Unprocessable Entity',
    error: {
      code: 'COURSE_LOCKED_BY_PROGRAM_VERSION',
      message: message ?? 'Học phần đã có phiên bản CTĐT ban hành (ACTIVE/ARCHIVED). Không được chỉnh sửa tên hoặc tín chỉ.',
    },
  });
}

export function createProgramLockedError(message?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 422,
    statusText: 'Unprocessable Entity',
    error: {
      code: 'PROGRAM_LOCKED_BY_VERSION',
      message: message ?? 'Chương trình đào tạo đã có phiên bản ban hành (ACTIVE/ARCHIVED). Không được chỉnh sửa mã hoặc tên.',
    },
  });
}

export function createFacultyActiveProgramsError(message?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 422,
    statusText: 'Unprocessable Entity',
    error: {
      code: 'FACULTY_HAS_ACTIVE_PROGRAMS',
      message: message ?? 'Khoa còn chương trình đào tạo đang hoạt động (ACTIVE). Không thể tắt trạng thái hoạt động của Khoa.',
    },
  });
}

export function createPmConflictError(message?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 409,
    statusText: 'Conflict',
    error: {
      code: 'PM_ALREADY_ASSIGNED',
      message: message ?? 'Người dùng đã là Program Manager của Khoa khác. Vi phạm ràng buộc 1 PM = 1 Khoa.',
    },
  });
}

// ============================================================================
// 5. Opaque-Box Angular Component Harnesses
// ============================================================================

/**
 * PublicHomepageHarnessComponent:
 * Models Features F1, F2, F3, F4, F5 in an opaque-box component harness:
 * - Anonymous access & Youth HCMUTE layout.
 * - 4-step cascading filter: Khoa -> CTĐT -> Phiên bản -> Môn học.
 * - Tab 1: PLO/PI hierarchy tree.
 * - Tab 2: Course catalog table.
 * - Tab 3: CLO × PI matrix strictly adhering to Invariant Q22 (dash '—' and never '0').
 */
@Component({
  selector: 'app-public-homepage-harness',
  template: `
    <div class="hcmute-youth-theme bg-slate-50 min-h-screen text-slate-800">
      <!-- Youth Hero Banner & Metrics -->
      <header class="youth-hero bg-gradient-to-r from-[#0072bc] to-sky-600 text-white p-6 shadow-md">
        <div class="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div class="brand">
            <h1 class="text-2xl font-bold tracking-tight">CỔNG THÔNG TIN CHƯƠNG TRÌNH ĐÀO TẠO</h1>
            <p class="text-xs text-sky-100 uppercase">Trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)</p>
          </div>
          <div class="metrics flex gap-6 text-center">
            <div class="metric-item">
              <span class="block text-xl font-extrabold" id="metricFaculties">{{ faculties().length }}</span>
              <span class="text-xs text-sky-200">Khoa / Viện</span>
            </div>
            <div class="metric-item">
              <span class="block text-xl font-extrabold" id="metricPrograms">{{ filteredPrograms().length }}</span>
              <span class="text-xs text-sky-200">Chương trình</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Cascading Filter Section -->
      <section class="cascading-filter-panel container mx-auto p-4 my-4 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 class="text-sm font-bold text-slate-700 uppercase mb-3">Bộ lọc tra cứu liên hoàn</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- 1. Khoa -->
          <div>
            <label for="facultySelect" class="block text-xs font-semibold text-slate-600 mb-1">1. Khoa / Viện</label>
            <select
              id="facultySelect"
              class="w-full p-2 border border-slate-300 rounded text-sm bg-white"
              [value]="selectedFacultyId()"
              (change)="onFacultyChange($any($event.target).value)"
            >
              <option value="">-- Chọn Khoa --</option>
              @for (fac of faculties(); track fac.id) {
                <option [value]="fac.id">{{ fac.code }} - {{ fac.name }}</option>
              }
            </select>
          </div>

          <!-- 2. CTĐT -->
          <div>
            <label for="programSelect" class="block text-xs font-semibold text-slate-600 mb-1">2. Chương trình ĐT</label>
            <select
              id="programSelect"
              class="w-full p-2 border border-slate-300 rounded text-sm bg-white"
              [disabled]="!selectedFacultyId()"
              [value]="selectedProgramId()"
              (change)="onProgramChange($any($event.target).value)"
            >
              <option value="">-- Chọn CTĐT --</option>
              @for (prog of filteredPrograms(); track prog.id) {
                <option [value]="prog.id">{{ prog.code }} - {{ prog.name }}</option>
              }
            </select>
          </div>

          <!-- 3. Phiên bản / Khóa tuyển sinh -->
          <div>
            <label for="versionSelect" class="block text-xs font-semibold text-slate-600 mb-1">3. Phiên bản / Khóa</label>
            <select
              id="versionSelect"
              class="w-full p-2 border border-slate-300 rounded text-sm bg-white"
              [disabled]="!selectedProgramId()"
              [value]="selectedVersionId()"
              (change)="onVersionChange($any($event.target).value)"
            >
              <option value="">-- Chọn Phiên bản --</option>
              @for (ver of filteredVersions(); track ver.id) {
                <option [value]="ver.id">{{ ver.version }} (Khóa: {{ ver.applicableCohort }})</option>
              }
            </select>
          </div>

          <!-- 4. Môn học / Đề cương -->
          <div>
            <label for="courseSelect" class="block text-xs font-semibold text-slate-600 mb-1">4. Học phần / Đề cương</label>
            <select
              id="courseSelect"
              class="w-full p-2 border border-slate-300 rounded text-sm bg-white"
              [disabled]="!selectedVersionId()"
              [value]="selectedCourseId()"
              (change)="onCourseChange($any($event.target).value)"
            >
              <option value="">-- Tất cả học phần --</option>
              @for (pc of versionCourses(); track pc.id) {
                <option [value]="pc.courseId">{{ pc.course?.code }} - {{ pc.course?.name }}</option>
              }
            </select>
          </div>
        </div>
      </section>

      <!-- Main Tabs Content -->
      @if (selectedVersionId()) {
        <main class="container mx-auto p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div class="tab-navigation flex border-b border-slate-200 mb-4 gap-2">
            <button
              id="tabPloPiBtn"
              class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors"
              [class.bg-[#0072bc]]="activeTab() === 'plo-pi'"
              [class.text-white]="activeTab() === 'plo-pi'"
              [class.text-slate-600]="activeTab() !== 'plo-pi'"
              (click)="activeTab.set('plo-pi')"
            >
              1. Chuẩn đầu ra (PLO / PI)
            </button>
            <button
              id="tabCoursesBtn"
              class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors"
              [class.bg-[#0072bc]]="activeTab() === 'courses'"
              [class.text-white]="activeTab() === 'courses'"
              [class.text-slate-600]="activeTab() !== 'courses'"
              (click)="activeTab.set('courses')"
            >
              2. Kế hoạch đào tạo (Môn học)
            </button>
            <button
              id="tabCloPiMatrixBtn"
              class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors"
              [class.bg-[#0072bc]]="activeTab() === 'matrix'"
              [class.text-white]="activeTab() === 'matrix'"
              [class.text-slate-600]="activeTab() !== 'matrix'"
              (click)="activeTab.set('matrix')"
            >
              3. Ma trận CLO × PI (Q22)
            </button>
          </div>

          <!-- Tab 1: PLO / PI Hierarchical Tree -->
          @if (activeTab() === 'plo-pi') {
            <div id="tabPloPiContent" class="space-y-4">
              <h3 class="text-base font-bold text-slate-800">Cây Cấu trúc Chuẩn đầu ra CTĐT (PLO & PI)</h3>
              @for (plo of plos(); track plo.id) {
                <div class="plo-card p-4 rounded-lg bg-sky-50/50 border border-sky-200">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-[#0072bc]">{{ plo.code }}</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">{{ plo.category }}</span>
                  </div>
                  <p class="text-sm text-slate-700 mb-3">{{ plo.contentOriginal }}</p>

                  <div class="pis-container pl-4 border-l-2 border-sky-300 space-y-2">
                    @for (pi of getPisForPlo(plo.id); track pi.id) {
                      <div class="pi-item p-2 rounded bg-white border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <strong class="text-slate-900">{{ pi.code }}:</strong>
                          <span class="text-slate-600 ml-1">{{ pi.contentShort || pi.contentOriginal }}</span>
                        </div>
                        <span class="bloom-badge px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                          Level {{ pi.capabilityLevelRaw }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              } @empty {
                <div class="empty-plo-state text-center py-8 text-slate-400">Chưa có dữ liệu PLO / PI cho phiên bản này.</div>
              }
            </div>
          }

          <!-- Tab 2: Course Catalog Tab -->
          @if (activeTab() === 'courses') {
            <div id="tabCoursesContent">
              <h3 class="text-base font-bold text-slate-800 mb-3">Danh mục Học phần trong CTĐT</h3>
              <table class="w-full border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th class="p-2.5 text-left">Mã HP</th>
                    <th class="p-2.5 text-left">Tên Học phần</th>
                    <th class="p-2.5 text-center">Tín chỉ</th>
                    <th class="p-2.5 text-center">Học kỳ</th>
                    <th class="p-2.5 text-center">Loại HP</th>
                    <th class="p-2.5 text-left">Tiên quyết</th>
                  </tr>
                </thead>
                <tbody>
                  @for (pc of versionCourses(); track pc.id) {
                    <tr class="border-b border-slate-200 hover:bg-slate-50 course-row">
                      <td class="p-2.5 font-semibold text-slate-900">{{ pc.course?.code }}</td>
                      <td class="p-2.5 text-slate-800">{{ pc.course?.name }}</td>
                      <td class="p-2.5 text-center">{{ pc.credits || pc.course?.credits }}</td>
                      <td class="p-2.5 text-center">Kỳ {{ pc.semester || 1 }}</td>
                      <td class="p-2.5 text-center">{{ pc.type || 'COMPULSORY' }}</td>
                      <td class="p-2.5 text-slate-500">{{ pc.prerequisiteCourseIds?.join(', ') || '—' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="text-center py-8 text-slate-400">Chưa có học phần nào trong kế hoạch.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Tab 3: Public CLO × PI Matrix (Strict Invariant Q22) -->
          @if (activeTab() === 'matrix') {
            <div id="tabCloPiMatrixContent">
              <div class="mb-3">
                <h3 class="text-base font-bold text-slate-800">Ma trận Chuẩn đầu ra Học phần × Chỉ số Thực hiện (CLO × PI)</h3>
                <p class="text-xs text-slate-500">
                  Quy định kiểm định chất lượng: Ô không có liên kết hiển thị <strong>—</strong>, tuyệt đối không quy đổi thành 0 (Invariant Q22).
                </p>
              </div>

              @if (matrix(); as m) {
                <div class="overflow-x-auto border border-slate-200 rounded-lg">
                  <table class="w-full border-collapse text-xs matrix-table">
                    <thead>
                      <tr class="bg-slate-100 text-slate-800 border-b border-slate-200">
                        <th class="p-2.5 text-left min-w-48 border-r border-slate-200">CLO \\ PI</th>
                        @for (pi of m.pis; track pi.id) {
                          <th class="p-2.5 text-center min-w-28 border-r border-slate-200 font-bold text-sky-900">{{ pi.code }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (clo of m.clos; track clo.id) {
                        <tr class="border-b border-slate-200 hover:bg-slate-50/70 clo-matrix-row">
                          <td class="p-2.5 border-r border-slate-200 font-semibold text-slate-900">
                            {{ clo.code }} (B{{ clo.bloomLevel }})
                          </td>
                          @for (pi of m.pis; track pi.id) {
                            <td class="p-2.5 text-center border-r border-slate-200 matrix-cell" [attr.data-clo]="clo.id" [attr.data-pi]="pi.id">
                              <!-- Invariant Q22: cell.weight == null or unlinked MUST render '—' and NEVER '0' -->
                              @if (getLinkCell(clo.id, pi.id); as cell) {
                                <span class="linked-weight text-blue-700 font-bold">
                                  {{ cell.weight !== null && cell.weight !== undefined ? cell.weight : '—' }}
                                </span>
                              } @else {
                                <span class="unlinked-dash text-slate-400">—</span>
                              }
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-matrix-state text-center py-8 text-slate-400">Vui lòng chọn học phần để tải ma trận CLO × PI.</div>
              }
            </div>
          }
        </main>
      } @else {
        <div class="container mx-auto p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 my-4" id="selectPrompt">
          Vui lòng chọn Khoa, Chương trình đào tạo và Phiên bản để xem chi tiết.
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule],
})
export class PublicHomepageHarnessComponent {
  readonly faculties = signal<IFaculty[]>([]);
  readonly programs = signal<(IProgram & { facultyId: string; isActive: boolean; })[]>([]);
  readonly versions = signal<IProgramVersion[]>([]);
  readonly versionCourses = signal<IProgramCourse[]>([]);
  readonly plos = signal<IPlo[]>([]);
  readonly pis = signal<IPi[]>([]);
  readonly matrix = signal<ICloPiMatrix | null>(null);

  readonly selectedFacultyId = signal<string>('');
  readonly selectedProgramId = signal<string>('');
  readonly selectedVersionId = signal<string>('');
  readonly selectedCourseId = signal<string>('');

  readonly activeTab = signal<'plo-pi' | 'courses' | 'matrix'>('plo-pi');

  readonly filteredPrograms = computed(() => {
    const fid = this.selectedFacultyId();
    if (!fid) return [];
    return this.programs().filter(p => p.facultyId === fid && p.isActive);
  });

  readonly filteredVersions = computed(() => {
    const pid = this.selectedProgramId();
    if (!pid) return [];
    return this.versions().filter(v => v.programId === pid);
  });

  onFacultyChange(facultyId: string) {
    this.selectedFacultyId.set(facultyId);
    this.selectedProgramId.set('');
    this.selectedVersionId.set('');
    this.selectedCourseId.set('');
    this.matrix.set(null);
  }

  onProgramChange(programId: string) {
    this.selectedProgramId.set(programId);
    this.selectedVersionId.set('');
    this.selectedCourseId.set('');
    this.matrix.set(null);
  }

  onVersionChange(versionId: string) {
    this.selectedVersionId.set(versionId);
    this.selectedCourseId.set('');
  }

  onCourseChange(courseId: string) {
    this.selectedCourseId.set(courseId);
  }

  getPisForPlo(ploId: string): IPi[] {
    return this.pis().filter(pi => pi.ploId === ploId);
  }

  getLinkCell(cloId: string, piId: string): ICloPiLinkCell | undefined {
    return this.matrix()?.links.find(l => l.cloId === cloId && l.piId === piId);
  }
}

/**
 * AdminFacultyHarnessComponent:
 * Models Features F6 and F7:
 * - Admin Faculty CRUD & status toggling.
 * - HTTP 422 `FACULTY_HAS_ACTIVE_PROGRAMS` error interception showing warning modal.
 * - PM 1-1 assignment, removal, and transfer with transferReason.
 * - HTTP 409 PM conflict error handling.
 */
@Component({
  selector: 'app-admin-faculty-harness',
  template: `
    <div class="admin-faculty-container p-6 bg-slate-50 min-h-screen">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-xl font-bold text-slate-800">Quản trị Danh mục Khoa / Viện</h1>
        <button id="btnOpenCreateFaculty" class="btn-primary px-4 py-2 bg-blue-600 text-white rounded text-sm" (click)="openCreateModal()">
          + Thêm Khoa mới
        </button>
      </div>

      <!-- Error / Conflict Banner -->
      @if (conflictError()) {
        <div id="pmConflictAlert" class="p-3 mb-4 rounded bg-red-100 border border-red-300 text-red-800 text-sm">
          {{ conflictError() }}
        </div>
      }

      <!-- 422 Active Programs Warning Modal -->
      @if (activeProgramWarningModalVisible()) {
        <div id="activeProgramWarningModal" class="modal-backdrop fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div class="modal-box bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
            <h3 class="text-base font-bold text-red-600 mb-2">Không thể vô hiệu hóa Khoa</h3>
            <p class="text-sm text-slate-600 mb-4" id="activeProgramWarningMessage">{{ activeProgramWarningMessage() }}</p>
            <div class="flex justify-end">
              <button id="btnCloseActiveProgramWarning" class="px-4 py-1.5 bg-slate-200 rounded text-sm" (click)="activeProgramWarningModalVisible.set(false)">
                Đóng
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Faculty Table -->
      <table class="w-full bg-white rounded-lg border border-slate-200 text-sm">
        <thead>
          <tr class="bg-slate-100 text-slate-700 border-b">
            <th class="p-3 text-left">Mã Khoa</th>
            <th class="p-3 text-left">Tên Khoa</th>
            <th class="p-3 text-center">Trạng thái</th>
            <th class="p-3 text-center">Số PM</th>
            <th class="p-3 text-center">Hành động</th>
          </tr>
        </thead>
        <tbody>
          @for (fac of faculties(); track fac.id) {
            <tr class="border-b hover:bg-slate-50 faculty-row" [attr.data-id]="fac.id">
              <td class="p-3 font-semibold">{{ fac.code }}</td>
              <td class="p-3">{{ fac.name }}</td>
              <td class="p-3 text-center">
                <button
                  class="status-toggle-btn px-2 py-1 rounded text-xs font-semibold"
                  [class.bg-green-100]="fac.isActive"
                  [class.text-green-800]="fac.isActive"
                  [class.bg-slate-200]="!fac.isActive"
                  [class.text-slate-700]="!fac.isActive"
                  (click)="toggleFacultyStatus(fac)"
                >
                  {{ fac.isActive ? 'Hoạt động' : 'Đã vô hiệu hóa' }}
                </button>
              </td>
              <td class="p-3 text-center pm-count">{{ fac.programManagerCount || fac.programManagers?.length || 0 }}</td>
              <td class="p-3 text-center space-x-2">
                <button class="btn-manage-pm px-2 py-1 bg-sky-100 text-sky-800 rounded text-xs" (click)="openPmModal(fac)">
                  Gán / Chuyển PM
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <!-- Create / Edit Modal -->
      @if (createModalVisible()) {
        <div id="facultyFormModal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40">
          <div class="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
            <h3 class="text-base font-bold mb-4">Thêm mới Khoa</h3>
            <form [formGroup]="facultyForm" (ngSubmit)="submitCreateFaculty()">
              <div class="mb-3">
                <label class="block text-xs font-medium mb-1">Mã Khoa</label>
                <input id="facultyCodeInput" type="text" formControlName="code" class="w-full p-2 border rounded text-sm" />
              </div>
              <div class="mb-3">
                <label class="block text-xs font-medium mb-1">Tên Khoa</label>
                <input id="facultyNameInput" type="text" formControlName="name" class="w-full p-2 border rounded text-sm" />
              </div>
              <div class="flex justify-end gap-2 mt-4">
                <button type="button" class="px-3 py-1.5 text-sm bg-slate-200 rounded" (click)="createModalVisible.set(false)">Hủy</button>
                <button id="btnSubmitFaculty" type="submit" [disabled]="facultyForm.invalid" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- PM Assignment & Transfer Modal -->
      @if (pmModalVisible()) {
        <div id="pmManagementModal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40">
          <div class="bg-white p-6 rounded-lg max-w-lg w-full shadow-xl">
            <h3 class="text-base font-bold mb-2">Quản lý Program Manager: {{ selectedFaculty()?.name }}</h3>

            <!-- Existing PM list in faculty -->
            <div class="mb-4">
              <h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">PM hiện tại của Khoa (1 PM = 1 Khoa)</h4>
              @for (pm of selectedFaculty()?.programManagers || []; track pm.id) {
                <div class="flex justify-between items-center p-2 rounded bg-slate-50 border mb-2 text-xs pm-item">
                  <span>{{ pm.fullName }} ({{ pm.username }})</span>
                  <div class="space-x-1">
                    <button class="btn-remove-pm text-red-600 hover:underline" (click)="removePm(pm.id)">Gỡ PM</button>
                    <button class="btn-open-transfer text-blue-600 hover:underline" (click)="openTransferForm(pm)">Điều chuyển</button>
                  </div>
                </div>
              } @empty {
                <div class="text-xs text-slate-400 py-2">Chưa có PM nào được gán cho Khoa này.</div>
              }
            </div>

            <!-- Transfer PM Section -->
            @if (transferringPm(); as pm) {
              <div id="transferPmSection" class="p-3 bg-amber-50 rounded border border-amber-200 mb-4 text-xs">
                <h5 class="font-bold text-amber-900 mb-2">Điều chuyển PM: {{ pm.fullName }}</h5>
                <div class="mb-2">
                  <label class="block font-medium mb-1">Khoa đích</label>
                  <select id="transferTargetFacultySelect" class="w-full p-1.5 border rounded" [ngModel]="transferTargetFacultyId()" (ngModelChange)="transferTargetFacultyId.set($event)">
                    <option value="">-- Chọn Khoa tiếp nhận --</option>
                    @for (f of availableTargetFaculties(); track f.id) {
                      <option [value]="f.id">{{ f.name }}</option>
                    }
                  </select>
                </div>
                <div class="mb-2">
                  <label class="block font-medium mb-1">Lý do điều chuyển (Bắt buộc)</label>
                  <textarea id="transferReasonInput" class="w-full p-1.5 border rounded" rows="2" [ngModel]="transferReason()" (ngModelChange)="transferReason.set($event)"></textarea>
                </div>
                <div class="flex justify-end gap-2">
                  <button class="px-2 py-1 bg-slate-200 rounded" (click)="transferringPm.set(null)">Hủy</button>
                  <button id="btnConfirmTransfer" [disabled]="!transferTargetFacultyId() || !transferReason().trim()" class="px-2 py-1 bg-amber-600 text-white rounded" (click)="confirmTransfer()">
                    Xác nhận điều chuyển
                  </button>
                </div>
              </div>
            }

            <!-- Assign PM Section -->
            <div class="border-t pt-3">
              <h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">Gán PM mới</h4>
              <div class="flex gap-2">
                <input id="assignPmUserIdInput" type="text" placeholder="Nhập User ID hoặc chọn..." class="flex-1 p-1.5 border rounded text-xs" [ngModel]="newPmUserId()" (ngModelChange)="newPmUserId.set($event)" />
                <button id="btnAssignPm" [disabled]="!newPmUserId().trim()" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs" (click)="assignPm()">
                  Gán PM
                </button>
              </div>
            </div>

            <div class="flex justify-end mt-4">
              <button id="btnClosePmModal" class="px-3 py-1.5 bg-slate-200 rounded text-xs" (click)="pmModalVisible.set(false)">Đóng</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule],
})
export class AdminFacultyHarnessComponent {
  readonly faculties = signal<IFaculty[]>([]);
  readonly conflictError = signal<string | null>(null);
  readonly activeProgramWarningModalVisible = signal<boolean>(false);
  readonly activeProgramWarningMessage = signal<string>('');
  readonly createModalVisible = signal<boolean>(false);
  readonly pmModalVisible = signal<boolean>(false);
  readonly selectedFaculty = signal<IFaculty | null>(null);
  readonly transferringPm = signal<IUser | null>(null);

  readonly transferTargetFacultyId = signal<string>('');
  readonly transferReason = signal<string>('');
  readonly newPmUserId = signal<string>('');

  readonly facultyForm = new FormGroup({
    code: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
  });

  // Injectable simulated handlers
  onStatusToggle?: (faculty: IFaculty) => void;
  onAssignPm?: (facultyId: string, userId: string) => void;
  onRemovePm?: (facultyId: string, userId: string) => void;
  onTransferPm?: (dto: IFacultyTransferPmRequest) => void;

  openCreateModal() {
    this.facultyForm.reset();
    this.createModalVisible.set(true);
  }

  submitCreateFaculty() {
    if (this.facultyForm.invalid) return;
    const { code, name } = this.facultyForm.value;
    const newFac = createMockFaculty({
      id: `fac_${Date.now()}`,
      code: code ?? '',
      name: name ?? '',
      programManagerCount: 0,
      programManagers: [],
      isActive: true,
    });
    this.faculties.update(list => [...list, newFac]);
    this.createModalVisible.set(false);
  }

  toggleFacultyStatus(fac: IFaculty) {
    if (this.onStatusToggle) {
      this.onStatusToggle(fac);
      return;
    }
    this.faculties.update(list => list.map(f => (f.id === fac.id ? { ...f, isActive: !f.isActive } : f)));
  }

  openPmModal(fac: IFaculty) {
    this.selectedFaculty.set(fac);
    this.transferringPm.set(null);
    this.transferTargetFacultyId.set('');
    this.transferReason.set('');
    this.newPmUserId.set('');
    this.pmModalVisible.set(true);
  }

  openTransferForm(pm: IUser) {
    this.transferringPm.set(pm);
    this.transferTargetFacultyId.set('');
    this.transferReason.set('');
  }

  availableTargetFaculties(): IFaculty[] {
    const cur = this.selectedFaculty();
    return this.faculties().filter(f => f.id !== cur?.id && f.isActive);
  }

  assignPm() {
    const fac = this.selectedFaculty();
    const uid = this.newPmUserId().trim();
    if (!fac || !uid) return;
    if (this.onAssignPm) {
      this.onAssignPm(fac.id, uid);
    }
  }

  removePm(userId: string) {
    const fac = this.selectedFaculty();
    if (!fac) return;
    if (this.onRemovePm) {
      this.onRemovePm(fac.id, userId);
    }
  }

  confirmTransfer() {
    const cur = this.selectedFaculty();
    const pm = this.transferringPm();
    const targetId = this.transferTargetFacultyId();
    const reason = this.transferReason().trim();
    if (!cur || !pm || !targetId || !reason) return;
    if (this.onTransferPm) {
      this.onTransferPm({
        userId: pm.id,
        targetFacultyId: targetId,
        transferReason: reason,
      });
    }
  }
}

/**
 * PmScopingHarnessComponent:
 * Models Features F8 and F9:
 * - PROGRAM_MANAGER scoping to `principal.facultyId`.
 * - Pre-filled and locked faculty select in curriculum and course creation forms.
 * - HTTP 422 warning modals when editing entities with ACTIVE/ARCHIVED versions.
 */
@Component({
  selector: 'app-pm-scoping-harness',
  template: `
    <div class="pm-scoping-container p-6 bg-slate-50 min-h-screen">
      <h1 class="text-xl font-bold text-slate-800 mb-4">Quản lý CTĐT & Học phần theo Khoa phụ trách</h1>

      <!-- Scoped Faculty Notice -->
      <div id="pmScopeBanner" class="p-3 mb-4 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs">
        Phạm vi quản lý được cố định theo Khoa: <strong>{{ currentFacultyName() }}</strong> (ID: {{ currentFacultyId() }}).
      </div>

      <!-- Action buttons -->
      <div class="flex gap-3 mb-6">
        <button id="btnOpenCreateProgram" class="px-4 py-2 bg-blue-600 text-white rounded text-sm" (click)="openCreateProgramModal()">
          + Tạo mới CTĐT
        </button>
        <button id="btnOpenCreateCourse" class="px-4 py-2 bg-indigo-600 text-white rounded text-sm" (click)="openCreateCourseModal()">
          + Tạo mới Học phần
        </button>
      </div>

      <!-- 422 Locked Entity Warning Modal -->
      @if (lockedWarningModalVisible()) {
        <div id="lockedEntityWarningModal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div class="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
            <h3 class="text-base font-bold text-rose-600 mb-2">Thao tác bị từ chối (422 Locked)</h3>
            <p class="text-sm text-slate-600 mb-4" id="lockedWarningMessage">{{ lockedWarningMessage() }}</p>
            <div class="flex justify-end">
              <button id="btnCloseLockedWarning" class="px-4 py-1.5 bg-slate-200 rounded text-sm" (click)="lockedWarningModalVisible.set(false)">
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Program Create/Edit Form Modal -->
      @if (programModalVisible()) {
        <div id="programFormModal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40">
          <div class="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
            <h3 class="text-base font-bold mb-4">{{ isEditingProgram() ? 'Cập nhật CTĐT' : 'Tạo mới CTĐT' }}</h3>
            <form [formGroup]="programForm" (ngSubmit)="submitProgram()">
              <div class="mb-3">
                <label class="block text-xs font-semibold mb-1">Khoa phụ trách (Khóa theo tài khoản PM)</label>
                <!-- Disabled / Locked for PM -->
                <select id="scopedFacultySelect" formControlName="facultyId" class="w-full p-2 border rounded text-sm bg-slate-100 cursor-not-allowed">
                  @for (fac of faculties(); track fac.id) {
                    <option [value]="fac.id">{{ fac.name }}</option>
                  }
                </select>
              </div>
              <div class="mb-3">
                <label class="block text-xs font-semibold mb-1">Mã CTĐT</label>
                <input id="programCodeInput" type="text" formControlName="code" class="w-full p-2 border rounded text-sm" />
              </div>
              <div class="mb-3">
                <label class="block text-xs font-semibold mb-1">Tên CTĐT</label>
                <input id="programNameInput" type="text" formControlName="name" class="w-full p-2 border rounded text-sm" />
              </div>
              <div class="flex justify-end gap-2 mt-4">
                <button type="button" class="px-3 py-1.5 text-sm bg-slate-200 rounded" (click)="programModalVisible.set(false)">Hủy</button>
                <button id="btnSubmitProgram" type="submit" [disabled]="programForm.invalid" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Course Create/Edit Form Modal -->
      @if (courseModalVisible()) {
        <div id="courseFormModal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40">
          <div class="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
            <h3 class="text-base font-bold mb-4">{{ isEditingCourse() ? 'Cập nhật Học phần' : 'Tạo mới Học phần' }}</h3>
            <form [formGroup]="courseForm" (ngSubmit)="submitCourse()">
              <div class="mb-3">
                <label class="block text-xs font-semibold mb-1">Khoa quản lý (Khóa theo PM)</label>
                <select id="scopedCourseFacultySelect" formControlName="facultyId" class="w-full p-2 border rounded text-sm bg-slate-100 cursor-not-allowed">
                  @for (fac of faculties(); track fac.id) {
                    <option [value]="fac.id">{{ fac.name }}</option>
                  }
                </select>
              </div>
              <div class="mb-3">
                <label class="block text-xs font-semibold mb-1">Mã HP</label>
                <input id="courseCodeInput" type="text" formControlName="code" class="w-full p-2 border rounded text-sm" />
              </div>
              <div class="mb-3">
                <label class="block text-xs font-semibold mb-1">Tên HP</label>
                <input id="courseNameInput" type="text" formControlName="name" class="w-full p-2 border rounded text-sm" />
              </div>
              <div class="mb-3">
                <label class="block text-xs font-semibold mb-1">Số tín chỉ</label>
                <input id="courseCreditsInput" type="number" formControlName="credits" class="w-full p-2 border rounded text-sm" />
              </div>
              <div class="flex justify-end gap-2 mt-4">
                <button type="button" class="px-3 py-1.5 text-sm bg-slate-200 rounded" (click)="courseModalVisible.set(false)">Hủy</button>
                <button id="btnSubmitCourse" type="submit" [disabled]="courseForm.invalid" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule],
})
export class PmScopingHarnessComponent implements OnInit {
  readonly faculties = signal<IFaculty[]>([]);
  readonly currentFacultyId = signal<string>('fac_cntt_01');
  readonly currentFacultyName = signal<string>('Khoa Công nghệ Thông tin');

  readonly lockedWarningModalVisible = signal<boolean>(false);
  readonly lockedWarningMessage = signal<string>('');

  readonly programModalVisible = signal<boolean>(false);
  readonly isEditingProgram = signal<boolean>(false);

  readonly courseModalVisible = signal<boolean>(false);
  readonly isEditingCourse = signal<boolean>(false);

  readonly programForm = new FormGroup({
    facultyId: new FormControl({ value: '', disabled: true }, [Validators.required]),
    code: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
  });

  readonly courseForm = new FormGroup({
    facultyId: new FormControl({ value: '', disabled: true }, [Validators.required]),
    code: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    credits: new FormControl<number>(3, [Validators.required, Validators.min(1)]),
  });

  onSubmitProgram?: (formValue: unknown, isEdit: boolean) => void;
  onSubmitCourse?: (formValue: unknown, isEdit: boolean) => void;

  ngOnInit() {
    this.syncScopedFaculty();
  }

  syncScopedFaculty() {
    const fid = this.currentFacultyId();
    this.programForm.get('facultyId')?.setValue(fid);
    this.programForm.get('facultyId')?.disable();
    this.courseForm.get('facultyId')?.setValue(fid);
    this.courseForm.get('facultyId')?.disable();
  }

  openCreateProgramModal() {
    this.isEditingProgram.set(false);
    this.programForm.reset({ facultyId: this.currentFacultyId(), code: '', name: '' });
    this.programForm.get('facultyId')?.disable();
    this.programModalVisible.set(true);
  }

  openEditProgramModal(program: IProgram & { facultyId: string; }) {
    this.isEditingProgram.set(true);
    this.programForm.reset({ facultyId: program.facultyId, code: program.code, name: program.name });
    this.programForm.get('facultyId')?.disable();
    this.programModalVisible.set(true);
  }

  openCreateCourseModal() {
    this.isEditingCourse.set(false);
    this.courseForm.reset({ facultyId: this.currentFacultyId(), code: '', name: '', credits: 3 });
    this.courseForm.get('facultyId')?.disable();
    this.courseModalVisible.set(true);
  }

  openEditCourseModal(course: ICourse & { facultyId: string; }) {
    this.isEditingCourse.set(true);
    this.courseForm.reset({ facultyId: course.facultyId, code: course.code, name: course.name, credits: course.credits ?? 3 });
    this.courseForm.get('facultyId')?.disable();
    this.courseModalVisible.set(true);
  }

  submitProgram() {
    if (this.programForm.invalid) return;
    if (this.onSubmitProgram) {
      this.onSubmitProgram(this.programForm.getRawValue(), this.isEditingProgram());
    }
  }

  submitCourse() {
    if (this.courseForm.invalid) return;
    if (this.onSubmitCourse) {
      this.onSubmitCourse(this.courseForm.getRawValue(), this.isEditingCourse());
    }
  }

  handleLockedError(err: HttpErrorResponse) {
    if (err.status === 422) {
      const errBody = err.error as { code?: string; message?: string; } | undefined;
      const rawMsg = errBody?.message?.trim();
      const msg = rawMsg && rawMsg.length > 0 ? rawMsg : 'Đối tượng đã bị khóa bởi phiên bản ban hành (ACTIVE/ARCHIVED).';
      this.lockedWarningMessage.set(msg);
      this.lockedWarningModalVisible.set(true);
    }
  }
}

/**
 * WorkflowQaHarnessComponent:
 * Models Features F10, F11, F12:
 * - 2-step CSV import: Preview (`POST .../preview`) -> render preview table -> Confirm (`POST .../confirm`, auto-VERIFIED).
 * - Lock-only button: Calls `PUT .../lock` moving directly to ARCHIVED.
 * - Post-import immutability: Imported entities have NO edit or delete buttons rendered.
 * - QA read-only enforcement: QA role has NO approve/verify/edit/delete buttons, only view and export.
 */
@Component({
  selector: 'app-workflow-qa-harness',
  template: `
    <div class="workflow-qa-container p-6 bg-slate-50 min-h-screen">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-xl font-bold text-slate-800">Quy trình Đề cương & ĐBCL CTĐT</h1>
          <span class="text-xs text-slate-500">Vai trò hiện tại: <strong>{{ currentRole() }}</strong></span>
        </div>

        <div class="actions flex gap-2">
          <!-- Only non-QA roles have Import button -->
          @if (!isQa()) {
            <button id="btnOpenImportCsv" class="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium" (click)="importModalVisible.set(true)">
              + Nhập CSV Đề cương
            </button>
          }
          <!-- QA only has export/report actions -->
          @if (isQa()) {
            <button id="btnExportReport" class="px-4 py-2 bg-slate-700 text-white rounded text-sm font-medium" (click)="onExportReport()">
              Xuất báo cáo ĐBCL
            </button>
          }
        </div>
      </div>

      <!-- Entity List / Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (item of entities(); track item.id) {
          <div class="entity-card p-4 bg-white rounded-lg border border-slate-200 shadow-sm" [attr.data-id]="item.id">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="font-bold text-slate-900 text-sm entity-title">{{ item.title }}</h3>
                <span class="text-xs text-slate-500">Phiên bản: {{ item.version }}</span>
              </div>
              <span class="status-badge px-2 py-0.5 rounded text-xs font-semibold"
                [class.bg-emerald-100]="item.status === 'ACTIVE' || item.status === 'CONFIRMED'"
                [class.text-emerald-800]="item.status === 'ACTIVE' || item.status === 'CONFIRMED'"
                [class.bg-amber-100]="item.status === 'DRAFT'"
                [class.text-amber-800]="item.status === 'DRAFT'"
                [class.bg-slate-200]="item.status === 'ARCHIVED'"
                [class.text-slate-800]="item.status === 'ARCHIVED'">
                {{ item.status }} ({{ item.verificationStatus }})
              </span>
            </div>

            <!-- Immutability check: If imported, NO edit/delete buttons -->
            <div class="action-dock flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              @if (!isQa()) {
                <!-- Lock-only action button: transitions directly to ARCHIVED -->
                @if (item.status !== 'ARCHIVED') {
                  <button class="btn-lock-entity px-3 py-1 bg-amber-600 text-white rounded text-xs" (click)="lockEntity(item)">
                    Khóa (Lock)
                  </button>
                }

                <!-- Edit and Delete buttons are strictly hidden if entity is imported -->
                @if (!item.isImported && item.status !== 'ARCHIVED') {
                  <button class="btn-edit-entity px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs" (click)="onEditEntity(item)">
                    Sửa
                  </button>
                  <button class="btn-delete-entity px-3 py-1 bg-red-50 text-red-600 rounded text-xs" (click)="onDeleteEntity(item)">
                    Xóa
                  </button>
                }
              }

              <!-- QA Read-Only Enforcement: Ensure NO approve or verify buttons exist -->
              @if (isQa()) {
                <span class="text-xs text-slate-400 italic">Chế độ kiểm tra ĐBCL: Chỉ đọc (Read-only)</span>
              }
            </div>
          </div>
        }
      </div>

      <!-- 2-Step CSV Import Modal -->
      @if (importModalVisible()) {
        <div id="csvImportModal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div class="bg-white p-6 rounded-lg max-w-2xl w-full shadow-2xl">
            <h3 class="text-base font-bold mb-3">Nhập Đề cương từ tệp CSV (2 bước)</h3>

            <!-- Step 1: Upload & Preview -->
            @if (importStep() === 1) {
              <div id="importStep1">
                <p class="text-xs text-slate-600 mb-3">
                  Bước 1: Tải lên file CSV đề cương. Hệ thống sẽ phân tích cú pháp và hiển thị dữ liệu xem trước.
                </p>
                <input id="csvFileInput" type="file" accept=".csv" class="mb-4 text-xs" (change)="onFileSelected($event)" />
                <div class="flex justify-end gap-2">
                  <button class="px-3 py-1.5 text-xs bg-slate-200 rounded" (click)="importModalVisible.set(false)">Hủy</button>
                  <button id="btnPreviewCsv" [disabled]="!selectedFile()" class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded" (click)="previewCsv()">
                    Xem trước dữ liệu
                  </button>
                </div>
              </div>
            }

            <!-- Step 2: Review Preview Table & Confirm (auto-VERIFIED) -->
            @if (importStep() === 2) {
              <div id="importStep2">
                <div class="flex justify-between items-center mb-2">
                  <p class="text-xs text-slate-600">
                    Bước 2: Kiểm tra dữ liệu xem trước. Nhấn <strong>Xác nhận Import</strong> để lưu trực tiếp với trạng thái auto-VERIFIED.
                  </p>
                  <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Auto-VERIFIED
                  </span>
                </div>

                <div class="max-h-60 overflow-y-auto border border-slate-200 rounded mb-4">
                  <table id="csvPreviewTable" class="w-full text-xs">
                    <thead>
                      <tr class="bg-slate-100 border-b">
                        <th class="p-2 text-left">Mã CLO</th>
                        <th class="p-2 text-left">Nội dung</th>
                        <th class="p-2 text-center">Bloom Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of previewData(); track row.code) {
                        <tr class="border-b preview-row">
                          <td class="p-2 font-semibold">{{ row.code }}</td>
                          <td class="p-2">{{ row.content }}</td>
                          <td class="p-2 text-center">Level {{ row.bloomLevel }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="flex justify-end gap-2">
                  <button class="px-3 py-1.5 text-xs bg-slate-200 rounded" (click)="importStep.set(1)">Quay lại</button>
                  <button id="btnConfirmImport" class="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded font-medium" (click)="confirmImport()">
                    Xác nhận Import (auto-VERIFIED)
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class WorkflowQaHarnessComponent {
  readonly currentRole = signal<string>('PROGRAM_MANAGER');
  readonly isQa = computed(() => this.currentRole() === SystemConstant.ROLE.QA);

  readonly entities = signal<
    {
      id: string;
      title: string;
      version: string;
      status: string;
      verificationStatus: string;
      isImported: boolean;
    }[]
  >([]);

  readonly importModalVisible = signal<boolean>(false);
  readonly importStep = signal<1 | 2>(1);
  readonly selectedFile = signal<File | null>(null);
  readonly previewData = signal<{ code: string; content: string; bloomLevel: number; }[]>([]);

  onLockAction?: (entityId: string) => void;
  onConfirmImportAction?: (data: unknown) => void;

  onFileSelected(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.selectedFile.set(inputEl.files[0]);
    }
  }

  previewCsv() {
    if (!this.selectedFile()) return;
    this.previewData.set([
      { code: 'CLO1', content: 'Vận dụng tư duy hướng đối tượng', bloomLevel: 3 },
      { code: 'CLO2', content: 'Phân tích các mẫu thiết kế phần mềm', bloomLevel: 4 },
      { code: 'CLO3', content: 'Đánh giá độ phức tạp thuật toán', bloomLevel: 5 },
    ]);
    this.importStep.set(2);
  }

  confirmImport() {
    if (this.onConfirmImportAction) {
      this.onConfirmImportAction(this.previewData());
    } else {
      const newEntity = {
        id: `syl_imported_${Date.now()}`,
        title: 'Đề cương Môn học Mới (Imported)',
        version: '2026-v1',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        isImported: true,
      };
      this.entities.update(list => [...list, newEntity]);
    }
    this.importModalVisible.set(false);
    this.importStep.set(1);
    this.selectedFile.set(null);
  }

  lockEntity(item: { id: string; status: string; }) {
    if (this.onLockAction) {
      this.onLockAction(item.id);
    } else {
      this.entities.update(list => list.map(e => (e.id === item.id ? { ...e, status: 'ARCHIVED' } : e)));
    }
  }

  onEditEntity(_item: unknown) {
    return _item;
  }

  onDeleteEntity(_item: unknown) {
    return _item;
  }

  onExportReport() {
    return true;
  }
}

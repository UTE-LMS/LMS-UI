import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IProgram } from '@models/program/program.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ListCurriculumVersionsComponent } from './list-curriculum-versions.component';

describe('ListCurriculumVersionsComponent (F02 US-05, ADR 0005 UI.pdf Trang 3)', () => {
  let fixture: ComponentFixture<ListCurriculumVersionsComponent>;
  let component: ListCurriculumVersionsComponent;

  const mockPrograms: IProgram[] = [
    {
      id: '671dcba5f123456789abcde1',
      code: 'CNTT',
      name: 'Công nghệ thông tin',
      level: 'Đại học',
      degree: 'Kỹ sư',
    },
  ];

  const mockVersions: IProgramVersion[] = [
    {
      id: '671dcba5f123456789abcdef',
      programId: '671dcba5f123456789abcde1',
      version: 'BM7A-2.7-Updated-2026',
      totalCredits: 132,
      durationYears: 4,
      applicableCohorts: ['2026-HK1'],
      status: 'ACTIVE',
    },
    {
      id: '671dcba5f123456789abcdea',
      programId: '671dcba5f123456789abcde1',
      version: 'BM7A-2.8-Draft',
      totalCredits: 132,
      durationYears: 4,
      status: 'DRAFT',
    },
  ];

  const programSvc = {
    getPrograms: vi.fn(() => of({
      content: mockPrograms,
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      last: true,
    })),
  };

  const versionSvc = {
    getProgramVersions: vi.fn(() => of({
      content: mockVersions,
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
      last: true,
    })),
    importProgramCsv: vi.fn(),
    confirmImport: vi.fn(),
    downloadImportTemplate: vi.fn(),
    updateProgramVersionStatus: vi.fn(() => of(mockVersions[0])),
  };

  const ploPiSvc = {
    getPlos: vi.fn(() => of([])),
    getPis: vi.fn(() => of([])),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.PROGRAM_MANAGER]),
    getRoleAssignments: vi.fn(() => [
      {
        role: SystemConstant.ROLE.PROGRAM_MANAGER,
        scope: { programIds: ['671dcba5f123456789abcde1'] },
      },
    ]),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListCurriculumVersionsComponent],
      providers: [
        provideRouter([]),
        { provide: ProgramService, useValue: programSvc },
        { provide: ProgramVersionService, useValue: versionSvc },
        { provide: PloPiService, useValue: ploPiSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListCurriculumVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo và tải danh sách chương trình & phiên bản thành công', () => {
    expect(component).toBeTruthy();
    expect(component.programs().length).toBe(1);
    expect(component.selectedProgramId()).toBe('671dcba5f123456789abcde1');
    expect(component.versions().length).toBe(2);
  });

  it('hiển thị canManage = true khi Program Manager có quyền trong scope', () => {
    expect(component.canManage()).toBe(true);
  });

  it('mở modal Import CSV CTĐT reset về bước 1', () => {
    component.openImportModal();
    expect(component.isImportModalVisible()).toBe(true);
    expect(component.importStep()).toBe(0);
    expect(component.importVersion()).toBe('');
  });

  it('formatCohorts trả về dấu gạch — khi không có dữ liệu khóa', () => {
    expect(component.formatCohorts([])).toBe('—');
    expect(component.formatCohorts(['2026-HK1'])).toBe('2026-HK1');
  });

  it('Người dùng không có quyền canManage thì không được tự áp dụng phiên bản', () => {
    component.userRoles.set([SystemConstant.ROLE.LECTURER]);
    expect(component.canManage()).toBe(false);
    component.confirmActivateVersion(mockVersions[1]);
    expect(alertSvc.error).toHaveBeenCalledWith(
      expect.stringContaining('Chỉ Trưởng chương trình đào tạo mới có quyền phê duyệt đưa phiên bản CTĐT vào áp dụng'),
    );
  });

  it('ADMIN chỉ được xem, không có quyền quản lý phiên bản (canManage = false)', () => {
    component.userRoles.set([SystemConstant.ROLE.ADMIN]);
    expect(component.canManage()).toBe(false);
  });
});

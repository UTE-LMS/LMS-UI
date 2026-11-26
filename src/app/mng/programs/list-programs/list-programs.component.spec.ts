import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IProgram } from '@models/program/program.model';
import { AuthService } from '@services/auth/auth.service';
import { FacultyService } from '@services/faculty/faculty.service';
import { ProgramService } from '@services/program/program.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ListProgramsComponent } from './list-programs.component';

describe('ListProgramsComponent (F02 US-05, M4 PM Decentralization & 422 Lock)', () => {
  let fixture: ComponentFixture<ListProgramsComponent>;
  let component: ListProgramsComponent;

  const mockPrograms: IProgram[] = [
    {
      id: '671dcba5f123456789abcde1',
      code: 'CNTT',
      name: 'Công nghệ thông tin',
      level: 'Đại học',
      degree: 'Kỹ sư',
      facultyId: 'fac_cntt_01',
      createdAt: '2026-10-27T08:00:00Z',
    },
    {
      id: '671dcba5f123456789abcde2',
      code: 'FINTECH',
      name: 'Công nghệ tài chính',
      level: 'Đại học',
      degree: 'Kỹ sư',
      facultyId: 'fac_cntt_01',
      createdAt: '2026-10-28T09:00:00Z',
    },
  ];

  const programSvc = {
    getPrograms: vi.fn(() => of({
      content: mockPrograms,
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
      last: true,
    })),
    createProgram: vi.fn(() => of(mockPrograms[0])),
    updateProgram: vi.fn(() => of(mockPrograms[0])),
  };

  const facultySvc = {
    getFaculties: vi.fn(() => of({
      content: [
        { id: 'fac_cntt_01', code: 'CNTT', name: 'Khoa Công nghệ Thông tin', isActive: true },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      last: true,
    })),
  };

  const authSvc = {
    getRoles: vi.fn<() => string[]>(() => [SystemConstant.ROLE.ADMIN]),
    getFacultyId: vi.fn<() => string | undefined>(() => 'fac_cntt_01'),
  };

  const alert = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  const modalSvc = {
    warning: vi.fn(),
    confirm: vi.fn(),
  };

  function recreateWithRoles(roles: string[]): void {
    authSvc.getRoles.mockReturnValue(roles);
    fixture = TestBed.createComponent(ListProgramsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    programSvc.getPrograms.mockReturnValue(
      of({
        content: mockPrograms,
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
        last: true,
      }),
    );
    programSvc.createProgram.mockReturnValue(of(mockPrograms[0]));
    programSvc.updateProgram.mockReturnValue(of(mockPrograms[0]));
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.PROGRAM_MANAGER]);
    authSvc.getFacultyId.mockReturnValue('fac_cntt_01');

    await TestBed.configureTestingModule({
      imports: [ListProgramsComponent],
      providers: [
        provideRouter([]),
        { provide: ProgramService, useValue: programSvc },
        { provide: FacultyService, useValue: facultySvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alert },
        { provide: NzModalService, useValue: modalSvc },
      ],
    })
      .overrideComponent(ListProgramsComponent, {
        set: {
          providers: [{ provide: NzModalService, useValue: modalSvc }],
        },
      })
      .compileComponents();

    recreateWithRoles([SystemConstant.ROLE.PROGRAM_MANAGER]);
  });

  it('PROGRAM_MANAGER khởi tạo thành công, tải danh sách theo facultyId và nạp Khoa', () => {
    expect(component).toBeTruthy();
    expect(component.canManage()).toBe(true);
    expect(programSvc.getPrograms).toHaveBeenCalledWith(0, 10, 'fac_cntt_01');
    expect(facultySvc.getFaculties).toHaveBeenCalled();
    expect(component.manager.listData().data.length).toBe(2);
  });

  it('ADMIN chỉ có quyền xem (canManage = false): ẩn Thêm/Sửa, không gọi getFaculties, giữ cột Thao tác với Xem phiên bản', () => {
    vi.clearAllMocks();
    recreateWithRoles([SystemConstant.ROLE.ADMIN]);

    const el = fixture.nativeElement as HTMLElement;
    expect(component.canManage()).toBe(false);
    expect(programSvc.getPrograms).toHaveBeenCalledWith(0, 10);
    expect(facultySvc.getFaculties).not.toHaveBeenCalled();
    expect(el.querySelector('.add-program-btn')).toBeNull();
    expect(el.querySelector('button[aria-label="Sửa chương trình đào tạo"]')).toBeNull();
    expect(el.textContent).toContain('Thao tác');
    expect(el.textContent).toContain('Xem phiên bản');

    component.openCreateModal();
    expect(component.isModalVisible()).toBe(false);

    component.openEditModal(mockPrograms[0]);
    expect(component.isModalVisible()).toBe(false);
  });

  it('PROGRAM_MANAGER thấy nút Thêm và Sửa chương trình đào tạo', () => {
    const el = fixture.nativeElement as HTMLElement;
    const addBtn = el.querySelector('.add-program-btn');
    const editBtn = el.querySelector('button[aria-label="Sửa chương trình đào tạo"]');
    expect(addBtn).toBeTruthy();
    expect(addBtn?.textContent).toContain('Thêm chương trình đào tạo');
    expect(editBtn).toBeTruthy();
  });

  it('vai trò khác (QA / LECTURER) không có quyền canManage và không thấy nút Thêm/Sửa', () => {
    recreateWithRoles([SystemConstant.ROLE.QA]);
    const el = fixture.nativeElement as HTMLElement;
    expect(component.canManage()).toBe(false);
    expect(el.querySelector('.add-program-btn')).toBeNull();
    expect(el.querySelector('button[aria-label="Sửa chương trình đào tạo"]')).toBeNull();

    recreateWithRoles([SystemConstant.ROLE.LECTURER]);
    const lecEl = fixture.nativeElement as HTMLElement;
    expect(component.canManage()).toBe(false);
    expect(lecEl.querySelector('.add-program-btn')).toBeNull();
  });

  it('PROGRAM_MANAGER khóa trường Khoa theo scope khi tạo/sửa và gửi facultyId', () => {
    component.openCreateModal();
    expect(component.programForm.get('facultyId')?.value).toBe('fac_cntt_01');
    expect(component.programForm.get('facultyId')?.disabled).toBe(true);

    component.programForm.patchValue({
      code: 'SE',
      name: 'Kỹ thuật phần mềm',
      level: 'Đại học',
      degree: 'Kỹ sư',
    });
    component.submitProgram();
    expect(programSvc.createProgram).toHaveBeenCalledWith({
      code: 'SE',
      name: 'Kỹ thuật phần mềm',
      level: 'Đại học',
      degree: 'Kỹ sư',
      facultyId: 'fac_cntt_01',
    });
  });

  it('mở modal tạo mới: form trống và trường code cho phép nhập', () => {
    component.openCreateModal();
    expect(component.isModalVisible()).toBe(true);
    expect(component.editingProgramId()).toBeNull();
    expect(component.programForm.get('code')?.enabled).toBe(true);
    expect(component.programForm.get('code')?.value).toBe('');
  });

  it('mở modal sửa: trường code bị khóa (disabled) để bảo vệ bất biến', () => {
    component.openEditModal(mockPrograms[0]);
    expect(component.isModalVisible()).toBe(true);
    expect(component.editingProgramId()).toBe(mockPrograms[0].id);
    expect(component.programForm.get('code')?.disabled).toBe(true);
    expect(component.programForm.get('code')?.value).toBe('CNTT');
    expect(component.programForm.get('name')?.value).toBe('Công nghệ thông tin');
  });

  it('submitProgram khi form hợp lệ tạo CTĐT mới thành công', () => {
    component.openCreateModal();
    component.programForm.patchValue({
      code: 'IS',
      name: 'Hệ thống thông tin',
      level: 'Đại học',
      degree: 'Kỹ sư',
    });

    component.submitProgram();
    expect(programSvc.createProgram).toHaveBeenCalledWith({
      code: 'IS',
      name: 'Hệ thống thông tin',
      level: 'Đại học',
      degree: 'Kỹ sư',
      facultyId: 'fac_cntt_01',
    });
    expect(alert.success).toHaveBeenCalledWith('Thêm chương trình đào tạo thành công');
    expect(component.isModalVisible()).toBe(false);
  });

  it('bắt lỗi HTTP 422 PROGRAM_LOCKED_BY_VERSION khi sửa CTĐT đã có phiên bản ban hành và hiển thị modal cảnh báo', () => {
    programSvc.updateProgram.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({
          status: 422,
          error: {
            status: 422,
            code: 'PROGRAM_LOCKED_BY_VERSION',
            message: 'Chương trình đào tạo đã có phiên bản ban hành (ACTIVE/ARCHIVED). Không được chỉnh sửa.',
          },
        }),
      ),
    );

    component.openEditModal(mockPrograms[0]);
    component.programForm.patchValue({ name: 'Tên mới bị khóa' });
    component.submitProgram();

    expect(modalSvc.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        nzTitle: 'Không thể chỉnh sửa chương trình đào tạo',
        nzContent: 'Chương trình đào tạo đã có phiên bản ban hành (ACTIVE/ARCHIVED). Không được chỉnh sửa.',
        nzOkText: 'Đã hiểu',
      }),
    );
  });
});

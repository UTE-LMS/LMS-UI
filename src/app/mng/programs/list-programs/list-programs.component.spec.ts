import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IProgram } from '@models/program/program.model';
import { AuthService } from '@services/auth/auth.service';
import { ProgramService } from '@services/program/program.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ListProgramsComponent } from './list-programs.component';

describe('ListProgramsComponent (F02 US-05, ADR 0005 Admin Program Catalog)', () => {
  let fixture: ComponentFixture<ListProgramsComponent>;
  let component: ListProgramsComponent;

  const mockPrograms: IProgram[] = [
    {
      id: '671dcba5f123456789abcde1',
      code: 'CNTT',
      name: 'Công nghệ thông tin',
      level: 'Đại học',
      degree: 'Kỹ sư',
      createdAt: '2026-10-27T08:00:00Z',
    },
    {
      id: '671dcba5f123456789abcde2',
      code: 'FINTECH',
      name: 'Công nghệ tài chính',
      level: 'Đại học',
      degree: 'Kỹ sư',
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

  const authSvc = {
    getRoles: vi.fn(() => [SystemConstant.ROLE.ADMIN]),
  };

  const alert = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(async () => {
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
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.ADMIN]);

    await TestBed.configureTestingModule({
      imports: [ListProgramsComponent],
      providers: [
        provideRouter([]),
        { provide: ProgramService, useValue: programSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: alert },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListProgramsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo thành công và gọi getPrograms với trang đầu tiên', () => {
    expect(component).toBeTruthy();
    expect(programSvc.getPrograms).toHaveBeenCalledWith(0, 10);
    expect(component.manager.listData().data.length).toBe(2);
  });

  it('ADMIN thấy nút Thêm chương trình đào tạo', () => {
    const el = fixture.nativeElement as HTMLElement;
    const addBtn = el.querySelector('.add-program-btn');
    expect(addBtn).toBeTruthy();
    expect(addBtn?.textContent).toContain('Thêm chương trình đào tạo');
  });

  it('vai trò không phải ADMIN không thấy nút Thêm chương trình đào tạo', () => {
    component.isAdmin.set(false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const addBtn = el.querySelector('.add-program-btn');
    expect(addBtn).toBeNull();
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
    });
    expect(alert.success).toHaveBeenCalledWith('Thêm chương trình đào tạo thành công');
    expect(component.isModalVisible()).toBe(false);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { of } from 'rxjs';
import { ManagementLayoutComponent } from './management-layout.component';

describe('ManagementLayoutComponent (Layout Quản trị)', () => {
  let fixture: ComponentFixture<ManagementLayoutComponent>;
  let component: ManagementLayoutComponent;

  const authSvc = {
    getUsername: vi.fn(() => 'admin'),
    getNameOfLogin: vi.fn(() => 'Quản trị viên'),
    getRoles: vi.fn(() => ['ADMIN']),
    getAvatarOfLogin: vi.fn(() => ''),
    logout: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagementLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo thành công', () => {
    expect(component).toBeTruthy();
  });

  it('chứa header quản trị và khu vực nội dung router-outlet', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-management-header')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { MainHeaderComponent } from './main-header.component';

describe('MainHeaderComponent', () => {
  const authServiceMock = {
    getAuthData: vi.fn<() => Record<string, unknown> | null>(() => null),
    getToken: vi.fn<() => string | null>(() => null),
    checkRole: vi.fn<(role: string) => boolean>(() => false),
    getAvatarOfLogin: vi.fn<() => string | null>(() => null),
    getNameOfLogin: vi.fn<() => string>(() => 'Người dùng'),
    doLogout: vi.fn<(redirect?: string) => void>(),
  };

  const createComponent = (): {
    fixture: ComponentFixture<MainHeaderComponent>;
    component: MainHeaderComponent;
    compiled: HTMLElement;
  } => {
    const fixture = TestBed.createComponent(MainHeaderComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    return { fixture, component, compiled };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    authServiceMock.getAuthData.mockReturnValue(null);
    authServiceMock.getToken.mockReturnValue(null);
    authServiceMock.checkRole.mockReturnValue(false);
    authServiceMock.getAvatarOfLogin.mockReturnValue(null);
    authServiceMock.getNameOfLogin.mockReturnValue('Người dùng');

    await TestBed.configureTestingModule({
      imports: [MainHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();
  });

  it('does not render program, version, or syllabus switch buttons on header while keeping help and login', () => {
    const { compiled } = createComponent();

    expect(compiled.querySelector('[data-testid="header-btn-programs"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="header-btn-versions"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="header-btn-syllabi"]')).toBeNull();

    const headerText = compiled.querySelector('header')?.textContent ?? '';
    expect(headerText).not.toContain('Chương trình đào tạo');
    expect(headerText).not.toContain('Phiên bản CTĐT');
    expect(headerText).not.toContain('Đề cương học phần');

    expect(compiled.querySelector('.youth-help-btn')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="header-btn-login"]')).not.toBeNull();
  });

  it('hides login button and displays authenticated user name when logged in', () => {
    authServiceMock.getAuthData.mockReturnValue({ username: 'gv_test' });
    authServiceMock.getToken.mockReturnValue('mock-token');
    authServiceMock.getNameOfLogin.mockReturnValue('Giảng viên Test');

    const { component, compiled } = createComponent();

    expect(component.isLogin()).toBe(true);
    expect(compiled.querySelector('[data-testid="header-btn-login"]')).toBeNull();
    expect(compiled.querySelector('header')?.textContent).toContain('Giảng viên Test');
  });
});

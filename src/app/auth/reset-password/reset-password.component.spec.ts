import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent (trang đặt lại mật khẩu)', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let navigate: ReturnType<typeof vi.fn>;

  const setup = async (queryParams: Record<string, string>): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        { provide: AuthService, useValue: { doResetPasswordUpdate: vi.fn(() => of({ message: 'Success' })) } },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: NgxSpinnerService, useValue: { show: vi.fn(), hide: vi.fn() } },
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(ResetPasswordComponent);
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('không có tham số id: chuyển về đăng nhập, không dựng form và không ném lỗi NG01052 (formGroup chưa có)', async () => {
    await setup({});
    // Lỗi mẫu cũ: [formGroup]="form" bị vẽ khi form còn undefined; detectChanges sẽ ném lỗi nếu quay lại như vậy
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.AUTH.LOGIN);
    expect(el().querySelector('form')).toBeNull();
  });

  it('có id: dựng form đặt lại mật khẩu và không chuyển trang', async () => {
    await setup({ id: 'ma-dat-lai-gia' });
    fixture.detectChanges();
    expect(el().querySelector('form')).not.toBeNull();
    expect(el().querySelectorAll('input').length).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
  });
});

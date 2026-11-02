import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { AuthService } from '@services/auth/auth.service';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzGridModule } from 'ng-zorro-antd/grid';

@Component({
  selector: 'app-management-header',
  templateUrl: './management-header.component.html',
  styleUrl: './management-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NzGridModule,
    NzDropdownModule,
  ],
})
export class ManagementHeaderComponent implements OnInit {
  private authSvc = inject(AuthService);
  private router = inject(Router);

  urlConst = UrlConstant;
  avatarOfUser = signal('');

  // Ngon ngu hien thi //////////
  langCode: 'en' | 'vi' = localStorage.getItem('language') as 'en' | 'vi' ?? 'vi';
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).LAYOUT.MNG.HEADER;

  ngOnInit(): void {
    this.avatarOfUser.set(this.authSvc.getAvatarOfLogin());
  }

  /** Báo backend vô hiệu hóa token (tăng tokenVersion) rồi về trang đăng nhập. Lỗi mạng vẫn xóa phiên cục bộ. */
  doLogout(): void {
    this.authSvc.logout().subscribe(() => void this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN));
  }

  switchLang(lang: 'en' | 'vi'): void {
    localStorage.setItem('language', lang);
    this.langCode = lang;
    window.location.reload();
  }
}

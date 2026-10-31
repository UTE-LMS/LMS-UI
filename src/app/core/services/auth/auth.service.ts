import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { environment } from '@env';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import {
  IAuthData, ILoginDTO, ILoginRequest, ILoginResponse,
  IRegisterDTO, IResetPasswordDTO, IResetPasswordRequsetDTO,
} from '@models/auth/auth.model';
import { IRoleAssignment } from '@models/user/user.model';
import { sha256 } from 'js-sha256';
import { ToastrService } from 'ngx-toastr';
import { catchError, map, Observable, of, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private alert = inject(ToastrService);

  // Ngon ngu hien thi //////////
  private langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).CORE.AUTH;
  //////////////////////////////

  private apiUrl = UrlConstant.API.LOGIN_ADMIN;


  /************************************
   *             Common
   ************************************/

  // Remember to turn on People API
  // Request header must not include any custom properties
  // getGoogleUserData(accessToken: string): Observable<IPeopleGoogle> {
  //   const httpOptions = {
  //     headers: new HttpHeaders({
  //       // eslint-disable-next-line @typescript-eslint/naming-convention
  //       'Content-Type': 'application/json',
  //       authorization: 'Bearer ' + accessToken
  //     })
  //   };
  //   return this.http.get<IPeopleGoogle>(UrlConstant.API.GOOGLE_PEOPLE, httpOptions);
  // }

  getNameOfLogin(): string {
    const tmp = localStorage.getItem(SystemConstant.CURRENT_INFO_DATA);
    if (tmp) {
      return (JSON.parse(tmp) as IAuthData)?.fullName;
    } else {
      return '';
    }
  }

  getAvatarOfLogin(): string {
    const tmp = localStorage.getItem(SystemConstant.CURRENT_INFO_DATA);
    if (tmp) {
      return (JSON.parse(tmp) as IAuthData)?.avatar;
    } else {
      return '';
    }
  }

  /** Xóa token và thông tin người dùng khỏi trình duyệt (không gọi backend). */
  clearSession(): void {
    localStorage.removeItem(SystemConstant.CURRENT_INFO);
    localStorage.removeItem(SystemConstant.CURRENT_INFO_DATA);
    localStorage.removeItem(SystemConstant.CURRENT_INFO_SKEY);
  }

  doLogout(redirectTo?: string, forceRedirectIfSamePath?: boolean): boolean {
    this.clearSession();
    if (redirectTo) {
      if (forceRedirectIfSamePath || (window.location.pathname !== redirectTo)) {
        window.location.assign(`..${redirectTo}`);
      }
    }
    return true;
  }


  /************************************
   *     F01 - Đăng nhập / đăng xuất
   ************************************/

  /**
   * POST /api/v1/auth/login. Lỗi 400/401 do form đăng nhập tự hiển thị (INLINE_ERRORS), vì 401 ở đây nghĩa là
   * sai tên đăng nhập, sai mật khẩu hoặc tài khoản bị khóa chứ không phải phiên hết hạn (API-CONTRACT.md §3).
   * Thành công thì lưu token và thông tin người dùng.
   */
  login(model: ILoginRequest): Observable<ILoginResponse> {
    return this.http
      .post<ILoginResponse>(UrlConstant.API.AUTH_LOGIN, model, {
        context: new HttpContext().set(INLINE_ERRORS, true),
      })
      .pipe(tap(res => this.startSession(res)));
  }

  /**
   * POST /api/v1/auth/logout rồi xóa phiên cục bộ. Dù backend trả lỗi (token đã hết hạn, mất mạng)
   * vẫn xóa phiên cục bộ để người dùng thoát được; token cũ đã vô hiệu hoặc sẽ tự hết hạn.
   */
  logout(): Observable<void> {
    const hadToken = !!this.getToken();
    const request$: Observable<unknown> = hadToken
      ? this.http.post<unknown>(UrlConstant.API.AUTH_LOGOUT, null, { context: new HttpContext().set(INLINE_ERRORS, true) })
      : of(null);
    return request$.pipe(
      catchError(() => of(null)),
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  private startSession(res: ILoginResponse): void {
    const user = res.user;
    this.setToken(res.accessToken);
    this.setAuthData({
      avatar: '',
      expired: Date.now() + (res.expiresIn * 1000),
      roles: [...new Set(user.roleAssignments.map(assignment => assignment.role))],
      fullName: user.fullName,
      userId: user.id,
      username: user.username,
      roleAssignments: user.roleAssignments,
    });
  }

  /** Có token, có thông tin người dùng và chưa quá hạn ghi nhận lúc đăng nhập. */
  isAuthenticated(): boolean {
    const data = this.getAuthData();
    return !!data && !!this.getToken() && (!data.expired || data.expired > Date.now());
  }

  getRoles(): string[] {
    return this.getAuthData()?.roles ?? [];
  }

  getRoleAssignments(): IRoleAssignment[] {
    return this.getAuthData()?.roleAssignments ?? [];
  }

  getUserId(): string {
    return this.getAuthData()?.userId ?? '';
  }

  getUsername(): string {
    return this.getAuthData()?.username ?? '';
  }

  /** Người dùng có ít nhất một vai trò trong danh sách. Danh sách rỗng nghĩa là không đòi hỏi vai trò. */
  hasAnyRole(roles: readonly string[]): boolean {
    return roles.length === 0 || roles.some(role => this.checkRole(role));
  }


  /************************************
   *         Login Function
   ************************************/
  doLoginGoogle(token: string): Observable<IAuthData> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        accessToken: token,
      }),
    };
    return this.http.post<IAuthData>(this.apiUrl + `/google`, null, httpOptions);
  }

  doLoginForm(model: Partial<ILoginDTO>): Observable<IAuthData> {
    return this.http.post<IAuthData>(this.apiUrl, model);
  }


  /************************************
   *        Register Function
   ************************************/
  doRegisterForm(role: string, model: Partial<IRegisterDTO>): Observable<{ message: string; }> {
    switch (role) {
      case SystemConstant.ROLE.STUDENT:
        return this.http
          .post<{ message: string; }>(this.apiUrl + '/register', model);
      default:
        return of({ message: this.langData.TAI_KHOAN_KHONG_HO_TRO });
    }
  }


  /************************************
   *       Reset Pass Function
   ************************************/
  doResetPasswordRequest(role: string, model: Partial<IResetPasswordRequsetDTO>): Observable<{ message: string; }> {
    switch (role) {
      case SystemConstant.ROLE.STUDENT:
        return this.http
          .post<{ message: string; }>(this.apiUrl + '/forgot-password', model);
      default:
        return of({ message: this.langData.TAI_KHOAN_KHONG_HO_TRO });
    }
  }

  doResetPasswordUpdate(
    role: string,
    model: Partial<IResetPasswordDTO>,
    token: string,
  ): Observable<{ message: string; }> {
    switch (role) {
      case SystemConstant.ROLE.STUDENT:
        return this.http
          .post<{ message: string; }>(this.apiUrl + '/reset-password', model, { headers: new HttpHeaders().append('thiSinhId', token) });
      default:
        return of({ message: this.langData.TAI_KHOAN_KHONG_HO_TRO });
    }
  }


  /************************************
   *       Processing Auth Data
   ************************************/
  // getAuthData(): IAuthData | null {
  //   const tmp = localStorage.getItem(SystemConstant.CURRENT_INFO_DATA);
  //   if (tmp) {
  //     return JSON.parse(tmp) as IAuthData | null;
  //   } else {
  //     return null;
  //   }
  // }
  getAuthData(): IAuthData | null {
    const tmp = localStorage.getItem(SystemConstant.CURRENT_INFO_DATA);
    if (tmp) {
      // Async verify Hash
      // const hashData = localStorage.getItem(SystemConstant.CURRENT_INFO_SKEY);
      // const data = new TextEncoder().encode(tmp + environment.keyGoogle);
      // window.crypto.subtle.digest('SHA-256', data)
      //   .then(hash => {
      //     const calcHash = [...new Uint8Array(hash)]
      //       .map(x => x.toString(16).padStart(2, '0'))
      //       .join('');
      //     if (calcHash !== hashData) {
      //       this.alert.error(this.langData.THONG_TIN_DINH_DANH_KHONG_HOP_LE);
      //       this.doLogout(UrlConstant.ROUTE.MAIN.HOMEPAGE);
      //     }
      //   });
      const hashData = localStorage.getItem(SystemConstant.CURRENT_INFO_SKEY);
      const calcHash = sha256(tmp + environment.keyGoogle);
      if (calcHash !== hashData) {
        this.alert.error(this.langData.THONG_TIN_DINH_DANH_KHONG_HOP_LE);
        timer(1000).subscribe(() => this.doLogout(UrlConstant.ROUTE.MAIN.HOMEPAGE));
      }
      return JSON.parse(tmp) as IAuthData | null;
    } else {
      return null;
    }
  }

  // setAuthData(model: IAuthData): void {
  //   localStorage.setItem(
  //     SystemConstant.CURRENT_INFO_DATA,
  //     JSON.stringify(model)
  //   );
  // }
  setAuthData(model: IAuthData): void {
    const rawData = JSON.stringify(model);
    // const data = new TextEncoder().encode(rawData + environment.keyGoogle);
    // window.crypto.subtle.digest('SHA-256', data)
    //   .then(hash => {
    //     const calcHash = [...new Uint8Array(hash)]
    //       .map(x => x.toString(16).padStart(2, '0'))
    //       .join('');
    //     localStorage.setItem(SystemConstant.CURRENT_INFO_SKEY, calcHash);
    //     localStorage.setItem(SystemConstant.CURRENT_INFO_DATA, rawData);
    //   });
    const hash = sha256(rawData + environment.keyGoogle);
    localStorage.setItem(SystemConstant.CURRENT_INFO_SKEY, hash);
    localStorage.setItem(SystemConstant.CURRENT_INFO_DATA, rawData);
  }

  getToken(): string {
    return localStorage.getItem(SystemConstant.CURRENT_INFO) ?? '';
  }

  setToken(token: string): void {
    localStorage.setItem(SystemConstant.CURRENT_INFO, token);
  }


  /************************************
   *           Check role
   ************************************/
  checkRole(roleCheck: string): boolean {
    const auth = this.getAuthData();
    if (auth) {
      const role = auth.roles?.find(item => item === roleCheck);
      if (role) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}

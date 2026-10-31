import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import { IUser, IUserCreateDTO, IUserStatusDTO, IUserUpdateDTO, UserStatus } from '@models/user/user.model';
import { Observable } from 'rxjs';

/**
 * Quản trị người dùng (F01, US-02). Toàn bộ endpoint chỉ dành cho ADMIN (API-CONTRACT.md §5.3).
 * Tạo/sửa/đổi trạng thái để màn hình tự hiển thị lỗi 400/404/409/422 tại form (INLINE_ERRORS).
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.USERS;

  /** Backend chỉ nhận page (từ 0) và size (1..100), không có tìm kiếm hay lọc theo vai trò. */
  filter(page: number, size: number): Observable<IPagedResults<IUser>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<IPagedResults<IUser>>(this.apiUrl, { params });
  }

  getById(id: string): Observable<IUser> {
    return this.http.get<IUser>(`${this.apiUrl}/${id}`, { context: this.inlineErrors() });
  }

  create(model: IUserCreateDTO): Observable<IUser> {
    return this.http.post<IUser>(this.apiUrl, model, { context: this.inlineErrors() });
  }

  update(model: IUserUpdateDTO, id: string): Observable<IUser> {
    return this.http.put<IUser>(`${this.apiUrl}/${id}`, model, { context: this.inlineErrors() });
  }

  /** Khóa/mở khóa. Khi khóa, backend tăng tokenVersion nên mọi token cũ của người này bị 401 vĩnh viễn. */
  updateStatus(id: string, status: UserStatus): Observable<IUser> {
    const body: IUserStatusDTO = { status };
    return this.http.put<IUser>(`${this.apiUrl}/${id}/status`, body, { context: this.inlineErrors() });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}

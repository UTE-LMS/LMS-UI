# ADR 0001 — UI là SPA tĩnh, không dùng SSR

- **Trạng thái:** Đề xuất — chờ hai sinh viên xác nhận (IBS và IT). Chưa xác nhận thì chưa coi là quyết định cuối.
- **Ngày:** 2026-11-02
- **Liên quan:** issue UI #9, nợ kỹ thuật TD-02 (`LMS-API/doc/tech-debt.md`), ADR 0002 (CI/CD), `.claude/rules/04-testing-and-cicd.md`.

## Bối cảnh

TD-02 ghi nhận khung dự án ban đầu bật SSR (`@angular/ssr`, `express`, `outputMode: server`, `src/server.ts`,
`provideClientHydration`, `security.allowedHosts`) mà thiết kế đề tài chưa nêu lý do. Thành phần không giải thích
được là rủi ro vấn đáp (Rubric mục 6).

Thực trạng đã kiểm tra trên `main` (2026-11-02), bằng tìm kiếm trong toàn bộ mã nguồn, `angular.json`, `package.json`
và các tệp cấu hình (trừ `node_modules`):

| Mục kiểm tra | Kết quả |
|---|---|
| `@angular/ssr`, `express` trong `dependencies`/`devDependencies` | Không có |
| `src/server.ts`, `src/main.server.ts`, `tsconfig.server.json`, `app.config.server.ts` | Không có |
| `outputMode: server`, khối `ssr` trong `angular.json` | Không có (`build` chỉ có `browser: src/main.ts`) |
| `provideClientHydration`, `allowedHosts`, script `serve:ssr:*` | Không có |
| Gói `@angular/ssr` trong `package-lock.json` | Chỉ là peer dependency tùy chọn của `@angular/build` (không được cài) |
| `express` trong `package-lock.json` | Phụ thuộc gián tiếp của công cụ CLI (`@angular/cli`), không nằm trong bundle ứng dụng |

Như vậy phần mã SSR đã được gỡ khỏi `main` khi khung dự án được thay bằng khung hiện tại; còn lại là các câu chữ cũ
trong tài liệu (xem mục "Hệ quả" bên dưới).

Ứng dụng là hệ thống nội bộ phía sau đăng nhập (quản trị CTĐT, nhập điểm, báo cáo). Không có trang công khai cần
thu thập bởi công cụ tìm kiếm, và không có yêu cầu chia sẻ liên kết có xem trước.

## Phương án

**A. Giữ SSR (Node + express).**
- Ưu: HTML render sẵn cho trang công khai/SEO; có thể tải lần đầu nhanh hơn trên thiết bị yếu.
- Nhược: image phải chạy Node (bề mặt tấn công và vận hành lớn hơn); phải cấu hình `allowedHosts`; mọi truy cập
  `window`/`localStorage`/`document` phải kiểm tra nền tảng (mã hiện tại dùng `localStorage` trực tiếp ở auth, guard,
  interceptor); hydration làm tăng độ phức tạp kiểm thử; không có yêu cầu nghiệp vụ nào cần SEO.

**B. Bỏ SSR, build tĩnh (đề xuất).**
- Ưu: kết quả build là tệp tĩnh (`dist/browser`), phục vụ bằng nginx với fallback `index.html`; image nhỏ, chạy
  người dùng không root; không cần Node ở thời gian chạy; mã được viết cho trình duyệt; dễ giải thích khi vấn đáp.
- Nhược: không có HTML render sẵn (không ảnh hưởng vì ứng dụng nằm sau đăng nhập); thời gian hiển thị đầu phụ thuộc
  kích thước bundle (đã kiểm soát bằng budget và lazy load).

## Quyết định (đề xuất)

Chọn **B**: ứng dụng là SPA tĩnh. Không thêm lại `@angular/ssr`, `express`, `server.ts` hay hydration. Muốn bật SSR
sau này phải có ADR mới nêu yêu cầu nghiệp vụ cần nó.

## Hệ quả

- **Triển khai:** `ng build` (production) tạo thư mục tĩnh; image Docker dùng nginx, `try_files $uri /index.html`
  cho định tuyến phía trình duyệt, không cache `index.html`, cache dài cho tệp có băm tên (xem ADR 0002 và
  `doc/deploy/staging.md`).
- **Cấu hình URL API:** vì không có tiến trình Node đọc biến môi trường, URL API được nạp lúc khởi động container
  từ `config.json` (cấu hình runtime), không bake vào image.
- **Mã:** không cần `isPlatformBrowser` cho `localStorage`/`window`; `security.allowedHosts` không áp dụng.
- **Tài liệu cần đồng bộ sau khi hai sinh viên xác nhận** (các tệp này do người dùng giữ, PR này không sửa):
  `CLAUDE.md` mục "Hiện trạng đã phát hiện" (dòng "SSR đang bật"), `.claude/rules/03-angular-architecture-and-quality.md`
  (dòng "Hiện có `express` + `@angular/ssr`"), `.claude/rules/04-testing-and-cicd.md` (nhánh "Nếu SSR giữ lại").
  `README.md` đã được cập nhật trong PR này.
- **Nợ kỹ thuật:** TD-02 có thể chuyển sang "Đã xử lý" khi ADR được xác nhận.
- **Đảo ngược:** nếu sau này cần SSR, chi phí là thêm `@angular/ssr`, `server.ts`, kiểm tra nền tảng cho truy cập
  `localStorage`/`window` và đổi image sang Node; không có mã nào hiện nay bị khóa vào SPA tĩnh.

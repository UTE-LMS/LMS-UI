# LMS-UI

Giao diện web (Angular) của **Hệ thống quản lý, đo lường và phân tích chuẩn đầu ra chương trình đào tạo** (LOMS).
Tiểu luận chuyên ngành CNTT, Trường HCM-UTE. Backend: repo riêng `LMS-API` (Spring Boot + MongoDB). UI chỉ gọi API,
không truy cập MongoDB và không tự tính công thức đo lường chính thức.

> **Trạng thái:** đang phát triển (khung dự án). Chưa có màn hình nghiệp vụ.

## Công nghệ

Angular 21, TypeScript (strict), Tailwind CSS 4, Vitest (qua `ng test`), ESLint (`angular-eslint`) và Prettier.
Thư viện UI: chưa chọn. SSR (`@angular/ssr`) đang bật theo mặc định của khung, chờ quyết định giữ hay bỏ.

## Yêu cầu môi trường

- Node.js 24 và npm 11 (đã chạy với Node v24.13.0, npm 11.21.0; `packageManager` ghi `npm@11.12.1`).
- Backend `LMS-API` đang chạy để dùng các chức năng nghiệp vụ (khi đã có).

## Cài đặt và chạy

```
npm ci            # cài đúng phiên bản trong package-lock.json
npm start         # ng serve, mở http://localhost:4200/
```

## Kiểm tra chất lượng

```
npm run lint                         # ESLint, phải sạch lỗi
npx ng test --no-watch               # unit/component test (Vitest)
npx ng test --no-watch --coverage    # kèm báo cáo coverage (thư mục coverage/)
npm run build                        # build production vào dist/
npm audit --audit-level=high         # quét phụ thuộc
```

## Cấu trúc

```
src/app/            # mã ứng dụng (dự kiến core/, shared/, features/ theo module backend)
public/             # tài nguyên tĩnh
CLAUDE.md, .claude/ # quy tắc làm việc cho trợ lý AI
logsAI/             # nhật ký sử dụng AI (Rubric TC2.3)
```

Tài liệu dự án (nghiệp vụ, thiết kế CSDL, kế hoạch, hồ sơ đồ án) nằm ở repo `LMS-API/doc/`.

## Quy trình đóng góp

Nhánh theo tác vụ (`feat/…`, `fix/…`), commit theo Conventional Commits, mở Pull Request, **sinh viên còn lại review**
trước khi merge vào `main`. Không commit secret hay dữ liệu sinh viên thật. Thêm thư viện mới: ghim đúng major
tương thích Angular 21, ghi lý do vào `logsAI/ai-usage-log.md` mục D (xem `.claude/rules/03-…`).

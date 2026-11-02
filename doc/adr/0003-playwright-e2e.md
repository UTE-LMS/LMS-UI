# ADR 0003 — Playwright cho kiểm thử E2E và axe cho tiếp cận cơ bản

- **Trạng thái:** Đề xuất — chờ hai sinh viên xác nhận (IBS và IT).
- **Ngày:** 2026-11-02
- **Liên quan:** issue UI #12 (phần Playwright/axe; phần bảo vệ nhánh `main` là cài đặt GitHub, ngoài PR này);
  `.claude/rules/04-testing-and-cicd.md` (tầng E2E, phi chức năng: tiếp cận).

## Bối cảnh

Rubric TC2.5 yêu cầu nhiều tầng kiểm thử, trong đó có E2E và kiểm tiếp cận. Hiện chỉ có kiểm thử đơn vị (Vitest).
Cần một công cụ chạy trình duyệt thật, dựng được dữ liệu giả cho API (để chạy khi backend chưa có hoặc chưa ổn
định) và kiểm axe.

## Quyết định (đề xuất)

Thêm hai devDependency, ghim phiên bản chính xác (`--save-exact`), đã kiểm tra tương thích trước khi cài:

| Gói | Phiên bản | Giấy phép (đọc tệp `LICENSE`/`package.json` trong `node_modules`) | Dùng để |
|---|---|---|---|
| `@playwright/test` | 1.63.0 | Apache-2.0 | chạy test E2E, `page.route` giả lập API |
| `playwright-core` | 1.63.0 | Apache-2.0 | khai báo trực tiếp để khớp phiên bản với `@playwright/test`; nếu không, peer dependency của axe kéo bản 1.64.1 riêng |
| `@axe-core/playwright` | 4.13.0 | MPL-2.0 (kéo theo `axe-core` 4.13.0, MPL-2.0) | quét tiếp cận WCAG trên trang đã render |

Cả ba chỉ là công cụ phát triển, không nằm trong bundle ứng dụng. MPL-2.0 là giấy phép copyleft theo tệp; việc dùng
`axe-core` nguyên bản như một công cụ kiểm thử không buộc mã của đề tài phải đổi giấy phép. Trình duyệt Chromium do
Playwright tải riêng (`npm run e2e:install`), không đưa vào repo.

### Phạm vi hiện tại

- Thư mục `e2e/` (tệp `*.e2e.ts`, tên khác `*.spec.ts` để Vitest không nhặt nhầm) và `e2e/playwright.config.ts`.
  Cấu hình nằm trong `e2e/` để dùng chung `tsconfig` riêng và để ESLint kiểm được.
- `baseURL` lấy từ biến môi trường `E2E_BASE_URL`; không đặt thì tự chạy `ng serve` ở cổng 4200 (cấu hình
  development, vì `index.prod.html` ép chuyển sang https).
- Mọi lời gọi API bị chặn mặc định và chỉ test nào cần mới giả lập bằng `page.route` với dữ liệu mang nhãn
  **DỮ LIỆU THỬ NGHIỆM**. Test không phụ thuộc backend. Yêu cầu tới dịch vụ báo lỗi của Google Apps Script cũng bị
  chặn để test không gửi dữ liệu ra ngoài.
- axe chạy với toàn bộ rule mặc định, không tắt rule nào; test fail khi có vi phạm mức `serious` hoặc `critical`.
- Test hiện có: màn đăng nhập (hiển thị, form trống, sai thông tin 401, không đủ quyền 403, lỗi 500, đăng nhập thành
  công bằng dữ liệu giả, axe) và định tuyến (đường dẫn lạ về trang chủ, axe trang chủ).

### Vi phạm tiếp cận thật đã gặp và cách xử lý

Lần chạy đầu phát hiện vi phạm `serious` ở trang đăng nhập và trang chủ. Sửa tối thiểu trong giao diện, không tắt
rule: thêm `aria-label` cho liên kết logo/biểu tượng ở header và footer (`link-name`); thêm nhãn cho nút hiện/ẩn mật
khẩu (`aria-command-name`, khóa mới `AN_MAT_KHAU`/`HIEN_MAT_KHAU` trong hai tệp ngôn ngữ); đổi màu liên kết "Quên
mật khẩu?" và nút Google để đạt tỷ lệ tương phản 4.5:1 (`color-contrast`, chỉ phạm vi trang đăng nhập). Các vi
phạm mức `moderate`/`minor` (ví dụ thiếu `landmark`, `h1`) chưa chặn và nên xử lý khi thiết kế lại bố cục.

## Phương án không dùng

- **Cypress:** giấy phép MIT, chức năng tương đương cho nhu cầu này. Chọn Playwright vì `page.route` giả lập mạng, trace khi fail và
  `@axe-core/playwright` dùng ngay; không có lý do mạnh để giữ hai công cụ E2E.
- **Selenium/WebDriver:** cấu hình nặng, không có sẵn cơ chế chờ tự động và giả lập mạng.
- **Chỉ dùng `@angular/build:unit-test` với trình duyệt:** là kiểm thử component, không thay được E2E trên bản đã
  chạy bằng server thật.
- **Chỉ kiểm tiếp cận bằng ESLint template (`templateAccessibility`):** bắt được lỗi tĩnh nhưng không đo được
  tương phản màu hay tên truy cập sau khi render.
- **Không làm E2E:** thiếu tầng E2E ảnh hưởng điểm TC2.5.

## Hệ quả và giới hạn đã biết

- E2E của PR này viết cho giao diện trên `main` tại thời điểm viết. Nhánh `feat/f01-ui-screens` (PR #8) thay màn
  đăng nhập, đổi API sang `/api/v1/auth/login` và thêm trang `/mng/forbidden`; khi PR đó vào, cần cập nhật bộ chọn
  và địa chỉ giả lập trong `e2e/login.e2e.ts` và thêm test cho trang forbidden và chuyển hướng 401/403 của guard.
  Các test này chưa viết được vì các tính năng đó chưa có trên `main`.
- Luồng E2E đầy đủ trong rule 04 (đăng nhập → chọn lớp → tải điểm → kết quả CLO → báo cáo → truy vết) cần các màn
  hình F05–F07 chưa tồn tại; chưa thực hiện.
- Trong CI, `npx playwright install --with-deps chromium` tải trình duyệt mỗi lần (không cache) để đơn giản.

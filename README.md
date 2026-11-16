# LMS-UI

Giao diện web (Angular) của **Hệ thống quản lý, đo lường và phân tích chuẩn đầu ra chương trình đào tạo** (LOMS).
Tiểu luận chuyên ngành CNTT, Trường HCM-UTE. Backend: repo riêng `LMS-API` (Spring Boot + MongoDB). UI chỉ gọi API,
không truy cập MongoDB và không tự tính công thức đo lường chính thức.

> **Trạng thái:** đang phát triển. Đã có màn hình cho các chức năng F01–F07 (xem mục Giao diện). Theo dõi cải tiến
> (F08) và cấu hình ngưỡng/trọng số chưa có màn hình vì backend chưa có API.

## Giao diện

Ảnh chụp ở độ phân giải 1440×900, đăng nhập bằng tài khoản Quản trị viên. Toàn bộ số liệu là **DỮ LIỆU THỬ NGHIỆM**
(tên có nhãn `[DỮ LIỆU THỬ NGHIỆM]`, mã sinh viên giả `SV-xxxx`), tạo qua API trong database tạm, **không phải kết quả
đo thật**. Ảnh gốc ở `doc/screenshots/`.

### Đăng nhập và tổng quan

| Màn | Ảnh |
|---|---|
| Đăng nhập | ![Đăng nhập](doc/screenshots/01-dang-nhap.png) |
| Tổng quan: số lớp trong phạm vi, lần tính gần nhất, mức đạt PI/PLO kèm mẫu số | ![Tổng quan](doc/screenshots/02-tong-quan.png) |

### Thiết lập: CTĐT, học phần, đề cương, lớp

| Màn | Ảnh |
|---|---|
| Khung CTĐT và chuẩn đầu ra | ![Khung CTĐT](doc/screenshots/03-khung-ctdt.png) |
| Chi tiết phiên bản CTĐT (PLO, PI) | ![Chi tiết phiên bản CTĐT](doc/screenshots/04-chi-tiet-phien-ban-ctdt.png) |
| Học phần và học kỳ | ![Học phần và học kỳ](doc/screenshots/05-hoc-phan-hoc-ky.png) |
| Đề cương và CLO | ![Đề cương và CLO](doc/screenshots/06-de-cuong-clo.png) |
| Chi tiết đề cương (CLO, liên kết CLO–PI) | ![Chi tiết đề cương](doc/screenshots/07-chi-tiet-de-cuong.png) |
| Lớp học phần | ![Lớp học phần](doc/screenshots/08-lop-hoc-phan.png) |
| Chi tiết lớp và danh sách ghi danh | ![Chi tiết lớp](doc/screenshots/09-chi-tiet-lop.png) |

### Thu thập: bài đánh giá và nhập điểm

| Màn | Ảnh |
|---|---|
| Bài đánh giá của lớp | ![Bài đánh giá của lớp](doc/screenshots/10-bai-danh-gia-cua-lop.png) |
| Chi tiết bài đánh giá (ma trận câu hỏi–CLO) | ![Chi tiết bài đánh giá](doc/screenshots/11-chi-tiet-bai-danh-gia.png) |
| Độ phủ ma trận | ![Độ phủ ma trận](doc/screenshots/12-do-phu-ma-tran.png) |
| Nhập điểm từ CSV | ![Nhập điểm từ CSV](doc/screenshots/13-nhap-diem-csv.png) |
| Lịch sử nhập điểm, lỗi theo dòng/cột | ![Lịch sử nhập điểm](doc/screenshots/14-lich-su-nhap-diem.png) |

### Đo lường, báo cáo và phân tích

| Màn | Ảnh |
|---|---|
| Đo lường chuẩn đầu ra 4 cấp độ | ![Đo lường](doc/screenshots/15-do-luong-chuan-dau-ra.png) |
| Báo cáo QA và truy vết | ![Báo cáo và truy vết](doc/screenshots/16-bao-cao-truy-vet.png) |
| Phân tích đa chiều (biểu đồ và bảng số liệu) | ![Phân tích đa chiều](doc/screenshots/17-phan-tich-da-chieu.png) |

### Hệ thống

| Màn | Ảnh |
|---|---|
| Danh mục CTĐT | ![Danh mục CTĐT](doc/screenshots/18-danh-muc-ctdt.png) |
| Người dùng và phân quyền | ![Người dùng](doc/screenshots/19-nguoi-dung.png) |
| Thêm người dùng | ![Thêm người dùng](doc/screenshots/20-them-nguoi-dung.png) |
| Nhật ký thao tác | ![Nhật ký thao tác](doc/screenshots/21-nhat-ky-thao-tac.png) |
| Tài khoản của tôi | ![Tài khoản của tôi](doc/screenshots/22-tai-khoan-cua-toi.png) |
| Không có quyền | ![Không có quyền](doc/screenshots/23-khong-co-quyen.png) |

## Công nghệ

Angular 21, TypeScript (strict), Tailwind CSS 4, Vitest (qua `ng test`), ESLint (`angular-eslint`), Playwright + axe (E2E, tiếp cận), Docker + nginx. Có sẵn
`.prettierrc` nhưng chưa bật kiểm Prettier trong CI (lý do: `doc/adr/0002-ci-cd-ui.md`).
UI là SPA tĩnh, **không dùng SSR** (`doc/adr/0001-spa-tinh-khong-ssr.md`, đề xuất chờ hai sinh viên xác nhận): `ng build`
tạo tệp tĩnh, phục vụ bằng nginx với fallback `index.html`.

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
npm run test:ci                      # unit test + coverage, fail nếu dưới 70% dòng lệnh mô-đun lõi (coverage/LMS-UI/)
npm run build                        # build production vào dist/browser/
npm run e2e:install                  # tải Chromium cho Playwright (một lần)
npm run e2e                          # E2E Playwright + axe, API giả lập (tự chạy ng serve)
npm audit --audit-level=high         # quét phụ thuộc
```

Phạm vi coverage, truy vết AC, SonarCloud và E2E: `doc/testing-and-quality.md`. Pipeline CI: `.github/workflows/ci.yml`
(`build`, `lint`, `test`, `e2e`, `security`, `docker`, `deploy-staging`), lý do từng công cụ: `doc/adr/0002-ci-cd-ui.md`.

## Cấu hình URL API (runtime)

URL backend **không** bake vào bundle production. `index.html` nạp `config.js` (đặt `globalThis.APP_CONFIG`) trước
ứng dụng; trong container, `config.js` được sinh lúc khởi động từ biến môi trường:

| Biến | Ý nghĩa |
|---|---|
| `API_BASE_URL` | địa chỉ gốc backend, ví dụ `https://api.example.org` (tự thêm `/` cuối); rỗng = cùng nguồn gốc |
| `FILE_BASE_URL` | địa chỉ gốc dịch vụ tệp (mặc định bằng `API_BASE_URL`) |

Chạy `ng serve` thì dùng `src/environments/environment.ts`. Không đặt secret vào các biến này (giá trị gửi xuống trình duyệt).

## Docker và triển khai

```
docker build -t lms-ui:local .
bash deploy/smoke-image.sh lms-ui:local      # chạy thử container, kiểm tra health/SPA/config/non-root
```

Image nginx không root (cổng 8080), có `HEALTHCHECK` (`/healthz`) và fallback SPA về `index.html`. Quy trình staging,
biến/secret cần tạo, health check, rollback: `doc/deploy/staging.md` (khung chờ nền tảng, chưa có lần deploy thật).

## Cấu trúc

```
src/app/            # mã ứng dụng (dự kiến core/, shared/, features/ theo module backend)
src/environments/   # cấu hình theo môi trường; runtime-config.ts đọc config.js
e2e/                # Playwright (*.e2e.ts) và cấu hình
deploy/             # nginx, entrypoint cấu hình runtime, script smoke/deploy/health check, compose staging
doc/adr/            # quyết định kiến trúc của repo UI (0001 SPA tĩnh, 0002 CI/CD, 0003 Playwright)
doc/deploy/         # tài liệu triển khai staging
doc/screenshots/    # ảnh chụp màn hình cho README (dữ liệu thử nghiệm)
public/             # tài nguyên tĩnh
CLAUDE.md, .claude/ # quy tắc làm việc cho trợ lý AI
logsAI/             # nhật ký sử dụng AI (Rubric TC2.3)
```

Tài liệu dự án (nghiệp vụ, thiết kế CSDL, kế hoạch, hồ sơ đồ án) nằm ở repo `LMS-API/doc/`.

## Quy trình đóng góp

Nhánh theo tác vụ (`feat/…`, `fix/…`), commit theo Conventional Commits, mở Pull Request, **sinh viên còn lại review**
trước khi merge vào `main`. Không commit secret hay dữ liệu sinh viên thật. Thêm thư viện mới: ghim đúng major
tương thích Angular 21, ghi lý do vào `logsAI/ai-usage-log.md` mục D (xem `.claude/rules/03-…`).

# LMS-UI

Giao diện web (Angular) của **Hệ thống quản lý, đo lường và phân tích chuẩn đầu ra chương trình đào tạo** (LOMS).
Tiểu luận chuyên ngành CNTT, Trường HCM-UTE. Backend: repo riêng `LMS-API` (Spring Boot + MongoDB). UI chỉ gọi API,
không truy cập MongoDB và không tự tính công thức đo lường chính thức.

> **Trạng thái:** đang phát triển (khung dự án). Chưa có màn hình nghiệp vụ.

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
public/             # tài nguyên tĩnh
CLAUDE.md, .claude/ # quy tắc làm việc cho trợ lý AI
logsAI/             # nhật ký sử dụng AI (Rubric TC2.3)
```

Tài liệu dự án (nghiệp vụ, thiết kế CSDL, kế hoạch, hồ sơ đồ án) nằm ở repo `LMS-API/doc/`.

## Quy trình đóng góp

Nhánh theo tác vụ (`feat/…`, `fix/…`), commit theo Conventional Commits, mở Pull Request, **sinh viên còn lại review**
trước khi merge vào `main`. Không commit secret hay dữ liệu sinh viên thật. Thêm thư viện mới: ghim đúng major
tương thích Angular 21, ghi lý do vào `logsAI/ai-usage-log.md` mục D (xem `.claude/rules/03-…`).

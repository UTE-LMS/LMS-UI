# ADR 0002 — Pipeline CI/CD của UI và chuẩn bị staging

- **Trạng thái:** Đề xuất — chờ hai sinh viên xác nhận (IBS và IT).
- **Ngày:** 2026-11-02
- **Liên quan:** issue UI #10 (phân tích tĩnh, coverage) và #11 (CI, staging); nợ kỹ thuật TD-09 (phần UI) và TD-11;
  ADR 0001 (SPA tĩnh); `.claude/rules/04-testing-and-cicd.md`; `doc/deploy/staging.md`.

## Bối cảnh

`ci.yml` cũ chỉ có một job `build-test` (lint, test, build, audit). Rubric TC2.6 yêu cầu pipeline ≥ 6 chặng gồm quét
secret, quét image, đóng gói Docker, triển khai tự động và health check. Nền tảng staging chưa được chọn (issue #11
đang chờ GVHD/Khoa), nên phần triển khai chỉ là khung tham số hóa, không có host hay URL cố định.

## Quyết định

Tách thành các job riêng, tên thống nhất với repo API (`build`, `lint`, `test`, `security`, `docker`,
`deploy-staging`) và một job phụ `e2e`:

| Job | Chặng | Nội dung | Điều kiện chạy |
|---|---|---|---|
| `build` | 1 | `npm ci` + `npm run build` (production, kiểm budget trong `angular.json`) | mọi lần |
| `lint` | 2 | `npm run lint` (ESLint `angular-eslint` + `@stylistic`, 0 lỗi) | mọi lần |
| `test` | 3 | `npm run test:ci` = `ng test --no-watch --coverage`; cổng ≥ 70% dòng lệnh; tải báo cáo coverage; SonarCloud | mọi lần; Sonar khi `vars.SONAR_ENABLED == 'true'` |
| `e2e` | 3 (phụ) | Playwright + axe, API giả lập (ADR 0003) | mọi lần |
| `security` | 4 | `npm audit --audit-level=high`; gitleaks (toàn bộ lịch sử) | mọi lần |
| `docker` | 5 (và quét image của chặng 4) | build image, smoke test, Trivy, gắn tag, push GHCR | build/scan mọi lần; push chỉ ở `main` hoặc tag `v*.*.*` |
| `deploy-staging` | 6 | deploy qua SSH + docker compose, health check, E2E nhẹ | chỉ `push` vào `main` và `vars.STAGING_ENABLED == 'true'`; dùng GitHub Environment `staging` |

Nguyên tắc chung: không `continue-on-error`, không `|| true`; mỗi job `timeout-minutes`; quyền mặc định
`contents: read`, chỉ job `docker` có thêm `packages: write`; mọi action ghim theo SHA commit (kèm phiên bản trong
chú thích); `concurrency` hủy lần chạy cũ trừ `main`; Node ghim `24.13.0` (đã dùng để phát triển) và npm
`11.12.1` (khớp `packageManager`); luôn `npm ci`.

### Công cụ, giấy phép và phương án không dùng

| Công cụ | Giấy phép (đã tra repo) | Dùng để | Phương án không dùng |
|---|---|---|---|
| `actions/checkout`, `setup-node`, `upload-artifact` | MIT | lấy mã, cài Node có cache, lưu báo cáo | tự `git clone`/`curl` Node: dài và khó ghim |
| SonarCloud qua `SonarSource/sonarqube-scan-action` | LGPL-3.0 (action); dịch vụ miễn phí cho repo công khai | Blocker/Critical, trùng lặp (Rubric TC2.4) | tự dựng SonarQube: cần máy chủ; chỉ ESLint: không đo trùng lặp |
| gitleaks (binary v8.30.1) | MIT | quét secret trong mã và lịch sử | `gitleaks-action`: đòi giấy phép với repo của tổ chức; `trufflehog`: không có lý do hơn |
| Trivy (binary v0.76.0) | Apache-2.0 | quét lỗ hổng image Docker | `docker scout`: cần đăng nhập Docker Hub; `trivy-action`: thêm một action bên thứ ba cần tin cậy |
| `npm audit` | đi kèm npm | quét phụ thuộc theo `package-lock.json` | Dependabot/Snyk: bổ sung sau, không thay thế cổng trong CI |
| nginx (`nginxinc/nginx-unprivileged`) | Apache-2.0 (image), BSD-2-Clause (nginx) | phục vụ SPA tĩnh, user không root, cổng 8080 | image Node + SSR: bị loại bởi ADR 0001; `nginx` chuẩn: cần tự bỏ quyền root |
| Docker CLI thường | Apache-2.0 | build/push image | `docker/build-push-action`: không cần cho bản build một kiến trúc |

gitleaks và Trivy được tải từ trang phát hành, ghim phiên bản **và** mã băm SHA-256 trong `ci.yml` (kiểm bằng
`sha256sum --check`); đổi phiên bản phải đổi cả mã băm. Image nền ghim theo digest.

### Các lựa chọn cần nêu rõ

1. **Định dạng:** `.prettierrc` có sẵn nhưng Prettier **không** nằm trong `devDependencies` và mã hiện có không
   tuân thủ nó (nhiều dòng > 100 ký tự). Bật `prettier --check` sẽ đỏ ngay hoặc buộc định dạng lại cả repo, xung đột
   với các nhánh đang mở. Vì vậy chặng 2 dùng ESLint với `@stylistic` làm cổng định dạng (thụt lề, dấu nháy, dấu
   chấm phẩy, dấu phẩy cuối). Việc đưa Prettier vào là công việc riêng (cần ADR vì thêm thư viện).
2. **Trivy `--ignore-unfixed`:** chỉ chặn lỗ hổng HIGH/CRITICAL đã có bản vá. Lỗ hổng chưa có bản vá của image nền
   nhóm không sửa được; bỏ chúng khỏi cổng để cổng có ý nghĩa. Trên image thật, Trivy đã phát hiện `brotli-libs`
   (CRITICAL) và `curl`/`libcurl` (HIGH) có bản vá trong image nền ngày 2026-11-02; `Dockerfile` chạy `apk upgrade`
   để vá, sau đó Trivy báo 0.
3. **Quét image nằm trong job `docker`:** Trivy cần image đã build, nên "chặng 4" gồm hai job (`security` cho
   phụ thuộc và secret, `docker` cho image). Không tách thêm job build image thứ hai để khỏi build hai lần.
4. **E2E dùng `ng serve`, không dùng bản production:** `index.prod.html` có đoạn script ép chuyển sang `https`,
   nên bản build production không chạy được trên `http://localhost`.
5. **Docker build đa chặng tự build Angular:** image tự đủ (không phụ thuộc artifact của job `build`), tái lập được ở
   máy khác. Đổi lại build Angular chạy hai lần trong một pipeline.
6. **Gắn tag:** `sha-<7 ký tự>` cho mọi lần push, `main` cho nhánh chính, `X.Y.Z` khi đẩy tag `vX.Y.Z`. Rollback
   dùng lại tag `sha-...` trước đó (xem `doc/deploy/staging.md`).
7. **Cấu hình URL API lúc chạy:** `config.js` sinh khi container khởi động từ `API_BASE_URL`/`FILE_BASE_URL`
   (`src/environments/runtime-config.ts`), loại khỏi service worker; không có URL hay secret trong image.
8. **TD-11 (npm chặn install-scripts):** `allowScripts` đã khai báo trong `package.json`. Đã chạy `npm ci` bằng
   đúng `npm@11.12.1` trên bản sao sạch của `package.json` + `package-lock.json`: thành công, không có cảnh báo
   `install-scripts`. Không cần cấu hình thêm; theo dõi lần chạy CI thật đầu tiên để xác nhận.

## Hệ quả

- Pipeline có 7 job; các cổng chất lượng: lint 0 lỗi, test + coverage ≥ 70% (lõi), audit mức high, secret, Trivy.
- `deploy-staging` không chạy và không làm đỏ pipeline cho tới khi nhóm đặt `STAGING_ENABLED=true` và nền tảng
  staging sẵn sàng; việc đó nằm ngoài PR này (thiếu: nền tảng, host, khóa SSH, URL).
- SonarCloud tương tự: cần tạo dự án và `SONAR_TOKEN` rồi đặt `SONAR_ENABLED=true`.
- Bảo vệ nhánh `main` (TD-10) cần người có quyền quản trị bật trong cài đặt GitHub; PR này không đổi cài đặt đó.
- Số lần chạy CI, thời gian pipeline và tỷ lệ xanh chưa có số liệu thật vì workflow chưa chạy trên GitHub; không
  ghi số ước lượng ở đây.

# Triển khai staging cho UI (khung chuẩn bị)

> **Trạng thái:** khung chờ nền tảng. Nhóm chưa chọn nền tảng staging (issue #11 chờ GVHD/Khoa), nên **chưa có lần
> triển khai thật nào**. Tài liệu này mô tả image, cấu hình và quy trình đã sẵn sàng; không có host/URL cố định.
> Kiến trúc: SPA tĩnh phục vụ bằng nginx (`doc/adr/0001-spa-tinh-khong-ssr.md`); pipeline: `doc/adr/0002-ci-cd-ui.md`.

## Sơ đồ triển khai

```
Trình duyệt ──https──▶ [reverse proxy / nền tảng, kết thúc TLS]
                              │ http :8080
                              ▼
                  Container lms-ui (nginx-unprivileged, uid 101)
                    ├─ /usr/share/nginx/html   bundle Angular (chỉ đọc) + version.txt
                    └─ /tmp/runtime-config/config.js   sinh lúc khởi động từ API_BASE_URL
Trình duyệt ──https──▶ LMS-API (địa chỉ = API_BASE_URL; backend phải bật CORS cho nguồn gốc của UI)
```

Container chỉ nghe HTTP cổng 8080; HTTPS do lớp phía trước đảm nhiệm. Bản production của UI ép chuyển sang `https`
(`src/index.prod.html`), nên không mở trực tiếp bằng `http://` ngoài `localhost` được.

## Image

- Dựng bằng `Dockerfile` (đa chặng): Node 24.13.0 build, nginx 1.30 (Alpine) chạy; image nền ghim theo digest;
  `apk upgrade` khi build để nhận bản vá; user `101` (không root); `HEALTHCHECK` gọi `/healthz`.
- Tag: `sha-<7 ký tự commit>` (mọi lần push), `main` (nhánh chính), `X.Y.Z` (khi đẩy tag `vX.Y.Z`). Kho: `ghcr.io/<owner>/<repo>`
  viết thường (ví dụ dạng `ghcr.io/ute-lms/lms-ui:sha-abc1234`). Chỉ `main` và tag phiên bản mới được push.
- `version.txt` trong image chứa `<VERSION> <SHA đầy đủ>`, dùng để xác nhận đúng bản đang chạy.
- Chạy được ở chế độ chặt: `--read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true`.

Chạy thử ở máy cá nhân:

```
docker build --build-arg VERSION=local --build-arg VCS_REF=$(git rev-parse HEAD) -t lms-ui:local .
bash deploy/smoke-image.sh lms-ui:local          # chạy container, kiểm tra health/SPA/config/non-root rồi dọn
docker run --rm -p 8080:8080 -e API_BASE_URL=http://localhost:8080 lms-ui:local   # xem tay (cần proxy https như trên)
```

## Biến cấu hình

Không biến nào là secret: giá trị được gửi xuống trình duyệt qua `config.js`.

| Biến (container) | Bắt buộc | Ý nghĩa |
|---|---|---|
| `API_BASE_URL` | có ở môi trường thật | địa chỉ gốc backend, `http(s)://host[:cổng]`; tự thêm `/` cuối. Rỗng = cùng nguồn gốc. Giá trị lạ (không phải `http(s)://` hay `/`) làm container dừng ngay |
| `FILE_BASE_URL` | không | địa chỉ gốc dịch vụ tệp; mặc định bằng `API_BASE_URL` |

Biến và secret GitHub dùng cho job `deploy-staging` (đặt trong **Environment `staging`**; người có quyền quản trị tạo):

| Loại | Tên | Dùng cho |
|---|---|---|
| Variable (repository) | `STAGING_ENABLED` | `true` mới bật job `deploy-staging`; chưa đặt thì job bị bỏ qua |
| Variable | `STAGING_URL` | địa chỉ công khai của UI (health check, E2E, hiển thị trên Environment) |
| Variable | `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_PORT` (tùy chọn) | đích SSH |
| Variable | `STAGING_DEPLOY_DIR` (tùy chọn) | thư mục trên máy chủ, mặc định `/opt/lms-ui` |
| Variable | `STAGING_API_BASE_URL`, `STAGING_FILE_BASE_URL` (tùy chọn) | giá trị `API_BASE_URL`, `FILE_BASE_URL` của container |
| Variable | `STAGING_API_HEALTH_URL` (tùy chọn) | ví dụ `<API>/actuator/health`; health check phải trả 200 |
| Secret | `STAGING_SSH_KEY` | khóa riêng SSH dành riêng cho deploy |
| Secret | `STAGING_SSH_KNOWN_HOSTS` | dòng `known_hosts` của máy chủ (bắt buộc, không tắt kiểm tra khóa máy chủ) |
| Secret + Variable | `STAGING_GHCR_PULL_TOKEN` + `STAGING_GHCR_PULL_USER` | chỉ khi gói GHCR ở chế độ riêng tư |

Các biến cho SonarCloud (job `test`): variable `SONAR_ENABLED`, `SONAR_ORGANIZATION`, `SONAR_PROJECT_KEY`; secret
`SONAR_TOKEN`. Xem `doc/testing-and-quality.md`.

Nếu nền tảng được chọn không phải "SSH + docker compose" (ví dụ nền tảng PaaS/Kubernetes), thay hai bước *Configure
SSH* và *Deploy image to staging* trong `ci.yml` (và `deploy/deploy-staging.sh`); phần image, `config.js`, health check
và E2E giữ nguyên.

## Quy trình triển khai (tự động từ `main`)

1. Merge vào `main` → job `build`, `lint`, `test`, `e2e`, `security` đều xanh → job `docker` build, smoke test, quét
   Trivy rồi đẩy `sha-<7>` và `main` lên GHCR.
2. `deploy-staging` (nếu `STAGING_ENABLED=true`): `deploy/deploy-staging.sh` chép `deploy/docker-compose.staging.yml`,
   ghi `.env` (chỉ cấu hình không bí mật), lưu image đang chạy vào `previous-image.txt`, rồi `docker compose pull && up -d`.
3. Health check (`deploy/health-check.sh`): `/healthz` trả 200 (thử lại tối đa 30 lần cách 5 giây), trang chính trả
   200, `/version.txt` chứa SHA vừa triển khai, `/config.js` chứa đúng `API_BASE_URL`, và (nếu có) API health trả 200.
4. E2E nhẹ: `npm run e2e` với `E2E_BASE_URL=$STAGING_URL` (test giả lập API bằng `page.route`, kiểm UI đã triển khai).
   Muốn kiểm UI gọi được API thật, cần thêm test tích hợp riêng khi có backend staging.

Mốc "commit → staging ≤ 15 phút" (Rubric) chưa đo được vì chưa có lần chạy thật; chỉ đo khi pipeline chạy trên GitHub.

## Rollback

Image phiên bản trước vẫn còn trên GHCR (tag `sha-...` không bị ghi đè). Để quay lại:

1. Lấy tag trước: tệp `previous-image.txt` trên máy chủ (thư mục `STAGING_DEPLOY_DIR`), hoặc tag `sha-...` của lần
   deploy xanh gần nhất trong tab *Actions*/Environment `staging`.
2. Triển khai lại tag đó bằng cách chạy cục bộ hoặc trên runner:
   `LMS_UI_IMAGE=ghcr.io/<owner>/<repo>:sha-<trước> STAGING_URL=... EXPECTED_VERSION=<SHA đầy đủ trước> API_BASE_URL=... bash deploy/deploy-staging.sh && bash deploy/health-check.sh`
   (cùng các biến SSH như trên). Hoặc revert commit trên `main` để pipeline triển khai lại bản trước.
3. Xác nhận bằng `deploy/health-check.sh`. Ghi lại sự cố và tag đã quay về.

## Giám sát sau triển khai

Chưa có hệ thống giám sát/cảnh báo. Hiện có: `HEALTHCHECK` của container (`docker ps` hiển thị `healthy`),
`/healthz`, nhật ký truy cập/lỗi nginx ra stdout/stderr của container (`docker logs lms-ui`). Cảnh báo (ví dụ báo khi
`/healthz` lỗi) cần nền tảng được chọn; ghi nhận là nợ kỹ thuật còn lại của TD-09.

## Khắc phục sự cố thường gặp

- Container thoát ngay với "40-runtime-config: API_BASE_URL không hợp lệ": giá trị không phải `http(s)://...` hoặc `/`.
- Trình duyệt báo CORS: backend chưa cho phép nguồn gốc của UI (cấu hình ở LMS-API, không sửa ở UI).
- Người dùng vẫn thấy bản cũ: `index.html` và `ngsw.json` không được cache; service worker cập nhật ở lần tải sau.
  `config.js` bị loại khỏi service worker để đổi `API_BASE_URL` có hiệu lực ngay khi container khởi động lại.

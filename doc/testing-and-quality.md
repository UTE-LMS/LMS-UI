# Kiểm thử, coverage và phân tích tĩnh của UI

Tài liệu này gắn với issue UI #10 (phân tích tĩnh, cổng coverage) và #12 (E2E). Số liệu dưới đây là kết quả đo thật
ngày 2026-11-02 trên nhánh `chore/f00-ui-infra`; chạy lại bằng lệnh nêu kèm, đừng trích dẫn số cũ.

## Lệnh

| Lệnh | Tác dụng |
|---|---|
| `npm run lint` | ESLint (`angular-eslint`, `@stylistic`) trên `src/**/*.ts`, `src/**/*.html`, `e2e/**/*.ts`; phải 0 lỗi |
| `npm test` | unit test Vitest ở chế độ theo dõi (phát triển) |
| `npm run test:ci` | `ng test --no-watch --coverage`: chạy một lần, báo cáo coverage ở `coverage/LMS-UI/`, **fail nếu dưới ngưỡng** |
| `npm run e2e:install` | tải Chromium cho Playwright (một lần) |
| `npm run e2e` | E2E Playwright + axe (tự chạy `ng serve`; đặt `E2E_BASE_URL` để trỏ tới môi trường khác) |

## Cổng coverage

Cấu hình trong `angular.json` (mục `test`, builder `@angular/build:unit-test`, đúng các khóa `coverageInclude`,
`coverageExclude`, `coverageReporters`, `coverageThresholds` của schema builder đã cài):

- Nhà cung cấp coverage: `@vitest/coverage-v8` 4.1.12, ghim cùng `vitest` 4.1.12 (cùng major 4, cùng phiên bản).
- Ngưỡng: **`lines` ≥ 70**. Nếu thấp hơn, `ng test` thoát với mã lỗi và CI đỏ (đã kiểm chứng bằng cách tạm đặt 99:
  báo "Coverage for lines (92.88%) does not meet global threshold (99%)", mã thoát 1).
- Báo cáo: `text`, `html`, `lcovonly` (cho SonarCloud) và `json-summary`, đều nằm trong `coverage/LMS-UI/`; CI đăng
  tải thư mục này thành artifact `coverage-report`.

### Tập tệp tính coverage (và lý do)

Tính trên `src/app/core/{builder,guards,interceptors,services,validators}/**/*.ts`, loại tệp `*.spec.ts`. Đây là mọi
mã có logic ở tầng `core` hiện có: gọi HTTP và xác thực (`services`, `interceptors`), bảo vệ route (`guards`), kiểm
tra dữ liệu nhập (`validators`) và logic danh sách phân trang (`builder`), khớp danh sách "HTTP/auth/interceptors/
guards/validators/services/builders" của rule 04. Không tính:

- `core/models`, `core/constants`: chỉ khai báo kiểu/hằng, không có hành vi để kiểm thử.
- `core/core.providers.ts`: chỉ nối cấu hình thư viện (DI), không có logic của nhóm.
- `shared/`, `layout/`, `auth/`, `main/`, `mng/` (component): chưa nằm trong cổng này. **Con số này không nói gì về
  component.** Khi thêm test cho component nhập điểm, đo lường, truy vết (rule 04), phải mở rộng
  `coverageInclude`, không thu hẹp.

Bốn mô-đun nghiệp vụ nêu ở Rubric (nhập điểm, kết quả/mẫu số, truy vết) **chưa tồn tại** trên `main`, nên chưa có gì
để đo; không trích dẫn con số dưới đây như coverage của các mô-đun đó.

### Kết quả đo (`npm run test:ci`)

| Phạm vi | Lines | Statements | Branches | Functions |
|---|---|---|---|---|
| Tập `coverageInclude` (cổng) | **92.88%** (496/534) | 93.51% (548/586) | 86.98% (341/392) | 97.81% (134/137) |
| Toàn bộ `src/app/**/*.ts` (`--coverage-include "src/app/**/*.ts"`) | 41.74% (518/1241) | 42.22% | 52.69% | 38.26% |

Tệp thấp nhất trong cổng: `utils.service.ts` ~66% dòng (các nhánh đọc số tiếng Anh và vài chữ số hiếm chưa được
kiểm thử), `handler-error.service.ts` ~87%. 205 test, 0 skip.

### Khi `main` thay đổi

Nhánh `feat/f01-ui-screens` (PR #8) viết lại `can-active.guard.ts`, `auth.service.ts`, `handler-error.service.ts`,
`auth.interceptor.ts` và hai `list-mng-*.builder.ts`, đồng thời có spec riêng cho guard/auth/handler-error cùng đường
dẫn với spec trong PR này. Người merge sau cần giải quyết xung đột: giữ spec của PR #8 cho ba tệp đó, cập nhật spec
builder theo mô hình phân trang mới (`page`/`size` thay cho `pageable`), rồi chạy lại `npm run test:ci` để xác nhận
ngưỡng.

## Truy vết test ↔ AC

Test mới gắn mã AC theo mẫu `US-xx/AC-y` trong tên `describe`:

- Dùng AC có sẵn của backend khi hành vi khớp: `US-01/AC-6`, `US-03/AC-2` (chưa xác thực bị từ chối), `US-02/AC-4`
  (không đủ vai trò → từ chối), `US-40/AC-4` (lỗi không lộ chi tiết nội bộ).
- Phần hạ tầng UI không có user story nên dùng mã tạm **`NT-UI/AC-n`** (nền tảng UI), đề xuất trong PR này và cần hai
  sinh viên xác nhận/đưa vào `doc/test-plan.md`: AC-1 bộ kiểm tra form (validators); AC-2 bảo vệ rời trang
  (`canDeactivate`); AC-3 danh sách phân trang (`createListManager*`); AC-4 tiện ích văn bản/số (`UtilsService`);
  AC-5 `FormValidatorService`; AC-6 nhận diện loại tệp theo chữ ký byte; AC-7 `FileService`; AC-8 `SeoService` và
  `LatexService`; AC-9 cấu hình runtime (`runtime-config`).

Ca âm/biên có mặt ở từng nhóm (giá trị rỗng/null, đầu vào sai định dạng, 401/403/500, mất kết nối, dữ liệu bị sửa
tay trong localStorage, URL lạ trong cấu hình...). Giá trị kỳ vọng tính tay từ đặc tả (ví dụ đọc số "1205" thành
"Một nghìn hai trăm lẻ năm"), không lấy từ chính mã.

### Hành vi hiện tại đáng chú ý (phát hiện khi viết test)

- `CheckFileTypeService.checkTypeOfBlob` ném lỗi khi tệp ngắn hơn 12 byte (chữ ký JPEG-Exif dài nhất) thay vì trả về
  chuỗi rỗng; một test ghi nhận hành vi này ("đặc tính hiện tại"). Nên sửa trước khi dùng cho tải tệp điểm.
- `auth.interceptor.ts` gắn `Authorization: Bearer` cả cho yêu cầu tới `googleapis.com` khi đã đăng nhập (nhánh
  `GOOGLE_URL` không chặn bước gắn token phía sau). Hiện không có đường gọi nào tới Google nên chưa gây rò rỉ.
- `UtilsService.readNumberAsText` bản tiếng Anh cho ra "Fif" thay vì "Five" với số 5 (chuỗi `if\s` không khớp vì kết
  quả đã được cắt khoảng trắng). Mã thừa từ khung ban đầu; test chỉ kiểm bản tiếng Việt.
- Có 6 tệp nguồn còn `eslint-disable` (các tệp thuộc khung ban đầu, trong đó `handler-error.service.ts` do nhánh khác
  đang viết lại); PR này không thêm cái nào mới.

## SonarCloud

`sonar-project.properties` cấu hình nguồn, loại trừ (`src/assets/**` chứa thư viện bên thứ ba), đường dẫn
`coverage/LMS-UI/lcov.info`. **Chưa chạy được** vì cần người có quyền tạo dự án; các bước:

1. Đăng nhập sonarcloud.io bằng tài khoản GitHub, nhập tổ chức/repo `UTE-LMS/LMS-UI`.
2. Tạo token (My Account → Security) và lưu thành secret `SONAR_TOKEN` của repo.
3. Đặt variable repo: `SONAR_ORGANIZATION`, `SONAR_PROJECT_KEY` (giá trị lấy từ trang dự án Sonar, không đoán), rồi
   `SONAR_ENABLED=true`.
4. Tắt "Automatic Analysis" trong cài đặt dự án Sonar (nếu bật sẽ xung đột với phân tích từ CI).

Mục tiêu theo rule 03: 0 Blocker/Critical, trùng lặp ≤ 3%. Sonar tính coverage trên toàn bộ nguồn nên sẽ thấp hơn
con số của cổng (xem bảng trên). Chưa có số liệu Sonar thật; đừng ước lượng.

## E2E và tiếp cận

Xem `doc/adr/0003-playwright-e2e.md`. Kết quả chạy cục bộ ngày 2026-11-02 bằng `npm run e2e` (Chromium headless,
`ng serve`): 9 test, 9 pass. Hai test axe ban đầu fail vì vi phạm thật; đã sửa mã giao diện (không tắt rule axe).
Trang forbidden và chuyển hướng 401/403 của guard chưa có trên `main` nên chưa có E2E (xem ADR 0003, mục giới hạn).

# Rule 04 — Kiểm thử và CI/CD (UI)

Căn cứ: TC2.5 và TC2.6 (mỗi tiêu chí 5 điểm), G5, G6. Backend có quy tắc tương ứng trong
`D:\TLCN\LMS-API\.claude\rules\04-testing-and-cicd.md`; hai repo dùng chung kế hoạch kiểm thử và pipeline cùng tinh thần.

## Mục tiêu (ngưỡng Mức 5)

| Chỉ số | Mục tiêu |
|---|---|
| Số tầng kiểm thử | ≥ 4 (unit, integration/component, API/hợp đồng, E2E/UI, phi chức năng) |
| Coverage dòng lệnh mô-đun lõi của UI (nhập điểm, hiển thị kết quả/mẫu số, truy vết, HTTP/auth) | ≥ 70%, có báo cáo |
| Tỷ lệ test case tự động hóa | ≥ 70% |
| Test pass ở lần chạy CI cuối | 100% |
| Defect Critical/Blocker còn tồn khi bảo vệ | 0 |
| Chặng pipeline | ≥ 6 |
| Build xanh | ≥ 90% |
| Triển khai tự động trong kỳ | ≥ 10 lần, trải đều |
| Commit → staging | ≤ 15 phút |

## Kiểm thử

- **Công cụ hiện có:** `ng test` dùng builder `@angular/build:unit-test` (Vitest 4, `jsdom` đã có trong
  devDependencies). Coverage: `ng test --coverage`; cần thêm gói coverage của Vitest, **ghim đúng major khớp Vitest đã cài**
  (project dùng Vitest 4 nên dùng `@vitest/coverage-v8@4`, không dùng bản 5). E2E: **Playwright** (chưa cài; người dùng
  đã cho phép thêm thư viện, thêm theo điều kiện ở rule 03 và ghi ADR).
- **Tầng:**
  - Unit: pure function, pipe, service, interceptor, mapper trạng thái điểm → nhãn.
  - Component/integration: render với `TestBed`, tương tác, các trạng thái tải/rỗng/lỗi/không đủ quyền; HTTP bằng
    `provideHttpClientTesting` + `HttpTestingController`, không gọi mạng thật.
  - Hợp đồng API: kiểm tra DTO/interface khớp phản hồi mẫu của backend (cùng bên API giữ ví dụ phản hồi).
  - E2E (Playwright): luồng chính **đăng nhập → chọn lớp/bài đánh giá → tải tệp điểm → xem lỗi → xác nhận nhập → xem
    kết quả CLO (kèm mẫu số) → xem báo cáo → truy vết**, chạy với backend dữ liệu giả có nhãn.
  - Phi chức năng: hiệu năng tải trang/danh sách lớn (Lighthouse hoặc đo thủ công có ghi lại), tiếp cận cơ bản
    (axe), kích thước bundle theo budget, quét phụ thuộc (`npm audit`).
- **Truy vết:** mỗi test gắn một AC (`describe`/`it` có `US-xx/AC-y`). AC không có test là khoảng trống phải báo.
- **Ca âm, ca biên và trạng thái là bắt buộc:** tệp trống/sai cột; lỗi theo dòng; điểm vượt thang; `MISSING` không
  hiển thị là 0; `BLANK` hiển thị khác `MISSING`; tỷ lệ luôn kèm mẫu số; `INSUFFICIENT_DATA`; kết quả "không chính
  thức" có nhãn; 401/403/409/500/timeout; danh sách rỗng; dữ liệu lớn; chống gửi form hai lần; học kỳ khóa điểm.
- **Giá trị kỳ vọng tính tay độc lập**, không lấy kết quả của chính mã làm kỳ vọng. Dữ liệu test là dữ liệu giả có
  nhãn, không dùng dữ liệu thật; ví dụ trong tài liệu (72%, 60%, 45/40) chỉ là **ví dụ minh họa**.
- **Cấm:** xóa/skip/`it.skip`/`xit`/`fdescribe` test đang đỏ, nới assertion cho qua, mock chính đối tượng đang kiểm,
  assertion luôn đúng, snapshot chụp lại mà không xem, hạ ngưỡng coverage, sửa test cho khớp mã sai.
  `app.spec.ts` hiện kiểm tra `h1` "Hello, LMS-UI" của template mẫu: khi thay template phải **sửa test theo hành vi
  mới**, không xóa.
- Khi báo kết quả: nêu lệnh đã chạy, số test pass/fail/skip, coverage đo được. Không có số thì nói không có.
- **Quản lý lỗi:** mỗi lỗi là một issue (nhãn mức độ Critical/Major/Minor, bước tái hiện, ảnh chụp có dữ liệu giả,
  trạng thái); mỗi lỗi sửa kèm regression test và commit tham chiếu issue. Không đóng issue Critical khi chưa có
  test chứng minh.
- Kế hoạch kiểm thử và danh sách test case dùng chung `doc/test-plan.md` (bên API giữ). Không có kiểm thử tự động
  lẫn tài liệu kiểm thử thủ công là G5 (TC2.5 ≤ 1,75).

## CI/CD

- Ghim phiên bản Node/npm trong CI khớp thống nhất của Trung tâm CNPM (máy hiện tại Node v24.13.0, npm 11.21.0;
  `packageManager` trong `package.json` là npm@11.12.1). Dùng `npm ci`, không `npm install`.
- Các chặng (≥ 6): 1. cài đặt + build (`ng build`); 2. lint + định dạng + phân tích tĩnh; 3. test + cổng coverage
  (`ng test --no-watch --coverage`); 4. quét phụ thuộc và secret (`npm audit`, gitleaks, Trivy cho image);
  5. đóng gói Docker + gắn phiên bản; 6. triển khai tự động tới staging, rồi kiểm tra sức khỏe (trang chính trả 200,
  gọi được API) và E2E nhẹ.
- Nếu **SSR giữ lại**: image chạy Node (`serve:ssr:LMS-UI`), cấu hình `allowedHosts`; nếu **bỏ SSR**: build tĩnh phục vụ
  bằng web server (ví dụ nginx) với cấu hình fallback về `index.html`. Chọn theo ADR.
- Cấu hình URL API theo môi trường truyền vào qua cơ chế của nền tảng, không bake secret vào image.
- Có đánh phiên bản và khả năng rollback (giữ image phiên bản trước). Có giám sát sau triển khai: health check,
  log, cảnh báo.
- **Không làm giả "xanh":** không `continue-on-error`, `|| true`, bỏ chặng khi lỗi, giảm ngưỡng cổng chất lượng.
  Pipeline đỏ thì sửa nguyên nhân.
- Chạy `ng build` và `ng test --no-watch` cục bộ trước khi đề nghị đẩy mã để giữ tỷ lệ build xanh ≥ 90%. Không báo
  trạng thái CI nếu chưa xem được lần chạy thực. Không bịa số lần deploy hay thời gian pipeline.
- Staging công khai (và tốt nhất production có người dùng thật) phục vụ TC2.2 Mức 5 và demo trực tiếp (TC3).
  Pipeline chưa chạy được tại thời điểm bảo vệ là G6 (TC2.6 ≤ 2,75).

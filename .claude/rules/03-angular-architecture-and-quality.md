# Rule 03 — Kiến trúc Angular, chất lượng mã và Git (UI)

Căn cứ: TC2.4 (10 điểm), G2, G8. Mức 5: 0 lỗi lint; 0 issue Blocker/Critical; trùng lặp ≤ 3%; ≥ 90% số tuần có
commit; ≥ 90% thay đổi qua Pull Request có review; 0 secret; cấu hình qua biến môi trường; README, hướng dẫn cài
đặt, sơ đồ triển khai; danh mục nợ kỹ thuật kèm kế hoạch xử lý.

**Luôn tra tài liệu chính thức của đúng phiên bản** (Angular 21 trong `package.json`, `angular.dev`). Không dùng cú
pháp AngularJS 1.x. Không trộn kiểu cũ/mới trong cùng dự án: theo kiểu mà các file đã được CLI sinh ra (`app.ts`
với `class App`, `app.html`, `app.css`, không hậu tố `.component`).

## Cấu trúc thư mục (đề xuất, ghi ADR nếu đổi)

```
src/app/
  core/        # dùng toàn app, tạo một lần: api client, auth, interceptors, guards, cấu hình, xử lý lỗi, constants, models, services, validators
  shared/      # thành phần/pipe/directive, widget dùng lại, không phụ thuộc nghiệp vụ cụ thể
  features/    # mỗi nhóm chức năng một thư mục, bám module backend:
    auth/ program/ course/ assessment/ academic/ score-import/ measurement/ report/ improvement/
```

- Mỗi `feature` có `routes` riêng, **lazy load** (`loadChildren` / `loadComponent`).
- Phụ thuộc một chiều: `features` → `shared`, `core`; `shared` không phụ thuộc `features`; feature không import chéo
  feature khác (cần dùng chung thì đẩy xuống `shared`/`core`).
- Phân tách: component "thông minh" (lấy dữ liệu, điều phối) và component "trình bày" (nhận `input()`, phát
  `output()`). Logic nghiệp vụ hiển thị và gọi API nằm trong service, không nằm trong template.

## Quy ước viết mã Angular (theo tài liệu chính thức; xác nhận với đúng phiên bản trước khi dùng)

- Standalone component (không NgModule mới). `inject()` thay vì constructor injection khi hợp lý.
- Trạng thái cục bộ bằng **signals** (`signal`, `computed`, `input()`, `output()`); luồng bất đồng bộ HTTP bằng
  RxJS/`HttpClient` hoặc API tương ứng của phiên bản; hủy đăng ký bằng `takeUntilDestroyed` / `async` pipe /
  tín hiệu, không để rò rỉ subscription.
- Template dùng cú pháp control flow `@if`, `@for` (có `track`), `@switch`. Không logic nặng trong template.
- `ChangeDetectionStrategy.OnPush` cho component mới. (Cấu hình hiện có `zone.js` + `provideZoneChangeDetection`;
  không đổi sang zoneless khi chưa có ADR.)
- Form: **Reactive Forms** (ổn định). Không dùng tính năng thử nghiệm của framework khi chưa có ADR.
- TypeScript `strict` và `strictTemplates` đã bật: **cấm `any`** (dùng `unknown` + thu hẹp kiểu), không
  `@ts-ignore`. Mô hình dữ liệu là `interface`/`type` khớp DTO của backend; enum trạng thái (`ScoreStatus`, `Verification`…)
  khai báo một nơi.
- Kiểu dữ liệu API: định nghĩa interface thủ công khớp DTO backend và có test hợp đồng, hoặc sinh từ OpenAPI của
  backend nếu backend cung cấp (quyết bằng ADR cùng bên API). Không suy diễn tên trường.
- Không `innerHTML` với dữ liệu người dùng; không `bypassSecurityTrust*` nếu chưa có lý do ghi rõ.

## Gọi API, xác thực, cấu hình

- Một lớp HTTP tập trung: `HttpClient` + interceptor (gắn thông tin xác thực, chuẩn hóa lỗi, 401 → đăng nhập lại,
  hết thời gian, thử lại có kiểm soát chỉ cho thao tác an toàn/idempotent). Không `fetch`/`XMLHttpRequest` rải rác.
- Cơ chế xác thực/lưu token theo **ADR xác thực của backend** (JWT hay session). Không đặt token trong URL, không ghi
  log token. Nếu SSR còn bật: không truy cập `window`/`localStorage`/`document` trực tiếp ngoài kiểm tra nền tảng.
- URL API và cờ môi trường nằm ở file cấu hình theo môi trường (hoặc cấu hình runtime), **không có secret**. Chỉ
  commit file mẫu; thêm khóa mới thì cập nhật file mẫu và README.
- Lỗi từ backend (mã, thông báo, lỗi theo trường) được ánh xạ thành thông báo người dùng hiểu được; không hiển thị
  stack trace hay chi tiết nội bộ.

## Convention và công cụ phân tích

- Đã có: `.prettierrc` (printWidth 100, dấu nháy đơn, parser `angular` cho HTML), `.editorconfig` (2 space, UTF-8).
  Tuân theo; định dạng bằng Prettier trước khi báo xong.
- **ESLint đã cấu hình** (`angular-eslint@21.4.0`, `eslint.config.js`, `npm run lint`). Mục tiêu: **0 lỗi lint**. Không `eslint-disable` để cho qua; nếu bắt buộc, ghi lý do tại chỗ và
  trong `doc/tech-debt.md`.
- Phân tích tĩnh/trùng lặp: SonarQube/SonarCloud (hoặc công cụ tương đương) với mục tiêu **0 Blocker/Critical,
  trùng lặp ≤ 3%**. Chạy công cụ thật; chưa cài thì nói rõ là chưa đo, đừng ước lượng.
- Coding convention phải được công bố (Rubric mục 8 #7): thống nhất một tài liệu `doc/coding-convention.md` với
  repo API (nội dung phần UI: Angular Style Guide + ESLint + Prettier). Chưa có thì nhắc, đừng tự cố định.
- Hàm/component ngắn, một việc; không magic number/chuỗi hardcode (dùng hằng, enum, cấu hình); không comment nhắc
  lại điều mã đã nói, chỉ comment "vì sao". Không mã chết, không `console.log` còn sót.
- Budget build hiện có (`initial` cảnh báo 500 kB, lỗi 1 MB; style component cảnh báo 4 kB): không nới để cho qua;
  lazy load và tối ưu import thay vì tăng ngưỡng.

## Dependency

Người dùng **đã cho phép dùng thư viện**. Điều kiện mỗi package:
1. Có lý do gắn yêu cầu và phương án không dùng nó; giấy phép tương thích (đọc file giấy phép, không đoán từ tên).
2. **Ghim đúng major tương thích Angular 21.** Bản `latest` trên npm của nhiều thư viện Angular hiện yêu cầu
   Angular 22. Kiểm tra `peerDependencies` (`npm view <gói>@<major> peerDependencies`) trước khi cài; không dùng
   `@latest`; không dùng `--force`/`--legacy-peer-deps` để cho qua xung đột. Xung đột phiên bản → dừng và báo.
3. Cài bằng lệnh nêu rõ phiên bản, commit `package-lock.json`. Thêm vào nhật ký AI mục D (nguồn, giấy phép, dùng ở
   đâu). Thư viện lớn (UI kit, framework test/E2E, thư viện biểu đồ) ghi ADR.
4. Xóa package không dùng. Chạy `npm audit` định kỳ; không chấp nhận lỗ hổng mức cao tồn đọng. Không tự nâng/hạ
   phiên bản chính của Angular hay thư viện đã chốt.

Hiện có `express` + `@angular/ssr` (SSR) chưa có lý do trong thiết kế (xem `CLAUDE.md`).

## Git

- Nhánh theo tác vụ: `feat/<mô-tả>`, `fix/…`, `docs/…`, `test/…`, `chore/…`. Không làm trực tiếp trên `main`.
- Mọi thay đổi vào `main` qua Pull Request có review (≥ 90%). Hai sinh viên review chéo; người mở PR không tự
  approve; agent không approve/merge thay. Nên bật bảo vệ nhánh `main` (bắt buộc ≥ 1 review).
- Mô tả PR nêu: mục tiêu, user story/AC, cách kiểm chứng, phần có AI hỗ trợ, ảnh hưởng tài liệu. Có ảnh chụp màn
  hình khi thay giao diện (dùng dữ liệu giả có nhãn).
- Commit nhỏ, một ý, Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`), tiếng Anh,
  thể mệnh lệnh. Mỗi sinh viên commit bằng danh tính Git của riêng mình.
- Không `--no-verify`, không `push --force` lên nhánh chung, không rewrite lịch sử đã đẩy.
- Chỉ commit/push khi người dùng yêu cầu. Thấy `git log` cách quãng hơn một tuần hoặc commit dồn cục thì nhắc
  (mục tiêu ≥ 90% số tuần có commit; báo cáo tiến độ ≥ 1 lần/tuần, G2).
- Repo phải cấp quyền cho hội đồng và build được từ bản clone sạch (G8): sau thay đổi lớn, kiểm tra `npm ci` và
  `ng build`.
- Quét secret (gitleaks) trước commit. Thấy secret → dừng, báo, đề nghị thu hồi khóa; không "xóa ở commit sau".

## Tài liệu kỹ thuật cho người tiếp nhận

Thay `README.md` (hiện là bản mặc định của Angular CLI) bằng: mục đích, kiến trúc UI, yêu cầu môi trường (Node,
npm), cài đặt, chạy, test, build, biến cấu hình, cách trỏ tới backend, cấu trúc thư mục. Nợ kỹ thuật ghi ở
`D:\TLCN\LMS-API\doc\tech-debt.md` (dùng chung hai repo, cột Repo; mô tả, tác động, kế hoạch xử lý). Thêm package, cấu hình hay bước chạy mới → cập nhật README cùng lúc.

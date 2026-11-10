# Nhật ký sử dụng AI (AI Usage Log) — repo LMS-UI

Phục vụ Rubric TC2.3 và Mục 8 #5. Nhật ký này dành cho repo `LMS-UI`; repo `LMS-API` có nhật ký riêng tại
`D:\TLCN\LMS-API\logsAI\ai-usage-log.md` (cùng định dạng). Khi nộp, gộp hai nhật ký.
Quy tắc ghi: `.claude/rules/01-ai-usage-and-ownership.md`.

- Ghi đúng sự thật; kê khai phải khớp `git log` và phần vấn đáp (mâu thuẫn = G4).
- Agent điền các cột về công cụ, phạm vi, prompt, file. Cột **"Sinh viên đã sửa/rà soát"** và **"Commit"**
  do sinh viên điền sau khi đọc và hiểu mã.
- Mỗi vị trí mã AI sinh phải được sinh viên giải thích được (mục tiêu 100% khi hội đồng chọn ≥ 5 vị trí).

## A. Nhật ký phiên làm việc

| # | Ngày | Sinh viên | Công cụ / mô hình | Phạm vi | Prompt chính (tóm tắt) | File AI sinh/sửa | Sinh viên đã sửa/rà soát | Kiểm chứng đã làm | Commit |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-10-20 | _chờ điền_ | Claude Code, claude-sonnet-5-5 | Soạn bộ rule cho repo UI (CLAUDE.md tự chứa + 4 rule), tạo nhật ký AI riêng cho repo | "set rule bên phần UI cho tôi" | `CLAUDE.md`, `.claude/rules/01…04`, `logsAI/ai-usage-log.md` | _Chờ sinh viên rà soát_ | Đọc `angular.json`, `app.config.ts`, `app.ts`, `app.spec.ts`, `package.json`, `.prettierrc`, `.editorconfig`, `.gitignore`, `.vscode/mcp.json`; đối chiếu rubric. Chưa chạy `ng build`/`ng test` (chưa có mã mới) | Nhánh `chore/project-setup` (sinh viên điền mã commit) |
| 2 | 2026-10-20 | _chờ điền_ | Claude Code, claude-sonnet-5-5 | Ghi quyết định "cho dùng thư viện" vào rule; ghim phiên bản theo Angular 21 | "cho dùng thư viện" | `CLAUDE.md`, `.claude/rules/01…04` | _Chờ sinh viên rà soát_ | `npm view` kiểm tra `latest` của @angular/material, primeng, angular-eslint đều cần Angular 22; xác nhận có bản 21.x (`@angular/material@21.2.14`, `primeng@21.1.10`, `angular-eslint@21.4.0`, `@vitest/coverage-v8@4.1.12`) và peerDependencies tương thích. Chưa cài gì | Nhánh `chore/project-setup` (sinh viên điền mã commit) |
| 3 | 2026-10-20 | _chờ điền_ | Claude Code, claude-sonnet-5-5 | Cài ESLint và gói coverage; vá lỗ hổng phụ thuộc; README; khung CI | "bạn hãy làm theo hướng bạn nghĩ tối ưu nhất" | `package.json`, `package-lock.json`, `angular.json`, `eslint.config.js`, `README.md`, `.github/workflows/ci.yml`, `CLAUDE.md`, `.claude/rules/03…` | _Chờ sinh viên rà soát_ | Baseline trước khi sửa: `ng test` 2 pass, `ng build` OK. `ng add angular-eslint@21.4.0`; `@vitest/coverage-v8` ghim 4.1.10 rồi 4.1.12 khớp `vitest`. `npm audit` ban đầu 26 lỗ hổng (3 critical): `npm audit fix` còn 11; `npm install` nhóm Angular bị ERESOLVE (không dùng `--force`); `ng update @angular/core@21.2.25 @angular/cli@21.2.27` thành công → `npm audit` = 0. Sau cùng `npm run lint` sạch, `ng test --coverage` 2 pass, `ng build` OK. **Chưa kiểm chứng:** `ci.yml` trên GitHub | Nhánh `chore/project-setup` (sinh viên điền mã commit) |
| 4 | 2026-10-27 | TinMH (IT) | Claude Code, claude-sonnet-5-5 | Khởi tạo tài liệu Hợp đồng API liên repo (`API-CONTRACT.md`) cho Bước 00 và lộ trình F01–F08 | "khởi tạo tài liệu hợp đồng API (D:\TLCN\LMS-UI\doc\API-CONTRACT.md) để Frontend và Backend giao tiếp thống nhất qua từng bước" | `doc/API-CONTRACT.md`, `logsAI/ai-usage-log.md` | _Chờ sinh viên rà soát_ | Đối chiếu cấu trúc `ErrorResponse` và `ErrorCode` enum trong `LMS-API`; kiểm tra định dạng ISO-8601 UTC và ObjectId 24 ký tự hex; đối soát endpoint Actuator `/actuator/health` (UP/DOWN) và `/actuator/info`; xác thực bảng ánh xạ HTTP status và hướng dẫn xử lý UI trên Angular Reactive Forms | _Chờ sinh viên điền commit_ |
| 5 | 2026-10-27 | TinMH (IT) | Teamwork Agent, Claude Sonnet | Cập nhật hợp đồng API liên repo (API-CONTRACT.md) cho F01 theo R1 và đồng bộ nhật ký AI | "Cập nhật hợp đồng API tại D:\TLCN\LMS-UI\doc\API-CONTRACT.md theo R1: chuẩn hóa tiền tố /api/v1/, loại bỏ /auth/refresh và DELETE /users/{id}, chuyển /users/me sang /auth/me, chuẩn hóa GET /users phân trang envelope, quy định mã 401 login và DTOs" | `doc/API-CONTRACT.md`, `logsAI/ai-usage-log.md` | _Chờ sinh viên rà soát_ | Đối chiếu chi tiết từng DTO và endpoint với `doc/plan/F01-nguoi-dung-phan-quyen.md`, `ADR 0002` và `ORIGINAL_REQUEST.md`; kiểm tra ràng buộc phân trang envelope chuẩn (page >= 0, 1 <= size <= 100); xác thực quy tắc xử lý mã 401 cho form đăng nhập UI; kiểm tra tính bất biến của username và các guards bảo vệ tài khoản ADMIN. | _Chờ sinh viên điền commit_ |
| 6 | 2026-10-31 | TinMH (IT) | Claude Code, claude-sonnet-5-5 | Dựng giao diện F01 (người dùng và phân quyền) theo thiết kế LOMS trên canvas: đăng nhập, danh sách/thêm/sửa người dùng, khóa/mở khóa, route + menu theo vai trò, trang "Không có quyền"; sửa lớp HTTP (interceptor, xử lý lỗi, guard) theo `API-CONTRACT.md` §3 | "build cho tôi màn hình ở F01 để tôi hoàn thiện phase này" (kèm liên kết canvas thiết kế) | `src/app/auth/login/*`, `src/app/auth/auth.routes.ts`, `src/app/mng/users/**`, `src/app/mng/forbidden/*`, `src/app/mng/mng.routes.ts`, `src/app/core/services/{auth,user,common}/*`, `src/app/core/{guards,interceptors,validators,models,constants,builder}/*`, `src/app/layout/mng/*`, `src/environments/environment.ts`, `tsconfig.json` (alias `@builder/*`), các file `*.spec.ts` | _Chờ sinh viên rà soát_ | `npm ci` (node_modules đang thiếu ng-zorro, ngx-toastr…); `npm run build:dev` và `npm run build` (production, không vượt budget); `npm run lint` = 0 lỗi; `ng test --no-watch --coverage`: 14 file, 106 test pass. Chưa chạy với backend thật và chưa xem trên trình duyệt (không có backend/trình duyệt trong phiên) | _chưa commit_ |
| 7 | 2026-11-02 | TinMH (chờ xác nhận IBS/IT) | Claude Code, claude-sonnet-5-5 (điều phối + 2 subagent) | F00 phía UI: PR #41 (thành phần dùng chung: huy hiệu trạng thái điểm, khối mẫu số, nhãn "Không chính thức", cảnh báo `isStale`, nhãn rubric/Bloom; xử lý lỗi API thống nhất: retry GET, timeout, gắn `fieldErrors` vào form, `app-error-state`) và PR #42 (ADR không SSR, cổng coverage 70% cho `core/*`, CI 7 job, Dockerfile nginx + cấu hình runtime, khung deploy staging, Playwright + axe) | "làm các issue F00, hoàn thiện toàn bộ" (staging chỉ chuẩn bị, bảo vệ `main` chỉ viết hướng dẫn, sửa hết vi phạm, tạo PR) | Xem PR #41 (base `feat/f01-ui-screens`) và #42 (base `main`); ADR `doc/adr/0001-spa-tinh-khong-ssr.md`, `0002-ci-cd-ui.md`, `0003-playwright-e2e.md`; `doc/testing-and-quality.md`; `doc/deploy/staging.md` | _Chờ sinh viên rà soát_ | Do agent chạy thật: PR #41 lint sạch, 381 test pass, build production OK; PR #42 lint sạch, 205 test pass, coverage `core/*` 92,88% (toàn `src/app` 41,74%), E2E 9/9 trên Chromium, `docker build` + smoke, Trivy sau `apk upgrade` 0, gitleaks lịch sử sạch, CI thật xanh 6 chặng. **Chưa chạy/chưa đo:** Sonar, deploy staging, thời gian commit→staging, E2E trên backend thật, kiểm tra bằng mắt trên trình duyệt (PR #41) | PR #41, #42 — chưa merge; điền mã commit sau khi merge |
| 8 | 2026-11-05 | minhat5 (chờ xác nhận IBS/IT) | Antigravity, Gemini 3.8 Flash | Tái cấu trúc layout Admin theo đúng UI.pdf: Top navbar màu xanh navy, logo trường HCMUTE, menu chỉ hiển thị chức năng đang có (Tổng quan, Người dùng, Chương trình), dropdown người dùng có nút Đăng xuất; thêm phân hệ quản trị danh mục CTĐT cho Admin (/mng/programs) | "Giờ code lại trang admin cho giống bố cục với trong file UI.pdf được không, khác cái logo thì đặt là hình logo trường có sẵn trong assets và các chức năng nào không có thì đừng đưa vào trong header hay sidebar bây giờ chỉ đưa những gì có thôi, còn ở người dùng khi đã đăng nhập bấm vô thì có nút đăng xuất" | `src/app/layout/mng/*`, `src/app/mng/programs/*`, `src/app/mng/users/list-users/*`, `src/app/core/services/program/*`, `src/app/core/models/program/*`, `src/app/core/constants/url.constant.ts`, `src/app/mng/mng.routes.ts` | _Chờ sinh viên rà soát_ | `npm test` 50 file, 564 test pass; `npx eslint` trên toàn bộ file mới/sửa = 0 lỗi; `npm run build:dev` biên dịch thành công. | _chưa commit_ |

| 9 | 2026-11-05 | minhat5 (chờ xác nhận IBS/IT) | Antigravity, Gemini 3.8 Flash | Đồng bộ API cập nhật trạng thái phiên bản CTĐT: bỏ status khỏi IProgramVersionUpdateRequest, thêm IProgramVersionStatusUpdateRequest và updateProgramVersionStatus (PUT /api/v1/program-versions/{id}/status); cập nhật form-curriculum-version và list-curriculum-versions | "giờ sửa cả bên UI cho sử dụng đúng API đi không lỗi" | `src/app/core/constants/url.constant.ts`, `src/app/core/models/program/program-version.model.ts`, `src/app/core/services/program/program-version.service.ts`, `src/app/core/services/program/program-version.service.spec.ts`, `src/app/mng/curriculum/form-curriculum-version/form-curriculum-version.component.ts`, `src/app/mng/curriculum/list-curriculum-versions/list-curriculum-versions.component.ts`, `src/app/mng/curriculum/list-curriculum-versions/list-curriculum-versions.component.html`, `src/app/mng/curriculum/list-curriculum-versions/list-curriculum-versions.component.spec.ts` | _Chờ sinh viên rà soát_ | `npm test -- --no-watch`: 56 test files, 592/592 test pass 100%; `npm run build:dev` biên dịch thành công; kiểm chứng khớp API với LMS-API | _chưa commit_ |
| 10 | 2026-11-06 | minhat5 (chờ xác nhận IBS/IT) | Antigravity, Gemini 4 Argon (Medium) | Hoàn thiện giao diện F02 Khung CTĐT & Chuẩn đầu ra (#17, #18, #19, #20): liên kết bấm trực tiếp vào tên phiên bản / nút Xem cho mọi trạng thái phiên bản để mở trang chi tiết (`DetailCurriculumVersionComponent`) gồm 4 thẻ tổng quan, bảng cây PLO/PI, ma trận đóng góp I/R/M và danh sách học phần; bỏ thanh tab không cần thiết; tách bạch chặt chẽ quyền `ADMIN` (chỉ đọc ở `/mng/curriculum`, không được sửa phiên bản hay duyệt ĐBCL theo ADR 0004 & ADR 0005); sửa lỗi độ tương phản màu WCAG AA (3 phần tử trên `/mng/forbidden` và `ManagementHeaderComponent`) | "ở giao diện khung ctdt và chuẩn đầu ra, khi bấm vào một phiên bản chương trình đào tạo nào đó cho hiện lên chi tiết bên trong như nào đi", "thôi bỏ tab đó đi nghe không hợp lí lắm bỏ luôn hiển thị tab trên giao diện luôn chỉ hiển thị bảng thôi", "admin đâu có quyền sửa phiên bản chương trình đào tạo với duyệt mà cho chức năng vô giao diện vậy", "Error: Vi phạm tiếp cận serious/critical: color-contrast (3 phần tử)" | `src/app/mng/curriculum/curriculum.routes.ts`, `src/app/mng/curriculum/list-curriculum-versions/*`, `src/app/mng/curriculum/detail-curriculum-version/*`, `src/app/layout/mng/management-header/*`, `src/app/mng/forbidden/forbidden.component.html`, `logsAI/ai-usage-log.md` | _Chờ sinh viên rà soát_ | `npx eslint src/app` = 0 lỗi; `npm run test:ci`: 56 test files, 595/595 test pass (coverage 90.44% statements, 89.66% lines); kiểm tra tỷ lệ tương phản WCAG AA ≥ 4.5:1 cho `.role-avatar-circle` (7.05:1) và văn bản trên `/mng/forbidden` (7.18:1) | PR #45 (`ad0eb7f` + bản vá color-contrast) |
| 11 | 2026-11-09 | minhat5 (IT) | Antigravity, Gemini 3.8 Flash | Giao diện nạp danh mục học phần hàng loạt từ tệp CSV (F03 US-09/AC-4, ADR 0010 - Quản trị viên): tạo `CourseImportModalComponent` hỗ trợ tải file mẫu `courses_template.csv`, kéo thả chọn file `.csv`, gọi `POST /api/v1/courses/import`, hiển thị thống kê tổng quan và bảng chi tiết các dòng lỗi Best-effort; bổ sung nút "Nhập từ CSV" trên `ListCoursesComponent` chỉ dành cho ADMIN; viết bộ unit test toàn diện cho component và service | "tạo plan code giao diện cho chức năng này đi", "bắt đầu luôn" | `src/app/core/models/course/course.model.ts`, `src/app/core/constants/url.constant.ts`, `src/app/core/services/course/course.service.ts`, `src/app/core/services/course/course.service.spec.ts`, `src/app/mng/courses/course-import-modal/**`, `src/app/mng/courses/list-courses/*`, `logsAI/ai-usage-log.md` | _Chờ sinh viên rà soát_ | `npx eslint` trên toàn bộ file mới/sửa = 0 lỗi; `npm test -- --watch=false` đạt 66/66 test files, 646/646 test pass 100%; `npm run build:dev` biên dịch thành công 0 lỗi. | `281093e` |
| 12 | 2026-11-10 | minhat5 (IT) | Antigravity, Gemini 3.8 Flash | Hoàn thiện tìm kiếm môn học, phân trang cuộn vô tận và chế độ xem môn phụ trách (`ListSyllabiComponent`): (1) Chuyển sang tìm kiếm Server-side (`GET /api/v1/courses?search=...`) có cơ chế Debounce 300ms qua RxJS Subject, `debounceTime`, `distinctUntilChanged`, `switchMap`, và `takeUntilDestroyed`; (2) Tách bạch `scopedCourses` nạp danh sách môn học trong `scopeCourseIds` qua `forkJoin(getCourseById)`, đảm bảo luôn hiển thị đầy đủ môn phụ trách; (3) Tích hợp Infinite Scroll cuộn vô tận trên dropdown `<nz-select>` qua sự kiện `(nzScrollToBottom)` và `onCourseScrollToBottom()` để tải các trang tiếp theo (`page: 1, 2...`) khi từ khóa trả về > 100 kết quả; (4) Hoàn thiện `toggleShowAllCourses()`; (5) Viết bộ 10 unit tests kiểm thử debounce, deep linking, scope phụ trách và infinite scroll | "sao tôi import vô hết rồi mà qua bên đề cương search thử học phần lập trình hướng đối tượng nó lại không hiện ra ta trong khi danh sách đã có", "cái nút showAllCourses() chưa thực sự hoạt động đúng, bấm vào không hiển thị course đang phụ trách ra", "Nếu một từ khóa tìm kiếm chung chung... xử lý tình huống này nữa" | `src/app/mng/syllabi/list-syllabi/list-syllabi.component.ts`, `src/app/mng/syllabi/list-syllabi/list-syllabi.component.html`, `src/app/mng/syllabi/list-syllabi/list-syllabi.component.spec.ts`, `logsAI/ai-usage-log.md` | _Chờ sinh viên rà soát_ | `npx eslint src/app/mng/syllabi/list-syllabi/` = 0 lỗi; `npm run build:dev` biên dịch thành công; bộ kiểm thử `npm test -- --watch=false` đạt 67/67 files, 656/656 test pass 100%. | Nhánh `feat/syllabi-course-server-search` |

### Bài học ghi nhận (ứng viên cho mục B khi sinh viên xác nhận)

- Cài từng gói `@angular/*` bằng `npm install` gây ERESOLVE vì các gói ghim phiên bản của nhau; phải dùng `ng update`.
- `npm audit fix` không nâng được các gói bị chặn bởi ràng buộc peer nên cần bước thứ hai.

## B. Lỗi / ảo giác của AI đã phát hiện (mục tiêu ≥ 5, kèm phân tích nguyên nhân)

| # | Ngày | Mô tả lỗi | Phát hiện bằng cách nào | Nguyên nhân | Commit sửa |
|---|---|---|---|---|---|
| 1 | 2026-10-31 | Dùng `String.replace` trong script Node để sửa `url.constant.ts` với chuỗi thay thế chứa `$'`, JavaScript hiểu `$'` là "phần văn bản sau chỗ khớp" nên file bị nhân đôi nội dung và hỏng | `git diff` thấy file phình bất thường; khôi phục bằng `git checkout -- <file>` rồi sửa lại bằng công cụ Edit | AI không nhớ `$'`, `$&`, `$1` là mẫu đặc biệt của tham số thay thế trong `String.prototype.replace` | _chưa commit_ |
| 2 | 2026-10-31 | Gắn `[nzStatus]` lên `<nz-input-password>`; import `@builder/...` khi `tsconfig.json` chưa khai báo alias; gán `Observable<Object> | Observable<null>` cho `Observable<void>` | `ng build` báo NG8002, TS2307, TS2322 | AI đoán API của ng-zorro 21 và đoán alias theo `angular_component_rulebook.md` mà không đối chiếu `tsconfig.json`/tài liệu đúng phiên bản | _chưa commit_ |
| 3 | 2026-10-31 | Validator email dùng giá trị chưa trim nên email có khoảng trắng thừa (dán từ nơi khác) bị báo "không hợp lệ", trong khi backend vẫn trim và chấp nhận (`API-CONTRACT.md` §5.3.2) | Test `form-users.component.spec.ts` ca "gửi username/email đã trim + lowercase" đỏ | AI viết test theo hợp đồng nhưng form ban đầu kiểm tra trên giá trị thô; lỗi lộ nhờ test hợp đồng chứ không phải nhờ chạy tay | _chưa commit_ |
| 4 | 2026-10-31 | Test danh sách đếm số lần gọi API ngay sau `triggerReload()` nên thấy 1 thay vì 2 | 3 test đỏ trong `list-users.component.spec.ts` | `toObservable` phát lại bất đồng bộ qua effect; test thiếu `await fixture.whenStable()`. Mã chạy đúng, lỗi nằm ở test; đã sửa test chứ không nới assertion | _chưa commit_ |
| 5 | 2026-11-02 | Regex `runtime-config` chấp nhận `//evil.example.org`; regex nginx `{8}` không đặt trong dấu nháy làm nginx không khởi động; image nền có CVE có bản vá | Test âm; chạy container thật; Trivy | Thiếu ca âm; cú pháp nginx; image nền cũ — thêm `apk upgrade` | PR #42 |
| 6 | 2026-11-02 | Import sai `NzToolTipModule` (đúng `NzTooltipModule`); regex nhận diện chi tiết nội bộ dùng `\bException\b` bỏ sót `MongoSocketException` | TypeScript báo lỗi; test bắt được | Nhớ sai tên API; regex quá hẹp | PR #41 |
| 7 | 2026-11-02 | Định dùng `OnlineStatusService` trong interceptor, nhưng service này không `providedIn: root` | Chạy test | Giả định phạm vi provider; đổi sang đọc `navigator.onLine` | PR #41 |
| 8 | 2026-11-02 | Giả định chưa kiểm chứng: mọi tỷ lệ trong `aggregate_results` là phân số 0–1; hợp đồng F06/F07 chưa mô tả | Tự rà khi viết `IAggregateDenominator`; ghi vào điểm cần xác nhận | Hợp đồng chưa có (xem TD-26 ở `LMS-API/doc/tech-debt.md`) | PR #41 |
| 9 | 2026-11-05 | Trên màn hình danh sách phiên bản CTĐT (`list-curriculum-versions`), nút "Áp dụng" (`confirmActivateVersion`) bị đặt nhầm trong nhánh `isQaOfficer()` và gọi `updateProgramVersion` kèm `status: 'ACTIVE'`, trong khi backend chỉ cho phép `PROGRAM_MANAGER` đổi trạng thái vòng đời (QA gọi sẽ bị 403) | Sinh viên phát hiện khi kiểm tra luồng phân quyền giữa QA duyệt ĐBCL và chỉnh sửa/áp dụng phiên bản CTĐT | AI nhầm lẫn giữa quyền thẩm định chất lượng (`verification.status` của `QA_OFFICER`) với quyền quản lý vòng đời phiên bản (`status` của `PROGRAM_MANAGER`) | _chưa commit_ |
| 10 | 2026-11-05 | Trong `list-curriculum-versions.component.spec.ts`, mock `getRoleAssignments` trả về `[]` để test `canManage() == false`, nhưng test báo lỗi `expected true to be false` | Chạy `npm test -- --no-watch` (Vitest báo fail 1 test) | Không đọc kỹ computed `canManage()`: khi user vẫn có role `PROGRAM_MANAGER` mà `scopeProgramIds` rỗng thì hàm coi là không giới hạn scope và trả `true`. Đã sửa test bằng cách đổi role sang `LECTURER` | _chưa commit_ |
| 11 | 2026-11-06 | Trong `ListCurriculumVersionsComponent`, `DetailCurriculumVersionComponent` và `curriculum.routes.ts`, các hàm `canManage`, `canEdit`, `isQaOfficer` từng gộp `SystemConstant.ROLE.ADMIN` vào quyền sửa phiên bản CTĐT và quyền duyệt ĐBCL, vi phạm ADR 0004 & ADR 0005 | Sinh viên phát hiện khi rà soát giao diện ("admin đâu có quyền sửa phiên bản chương trình đào tạo với duyệt mà cho chức năng vô giao diện vậy") và đối chiếu Issue #17, #20 | AI áp dụng thói quen "ADMIN toàn quyền" của CRUD thông thường sang phân hệ học thuật chuyên môn mà không đối chiếu ranh giới phân quyền giữa `ADMIN` (chỉ quản lý danh mục ngành `/mng/programs`), `PROGRAM_MANAGER` (soạn thảo phiên bản, PLO/PI, ma trận I/R/M) và `QA_OFFICER` (thẩm định độc lập) | PR #45 (`ad0eb7f`) |
| 12 | 2026-11-06 | Trên trang `/mng/forbidden`, kiểm thử E2E `e2e/login.e2e.ts:189:7` báo 3 phần tử vi phạm `serious: color-contrast`: (1) `.role-avatar-circle` (`#ffffff` trên nền `#d97706`, tương phản 3.18:1 < 4.5:1) ở `ManagementHeaderComponent`, và (2)-(3) hai thẻ `<p class="text-[#66727f]">` ở `ForbiddenComponent` hiển thị trên nền `#f0f4f9` mới của `.management-content-area` (tương phản 4.44:1 < 4.5:1) | CI GitHub Actions chạy Playwright + `@axe-core/playwright` (`expectNoBlockingA11yViolations` tại `e2e/support.ts:20`) trên PR #45 | Khi đổi nền `.management-content-area` từ `#ffffff` sang `#f0f4f9` và thiết kế `.role-avatar-circle` màu cam `#d97706`, AI chỉ ước lượng bằng mắt mà không tính toán tỷ lệ tương phản luminance theo công thức WCAG 2.1 AA (≥ 4.5:1). Đã sửa `.role-avatar-circle` sang `#92400e` (7.05:1) và văn bản phụ của `forbidden.component.html` sang `#46525f` (7.18:1) | PR #45 |
| 13 | 2026-11-06 | Trong `AssignCourseModalComponent` (`src/app/mng/syllabi/assign-course-modal/assign-course-modal.component.ts`), hàm `effect()` đọc trực tiếp `this.lecturers().length === 0` mà không bọc trong `untracked()` và không có cờ `hasLoadedLecturers`; khi `userSvc.filter(0, 100)` trả về danh sách giảng viên rỗng (`[]`), `this.lecturers.set(list)` tạo tham chiếu mảng mới làm kích hoạt lại `effect()` liên tục (vòng lặp vô hạn gọi API + bật `ngx-spinner` chặn toàn bộ thao tác bấm nút `X` hoặc `Đóng` trên modal) | Sinh viên phát hiện khi mở modal Phân công Giảng viên biên soạn trên trình duyệt ("cái form hiển thị phân công giảng viên biên soạn bấm x hay đóng không được ta") | AI đọc signal `this.lecturers()` bên trong `effect()` rồi lại ghi đè `this.lecturers.set(list)` trong callback bất đồng bộ của cùng luồng đó, đồng thời quên rằng `signal([])` so sánh bằng `Object.is` nên mỗi lần `.set([])` đều tạo tham chiếu mảng mới. Đã sửa bằng cách bọc phần xử lý trong `untracked()`, thêm cờ `hasLoadedLecturers` và bổ sung `[nzFooter]` tường minh + `(nzVisibleChange)` | _chưa commit_ |
| 14 | 2026-11-07 | Trong `ListSyllabiComponent` và `DetailSyllabusComponent`, các computed `canCreateSyllabus`, `canEditClo`, `canApproveSyllabus` từng cho phép role `ADMIN` tạo đề cương, thêm/sửa/xóa CLO và duyệt `CONFIRMED`, vi phạm ranh giới thẩm quyền học thuật và bị lệch với Backend (BE commit `ade4c16`) | Sinh viên phát hiện khi rà soát phân quyền ("admin vẫn nên có quyền biên soạn đề cương à") | AI lặp lại thói quen gán quyền `ADMIN` vào nghiệp vụ học thuật sư phạm tương tự như lỗi #11 ở F02. Đã sửa thu hồi toàn bộ quyền biên soạn và phê duyệt của `ADMIN`, chuyển giao diện sang chế độ Chỉ đọc (Read-only) cho Admin theo đúng ADR 0010 | _chưa commit_ |

## C. Danh sách kiểm soát đầu ra AI đã áp dụng

Mỗi PR có AI hỗ trợ tick các mục trong `.claude/rules/01-ai-usage-and-ownership.md` §3: `ng build`/`ng test` đã chạy
thật; API đã đối chiếu tài liệu chính thức đúng phiên bản; package mới có lý do và giấy phép; không có secret/dữ
liệu thật; không chép mã ngoài; hợp đồng API đối chiếu backend; nghiệp vụ hiển thị đúng `02-domain-and-ux.md`.

## D. Nguồn và giấy phép của mã/tài liệu tham khảo

| Ngày | Nội dung | Nguồn (URL) | Giấy phép | Dùng ở đâu |
|---|---|---|---|---|
| 2026-11-02 | @playwright/test 1.63.0, playwright-core 1.63.0, @axe-core/playwright 4.13.0 (+ axe-core 4.13.0), @vitest/coverage-v8 4.1.12 | npm | Apache-2.0 / Apache-2.0 / MPL-2.0 / MPL-2.0 (đọc từ `node_modules`, sinh viên kiểm lại) | `package.json` (PR #42) |
| 2026-11-02 | gitleaks 8.30.1 (MIT), Trivy 0.76.0 (Apache-2.0) — binary ghim SHA-256; nginx-unprivileged 1.30.6 (Apache-2.0) | GitHub releases; Docker Hub | Như cột nội dung | `.github/workflows/ci.yml`, `Dockerfile` (PR #42) |

## E. Để vấn đáp — 4 câu hỏi bảo vệ đồ án tốt nghiệp trước Hội đồng (Dành cho Sinh viên IT và IBS)

Phần này chuẩn bị sẵn nội dung trả lời cho 4 câu hỏi trọng tâm của Hội đồng bảo vệ đồ án tốt nghiệp liên quan đến sự phối hợp giữa Frontend (`LMS-UI` - Angular 21) và Backend (`LMS-API`), tài liệu hợp đồng giao tiếp API và kiến trúc phân tầng:

---

### Câu hỏi 1: Bạn đã làm gì trong bước này? (What did you do?)

#### Trả lời góc nhìn Sinh viên IT:
- **Xây dựng Hợp đồng giao tiếp API chính thức (`LMS-UI/doc/API-CONTRACT.md`):** Đóng vai trò Single Source of Truth giữa Frontend và Backend.
- **Quy chuẩn hóa giao thức dữ liệu:**
  - Quy ước Base URL cục bộ (`http://localhost:8080`) và tiền tố `/api/v1` cho mọi endpoint nghiệp vụ.
  - Chuẩn hóa định dạng thời gian toàn hệ thống theo ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`), loại trừ rủi ro lệch múi giờ giữa trình duyệt client và máy chủ.
  - Chuẩn hóa định dạng định danh khóa chính `ObjectId` gồm đúng 24 ký tự hex (`^[0-9a-fA-F]{24}$`).
- **Tích hợp cơ chế truy vết phân tán (`X-Correlation-Id`):** Thiết lập quy định để Angular HTTP Interceptor truyền và nhận header `X-Correlation-Id`, dùng để hiển thị trên Toast cảnh báo khi có sự cố giúp đối soát log máy chủ.
- **Chuẩn hóa xử lý lỗi thống nhất (US-40):** Đặc tả cấu trúc JSON lỗi `{ timestamp, status, code, message, path, fieldErrors }` cùng bảng ánh xạ chi tiết 7 mã trạng thái HTTP (400, 401, 403, 404, 409, 422, 500) sang hành vi điều khiển giao diện Angular (Reactive Forms highlight viền đỏ, Toast cảnh báo, Modal xung đột dữ liệu, chuyển hướng đăng nhập khi 401).
- **Khởi tạo khung tích hợp Actuator và lộ trình F01–F08:** Tài liệu hóa các endpoint `/actuator/health` và `/actuator/info` cùng danh mục endpoint dự kiến cho 8 module nghiệp vụ tiếp theo.

#### Trả lời góc nhìn Sinh viên IBS:
- **Thiết kế trải nghiệm người dùng số (UX/UI Governance):** Tham gia định hình cơ chế tương tác khi người dùng gặp sự cố. Thay vì để hệ thống hiển thị những mã lỗi kỹ thuật khó hiểu (như "MongoWriteException" hay "NullPointerException"), chúng tôi đã chuẩn hóa bảng thông điệp bằng tiếng Việt thân thiện, rõ ràng, hướng dẫn cụ thể hành động tiếp theo cho giảng viên và sinh viên.
- **Đảm bảo tính liên tục của quy trình nghiệp vụ số:** Đưa ra giải pháp xử lý xung đột dữ liệu (HTTP 409) và lỗi vi phạm quy tắc nghiệp vụ (HTTP 422) sao cho form nhập liệu trên màn hình không bị xóa trắng khi người dùng bấm lưu bị lỗi, giúp giảng viên không bị mất công sức nhập lại bảng điểm.
- **Xây dựng hợp đồng hợp tác liên nhóm:** Đảm bảo hai nhóm phụ trách Frontend và Backend có cùng một nhận thức nghiệp vụ chung, tránh sai lệch và mâu thuẫn trong quá trình phát triển dự án.

---

### Câu hỏi 2: Vì sao phần này có mặt và đóng vai trò gì trong đề tài đo lường chuẩn đầu ra? (Why in thesis?)

#### Trả lời góc nhìn Sinh viên IT:
- **Loại bỏ sự phụ thuộc lỏng lẻo và rủi ro lệch giao thức:** Dự án gồm 2 repository độc lập (`LMS-API` và `LMS-UI`). Nếu không có một hợp đồng API được công bố và chốt từ Bước 00, việc phát triển Frontend sẽ dựa trên phỏng đoán, dẫn đến tình trạng sai lệch tên trường (ví dụ `studentId` vs `student_id`), sai định dạng ngày tháng, hoặc xử lý lỗi rời rạc khiến ứng dụng Angular bị crash khi gặp ngoại lệ.
- **Hỗ trợ kiến trúc 3 tầng từ phía Frontend:** Cấu trúc hợp đồng phản ánh đúng mô hình DTO từ tầng Presentation của Backend, bảo đảm tính độc lập giữa mô hình lưu trữ CSDL (Document) và mô hình hiển thị dữ liệu người dùng (DTO/View Model).

#### Trả lời góc nhìn Sinh viên IBS:
- **Tối ưu hóa hành trình người dùng và giảm chi phí hỗ trợ đào tạo:** Một hệ thống quản lý học tập và đo lường chuẩn đầu ra phục vụ cho toàn trường với hàng nghìn giảng viên và sinh viên. Giao diện người dùng phải minh bạch, khi thao tác sai phải chỉ rõ lý do nghiệp vụ (ví dụ: "Trọng số các bài kiểm tra chưa đủ 100%", "Bài đánh giá đã khóa điểm không được phép sửa câu hỏi"). Hợp đồng API đảm bảo mọi thông điệp lỗi nghiệp vụ phản ánh đúng thực tế quy chế đào tạo.

---

### Câu hỏi 3: Các tham số, cấu hình, thư viện từ đâu mà có? (Where do params/libs come from?)

#### Trả lời góc nhìn Sinh viên IT:
- **Cấu trúc `ErrorResponse` và enum `ErrorCode`:** Căn cứ trực tiếp theo yêu cầu User Story US-40 và tài liệu kế hoạch nền tảng dùng chung `doc/plan/00-nen-tang-chung.md`.
- **Định dạng `ObjectId` (24-char hex):** Là cấu trúc BSON ObjectID 12-byte chuẩn của MongoDB.
- **Chuẩn ISO-8601 UTC:** Là tiêu chuẩn quốc tế về trao đổi dữ liệu ngày giờ, tương thích hoàn toàn giữa kiểu `Instant` của Java 25 và đối tượng `Date`/`string` của TypeScript/JavaScript.
- **Header `X-Correlation-Id`:** Chuẩn công nghiệp trong kiến trúc ứng dụng web phân tán, tích hợp với SLF4J MDC ở Backend.
- **Quy tắc điều khiển Form Angular:** Căn cứ theo mô hình Reactive Forms và HttpInterceptor của Angular 21 (`@angular/common/http`).

#### Trả lời góc nhìn Sinh viên IBS:
- **Danh mục mã trạng thái HTTP nghiệp vụ (400, 401, 403, 404, 409, 422, 500):** Dựa trên quy trình nghiệp vụ đào tạo thực tế tại trường (ví dụ 401 là hết hạn phiên làm việc của giảng viên; 403 là giảng viên không được phép duyệt ma trận đề thi vốn thuộc thẩm quyền Trưởng bộ môn; 422 là vi phạm quy chế phân bổ điểm học phần).

---

### Câu hỏi 4: Nếu bỏ thành phần này đi thì hệ thống hoặc đề tài sẽ bị ảnh hưởng/phá vỡ ra sao? (What breaks if removed?)

#### Trả lời góc nhìn Sinh viên IT:
- **Nếu không có `API-CONTRACT.md`:**
  - Nhóm Frontend và Backend sẽ phát triển trong tình trạng "mù thông tin", dễ dẫn đến xung đột khi tích hợp API (Integration Hell).
  - Frontend không thể xây dựng cơ chế xử lý lỗi tập trung; mỗi màn hình sẽ phải tự viết mã xử lý lỗi riêng lẻ, dẫn đến mã nguồn UI bị trùng lặp, vi phạm tiêu chí chất lượng mã nguồn (TC2.4).
  - Khi có lỗi 500 từ Backend, Frontend không có mã `X-Correlation-Id` để hiển thị cho người dùng, khiến việc gỡ lỗi (debugging) giữa hai nhóm trở nên bất khả thi.

#### Trả lời góc nhìn Sinh viên IBS:
- **Nếu bỏ việc chuẩn hóa hợp đồng lỗi nghiệp vụ:**
  - Người dùng (giảng viên, sinh viên, cán bộ khảo thí) sẽ phải nhìn thấy các màn hình trắng hoặc các thông báo lỗi kỹ thuật vô nghĩa.
  - Tăng đột biến số lượng yêu cầu hỗ trợ kỹ thuật (support tickets), giảm sút mức độ hài lòng của người dùng đối với sản phẩm số, và làm suy giảm tính chuyên nghiệp của đề tài tốt nghiệp trước Hội đồng đánh giá.

---

### Bổ sung cho Phiên #5: 4 câu hỏi vấn đáp bảo vệ đồ án liên quan đến Hợp đồng API F01 (R1)

#### Câu hỏi 1: Bạn đã làm gì trong bước này? (What did you do?)
- **Góc nhìn Sinh viên IT:**
  - Hoàn thiện và cập nhật hợp đồng API liên repo (`LMS-UI/doc/API-CONTRACT.md`) cho phân hệ F01 (Xác thực và Quản trị người dùng) theo nguyên tắc API Contract First của ADR 0002.
  - Chuẩn hóa tiền tố định tuyến `/api/v1/` cho toàn bộ 8 endpoint F01.
  - Loại bỏ các endpoint thừa không nằm trong phạm vi kiến trúc F01: loại bỏ `/auth/refresh` (chỉ sử dụng JWT HS256 ngắn hạn kèm quản lý phiên qua `tokenVersion`), loại bỏ `DELETE /users/{id}` (thay thế bằng cơ chế khóa tài khoản `PUT /users/{id}/status` sang `LOCKED`).
  - Chuẩn hóa endpoint lấy thông tin cá nhân từ `/users/me` sang `/auth/me` để tách biệt khỏi namespace quản trị `/users/**` vốn chỉ dành cho `ADMIN`.
  - Định nghĩa khuôn dạng phân trang chuẩn hệ thống (Pagination Envelope: `content`, `page`, `size`, `totalElements`, `totalPages`, `last`), loại bỏ bộ lọc vai trò/khoa tại `GET /api/v1/users`, và quy định mã lỗi HTTP 400 `VALIDATION_ERROR` khi `page < 0`, `size < 1` hoặc `size > 100`.
  - Bổ sung quy định xử lý mã lỗi HTTP 401 tại Mục 3: Phân biệt rõ giữa 401 của các API nghiệp vụ thông thường (xóa token, redirect `/login`, toast hết hạn) với 401 tại `POST /api/v1/auth/login` (hiển thị thông báo trực tiếp tại form đăng nhập, không tự động xóa token và không redirect).
  - Chi tiết hóa đầy đủ Request/Response DTOs, header `Authorization: Bearer <token>`, và các mã lỗi theo Mục 2.
- **Góc nhìn Sinh viên IBS:**
  - Định nghĩa trải nghiệm người dùng số nhất quán khi đăng nhập và quản lý tài khoản. Xử lý triệt để lỗi trải nghiệm người dùng phổ biến khi trang đăng nhập bị "nháy" hoặc vòng lặp chuyển hướng do HTTP Interceptor xử lý sai mã 401.
  - Thiết lập cơ chế kiểm soát dữ liệu đầu vào thân thiện (Human-Centered Design): khi người dùng nhập sai số trang hoặc kích thước trang vượt ngưỡng 100, hệ thống đưa ra thông báo cảnh báo rõ ràng thay vì để giao diện bị treo hay trả về trang trắng.

#### Câu hỏi 2: Vì sao phần này có mặt và đóng vai trò gì trong đề tài đo lường chuẩn đầu ra? (Why in thesis?)
- **Góc nhìn Sinh viên IT:**
  - Đóng vai trò Single Source of Truth giữa hai nhóm phát triển độc lập (Frontend Angular 21 và Backend Spring Boot 4).
  - Đảm bảo tuân thủ nguyên tắc Contract-First Development (ADR 0002): Mọi cấu trúc DTO, URL, query param và HTTP status phải được thống nhất trước khi viết code backend, triệt tiêu nguy cơ bất đồng bộ mã nguồn khi ghép nối hệ thống.
- **Góc nhìn Sinh viên IBS:**
  - Phân hệ người dùng và phân quyền (F01) là nền tảng quản trị của toàn bộ đề tài: chỉ khi giảng viên, trưởng bộ môn, cán bộ khảo thí được định danh và phân quyền chính xác theo từng lớp học phần/CTĐT thì việc nhập điểm và tính toán kết quả chuẩn đầu ra (F05, F06) mới đảm bảo tính pháp lý và tính toàn vẹn dữ liệu.

#### Câu hỏi 3: Các tham số, cấu hình, thư viện từ đâu mà có? (Where do params/libs come from?)
- **Góc nhìn Sinh viên IT:**
  - Cấu trúc Envelope phân trang (`content`, `page`, `size`, `totalElements`, `totalPages`, `last`) xuất phát từ chuẩn `org.springframework.data.domain.Page` của Spring Data kết hợp cấu trúc phân trang phổ biến trên Angular Material / PrimeNG Table.
  - Các tham số `page` (zero-indexed) và `size` (mặc định 20, tối đa 100) được thiết lập để tối ưu hiệu năng truy vấn MongoDB, chống nghẽn bộ nhớ khi bảng dữ liệu người dùng tăng cao.
  - Danh mục mã lỗi (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`, `INTERNAL_ERROR`) kế thừa từ enum `ErrorCode` của US-40.
  - Giới hạn mật khẩu 8–72 bytes UTF-8 bắt nguồn từ giới hạn thuật toán băm BCrypt.
- **Góc nhìn Sinh viên IBS:**
  - Danh mục 7 vai trò (`ADMIN`, `PROGRAM_MANAGER`, `DEPARTMENT_HEAD`, `QA_OFFICER`, `LECTURER`, `STUDENT`, `VIEWER`) và 3 cấp phạm vi (`programIds`, `courseIds`, `sectionIds`) căn cứ theo sơ đồ tổ chức thực tế của Trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE) quy định trong tài liệu `GiaiThich_CoSoDuLieu.md` §4.1.

#### Câu hỏi 4: Nếu bỏ thành phần này đi thì hệ thống hoặc đề tài sẽ bị ảnh hưởng/phá vỡ ra sao? (What breaks if removed?)
- **Góc nhìn Sinh viên IT:**
  - Nếu không cập nhật hợp đồng, Frontend Angular sẽ gọi sai endpoint (ví dụ vẫn gọi `GET /api/v1/users/me` thay vì `GET /api/v1/auth/me`), hoặc gọi `POST /api/v1/auth/refresh` vốn không tồn tại trên Backend → HTTP 404.
  - Nếu không có quy định phân biệt mã 401 tại `/api/v1/auth/login`, HTTP Interceptor trên Angular sẽ bắt mã 401 khi người dùng nhập sai mật khẩu rồi tự động xóa storage và redirect về `/login`, tạo ra vòng lặp vô hạn (Infinite Redirect Loop) hoặc làm mất thông báo lỗi sai mật khẩu.
  - Nếu thiếu envelope phân trang chuẩn, component bảng danh sách người dùng trên Angular sẽ không parse được dữ liệu hoặc hiển thị sai số trang.
- **Góc nhìn Sinh viên IBS:**
  - Người dùng nhập sai mật khẩu sẽ không hiểu vì sao đăng nhập thất bại do màn hình bị reset liên tục.
  - Khi quản trị viên truy vấn danh sách người dùng lớn mà không có giới hạn phân trang chuẩn, hệ thống dễ rơi vào tình trạng quá tải, gây gián đoạn quy trình nghiệp vụ số của nhà trường.



---

## Phiên #9: Đồng bộ thiết kế trang Người dùng và Chương trình đào tạo theo UI.pdf

### 1. Bối cảnh và Yêu cầu
- Yêu cầu từ người dùng: Cải tổ và làm đồng bộ lại toàn bộ giao diện quản trị Admin gồm:
  1. Trang danh sách người dùng (`src/app/mng/users/list-users/`).
  2. Trang chi tiết/thêm/sửa người dùng (`src/app/mng/users/detail-users/`, `src/app/mng/users/form-users/`).
  3. Trang quản lý danh mục chương trình đào tạo (`src/app/mng/programs/list-programs/`).
  Đảm bảo tuân thủ thiết kế và trải nghiệm thực tế trong tài liệu đặc tả `UI.pdf` (trang 3, 4, 33, 34, 35, 38).
- Giữ nguyên toàn bộ các bất biến nghiệp vụ:
  - F01 US-02/AC-5: Tự khóa tài khoản chính mình bị chặn bằng hộp thoại thông tin ("Không thể khóa tài khoản của bạn"). Khóa tài khoản quản trị viên cuối cùng trả về lỗi 422 và giải thích bằng thông điệp backend.
  - Fail-closed RBAC: Chỉ hiển thị nút thêm/sửa chương trình cho vai trò `ADMIN`.
  - Mọi trường dữ liệu, validation, API endpoint và 564 unit test đều phải giữ vững 100% pass rate.

### 2. Các thay đổi kỹ thuật chính
1. **Trang Người dùng và phân quyền (`ListUsersComponent`)**:
   - Header: Breadcrumb `Hệ thống`, tiêu đề `Người dùng và phân quyền`, phần mô tả `Tài khoản do quản trị viên cấp. Giảng viên chỉ thao tác trên học phần được phân công.`
   - Thêm ô tìm kiếm tức thì `Tìm tên đăng nhập` kèm nút xóa tìm kiếm nhanh theo chuẩn trang 33 trong `UI.pdf`.
   - Bảng người dùng: Thiết kế lại theo phong cách clean minimal table (header `#f8fafc`, bo góc 12px, phân cấp typography).
   - Hiển thị huy hiệu vai trò (role badges) theo mã màu chuyên biệt: `ADMIN` (indigo/blue), `PROGRAM_MANAGER` (cyan), `DEPARTMENT_HEAD` (purple), `QA_OFFICER` (amber), `LECTURER` (emerald), `STUDENT`/`VIEWER` (slate).
   - Cột Trạng thái kết hợp chỉ báo trạng thái trực quan (`● Hoạt động` xanh lá / `● Bị khóa` đỏ) kèm công tắc `nz-switch` điều khiển mở khóa/khóa qua các hộp thoại xác nhận tuân thủ trang 35 `UI.pdf`.
2. **Trang Thêm/Sửa người dùng (`DetailUsersComponent` & `FormUsersComponent`)**:
   - Phân chia 2 phần rõ rệt theo trang 34 `UI.pdf`:
     - `I. Thông tin cơ bản`: Tên đăng nhập, Mật khẩu ban đầu (kèm ghi chú 8-72 ký tự), Họ và tên, Email.
     - `II. Vai trò và phạm vi`: Bảng phân quyền với lựa chọn vai trò và tags phạm vi (Chương trình, Học phần, Lớp học phần).
   - Thêm banner thông tin: `Một người có thể giữ nhiều vai trò. Phạm vi giới hạn nơi vai trò đó có hiệu lực. Bản phân quyền theo vai trò đang dự kiến chờ Khoa xác nhận (Q08).`
   - Thanh dock thao tác dính đáy (sticky dock) với nút `Hủy` và nút `Tạo người dùng` / `Lưu`.
3. **Trang Chương trình đào tạo (`ListProgramsComponent`)**:
   - Header hệ thống với ô tìm kiếm chương trình tức thì và nút `+ Thêm chương trình đào tạo` (dành riêng cho `ADMIN`).
   - Thêm Alert Banner thông tin phiên bản từ trang 3 `UI.pdf`: `Chương trình đang áp dụng không sửa trực tiếp được. Sửa bản đang áp dụng sẽ tạo phiên bản nháp mới, bản cũ vẫn giữ để đọc lại báo cáo.`
   - Bảng chương trình: Huy hiệu mã CTĐT (`font-mono`, `#1d4ed8`), các pill bậc đào tạo và loại văn bằng.
   - Modal Thêm/Sửa CTĐT chuẩn hóa giao diện với chú thích `Không đổi được sau khi tạo` cho trường mã CTĐT (bảo vệ tính toàn vẹn ADR 0005).

### 3. Kết quả kiểm thử và nghiệm thu
- **Unit Test**: 50 test files passed (564/564 tests passed, 100%).
- **ESLint**: 0 errors, 0 warnings trên toàn bộ các thư mục sửa đổi.
- **Build Dev**: `npm run build:dev` biên dịch thành công 100%.

---

### Bổ sung cho Phiên #9: 4 câu hỏi vấn đáp bảo vệ đồ án liên quan đến Giao diện Quản trị và Tính đồng bộ UI.pdf

#### Câu hỏi 1: Bạn đã làm gì trong bước này? (What did you do?)
- **Góc nhìn Sinh viên IT:**
  - Tái cấu trúc và đồng bộ hóa giao diện trang Quản trị người dùng (`/mng/users`) và Quản trị chương trình đào tạo (`/mng/programs`) theo đúng bố cục trong `UI.pdf` (trang 3, 4, 33, 34, 35).
  - Triển khai bộ lọc client-side phản ứng nhanh (`displayUsers`, `displayPrograms`) sử dụng Angular Signals và `computed()` giúp người dùng tìm kiếm tức thì theo tên đăng nhập, họ tên, email hoặc mã chương trình mà không cần gửi query thừa xuống backend khi backend chưa hỗ trợ full-text search.
  - Đồng bộ hóa các thẻ huy hiệu màu (Role Badges), trạng thái tài khoản (Status Indicators với chấm màu và switch toggle), và cấu trúc form hai phần (`I. Thông tin cơ bản`, `II. Vai trò và phạm vi`).
  - Đảm bảo 100% kiểm thử tự động (50 files, 564 unit tests) và quy tắc kiểm tra mã nguồn (ESLint) đều vượt qua.
- **Góc nhìn Sinh viên IBS:**
  - Hoàn thiện trải nghiệm quản trị hệ thống đào tạo theo tư duy thiết kế lấy người dùng làm trung tâm (Human-Centered Design): Bổ sung các gợi ý nghiệp vụ quan trọng ngay trên giao diện (như cảnh báo không thể sửa trực tiếp chương trình đang áp dụng mà phải tạo phiên bản nháp, ghi chú phạm vi hiệu lực của từng vai trò).
  - Tối ưu hóa thị giác với hệ màu chuẩn nhận diện, giúp người quản trị dễ dàng phân biệt trạng thái tài khoản đang hoạt động (`Hoạt động`) hay đã bị vô hiệu hóa (`Bị khóa`) chỉ qua một cái nhìn nhanh.

#### Câu hỏi 2: Vì sao phần này có mặt và đóng vai trò gì trong đề tài đo lường chuẩn đầu ra? (Why in thesis?)
- **Góc nhìn Sinh viên IT:**
  - Đảm bảo tính nhất quán (UI/UX Consistency) giữa tài liệu đặc tả thiết kế hệ thống và mã nguồn thực tế triển khai. Sự sai lệch giữa tài liệu kiến trúc/đặc tả và giao diện người dùng thực tế sẽ dẫn đến việc đánh giá sai lệch trong các kỳ kiểm định phần mềm.
  - Giao diện người dùng và chương trình là hai điểm chạm quản trị cốt lõi (Core Management Touchpoints) trước khi bất kỳ dữ liệu lớp học, đề cương, chuẩn đầu ra (PLO/PI) hay điểm số nào có thể được đưa vào hệ thống đo lường.
- **Góc nhìn Sinh viên IBS:**
  - Trong quản lý giáo dục đại học theo định hướng OBE, hệ thống quản lý học tập và đánh giá CĐR cần sự tham gia của nhiều nhóm đối tượng (Quản trị viên, Quản lý CTĐT, Trưởng bộ môn, Giảng viên, Ban ĐBCL). Giao diện trực quan, rõ ràng, phân định đúng thẩm quyền giúp giảm thiểu sai sót thao tác của người dùng, đảm bảo dữ liệu đầu vào của quá trình đo lường CĐR luôn đạt chuẩn và minh bạch.

#### Câu hỏi 3: Các tham số, cấu hình, thư viện từ đâu mà có? (Where do params/libs come from?)
- **Góc nhìn Sinh viên IT:**
  - Bảng màu và khoảng cách bố cục tuân theo Tailwind CSS và bảng mã màu trong `UI.pdf`: Màu xanh chủ đạo `#2563eb`, xanh lá trạng thái `#15803d`, đỏ cảnh báo `#b91c1c`, nền thẻ `#ffffff` và viền `#e2e8f0`.
  - Bộ điều khiển giao diện sử dụng Ng-Zorro Ant Design (`NzTableModule`, `NzSwitchModule`, `NzModalModule`, `NzSelectModule`, `NzInputModule`) được cấu hình OnPush Change Detection và Angular 21 Signals (`signal`, `computed`).
  - Bảng vai trò 7 mức kế thừa từ hệ thống phân quyền RBAC được định nghĩa trong `SystemConstant.MNG_ROLE` và `SystemConstant.ROLE_TITLE`.
- **Góc nhìn Sinh viên IBS:**
  - Nội dung banner thông báo về phiên bản ("Chương trình đang áp dụng không sửa trực tiếp được. Sửa bản đang áp dụng sẽ tạo phiên bản nháp mới, bản cũ vẫn giữ để đọc lại báo cáo") được trích xuất trực tiếp từ quy trình quản lý chu kỳ kiểm định đào tạo thực tế tại Khoa CNTT - HCMUTE (tương ứng trang 3 của tài liệu đặc tả nghiệp vụ).

#### Câu hỏi 4: Nếu bỏ thành phần này đi thì hệ thống hoặc đề tài sẽ bị ảnh hưởng/phá vỡ ra sao? (What breaks if removed?)
- **Góc nhìn Sinh viên IT:**
  - Nếu không đồng bộ giao diện theo `UI.pdf`, trải nghiệm người dùng sẽ bị phân mảnh: các trang mang phong cách chắp vá, thiếu thanh tìm kiếm khiến việc quản lý hàng trăm người dùng và hàng chục chương trình đào tạo trở nên bất khả thi do phải cuộn hoặc phân trang thủ công.
  - Nếu thiếu các ràng buộc trạng thái và xác nhận modal được đồng bộ, quản trị viên có thể vô tình thao tác sai (ví dụ cố gắng tự khóa chính mình hoặc khóa quản trị viên duy nhất), gây lỗi hoặc khóa cứng quyền quản trị hệ thống.
- **Góc nhìn Sinh viên IBS:**
  - Khi hội đồng đánh giá và người sử dụng (giảng viên, cán bộ quản lý) tiếp cận hệ thống, một giao diện không đồng bộ với tài liệu hướng dẫn và tài liệu nghiệp vụ sẽ làm giảm độ tin cậy của phần mềm.
  - Người dùng không nắm được quy tắc phiên bản chương trình có thể hiểu lầm cách thức vận hành của hệ thống, dẫn đến việc cố can thiệp trực tiếp vào chương trình đã ban hành, làm sai lệch dữ liệu lịch sử đo lường chuẩn đầu ra của các khóa trước.

---

## Phiên #10: Cải tổ và nâng cấp thanh điều hướng phân trang (Table Pagination)

### 1. Bối cảnh và Yêu cầu
- Yêu cầu từ người dùng: "cái hiển thị page vẫn chưa đẹp lắm sửa lại đi" -> Nâng cấp component phân trang bảng dữ liệu (`app-table-paginate`) vốn sử dụng cấu trúc cũ (hai cột 50% thô sơ, input number và select thuần HTML thiếu thẩm mỹ) thành thanh phân trang hiện đại, sang trọng theo đúng chuẩn thiết kế hệ thống và UI.pdf.
- Mục tiêu:
  - Tích hợp `NzPaginationModule` và `NzSelectModule` từ Ng-Zorro Ant Design.
  - Hiển thị thông tin trực quan ở bên trái: `Hiển thị X - Y trên tổng Z bản ghi`.
  - Hiển thị bộ điều khiển số trang gọn gàng bên phải: Các nút số trang bo góc (`1`, `2`, `3`), nút active xanh `#2563eb`, nút chuyển trang `<` và `>`, dropdown chọn kích thước trang (`10 / trang`, `20 / trang`, `50 / trang`, `100 / trang`).
  - Đảm bảo 100% tương thích ngược với API `Paginate<T>` và `createListManagerNoFilter`.
  - Giữ vững 564/564 unit tests và 0 lỗi ESLint/build.

### 2. Các thay đổi kỹ thuật
- [`paginate.component.ts`](file:///D:/Code/Project/LMS-UI/src/app/shared/widget/paginate/paginate.component.ts):
  - Bổ sung `NzPaginationModule`, `NzSelectModule` vào `imports`.
  - Bổ sung 2 computed signals: `fromItemIndex` và `toItemIndex` tính toán chính xác dải bản ghi đang hiển thị.
  - Bổ sung `onPageIndexChange` và `onLimitSelect` kết nối trực tiếp với luồng phát sự kiện `pageChange`.
- [`paginate.component.html`](file:///D:/Code/Project/LMS-UI/src/app/shared/widget/paginate/paginate.component.html):
  - Bố cục flexbox `justify-between`: Khối thống kê bản ghi bên trái và khối điều khiển trang/kích thước trang bên phải.
- [`paginate.component.css`](file:///D:/Code/Project/LMS-UI/src/app/shared/widget/paginate/paginate.component.css):
  - Tạo kiểu tinh tế cho các nút số trang: Bo góc 6px, hiệu ứng hover viền xanh `#2563eb`, nút active đổ bóng nhẹ màu xanh thương hiệu.
  - Tùy biến dropdown chọn limit trang nhỏ gọn, thanh lịch.
- Cập nhật khung chứa phân trang ở chân bảng trong [`list-users.component.html`](file:///D:/Code/Project/LMS-UI/src/app/mng/users/list-users/list-users.component.html) và [`list-programs.component.html`](file:///D:/Code/Project/LMS-UI/src/app/mng/programs/list-programs/list-programs.component.html) với nền `bg-slate-50/50` và viền phân cách mỏng.

### 3. Kết quả nghiệm thu
- **Unit Test (Vitest)**: 50/50 test files passed (564/564 tests passed - 100%).
- **ESLint**: 0 errors, 0 warnings.
- **Biên dịch**: `npm run build:dev` 0 errors, 0 warnings.

---

### Bổ sung cho Phiên #10: 4 câu hỏi vấn đáp bảo vệ đồ án liên quan đến Component Phân trang (Pagination)

#### Câu hỏi 1: Bạn đã làm gì trong bước này? (What did you do?)
- **Góc nhìn Sinh viên IT:**
  - Tái cấu trúc hoàn toàn widget phân trang [`TablePaginateComponent`](file:///D:/Code/Project/LMS-UI/src/app/shared/widget/paginate/paginate.component.ts) từ việc dùng các thẻ điều khiển thô (thẻ select thuần và ô input number chèn giữa nút bấm) sang việc tích hợp `NzPaginationModule` của Ng-Zorro Ant Design kết hợp tùy biến CSS scoped.
  - Sử dụng Angular Signals `computed()` để tự động tính toán chỉ số bản ghi đầu (`fromItemIndex`) và chỉ số bản ghi cuối (`toItemIndex`) phản ứng tức thì theo `currentPage`, `limit` và `totalItem`.
  - Giữ nguyên toàn bộ signature tương thích ngược (`Paginate<T>`, `pageChange`, `setPage`, `changedNumOfItem`) giúp không làm gãy logic của `createListManagerNoFilter`.
- **Góc nhìn Sinh viên IBS:**
  - Nâng tầm trải nghiệm người dùng số (UX/UI): Chuyển đổi thanh điều hướng đáy bảng thành thanh công cụ chuẩn mực của các hệ thống quản trị hiện đại. Giúp người dùng nắm bắt ngay thông tin ngữ cảnh ("Hiển thị 1 - 10 trên 45 bản ghi") thay vì chỉ thấy các con số rời rạc, hỗ trợ thao tác chuyển trang hoặc đổi số lượng bản ghi chỉ với 1 cú click chuột.

#### Câu hỏi 2: Vì sao phần này có mặt và đóng vai trò gì trong đề tài đo lường chuẩn đầu ra? (Why in thesis?)
- **Góc nhìn Sinh viên IT:**
  - Phân trang là cơ chế cốt lõi để bảo vệ hiệu năng hệ thống khi dữ liệu quy mô lớn (danh sách hàng nghìn sinh viên, hàng trăm lớp học phần, điểm số).
  - Phân trang ở giao diện người dùng phải phản ánh chính xác phân trang ở backend Spring Boot (`Pageable` zero-indexed chuyển đổi sang UI one-indexed).
- **Góc nhìn Sinh viên IBS:**
  - Trong quản lý học tập, việc duyệt danh sách sinh viên hay danh mục đào tạo đòi hỏi tốc độ kiểm tra nhanh. Một thanh phân trang trực quan giúp người dùng kiểm soát được khối lượng công việc còn lại, tránh bị mất phương hướng khi làm việc với các bảng dữ liệu dài.

#### Câu hỏi 3: Các tham số, cấu hình, thư viện từ đâu mà có? (Where do params/libs come from?)
- **Góc nhìn Sinh viên IT:**
  - Tích hợp `NzPaginationModule` và `NzSelectModule` từ bộ thư viện Ng-Zorro Ant Design (thư viện UI Component chính của dự án).
  - Các tùy chọn kích thước trang `10 / trang`, `20 / trang`, `50 / trang`, `100 / trang` được căn chỉnh theo hợp đồng API (`API-CONTRACT.md §5.3.1`) giới hạn kích thước trang tối đa là 100 để chống nghẽn RAM máy chủ MongoDB.
- **Góc nhìn Sinh viên IBS:**
  - Quy ước hiển thị số lượng bản ghi ("Hiển thị X - Y trên Z bản ghi") tuân theo chuẩn trải nghiệm người dùng (Usability Heuristics - Visibility of system status) của Nielsen Norman Group.

#### Câu hỏi 4: Nếu bỏ thành phần này đi thì hệ thống hoặc đề tài sẽ bị ảnh hưởng/phá vỡ ra sao? (What breaks if removed?)
- **Góc nhìn Sinh viên IT:**
  - Nếu thiếu phân trang, toàn bộ dữ liệu phải tải một lần (Full Table Dump) sẽ làm nghẽn kết nối mạng và làm đơ giao diện trình duyệt khi số lượng sinh viên, điểm số lên đến hàng chục nghìn dòng.
  - Nếu phân trang hiển thị xấu, lệch bố cục hoặc nhảy dòng trên thiết bị khác nhau, người dùng sẽ gặp khó khăn khi thao tác chuyển trang và chọn số bản ghi.
- **Góc nhìn Sinh viên IBS:**
  - Người dùng không biết mình đang đứng ở trang nào, không biết bảng có tổng cộng bao nhiêu bản ghi để rà soát, dẫn đến việc bỏ sót sinh viên hoặc lớp học phần chưa được đánh giá chuẩn đầu ra.

---

## Phiên #11: Bổ sung khoảng đệm (Padding) và khung bo viền chống cắt cạnh bảng dữ liệu

### 1. Bối cảnh và Yêu cầu
- Yêu cầu từ người dùng: "thêm padding ở cái component ngoài trước khi vào cái table đi chứ table bị che mất viển ngoài do round border rồi".
- Vấn đề thực tế: Container thẻ ngoài `table-card` trước đó có `rounded-xl` và `overflow-hidden` nhưng không có khoảng đệm (0 padding), khiến bảng dữ liệu `nz-table` (vốn có các đường viền ngoài `table-border`) nằm sát mép biên và bị góc bo tròn của thẻ ngoài cắt khuất mất viền trên-trái, trên-phải và viền hai bên.
- Giải pháp:
  - Bổ sung khoảng đệm tiêu chuẩn `p-4 sm:p-6` cho container thẻ ngoài `table-card`.
  - Bọc bảng `nz-table` trong một container con `table-container-inner` có viền riêng `border border-slate-200` và bo góc nhẹ `rounded-lg overflow-hidden`, tạo khoảng thở và giữ nguyên vẹn toàn bộ đường viền bảng.
  - Tách bạch phần chân trang phân trang `table-footer-pagination` với khoảng cách `pt-4 mt-3 border-t border-slate-100`.

### 2. Các thay đổi kỹ thuật
- [`list-users.component.html`](file:///D:/Code/Project/LMS-UI/src/app/mng/users/list-users/list-users.component.html) & [`list-users.component.css`](file:///D:/Code/Project/LMS-UI/src/app/mng/users/list-users/list-users.component.css):
  - Thay đổi `table-card` thành `class="table-card bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6"`.
  - Thêm `div.table-container-inner` bọc ngoài `nz-table`.
  - Thêm style `.table-container-inner { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff; }`.
- [`list-programs.component.html`](file:///D:/Code/Project/LMS-UI/src/app/mng/programs/list-programs/list-programs.component.html) & [`list-programs.component.css`](file:///D:/Code/Project/LMS-UI/src/app/mng/programs/list-programs/list-programs.component.css):
  - Áp dụng cấu trúc đệm và container bo viền tương tự.

### 3. Kết quả nghiệm thu
- **Unit Test (Vitest)**: 50/50 test files passed (564/564 unit tests - 100%).
- **ESLint**: 0 errors, 0 warnings.
- **Biên dịch**: `npm run build:dev` thành công 100%.

---

### Bổ sung cho Phiên #11: 4 câu hỏi vấn đáp bảo vệ đồ án liên quan đến Bố cục Giao diện & Khoảng đệm (Layout Padding & Visual Nesting)

#### Câu hỏi 1: Bạn đã làm gì trong bước này? (What did you do?)
- **Góc nhìn Sinh viên IT:**
  - Giải quyết triệt để lỗi xung đột CSS giữa thuộc tính `overflow: hidden` của thẻ bao ngoài (`rounded-xl`) với viền `1px solid` của bảng Ant Design con (`table-border`).
  - Bổ sung lớp đệm `p-4 sm:p-6` vào thẻ thẻ trắng ngoài (`table-card`), đồng thời bao bọc `nz-table` vào một `table-container-inner` riêng biệt có `rounded-lg` và `border border-slate-200`.
  - Đảm bảo toàn bộ 564 unit tests và kiểm tra ESLint/Build vẫn giữ vững 100% pass rate.
- **Góc nhìn Sinh viên IBS:**
  - Tối ưu hóa thị giác theo nguyên lý Gestalt (Proximity & Enclosure): Bảng dữ liệu không còn bị dính sát vào mép ngoài của thẻ, các đường viền phân định cột và tiêu đề được hiển thị đầy đủ, sắc nét, tạo cảm giác chuyên nghiệp và giảm mỏi mắt cho người quản trị khi xem danh sách dài.

#### Câu hỏi 2: Vì sao phần này có mặt và đóng vai trò gì trong đề tài đo lường chuẩn đầu ra? (Why in thesis?)
- **Góc nhìn Sinh viên IT:**
  - Đảm bảo tính hoàn thiện giao diện mức Pixel-Perfect: Trong quá trình đánh giá phần mềm hoặc bảo vệ sản phẩm, các lỗi hiển thị viền bị cắt xén (Clipping Artifacts) do cấu hình sai padding/overflow là lỗi cơ bản cần được xử lý dứt điểm.
- **Góc nhìn Sinh viên IBS:**
  - Thể hiện sự tôn trọng trải nghiệm người dùng cuối (User Experience): Trong môi trường giáo dục, một giao diện quản trị rõ ràng, các bảng biểu có khoảng thở giúp hạn chế việc người dùng click nhầm dòng hoặc bỏ sót nội dung ở các mép viền.

#### Câu hỏi 3: Các tham số, cấu hình, thư viện từ đâu mà có? (Where do params/libs come from?)
- **Góc nhìn Sinh viên IT:**
  - Khoảng đệm `p-4 sm:p-6` (16px trên mobile, 24px trên desktop) tuân thủ thang đo khoảng cách chuẩn (8pt Spacing Grid) của Tailwind CSS và Ant Design Design Token.
  - Màu viền `#e2e8f0` (`slate-200`) đồng bộ với bảng màu hệ thống.
- **Góc nhìn Sinh viên IBS:**
  - Tỷ lệ khoảng đệm trong-ngoài (Nested Padding: Card ngoài `24px`, bảng con `8px` bo góc) áp dụng quy tắc tỷ lệ lồng ghép trực quan (Visual Hierarchy) phổ biến trong thiết kế giao diện doanh nghiệp.

#### Câu hỏi 4: Nếu bỏ thành phần này đi thì hệ thống hoặc đề tài sẽ bị ảnh hưởng/phá vỡ ra sao? (What breaks if removed?)
- **Góc nhìn Sinh viên IT:**
  - Nếu không có padding, đường viền ngoài của bảng sẽ bị cắt mất tại 4 góc bo của thẻ bao ngoài, dẫn đến hiện tượng "gãy viền" hoặc mép bảng dính chặt vào cạnh màn hình trên các thiết bị có độ phân giải khác nhau.
- **Góc nhìn Sinh viên IBS:**
  - Sản phẩm trông như bản nháp chưa hoàn thiện, tạo ấn tượng thiếu chỉn chu trước hội đồng nghiệm thu và làm giảm mức độ hài lòng của người dùng khi sử dụng hệ thống.

---

## Phiên #12: Tối giản cột trạng thái người dùng chỉ với nút gạt ON / OFF

### 1. Bối cảnh và Yêu cầu
- Yêu cầu từ người dùng: "cột trạng thái tài khoản chỉ để nút on off thôi không ghi trạng thái là gì ở bên trái".
- Thay đổi thực hiện:
  - Loại bỏ hoàn toàn khối nhãn chữ và chấm màu bên trái (`.status-indicator` với chữ "Hoạt động" / "Bị khóa").
  - Cột trạng thái chỉ còn duy nhất công tắc `nz-switch` gọn gàng ở giữa ô, hiển thị nhãn `ON` (xanh lá `switcher-on-green`) khi đang kích hoạt và `OFF` (đỏ `switcher-off-red`) khi bị khóa.
  - Tích hợp nhãn trợ năng vô hình `.sr-only` để các công cụ đọc màn hình và bộ kiểm thử tự động (`list-users.component.spec.ts`) vẫn nhận diện được trạng thái tài khoản mà không làm xáo trộn hiển thị thị giác.

### 2. Các thay đổi kỹ thuật
- [`list-users.component.html`](file:///D:/Code/Project/LMS-UI/src/app/mng/users/list-users/list-users.component.html):
  - Cột trạng thái: Chỉ render `nz-switch` với `nzCheckedChildren="ON"` và `nzUnCheckedChildren="OFF"`.
  - Bổ sung `<span class="sr-only">{{ item.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa' }}</span>`.
- [`list-users.component.css`](file:///D:/Code/Project/LMS-UI/src/app/mng/users/list-users/list-users.component.css):
  - Xóa bỏ các class CSS thừa không còn dùng (`.status-cell-wrapper`, `.status-indicator`, `.status-active`, `.status-locked`, `.status-dot`).
  - Định nghĩa class `.sr-only` chuẩn CSS cho trợ năng.

### 3. Kết quả nghiệm thu
- **Unit Test (Vitest)**: 50/50 test files passed (564/564 unit tests - 100%).
- **ESLint**: 0 errors, 0 warnings.
- **Biên dịch**: `npm run build:dev` thành công 100%.

---

### Bổ sung cho Phiên #12: 4 câu hỏi vấn đáp bảo vệ đồ án liên quan đến Thiết kế Điều khiển Trạng thái & Trợ năng (Accessible Status Control)

#### Câu hỏi 1: Bạn đã làm gì trong bước này? (What did you do?)
- **Góc nhìn Sinh viên IT:**
  - Tinh giản giao diện cột "Cho phép đăng nhập / Trạng thái" của bảng người dùng: Bỏ nhãn văn bản dư thừa bên trái, chỉ giữ lại điều khiển trực tiếp `nz-switch` với trạng thái `ON` (xanh lá) và `OFF` (đỏ).
  - Áp dụng kỹ thuật Web Accessibility (A11y) với class `.sr-only` chứa văn bản "Hoạt động" / "Bị khóa", đảm bảo các thiết bị hỗ trợ người khiếm thị đọc được trạng thái mà không ảnh hưởng đến thiết kế tối giản của giao diện.
  - Đảm bảo 100% kiểm thử tự động (564 unit tests) và ESLint vượt qua.
- **Góc nhìn Sinh viên IBS:**
  - Tối ưu hóa nguyên lý thiết kế tối giản (Minimalism / Less is More): Giảm bớt tải trọng thông tin dư thừa (Cognitive Load). Công tắc gạt ON/OFF vốn đã là một ẩn dụ tương tác quen thuộc trong thiết kế kỹ thuật số, việc hiển thị thêm chữ bên cạnh gây chật chội và rối mắt cho người quản trị.

#### Câu hỏi 2: Vì sao phần này có mặt và đóng vai trò gì trong đề tài đo lường chuẩn đầu ra? (Why in thesis?)
- **Góc nhìn Sinh viên IT:**
  - Cung cấp thao tác quản trị trực tiếp (Direct Manipulation): Thay vì phải mở form sửa chi tiết để bật/tắt tài khoản, quản trị viên có thể khóa hoặc mở khóa tài khoản ngay tại bảng danh sách, qua đó kích hoạt cơ chế vô hiệu hóa tức thì JWT của người dùng tương ứng (F01 US-02/AC-5).
- **Góc nhìn Sinh viên IBS:**
  - Trong quản trị trường đại học, khi có biến động nhân sự hoặc nghi vấn rò rỉ tài khoản giảng viên nhập điểm, quản trị viên cần thao tác vô hiệu hóa tài khoản khẩn cấp một cách nhanh nhất mà không bị nhầm lẫn giữa các nút bấm phức tạp.

#### Câu hỏi 3: Các tham số, cấu hình, thư viện từ đâu mà có? (Where do params/libs come from?)
- **Góc nhìn Sinh viên IT:**
  - Điều khiển sử dụng `NzSwitchModule` với `nzCheckedChildren="ON"`, `nzUnCheckedChildren="OFF"`, kết hợp class toàn cục `switcher-on-green` và `switcher-off-red` được định nghĩa trong `src/assets/css/nz-btn-custom.css`.
  - Class `.sr-only` sử dụng cấu trúc clipping tiêu chuẩn W3C Web Content Accessibility Guidelines (WCAG).
- **Góc nhìn Sinh viên IBS:**
  - Trạng thái nhị phân ON (Cho phép đăng nhập) và OFF (Khóa đăng nhập) ánh xạ trực tiếp sang enum trạng thái `UserStatus` (`ACTIVE` / `LOCKED`) của tầng dữ liệu backend.

#### Câu hỏi 4: Nếu bỏ thành phần này đi thì hệ thống hoặc đề tài sẽ bị ảnh hưởng/phá vỡ ra sao? (What breaks if removed?)
- **Góc nhìn Sinh viên IT:**
  - Nếu thiếu công tắc chuyển trạng thái nhanh, quản trị viên buộc phải thực hiện nhiều bước (bấm sửa -> tìm checkbox -> lưu), làm tăng độ trễ khi cần khóa tài khoản khẩn cấp.
  - Nếu loại bỏ chữ mà không có `.sr-only`, các công cụ kiểm thử tự động và người dùng sử dụng Screen Reader sẽ không thể xác định được tài khoản đang ở trạng thái nào.
- **Góc nhìn Sinh viên IBS:**
  - Quản trị viên thao tác chậm hơn, tăng nguy cơ rò rỉ dữ liệu điểm số và chuẩn đầu ra trong trường hợp tài khoản giảng viên bị xâm phạm mà không được khóa kịp thời.


---

## Phiên #13: Thực hiện Kế hoạch UI F03 — Học phần, Đề cương, CLO, Liên kết CLO–PI & Quản lý Học kỳ (F05a)

### 1. Thông tin phiên làm việc
- **Thời gian:** 2026-11-06
- **Người thực hiện (`git config user.name`):** `minhat5`
- **Phạm vi nghiệp vụ:** F03 (`US-09`, `US-10`, `US-11`, `US-12`) và phần quản lý Học kỳ thuộc F05a (`US-18`), tuân thủ kiến trúc phân quyền học thuật phân cấp tại **ADR 0010** và **ADR 0004**.

### 2. Các hạng mục đã hiện thực
1. **Tầng Core (Constants, Models & Services):**
   - Cập nhật `src/app/core/constants/url.constant.ts` bổ sung đầy đủ các hằng số API và Route cho `terms`, `courses`, `program_courses`, `departments/assign-course`, `syllabi`, `clos`, `clo-pi-links` và `clo-pi-matrix`.
   - Khởi tạo các interface dữ liệu tại `src/app/core/models/course/` (`term.model.ts`, `course.model.ts`, `syllabus.model.ts`, `clo.model.ts`).
   - Xây dựng 4 service tại `src/app/core/services/course/` (`TermService`, `CourseService`, `SyllabusService`, `CloService`) kèm 4 file kiểm thử đơn vị `*.service.spec.ts`.
2. **Phân hệ Kho Học phần & Học kỳ (`/mng/courses`):**
   - Tab **Kho Học phần cấp trường (`courses`):** Dành riêng cho `ADMIN` thêm/sửa/xóa học phần cấp trường (Master Catalog theo ADR 0010); các vai trò khác tra cứu và mở sang đề cương học phần.
   - Tab **Danh mục Học kỳ (`terms` — F05a US-18):** Dành cho `ADMIN` và `PROGRAM_MANAGER` quản lý học kỳ (`OPEN`, `SCORE_LOCKED`, `CLOSED`), tích hợp hộp thoại bắt buộc nhập lý do giải trình khi mở lại học kỳ đã khóa sổ điểm (`SCORE_LOCKED -> OPEN`, US-18/AC-3).
3. **Phân hệ Đề cương & Chuẩn đầu ra Học phần (`/mng/syllabi`):**
   - Màn hình danh sách đề cương theo học phần (`ListSyllabiComponent`), lọc theo `scope.courseIds` hoặc tra cứu toàn trường.
   - Hộp thoại Trưởng bộ môn (`DEPARTMENT_HEAD`) phân công hoặc thu hồi quyền biên soạn đề cương cho Giảng viên (`AssignCourseModalComponent` — ADR 0010).
   - Màn hình chi tiết đề cương & biên soạn CLO (`DetailSyllabusComponent`): Kiểm tra regex mã CLO (`^CLO[0-9]+$`), thang nhận thức Bloom 1–6 (`app-bloom-level-label`), giữ `measurement` mặc định `null` (Q12), phê duyệt `CONFIRMED` bởi Trưởng bộ môn và đóng băng 100% thao tác sửa/xóa CLO khi đề cương khác `DRAFT` (TD-27).
4. **Mở rộng Khung CTĐT (`/mng/curriculum/versions/:versionId`) & Chọn Học phần ở Form Người dùng (`/mng/users`):**
   - Bổ sung Tab **Kế hoạch Học phần trong CTĐT (`ProgramCoursesTableComponent`):** Gán học phần vào phiên bản CTĐT kèm custom validator chặn tự tham chiếu (`selfReferenceConflict`) và chặn trùng học phần giữa danh sách Tiên quyết và Học trước (`prereqPrevConflict` — US-09/AC-3).
   - Bổ sung Tab **Ma trận Liên kết CLO × PI & Thẩm định QA (`CloPiMatrixTableComponent`):** Chỉ liệt kê các học phần thuộc CTĐT (TD-28), cho phép `PROGRAM_MANAGER` thiết lập/xóa liên kết CLO–PI khi đề cương ở `DRAFT`, và cho phép `QA_OFFICER` thẩm định độc lập từng liên kết (`VERIFIED` / `NEEDS_CLARIFICATION` / `UNVERIFIED` — US-12/AC-3).
   - Nâng cấp `FormUsersComponent` (`src/app/mng/users/form-users/form-users.component.ts` & `.html`): Tích hợp `CourseService.getCourses(0, 100)` và đổi ô chọn `courseIds` từ `nzMode="tags"` (nhập tay ObjectId) sang `nzMode="multiple"` kèm `nzShowSearch` hiển thị danh sách học phần theo định dạng `code - name` tương tự ô chọn Chương trình đào tạo (`programIds`).
5. **Thu hồi quyền học thuật & phân công bộ môn của ADMIN trên phân hệ Đề cương (đồng bộ Backend commit `ade4c16` & `865bd77`):**
   - Thu hồi quyền tạo phiên bản đề cương DRAFT (`canCreateSyllabus = false` đối với `ADMIN`) trong `ListSyllabiComponent`.
   - Thu hồi quyền phân công giảng viên tại các endpoint bộ môn (`canAssignCourse = false` đối với `ADMIN`) trong `ListSyllabiComponent` (chỉ dành riêng cho `DEPARTMENT_HEAD` có môn trong scope).
   - Thu hồi quyền thêm/sửa/xóa CLO (`canEditClo = false` đối với `ADMIN`) và quyền phê duyệt `CONFIRMED` (`canApproveSyllabus = false` đối với `ADMIN`) trong `DetailSyllabusComponent`.
   - Admin chỉ có quyền tra cứu/xem chi tiết toàn trường (Read-only 100% trên `/mng/syllabi`), đảm bảo tính toàn vẹn phân cấp học thuật theo ADR 0010.

### 3. Kết quả kiểm chứng
- **ESLint (`src/`):** 0 errors, 0 warnings.
- **Unit Tests (`npm test -- --no-watch`):** 65/65 test files passed (635/635 tests passed).
- **Build (`npm run build:dev`):** Biên dịch thành công 0 errors.

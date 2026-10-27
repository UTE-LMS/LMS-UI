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

### Bài học ghi nhận (ứng viên cho mục B khi sinh viên xác nhận)

- Cài từng gói `@angular/*` bằng `npm install` gây ERESOLVE vì các gói ghim phiên bản của nhau; phải dùng `ng update`.
- `npm audit fix` không nâng được các gói bị chặn bởi ràng buộc peer nên cần bước thứ hai.

## B. Lỗi / ảo giác của AI đã phát hiện (mục tiêu ≥ 5, kèm phân tích nguyên nhân)

| # | Ngày | Mô tả lỗi | Phát hiện bằng cách nào | Nguyên nhân | Commit sửa |
|---|---|---|---|---|---|
| | | | | | |

## C. Danh sách kiểm soát đầu ra AI đã áp dụng

Mỗi PR có AI hỗ trợ tick các mục trong `.claude/rules/01-ai-usage-and-ownership.md` §3: `ng build`/`ng test` đã chạy
thật; API đã đối chiếu tài liệu chính thức đúng phiên bản; package mới có lý do và giấy phép; không có secret/dữ
liệu thật; không chép mã ngoài; hợp đồng API đối chiếu backend; nghiệp vụ hiển thị đúng `02-domain-and-ux.md`.

## D. Nguồn và giấy phép của mã/tài liệu tham khảo

| Ngày | Nội dung | Nguồn (URL) | Giấy phép | Dùng ở đâu |
|---|---|---|---|---|
| | | | | |

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


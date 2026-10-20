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

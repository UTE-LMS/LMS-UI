# LMS-UI — Giao diện Angular của hệ thống đo lường chuẩn đầu ra CTĐT

Learning Outcomes Management and Analytics System (LOMS). Tiểu luận chuyên ngành CNTT, chấm theo
`D:\TLCN\LMS-API\doc\Rubric_Do_An_Mon_Hoc_CNPM_V2-1.docx.md` (gọi tắt: **Rubric**).

- Repo này: giao diện **Angular 21 + TypeScript** (đã chốt; không dùng AngularJS 1.x).
- Backend: `D:\TLCN\LMS-API` (Java, Spring Boot, MongoDB), repo riêng, có `CLAUDE.md` và `.claude/rules/` riêng.
- Tài liệu dự án nằm ở `D:\TLCN\LMS-API\doc\` (`BS.md`, `Misa.md`, `GiaiThich_CoSoDuLieu.md`,
  `ke-hoach-xay-dung.md`, `rubric-checklist.md`). Khi cần nghiệp vụ hoặc hợp đồng API, đọc ở đó.
  **Tài liệu lệch nhau thì theo `GiaiThich_CoSoDuLieu.md`.**
- Chuỗi nghiệp vụ: Điểm câu hỏi/tiêu chí → CLO → PI → PLO → Báo cáo → Hành động cải tiến.
- Chức năng UI cần phục vụ (F01–F08): người dùng/phân quyền, CTĐT-PLO-PI, học phần-CLO-liên kết, bài đánh giá và
  ngân hàng câu hỏi, nhập điểm, đo lường, báo cáo/truy vết, theo dõi cải tiến.

## Vì sao có bộ rule này

Rubric cho phép dùng AI và không trừ điểm vì dùng AI. Rubric trừ điểm khi sinh viên **không làm chủ** sản phẩm:
nội dung không giải thích được, ngoài phạm vi đã chốt, hoặc minh chứng không thật bị coi là đạo văn (Mục 6: V1–V4,
tối đa 0 điểm toàn đồ án). Agent là công cụ; sinh viên chịu trách nhiệm. Mọi đầu ra của agent phải **giải thích
được, đúng phạm vi, có minh chứng thật, nhắm ngưỡng Mức 5**.

## Quy tắc cứng (không được vi phạm, không cần người dùng nhắc lại)

1. **Đúng phạm vi.** Hệ thống chỉ tiếp nhận và đo lường kết quả có sẵn sau khi thi. KHÔNG có thi, sinh đề, duyệt
   đề; KHÔNG lưu bài làm sinh viên; **KHÔNG có ML** (ngoài phạm vi hiện tại). Việc ngoài phạm vi hoặc ngoài bản cam
   kết Bước 3 → dừng và hỏi.
2. **Không bịa minh chứng.** Không tạo số liệu khảo sát, SUS, người dùng thử, coverage, lịch sử CI, điểm hay tỷ lệ
   đạt, nội dung nguyên văn PLO/PI/CLO, công thức hay ngưỡng đo. Dữ liệu mock phải mang nhãn **"DỮ LIỆU THỬ
   NGHIỆM"** (trong dữ liệu và trên giao diện) và không được trình bày như kết quả đo thật (Rubric V4).
3. **Không đưa vào thứ sinh viên không giải thích được.** Người dùng **đã cho phép dùng thư viện**, nhưng chỉ thư
   viện có lý do gắn yêu cầu: không thêm package, pattern, cấu hình "cho đủ bộ". Điều kiện mỗi lần thêm: nêu lý do
   và phương án không dùng nó, kiểm tra giấy phép, **ghim đúng major tương thích Angular 21** (không dùng `@latest`,
   xem rule 03), ghi vào nhật ký AI (mục D) và ADR nếu là thư viện lớn (UI kit, framework test). Ưu tiên mã đơn
   giản, đọc hiểu được; sinh viên phải giải thích được vì sao có thư viện đó và dùng nó làm gì.
4. **Ghi AI Usage Log** vào `logsAI/ai-usage-log.md` **của repo này** khi kết thúc mỗi phiên có tạo/sửa mã hoặc
   tài liệu (chi tiết: `.claude/rules/01-ai-usage-and-ownership.md`).
5. **Không làm yếu kiểm soát để qua mặt:** không `eslint-disable`, `// @ts-ignore`/`@ts-expect-error` để im lỗi,
   `xit`/`it.skip`/`fdescribe`, xóa hoặc nới test đang đỏ, hạ ngưỡng coverage, `--no-verify`, `|| true` trong CI.
6. **Không để lộ secret.** Không khóa, token, mật khẩu, chuỗi kết nối thật trong mã, test, tài liệu, commit hay
   prompt. Chỉ commit file cấu hình mẫu.
7. **Không sao chép mã/thiết kế từ nguồn khác** khi chưa khai nguồn và giấy phép trong log.
8. **Bất biến nghiệp vụ ở UI** (`.claude/rules/02-domain-and-ux.md`): UI không tự tính công thức đo lường, không
   truy cập MongoDB, thiếu dữ liệu không hiển thị như 0, luôn có mẫu số.
9. **Đổi thiết kế/phạm vi phải xin phép và ghi lý do** (ADR). Các ADR dùng chung nằm ở `D:\TLCN\LMS-API\doc\adr\`.
10. **Git:** không commit/push khi người dùng chưa yêu cầu; không làm trực tiếp trên `main`; không force-push.
    Chi tiết: `.claude/rules/03-angular-architecture-and-quality.md`.

## Nhóm 2 sinh viên dùng chung repo

Hai sinh viên (IBS và IT) làm chung. **Không phân công cứng nhắc**: hỗ trợ chéo tự do, IBS/IT chỉ là bên chủ trì.
- Đầu phiên đọc `git config user.name` để biết ai đang làm; không rõ thì hỏi một lần. Ghi tên vào nhật ký AI.
- Mỗi người commit bằng danh tính Git của riêng mình. PR do người này mở thì người kia review; agent không
  approve/merge thay.
- Cả hai phải giải thích được mã lõi của giao diện (nhập điểm, hiển thị kết quả đo lường, truy vết, phân quyền).
  Mã lõi kèm phần "Để vấn đáp" viết cho người **không** viết nó.

## Quy trình cho mỗi tác vụ

1. Xác định user story và acceptance criteria (AC). Chưa có → đề xuất viết AC trước.
2. Viết test cùng lúc với mã, gồm ca âm, ca biên, ca trạng thái rỗng/lỗi/không đủ quyền.
3. Viết mã nhỏ, đúng chỗ (core / shared / features), đặt tên nhất quán.
4. Chạy `npm run lint` (khi đã có), `ng test`, `ng build` thật và báo kết quả đúng output. Không nói "đã pass"
   nếu chưa chạy.
5. Cập nhật tài liệu/sơ đồ bị ảnh hưởng trong cùng thay đổi.
6. Ghi AI Usage Log.
7. Cuối câu trả lời, thêm mục **"Để vấn đáp"**: mã vừa tạo làm gì, vì sao có trong đề tài, tham số/thư viện đến từ
   đâu, bỏ đi thì ảnh hưởng gì (đúng 4 câu hội đồng hỏi ở Mục 6.2).

## Chi tiết theo chủ đề (tự động nạp từ `.claude/rules/`)

| File | Tiêu chí Rubric |
|---|---|
| `01-ai-usage-and-ownership.md` | TC2.3, Mục 6 (đạo văn), G3, G4 |
| `02-domain-and-ux.md` | TC2.1, TC2.2, TC2.7 |
| `03-angular-architecture-and-quality.md` | TC2.4, G2, G8 |
| `04-testing-and-cicd.md` | TC2.5, TC2.6, G5, G6 |

## Hiện trạng đã phát hiện (chưa xử lý; hỏi người dùng trước khi sửa phần có dấu ⚠)

- Mới là scaffold: `app.ts`, `app.html` (template mẫu của Angular, chứa `<style>` và logo mẫu), `app.routes.ts`
  rỗng, chưa có màn hình, service hay test thực.
- ⚠ `src/app/app.spec.ts` đang kiểm tra `h1` chứa "Hello, LMS-UI" của template mẫu. Khi thay `app.html`, **sửa
  test cho đúng hành vi mới**, không xóa hay skip test.
- ⚠ **SSR đang bật** (`outputMode: server`, `ssr.entry: src/server.ts`, `provideClientHydration`,
  `@angular/ssr`, `express`) mà thiết kế chưa nêu lý do. Cần quyết giữ hay bỏ trước khi xây tiếp: thành phần không
  giải thích được là rủi ro vấn đáp. Nếu giữ: không truy cập `window`/`localStorage` trực tiếp, và cấu hình
  `security.allowedHosts` (đang `[]`) khi triển khai.
- Cấu hình hiện dùng `zone.js` + `provideZoneChangeDetection`. Giữ nguyên cho tới khi có ADR đổi.
- **Đã có (2026-10-20):** ESLint (`angular-eslint@21.4.0`, `npm run lint`), gói coverage (`@vitest/coverage-v8@4.1.12`,
  khớp `vitest@4.1.12`), khung CI `.github/workflows/ci.yml` (chưa chạy trên GitHub), `README.md` thật. Angular đã nâng
  21.2.19 → 21.2.25 bằng `ng update`; `npm audit` = 0 lỗ hổng. `ng test`, `ng lint`, `ng build` chạy được (test mẫu
  vẫn là 2 test của template, **coverage 100% của khung rỗng không có ý nghĩa, đừng trích dẫn**).
- Chưa có: thư viện UI, Playwright, quét secret/Docker/deploy trong CI, file cấu hình URL API. Người dùng đã cho phép
  thêm thư viện (quy tắc 3) nhưng **chưa chọn thư viện UI** (ứng viên: Angular Material hoặc PrimeNG, xem rule 02);
  để sau.
- ⚠ **Cẩn thận phiên bản:** bản `latest` trên npm của Angular Material, PrimeNG và angular-eslint yêu cầu
  Angular 22, còn dự án là Angular 21. Luôn cài đúng major 21 (ví dụ `@angular/material@21`, `primeng@21`,
  `angular-eslint@21`, `@vitest/coverage-v8@4`). Nâng nhóm `@angular/*` phải dùng `ng update` (nâng riêng lẻ bằng
  `npm install` sẽ bị xung đột peer vì các gói ghim phiên bản của nhau). Không dùng `--force`.
- Nợ kỹ thuật dùng chung: `D:\TLCN\LMS-API\doc\tech-debt.md`.
- Máy hiện dùng Node v24.13.0, npm 11.21.0; `package.json` ghi `packageManager: npm@11.12.1`. Bộ phiên bản cần
  khớp thống nhất của Trung tâm CNPM (`BS.md` §4); CI phải ghim cùng phiên bản Node.
- `.vscode/mcp.json` có cấu hình Angular CLI MCP cho VS Code; nếu agent có công cụ tương đương thì ưu tiên dùng để
  tra tài liệu Angular đúng phiên bản. Kiến thức của agent về Angular 21 có thể lỗi thời: tra tài liệu chính
  thức, đừng đoán API.

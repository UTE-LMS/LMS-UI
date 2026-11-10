# Kế hoạch Thiết kế & Hiện thực UI cho F05a: Học kỳ, Lớp học phần, Ghi danh & Nhập danh sách lớp

> **Tài liệu Kế hoạch Kỹ thuật UI Angular** (nháp của agent, sinh viên đọc, hiểu và viết lại; xem `.claude/rules/01`).
> **Dự án Frontend:** `LMS-UI` (Angular 21, TypeScript, Ng-Zorro-Antd, zoneless).
> **Dự án Backend:** `LMS-API`, nguồn sự thật là mã đã merge: `TermController`, `SectionController`,
> `EnrollmentController` và các DTO `Term*`, `Section*`, `Enrollment*`.
> **Căn cứ:** `LMS-API/doc/plan/F05a-hoc-ky-lop-sinh-vien.md` (kể cả §11 các quyết định D1–D12), `doc/API-CONTRACT.md` §6.4,
> mẫu cấu trúc `doc/plan/F03-hoc-phan-clo-ui.md`, bản thiết kế bố cục `Terms`, `Sections`, `SectionDetail`, `RosterImport`
> (chỉ là tham chiếu bố cục, hiện thực bằng thành phần và token của repo).
> **Phạm vi:** US-18 (học kỳ), US-19 (lớp học phần), US-20 (nhập danh sách lớp). **Không làm:** nhập điểm (F05b), nhập Excel
> (backend chưa hỗ trợ), họ tên/email sinh viên (Q09).

---

## 1. Trách nhiệm và quyền (UI chỉ ẩn nút; backend quyết định)

| Hành động | Backend cho phép | UI hiện nút khi |
|---|---|---|
| Xem học kỳ | mọi người đã xác thực | mọi vai trò |
| Thêm/sửa/khóa sổ/mở lại học kỳ | `ADMIN`, `PROGRAM_MANAGER` (xóa: `ADMIN`) | `ADMIN` hoặc `PROGRAM_MANAGER` |
| Xem danh sách lớp | lớp người gọi đọc/quản lý được (giảng viên: lớp mình) | mọi vai trò; **UI không tự lọc quyền** |
| Mở lớp, đổi giảng viên, đổi trạng thái lớp | `ADMIN`, hoặc `PROGRAM_MANAGER` mà học phần thuộc CTĐT trong `scope.programIds` (D1) | `ADMIN` hoặc `PROGRAM_MANAGER` |
| Nhập danh sách lớp, rút/ghi danh lại | `ADMIN` hoặc giảng viên của lớp (`canAccessSection` WRITE) | `ADMIN`, hoặc `LECTURER` có `userId` nằm trong `lecturerIds` |

Mọi lỗi 403/409/422 do backend trả được hiển thị theo bảng mã lỗi `API-CONTRACT.md` §3 (xem §4).

## 2. Bất biến nghiệp vụ hiển thị

| Bất biến | Hiện thực |
|---|---|
| Ghi danh là **mẫu số** của tỷ lệ đạt | Số "đang học" và "đã rút" lấy nguyên từ `enrolled`/`withdrawn` của API, UI không cộng trừ. Lớp chưa có bản ghi ghi danh nào hiện "—" kèm giải thích "chưa có mẫu số", **không** hiện 0 |
| `enrolledCount` mặc định 0 ở backend | Danh sách lớp hiện "—" cho cả `null` lẫn `0` (chú thích ở chân bảng); chỉ màn chi tiết lớp phân biệt được "chưa nhập" với "có sinh viên nhưng tất cả đã rút" (hiện 0 thật) |
| Ghi danh bị **đóng băng** khi lớp hoặc học kỳ không còn `OPEN` (D6) | Nút "Nhập danh sách lớp", "Rút", "Ghi danh lại" bị vô hiệu hóa **kèm lý do** (banner + `title`); backend vẫn trả 422 nếu bị gọi |
| Nhập CSV là **một thao tác thống nhất** (D7) | Có dòng lỗi thì không ghi gì; UI nói rõ "chưa có sinh viên nào được ghi danh" và khóa nút Ghi danh tới khi chọn lại tệp |
| Chỉ dùng mã thay thế `studentRef` (Q09) | Chỉ hiện `studentRef`; không hiện họ tên/email; cột ngoài `studentRef/cohort/majorCode` được báo là "bị bỏ qua" |
| Trạng thái không chỉ bằng màu | Mọi trạng thái (học kỳ, lớp, ghi danh, đề cương) có chữ + biểu tượng + kiểu viền qua `app-display-chip` (bảng nhãn ở `core/constants/academic-display.constant.ts`) |
| Dữ liệu thử nghiệm | Nhãn "DỮ LIỆU THỬ NGHIỆM" (`app-test-data-flag`) ở đầu các màn hình mới |
| Mở lại học kỳ/lớp đã khóa sổ điểm cần lý do (US-18/AC-3, D6) | Ô lý do bắt buộc ở cả hai màn; thiếu thì không gọi API |

## 3. Route và màn hình

| Route | Component | Nội dung |
|---|---|---|
| `/mng/courses?tab=terms` | `ListCoursesComponent` (đã có ở F03, tab "Danh mục Học kỳ") | **Màn hình Học kỳ**: danh sách, thêm/sửa, khóa sổ điểm, mở lại kèm lý do, đóng, xóa. F05a **dùng lại**, chỉ thêm đọc `?tab=terms` để màn Lớp học phần liên kết thẳng tới |
| `/mng/sections` | `ListSectionsComponent` | Lọc học kỳ/học phần/mã lớp; bảng: mã lớp, học phần, học kỳ, đề cương (phiên bản + trạng thái), giảng viên, ghi danh, trạng thái; nút "Thêm lớp" |
| (modal) | `SectionModalComponent` | Mở lớp (mã, học kỳ `OPEN`, học phần, đề cương `CONFIRMED`, giảng viên) hoặc chỉ đổi giảng viên |
| `/mng/sections/:sectionId` | `DetailSectionComponent` | Thông tin lớp, mẫu số, danh sách ghi danh (lọc Tất cả/Đang học/Đã rút, phân trang phía client 50 dòng/trang), Rút/Ghi danh lại, đổi giảng viên, đổi trạng thái lớp (modal, lý do bắt buộc khi mở lại lớp `LOCKED`), liên kết "Bài đánh giá" |
| `/mng/sections/:sectionId/roster-import` | `RosterImportComponent` | Chọn tệp CSV, ghi danh, kết quả hoặc bảng lỗi theo dòng, tải bản báo lỗi, tải tệp mẫu; thanh dưới cùng báo lỗi/hành động |

Menu: mục "Lớp học phần" (`sections.menu.ts`) hiện với mọi vai trò quản lý; danh sách do API lọc theo quyền.

### Khác với bản thiết kế (có chủ đích)

- **Màn Học kỳ không dựng thêm**: F03 đã hiện thực đủ chức năng (tab trong `/mng/courses`); dựng thêm sẽ trùng mã. Cột "Số lớp" trong thiết kế **không có** vì API không trả; không tự đếm.
- **Nhập danh sách lớp chỉ có 2 bước** (Chọn tệp + Ghi danh, Kết quả) thay vì 3 (Chọn tệp, Kiểm tra, Ghi danh): API không có bước xem trước. Lỗi theo dòng hiện sau khi gửi (422), không ghi gì.
- **Giảng viên** hiện tên đăng nhập chỉ khi tra được (ADMIN tải được `GET /users`); còn lại hiện "Bạn" hoặc "GV …mã ngắn", không đoán tên.

## 4. Trạng thái màn hình (đủ cho TC2.2)

| Trạng thái | Danh sách lớp | Chi tiết lớp | Nhập danh sách |
|---|---|---|---|
| Đang tải | `nz-table [nzLoading]` | "Đang tải thông tin lớp…" (`role=status`) | (thông tin lớp tải nền, không chặn) |
| Rỗng | "Chưa có lớp học phần nào khớp bộ lọc" + nút theo vai trò | "Lớp chưa có danh sách ghi danh" + nút nhập (nếu được) | — |
| Lỗi tải | `app-error-state` (Thử lại khi lỗi tạm thời, Tải lại khi 409) | như trái, kèm nút quay lại | thông điệp backend tại thanh dưới cùng |
| Hết quyền (403) | `app-error-state` "Không đủ quyền" | như trái | thông điệp 403 theo bảng mã lỗi |
| Lỗi thao tác 422/409 | tại modal (giữ dữ liệu đã nhập) | banner `role=alert` | thanh dưới cùng + bảng lỗi theo dòng |
| Đóng băng | — | banner + nút vô hiệu hóa kèm lý do | nút chọn tệp và Ghi danh vô hiệu hóa |
| Dữ liệu lớn | `GET /sections` không phân trang (D11) | bảng ghi danh phân trang phía client | bảng lỗi phân trang 50 dòng |

Chống bấm đúp: `isSubmitting` chặn lần gửi thứ hai ở modal lớp, đổi trạng thái, nhập danh sách.
Responsive: lưới `grid-cols-1 md:grid-cols-…`, bảng có `nzScroll.x`, `flex-wrap` ở thanh công cụ. A11y: mọi ô nhập có `label`/`aria-label`, lỗi có `role="alert"`, bước dùng `aria-current="step"`, chữ + biểu tượng cho trạng thái, màu chữ lỗi `#8c2f39` trên nền sáng (đạt tương phản AA).

**Kiểm tra giao diện đã làm (2026-11-10):** chạy tạm Playwright + axe (API giả lập bằng `page.route`, dữ liệu giả; tệp kiểm thử tạm đã xóa, không đưa vào repo) trên các màn hình của tài liệu này ở rộng 1440, 820, 390 px. Kết quả: không còn vi phạm axe mức serious/critical thuộc mã mới sau khi sửa (liên kết bằng `nzType="link"` và nút `nzDanger` thiếu tương phản, `nz-select` thiếu nhãn, vùng cuộn không có phần tử focus được). Còn lại **không thuộc mã mới**: `aria-dialog-name` của `nz-modal-container` (thư viện ng-zorro không cho đặt tên hộp thoại; ảnh hưởng mọi modal của app), tương phản chữ ở header chung (`.user-name-label`, `.nav-text`) và header chung làm tràn ngang trang ở 390 px. Chưa có E2E cố định cho các màn hình này.

## 5. Tổ chức mã

```text
core/constants/academic-display.constant.ts      <-- nhãn trạng thái học kỳ/lớp/ghi danh/đề cương
core/models/course/section.model.ts              <-- ISection, IEnrollment, IEnrollmentList, IEnrollmentImportResult...
core/services/course/section.service.ts          <-- GET/POST/PUT lớp, đổi trạng thái
core/services/course/enrollment.service.ts       <-- danh sách ghi danh, nhập CSV (multipart), rút/ghi danh lại
shared/widget/display-chip | action-dock | test-data-flag   <-- widget dùng chung (cũng dùng ở F04)
mng/sections/
  sections.routes.ts, sections.menu.ts, sections.util.ts     <-- hàm thuần: "—", đọc "line N", CSV lỗi, kiểm tra tệp
  list-sections/  section-modal/  detail-section/  roster-import/
```

## 6. Thứ tự hiện thực

1. Core: URL, model, service + spec HTTP. 2. Tiện ích thuần + spec. 3. Danh sách lớp + modal. 4. Chi tiết lớp. 5. Nhập danh sách.
6. Liên kết `?tab=terms` + test. Mỗi bước chạy lint, test, build.

## 7. Truy vết AC ↔ test

| AC | Kiểm bằng (spec › test) |
|---|---|
| US-18/AC-1, AC-3 (học kỳ, mở lại cần lý do) | `term.service.spec`, `list-courses.component.spec` (đã có ở F03); `list-courses` › "?tab=terms mở tab Học kỳ", "giá trị tab không hợp lệ bị bỏ qua" |
| US-19/AC-1 mở lớp | `section-modal.component.spec` › "mở lớp gửi đúng body"; `section.service.spec` › createSection |
| US-19/AC-2 tham chiếu sai → 422 | `section-modal` › "422 đề cương chưa duyệt"; ca âm thiếu trường, mã sai, giảng viên rỗng/ID sai/trùng |
| US-19/AC-3 trùng mã → 409 | `section-modal` › "409 trùng mã lớp ... giữ nguyên dữ liệu" |
| US-19/AC-4 giảng viên chỉ thấy lớp mình | `list-sections.component.spec` › hiển thị, "—" cho sĩ số 0, chỉ ADMIN/PROGRAM_MANAGER thấy "Thêm lớp", rỗng, 403, lỗi mạng + thử lại, lọc; `section.service.spec` › getSections |
| US-19 đổi trạng thái, lý do khi mở lại | `detail-section.component.spec` › "mở lại lớp LOCKED thiếu lý do", "có lý do", "đóng lớp không cần lý do" |
| US-20/AC-1 nhập thành công | `roster-import.component.spec` › "tệp hợp lệ được gửi ..."; `enrollment.service.spec` › multipart |
| US-20/AC-2 lỗi theo dòng, không ghi nửa chừng | `roster-import` › "422 kèm lỗi theo dòng"; `sections.util.spec` › parseImportLine, toRosterRowErrors, buildRosterErrorCsv |
| US-20/AC-3 tệp rỗng/sai định dạng | `roster-import` › "tệp không phải CSV", "tệp rỗng", "400 tệp sai cột"; `sections.util.spec` › validateRosterFile (biên đúng giới hạn và vượt 1 byte) |
| US-20/AC-4 rút/ghi danh lại, mẫu số | `detail-section.component.spec` › mẫu số 3/2, lớp chưa nhập (—), tất cả đã rút (0 thật), rút gọi API rồi tải lại số đếm, 422 khi rút; `enrollment.service.spec` › updateStatus |
| Đóng băng ghi danh (D6) | `detail-section` › "lớp đã đóng ...", "học kỳ đã khóa sổ điểm"; `roster-import` › "lớp không còn OPEN", "học kỳ khóa sổ" |
| Chống bấm đúp | `section-modal`, `roster-import` › "lần submit thứ hai bị bỏ qua" |

## 8. Chỗ UI cần API bổ sung / lệch hợp đồng (đề xuất, chưa sửa backend)

1. `SectionResponse` chỉ có ID: UI phải gọi thêm `GET /courses/{id}`, `GET /syllabi/{id}`, và không có tên giảng viên. Đề xuất nhúng `courseCode`, `courseName`, `termCode`, `syllabusVersion/status`, `lecturers[{id, username}]`.
2. `enrolledCount` mặc định 0: không phân biệt "chưa nhập danh sách" với "0 sinh viên". Đề xuất `null` cho lớp chưa có ghi danh hoặc thêm `hasRoster`.
3. Không có endpoint liệt kê giảng viên cho `PROGRAM_MANAGER` (chỉ `GET /users` của ADMIN và `GET /departments/lecturers` của Trưởng bộ môn): PM mở lớp phải dán ID giảng viên.
4. Không có bước xem trước/kiểm tra khi nhập CSV (UI không dựng bước "Kiểm tra" như thiết kế).
5. Học kỳ: không có số lớp theo học kỳ; chưa có `audit_logs` cho đổi trạng thái (TD-31).

## 9. Để vấn đáp (4 câu hội đồng, Mục 6.2)

1. **Mã làm gì?** Quản lý học kỳ (khóa sổ điểm), mở lớp học phần gắn đề cương `CONFIRMED` và giảng viên, nhập danh sách lớp từ CSV để có **số ghi danh = mẫu số** của tỷ lệ đạt, rút/ghi danh lại sinh viên.
2. **Vì sao có trong đề tài?** Báo cáo luôn phải nói lớp có bao nhiêu người ghi danh và bao nhiêu đủ dữ liệu; không có ghi danh thì không thể báo "5 người chưa đủ dữ liệu". Khóa sổ theo học kỳ để điểm đã công bố không bị đổi âm thầm.
3. **Tham số/thư viện từ đâu?** Giới hạn 5000 dòng, UTF-8, cột `studentRef/cohort/majorCode`, quy tắc đóng băng ghi danh: từ backend (plan F05a D6–D9). Không thêm thư viện; dùng `ng-zorro-antd` và Tailwind đã có; CSV chỉ gửi nguyên tệp, không đọc ở client.
4. **Bỏ đi thì sao?** Mất nguồn mẫu số (F06 không tính được tỷ lệ kèm mẫu số) và mất cơ chế chặn sửa danh sách khi lớp/học kỳ đã khóa; giảng viên không có chỗ nhập danh sách lớp.

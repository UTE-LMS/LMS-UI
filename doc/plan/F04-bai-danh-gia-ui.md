# Kế hoạch Thiết kế & Hiện thực UI cho F04: Bài đánh giá, Rubric & Duyệt ma trận đề thi

> **Tài liệu Kế hoạch Kỹ thuật UI Angular** (nháp của agent, sinh viên đọc, hiểu và viết lại; xem `.claude/rules/01`).
> **Dự án Frontend:** `LMS-UI` (Angular 21, TypeScript, Ng-Zorro-Antd, zoneless).
> **Dự án Backend:** `LMS-API`, nguồn sự thật là mã đã merge: `AssessmentController`, `AssessmentItemValidator`,
> `AssessmentApprovalServiceImpl` và các DTO `Assessment*`, `OutcomeMappingDto`, `Rubric*`, `CoverageResponse`.
> **Căn cứ:** `LMS-API/doc/plan/F04-bai-danh-gia.md` (§4 quy tắc, §11 quyết định D1–D13), ADR 0001 (phương án A, GVHD đã xác nhận
> Q11), ADR 0011 (câu hỏi chỉ gán CLO, PI suy ra), `doc/API-CONTRACT.md` §6.3, mẫu `doc/plan/F03-hoc-phan-clo-ui.md`, bản thiết kế
> `AssessmentList`, `Assessment`, `AssessmentItem`, `AssessmentReview` (chỉ tham chiếu bố cục).
> **Phạm vi:** US-15 (bài đánh giá khung/bản lớp), US-16 (rubric mức 1–4), NEW-01 (duyệt ma trận).
> **Không làm:** ngân hàng câu hỏi (US-13/14), nhập câu hỏi Excel/Moodle (US-17), nhập điểm (F05b), mở khóa `UNLOCK` (backend chưa có).

---

## 1. Trách nhiệm và quyền (UI chỉ ẩn nút; backend quyết định)

| Hành động | Backend cho phép | UI hiện nút khi |
|---|---|---|
| Xem bài/khung, độ phủ | đọc được lớp/đề cương | mọi vai trò |
| Soạn **khung** theo đề cương | `LECTURER` hoặc `DEPARTMENT_HEAD` có học phần trong `scope.courseIds`; ADMIN, PM chỉ đọc (D1) | `LECTURER` hoặc `DEPARTMENT_HEAD` |
| Tạo/sửa **bản lớp**, gửi duyệt | chỉ `LECTURER` của lớp (D2) | `LECTURER` (và `userId` ∈ `lecturerIds` ở nút tạo bài) |
| Duyệt / từ chối | chỉ `DEPARTMENT_HEAD` đúng phạm vi; **ADMIN không có quyền**; người gửi không tự duyệt (D3) | `DEPARTMENT_HEAD`, bài `SUBMITTED`, và không phải người gửi |

403/409/422 do backend trả đều được hiển thị (§4). Ẩn nút **không** thay cho kiểm tra của backend.

## 2. Bất biến nghiệp vụ hiển thị

| Bất biến | Hiện thực |
|---|---|
| UI **không tự tính** độ phủ | Màn duyệt hiển thị nguyên `byClo`/`byBloom` từ `GET /assessments/{id}/coverage` (kể cả giá trị bất thường như 12,5%: có test); thanh rộng = `percentage` API trả, chỉ kẹp 0–100 để vẽ |
| Kiểm tra phía client chỉ để **gợi ý** | Σ phần điểm = 1 (sai số 0,0001), tổng điểm khớp Σ điểm tối đa (0,001), mã trùng, điểm rubric ≤ điểm tối đa: sao chép sai số của backend (`assessments.util.ts`), chỉ chặn nút và hiện lý do; backend vẫn kiểm tra và quyết định (422) |
| Thiếu dữ liệu ≠ 0 | Tổng điểm, tỷ trọng chưa khai báo hiện "—"; bài chưa có phần tử hiện "—" cho Σ điểm; độ phủ rỗng có giải thích, không hiện "0%" |
| Mức Bloom (1–6) **tách** mức rubric (1–4) | Hai trường độc lập trong form và payload; nhãn khác nhau ("Mức Bloom" / "Mức rubric"); ghi chú "không phải điểm" (có test US-16/AC-2) |
| Ánh xạ chỉ có **CLO** | Mỗi phần tử chọn ≥ 1 CLO của đề cương với phần điểm trong (0, 1], tổng = 1, không trùng CLO. PI **không** khai báo (suy ra từ liên kết CLO–PI, ADR 0011); màn duyệt ghi chú rõ điều này |
| Khóa sửa khi `locked` | Trường JSON là **`locked`** (không phải `isLocked`). `isStructureEditable`: khung luôn sửa được; bản lớp chỉ ở `DRAFT`/`REJECTED` **và** `locked=false`. Khóa thì ẩn nút thêm/sửa/bỏ/lưu, vô hiệu hóa form, banner nêu lý do (chờ duyệt hay đã duyệt); xem câu hỏi ở chế độ chỉ đọc |
| `TOTAL_ONLY` | Banner "chỉ có điểm tổng nên không đo được CLO/PI" (`measurableByOutcome=false`) |
| Luồng trạng thái | Nháp, Đã gửi duyệt, Đã duyệt, Đã nhập điểm, Đã khóa; Bị từ chối quay về Nháp khi sửa. Mỗi trạng thái có chữ + biểu tượng + kiểu viền (`core/constants/assessment-display.constant.ts`). Bị từ chối hiện ghi chú nổi bật |
| Q11 | **Đã xác nhận** (ADR 0001 phương án A): bỏ dòng chú thích "đang chờ GVHD xác nhận (Q11)" của bản thiết kế (có test) |
| Dữ liệu thử nghiệm | Nhãn "DỮ LIỆU THỬ NGHIỆM" ở đầu các màn hình |

## 3. Route và màn hình

| Route | Component | Nội dung |
|---|---|---|
| `/mng/assessments/sections/:sectionId` | `ListAssessmentsComponent` (chế độ lớp) | Bài của lớp: tên, trạng thái, số câu, tổng điểm, cột "Cấu trúc" (Sửa được / Chờ Trưởng bộ môn duyệt / Đã khóa / ghi chú từ chối), liên kết Mở/Sửa/Xem/**Duyệt**; "Bài mới", "Tạo từ khung mẫu"; mục "Khung theo đề cương"; nhắc số bài chờ duyệt cho Trưởng bộ môn |
| `/mng/assessments/syllabi/:syllabusId` | `ListAssessmentsComponent` (chế độ khung) | Khung theo đề cương; "Khung mới". Liên kết từ trang đề cương ("Khung bài đánh giá") |
| (modal) | `AssessmentCreateModalComponent` | Mã, tên, loại, giai đoạn, ngày, tổng điểm, tỷ trọng, độ chi tiết, (bản lớp) khung để sao chép |
| `/mng/assessments/:id` | `DetailAssessmentComponent` | Thông tin bài; bảng câu hỏi/tiêu chí (CLO kèm phần điểm, Bloom, điểm tối đa, rubric); thêm/sửa/bỏ/đổi thứ tự trong bộ nhớ; Σ điểm tối đa so với tổng điểm; lịch sử; thanh dưới: Lưu cấu trúc, Gửi duyệt; cảnh báo rời trang khi chưa lưu (`canDeactivate` + `beforeunload`) |
| (modal) | `AssessmentItemModalComponent` | Một câu: mã, tiêu đề, loại (Câu hỏi/Tiêu chí), điểm tối đa, Bloom, chủ đề, mã Moodle, **bảng CLO + phần điểm** (tổng hiện "0,9 / 1"), rubric mức 1–4 |
| `/mng/assessments/:id/review` | `ReviewAssessmentComponent` | Màn Trưởng bộ môn: độ phủ theo CLO và Bloom (từ API), bảng từng phần tử, ghi chú từ chối (bắt buộc), lịch sử; thanh dưới: Từ chối, Duyệt (có hộp xác nhận) |

Cấu trúc được **sửa trong bộ nhớ** rồi ghi một lần bằng `PUT /assessments/{id}/items` (backend thay toàn bộ `items`); `orderIndex` được đánh lại 1..n theo vị trí. `id` của phần tử được giữ khi sửa. Lưu thông tin (`PUT /assessments/{id}`) tách riêng và không đụng vào bản làm việc của câu hỏi.

### Khác với bản thiết kế (có chủ đích)

- **Cặp CLO–PI → chỉ CLO** (API chỉ nhận `cloId` + `weight`; ADR 0011). Cột PI và nhãn "liên kết chưa duyệt" của thiết kế **chưa hiện** vì UI không có dữ liệu PI trong phản hồi bài; xem §8.
- Không có nút "Thêm từ ngân hàng câu hỏi" (US-13/14 ngoài phạm vi).
- Lịch sử chỉ hiện hành động/thời điểm/ghi chú, **không có tên người** (API chỉ trả `actorId`).
- Không có hàng đợi "bài chờ duyệt" riêng: Trưởng bộ môn đi từ lớp → bài (API chưa có truy vấn theo trạng thái).

## 4. Trạng thái màn hình và xử lý lỗi

| Tình huống | Hiển thị |
|---|---|
| Đang tải | "Đang tải bài đánh giá…" (`role=status`), bảng `nzLoading` |
| Rỗng | Lớp chưa có bài; bài chưa có câu; đề cương chưa có khung; độ phủ rỗng (đều có hướng dẫn việc kế tiếp theo vai trò) |
| Lỗi tải (404, mạng, 500) | `app-error-state` + Thử lại / quay lại |
| Hết quyền 403 | tải: `app-error-state` "Không đủ quyền"; thao tác: thanh dưới "Bạn không có quyền truy cập chức năng này" (không đăng xuất) |
| 400/422 khi lưu/gửi/duyệt | thanh dưới cùng hiện **nguyên văn** thông điệp backend (Σ phần điểm, CLO ngoài đề cương, sai thứ tự trạng thái, tổng điểm lệch...); giữ nguyên dữ liệu đang soạn |
| 409 (trùng mã; hai người cùng duyệt) | trùng mã: tại modal tạo; xung đột `revision`: banner kèm nút "Tải lại dữ liệu", không ghi đè im lặng |
| Khóa | banner nêu lý do + chế độ chỉ đọc |
| Lỗi tải độ phủ | báo riêng có nút thử lại, phần còn lại của màn duyệt vẫn dùng được |

Chống bấm đúp: bỏ qua lần gửi thứ hai khi đang tạo/lưu/gửi duyệt/duyệt/từ chối. Responsive: lưới `md:`, bảng `nzScroll.x`, thanh dưới `flex-wrap`. A11y: `label` cho mọi ô, `aria-label` cho nút theo hàng ("Sửa C1"), `role=alert` cho lỗi, thanh tỷ lệ có `aria-label` bằng chữ số, nhóm lọc dùng `aria-pressed`.

**Kiểm tra giao diện đã làm (2026-11-10):** chạy tạm Playwright + axe (API giả lập bằng `page.route`, dữ liệu giả; tệp kiểm thử tạm đã xóa, không đưa vào repo) trên các màn hình của tài liệu này ở rộng 1440, 820, 390 px. Kết quả: không còn vi phạm axe mức serious/critical thuộc mã mới sau khi sửa (liên kết bằng `nzType="link"` và nút `nzDanger` thiếu tương phản, `nz-select` thiếu nhãn, vùng cuộn không có phần tử focus được). Còn lại **không thuộc mã mới**: `aria-dialog-name` của `nz-modal-container` (thư viện ng-zorro không cho đặt tên hộp thoại; ảnh hưởng mọi modal của app), tương phản chữ ở header chung (`.user-name-label`, `.nav-text`) và header chung làm tràn ngang trang ở 390 px. Chưa có E2E cố định cho các màn hình này.

## 5. Tổ chức mã

```text
core/models/assessment/assessment.model.ts      <-- IAssessment, IAssessmentItem, IOutcomeMapping, IRubric, ICoverage...
core/services/assessment/assessment.service.ts  <-- 11 lệnh gọi theo AssessmentController
core/constants/assessment-display.constant.ts   <-- nhãn trạng thái/loại/Bloom (chỉ phân loại, không phải điểm)
mng/assessments/
  assessments.routes.ts   assessments.util.ts   <-- gợi ý phía client: Σ phần điểm, tổng điểm, khóa sửa, gợi ý gửi duyệt
  list-assessments/  assessment-create-modal/  detail-assessment/  assessment-item-modal/  review-assessment/
```

## 6. Thứ tự hiện thực

Core (model, service, hằng) → tiện ích thuần → danh sách + modal tạo → modal câu hỏi → chi tiết/soạn/gửi duyệt → màn duyệt. Mỗi bước lint + test + build.

## 7. Truy vết AC ↔ test

| AC | Kiểm bằng (spec › test) |
|---|---|
| US-15/AC-1 tạo bản lớp (tự soạn hoặc từ khung) | `assessment-create-modal.spec` › "tạo bản lớp gửi sectionId...", "tạo từ khung gửi templateId và không gửi items", "tạo khung gọi createTemplate"; `assessment.service.spec` › createSectionAssessment |
| US-15/AC-2 Σ phần điểm, CLO trùng, CLO ngoài đề cương | `assessment-item-modal.spec` › "0,5 + 0,5", "tổng 0,9", "tổng 1,01", "CLO khai báo hai lần", "phần điểm 0 hoặc > 1"; `assessments.util.spec` › weightSumMatches (biên 1,0001 / 1,00011 / 0,99995); `detail-assessment.spec` › "lỗi 422 của backend (tổng phần điểm)" |
| US-15/AC-4 ngoài phạm vi → 403 | `assessment-create-modal` › "403 ngoài phạm vi"; `list-assessments` › "chỉ giảng viên phụ trách lớp thấy nút tạo", VIEWER; `detail-assessment` › "chỉ đọc" cho VIEWER/ADMIN/PM |
| US-15/AC-5 khóa sửa khi `locked` | `detail-assessment` › "đã duyệt (locked=true)", "cờ locked=true khóa dù trạng thái là Nháp", "đang chờ duyệt", "lưu cấu trúc bị bỏ qua khi bài đã khóa"; `assessments.util.spec` › isStructureEditable, lockReason; `assessment-item-modal` › "bài đã khóa" |
| US-16/AC-1 rubric mức 1–4, điểm ≤ tối đa | `assessment-item-modal` › "chỉ lưu các mức có điểm", "điểm vượt (biên bằng thì được)", "mô tả mà thiếu điểm" |
| US-16/AC-2 Bloom ≠ rubric | `assessment-item-modal` › "mức Bloom và mức rubric là hai trường độc lập" |
| NEW-01/AC-1 gửi duyệt | `detail-assessment` › "đủ điều kiện: ... chuyển sang chờ duyệt"; `assessment.service.spec` › submit |
| NEW-01/AC-2 0 phần tử / tổng điểm lệch | `detail-assessment` › "bài chưa có câu nào", "tổng điểm khai báo lệch (12 và 10)", "chưa khai báo tổng điểm", "còn thay đổi chưa lưu", "422 do backend"; `assessments.util.spec` › submitHints, totalPointsMatches (biên 0,0009/0,0011) |
| NEW-01/AC-3 duyệt | `review-assessment.spec` › "xác nhận rồi duyệt: gọi approve, bài chuyển Đã duyệt" |
| NEW-01/AC-4 từ chối cần ghi chú | `review-assessment` › ghi chú trống, chỉ khoảng trắng, có ghi chú (cắt khoảng trắng), biên 1000/1001 ký tự; `assessment.service.spec` › reject |
| NEW-01/AC-5 sai vai trò / tự duyệt | `review-assessment` › giảng viên không thấy nút, "người gửi duyệt cũng là Trưởng bộ môn: nút bị khóa", 403 từ backend; `detail-assessment` › chỉ LECTURER thấy Gửi duyệt |
| NEW-01/AC-6 độ phủ khớp API | `review-assessment` › "hiện độ phủ ... đúng giá trị API", "không tự tính lại (12,5%)", Bloom chú thích, độ phủ rỗng, lỗi tải độ phủ |
| NEW-01/AC-7 sai thứ tự → 422 | `review-assessment` › "422 sai thứ tự trạng thái"; bài không `SUBMITTED` không còn nút (`isAwaitingReview`) |
| 409 xung đột | `detail-assessment`, `review-assessment` › "409 ... Tải lại dữ liệu" |
| Bỏ chú thích Q11 | `review-assessment` › "không còn dòng chú thích 'đang chờ GVHD xác nhận'" |
| Rời trang khi chưa lưu | `detail-assessment` › "rời trang khi còn thay đổi chưa lưu" |

## 8. Chỗ UI cần API bổ sung / lệch hợp đồng (đề xuất, chưa sửa backend)

1. **PI**: thiết kế canvas hiện cặp CLO–PI và trạng thái liên kết; API chỉ có CLO (ADR 0011). Nếu muốn hiện PI/trạng thái xác nhận, cần `AssessmentResponse` nhúng PI suy ra (hoặc UI gọi `GET /syllabi/{id}/clo-pi-matrix` kèm `programVersionId`, nhưng bài không biết `programVersionId`).
2. **Hàng đợi duyệt**: chưa có `GET /assessments?status=SUBMITTED` theo phạm vi Trưởng bộ môn; hiện phải đi từ lớp → bài.
3. **Tên người** trong `approval.history` (`submittedBy`, `actorId` chỉ là ID).
4. `coverageSummary.byClo[].cloCode` chỉ có ở `/coverage` (không có trong `AssessmentResponse`); UI tải thêm CLO của đề cương để hiện mã.
5. Tên trường khóa là **`locked`** (không phải `isLocked` như tài liệu/CSDL): `API-CONTRACT.md` đã ghi đúng.
6. `API-CONTRACT.md` §6.3/§6.4 cũ ghi đường dẫn không tồn tại (`/assessments/{id}/matrix`, `/course-sections/...`); đã thay bằng đường dẫn thật.

## 9. Để vấn đáp (4 câu hội đồng, Mục 6.2)

1. **Mã làm gì?** Khai báo cấu trúc bài đã thi (câu/tiêu chí, điểm tối đa, Bloom, CLO kèm phần điểm, rubric 1–4), gửi duyệt, và màn Trưởng bộ môn duyệt/từ chối ma trận dựa trên độ phủ do API tính.
2. **Vì sao có trong đề tài?** Đây là "bản đồ" quy điểm lên chuẩn đầu ra: không biết câu nào đo CLO nào với phần điểm bao nhiêu thì không đo được CLO/PI. Duyệt ma trận trước khi nhập điểm và khóa `items` sau đó để điểm gắn đúng cấu trúc đã duyệt.
3. **Tham số từ đâu?** Σ phần điểm = 1 (sai số 0,0001), tổng điểm khớp Σ điểm tối đa (0,001), rubric 1–4, Bloom 1–6, ghi chú từ chối ≤ 1000: từ backend (plan F04 §4, `AssessmentItemValidator`). UI chỉ sao chép để gợi ý, backend quyết định. Không thêm thư viện.
4. **Bỏ đi thì sao?** Mất cách khai báo ánh xạ câu → CLO; F05b/F06 không có cấu trúc để nhập điểm và quy lên CLO/PI. Bỏ khóa `locked` thì sửa `maxScore` sau khi có điểm làm sai kết quả. Bỏ gợi ý phía client thì người dùng chỉ biết lỗi sau khi bị backend từ chối 422.

# Kế hoạch Thiết kế & Hiện thực UI cho F04: Bài đánh giá & Khóa ma trận đề thi (OBE v0.7 / ADR 0014)

> **Tài liệu Kế hoạch Kỹ thuật UI Angular** (đồng bộ hoàn toàn với Backend v0.7 / ADR 0014).  
> **Dự án Frontend:** `LMS-UI` (Angular 21, TypeScript, Ng-Zorro-Antd, zoneless).  
> **Dự án Backend:** `LMS-API`, nguồn sự thật: `AssessmentController`, `AssessmentServiceImpl`, `AssessmentItemValidator`, và các DTO `Assessment*`, `OutcomeMappingDto`, `AssessmentCloWeightDto`, `CoverageResponse`.  
> **Căn cứ:** `LMS-API/doc/plan/F04-bai-danh-gia.md`, `ADR 0011` (câu hỏi chỉ gán CLO, PI suy ra), `ADR 0014` (bỏ Rubric, bỏ duyệt TBM, chuyển sang cơ chế khóa/mở khóa và `cloWeights`), `doc/API-CONTRACT.md` §6.3.  
> **Phạm vi:** US-15 (bài đánh giá khung/bản lớp), cấu hình `cloWeights` + `outcomeMappings[{cloId, maxScore}]`, khóa/mở khóa ma trận (`lock`/`unlock`).  
> **Đã loại bỏ (theo ADR 0014):** Rubric mức 1–4 (`IRubric`), quy trình nộp duyệt/duyệt/từ chối của Trưởng bộ môn (`DEPARTMENT_HEAD`, `submit`/`approve`/`reject`), `totalPoints`, `weightInCourse`, `dataGranularity` (`TOTAL_ONLY`).

---

## 1. Trách nhiệm và quyền (UI chỉ ẩn nút; backend quyết định)

| Hành động | Backend cho phép | UI hiện nút khi |
|---|---|---|
| Xem bài/khung, độ phủ | Đọc được lớp/đề cương (`ADMIN`, `PROGRAM_MANAGER`, `LECTURER` của lớp, `QA`) | Mọi vai trò được phép đọc |
| Soạn **khung** theo đề cương | `LECTURER` hoặc `PROGRAM_MANAGER` có quyền ghi học phần | `LECTURER` hoặc `PROGRAM_MANAGER` |
| Tạo/sửa/xóa **bản lớp**, **khóa/mở khóa** ma trận | Chỉ `LECTURER` của lớp (`canAccessSection`/`canAccessAssessment` WRITE) | `LECTURER` của lớp |

403/409/422 do backend trả đều được hiển thị nguyên văn (`API-CONTRACT.md` §3). Ẩn nút **không** thay cho kiểm tra của backend.

---

## 2. Bất biến nghiệp vụ hiển thị

| Bất biến | Hiện thực |
|---|---|
| UI **không tự tính** độ phủ | Hiển thị nguyên `byClo`/`byBloom` từ `GET /assessments/{id}/coverage`; thanh rộng = `percentage` API trả, chỉ kẹp 0–100 để vẽ |
| Thiếu dữ liệu ≠ 0 | Bài chưa có phần tử hoặc chưa cấu hình `cloWeights` hiện "—", độ phủ rỗng có giải thích, không hiện "0%" |
| Mức Bloom (1–6) | Bắt buộc chọn từ 1 đến 6 (1: Nhớ, 2: Hiểu, 3: Áp dụng, 4: Phân tích, 5: Đánh giá, 6: Sáng tạo) qua widget `app-level-label` |
| Ánh xạ câu hỏi chỉ có **CLO + `maxScore`** | Mỗi câu hỏi chọn ≥ 1 CLO của đề cương kèm `maxScore > 0` độc lập cho từng CLO (`outcomeMappings: [{ cloId, maxScore }]`), không trùng CLO. Một câu hỏi đo nhiều CLO sẽ sinh ra nhiều ô nhập điểm tương ứng ở F05b. PI **không** khai báo (suy ra từ liên kết CLO–PI, ADR 0011) |
| Bảng trọng số **`cloWeights`** | Mỗi bài đánh giá cấu hình danh sách `{ cloId, weight }` với $weight \in (0, 1]$. Tổng `weight` của cùng một CLO qua các bài đánh giá đã khóa trong lớp $\le 1.0$ (100%) |
| Khóa sửa khi `locked` | Trường JSON là **`locked`**. `isStructureEditable`: khung luôn sửa được; bản lớp chỉ sửa được khi `status === 'DRAFT'` và `locked === false`. Khi `LOCKED` hoặc `SCORE_ENTERED`, vô hiệu hóa form chỉnh sửa câu hỏi & `cloWeights`, hiện banner nêu rõ trạng thái |
| Luồng 3 trạng thái | `DRAFT` (Nháp - chỉnh sửa tự do) $\xrightarrow{\text{POST /lock}}$ `LOCKED` (Đã khóa ma trận - sẵn sàng nhập điểm; có thể `POST /unlock` để về `DRAFT`) $\xrightarrow{\text{F05b confirm}}$ `SCORE_ENTERED` (Đã nhập điểm - đóng băng vĩnh viễn) |

---

## 3. Route và màn hình

| Route | Component | Nội dung |
|---|---|---|
| `/mng/assessments/sections/:sectionId` | `ListAssessmentsComponent` (chế độ lớp) | Bài của lớp: mã, tên, loại, giai đoạn, trạng thái (`DRAFT` / `LOCKED` / `SCORE_ENTERED`), số câu hỏi, liên kết Mở/Sửa/Xem và nút dẫn tới màn nhập điểm (F05b) khi bài ở `LOCKED`/`SCORE_ENTERED`; "Bài mới", "Tạo từ khung mẫu"; mục "Khung theo đề cương" |
| `/mng/assessments/syllabi/:syllabusId` | `ListAssessmentsComponent` (chế độ khung) | Khung theo đề cương; "Khung mới". Liên kết từ trang đề cương ("Khung bài đánh giá") |
| (modal) | `AssessmentCreateModalComponent` | Mã, tên, loại (`QUIZ`, `PRACTICAL`, `PROJECT`, `MIDTERM`, `FINAL`, `OTHER`), giai đoạn (`FORMATIVE`, `MIDTERM`, `SUMMATIVE`), ngày thi, bảng cấu hình `cloWeights`, (bản lớp) chọn khung để sao chép |
| `/mng/assessments/:id` | `DetailAssessmentComponent` | Thông tin bài & cấu hình `cloWeights`; bảng câu hỏi (`code`, `orderIndex`, `bloomLevel`, danh sách `CLO - MaxScore`); thêm/sửa/bỏ/đổi thứ tự trong bộ nhớ rồi ghi qua `PUT /assessments/{id}/items`; khối tổng quan độ phủ (`GET .../coverage`); thanh hành động dưới cùng: **Lưu cấu trúc**, **Khóa ma trận (`lock`)**, **Mở khóa (`unlock`)** (khi `LOCKED`), **Xóa bài** (khi chưa `SCORE_ENTERED`); cảnh báo rời trang khi chưa lưu (`canDeactivate` + `beforeunload`) |
| (modal) | `AssessmentItemModalComponent` | Một câu: mã (`code`), mức Bloom (`1–6`), **bảng CLO + Điểm tối đa (`maxScore`)** |

Cấu trúc câu hỏi được **sửa trong bộ nhớ** rồi ghi một lần bằng `PUT /assessments/{id}/items` (backend thay toàn bộ `items`); `orderIndex` được đánh lại `1..n` theo vị trí. `id` của phần tử được giữ khi sửa. Lưu thông tin bài & `cloWeights` (`PUT /assessments/{id}`) tách riêng.

---

## 4. Trạng thái màn hình và xử lý lỗi

| Tình huống | Hiển thị |
|---|---|
| Đang tải | "Đang tải bài đánh giá…" (`role=status`), bảng `nzLoading` |
| Rỗng | Lớp chưa có bài; bài chưa có câu; đề cương chưa có khung; độ phủ rỗng (có hướng dẫn thao tác tiếp theo) |
| Lỗi tải (404, mạng, 500) | `app-error-state` + Thử lại / quay lại |
| Hết quyền 403 | Tải: `app-error-state` "Không đủ quyền"; thao tác: thanh dưới "Bạn không có quyền truy cập chức năng này" (không đăng xuất) |
| 400/422 khi lưu/khóa/mở khóa | Thanh dưới cùng hiện **nguyên văn** thông điệp backend (CLO ngoài đề cương, tổng trọng số CLO vượt 100%, thiếu câu hỏi khi khóa, đã nhập điểm không thể mở khóa...); giữ nguyên dữ liệu đang soạn |
| 409 (trùng mã; xung đột `revision`) | Trùng mã: tại modal tạo; xung đột `revision`: banner kèm nút "Tải lại dữ liệu", không ghi đè im lặng |
| Khóa (`LOCKED` / `SCORE_ENTERED`) | Banner nêu rõ trạng thái khóa + chế độ chỉ đọc; hiện nút "Mở khóa chỉnh sửa" nếu đang ở `LOCKED` và là `LECTURER` của lớp |

Chống bấm đúp: khóa nút trong lúc đang gọi API tạo/lưu/khóa/mở khóa/xóa.

---

## 5. Tổ chức mã & Kiểm thử

- `src/app/core/models/assessment/assessment.model.ts`: `AssessmentStatus = 'DRAFT' | 'LOCKED' | 'SCORE_ENTERED'`, `IAssessment`, `IAssessmentItem`, `IOutcomeMapping` (`{ cloId, maxScore }`), `IAssessmentCloWeight` (`{ cloId, weight }`), `ICoverage`.
- `src/app/core/services/assessment/assessment.service.ts`: `getTemplates`, `createTemplate`, `getSectionAssessments`, `createSectionAssessment`, `getAssessment`, `updateAssessment`, `replaceItems`, `getCoverage`, `lock`, `unlock`, `deleteAssessment`.
- Unit tests: Kiểm tra đầy đủ 3 trạng thái, bảng `cloWeights` $\le 1.0$, `outcomeMappings[{ cloId, maxScore }]`, ẩn/hiện nút theo 4 vai trò (`ADMIN`, `PROGRAM_MANAGER`, `LECTURER`, `QA`), không còn test/tham chiếu đến Rubric hay `DEPARTMENT_HEAD`.

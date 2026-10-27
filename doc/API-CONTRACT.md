# Hợp Đồng Giao Tiếp API (Frontend LMS-UI & Backend LMS-API)

Tài liệu này là hợp đồng kỹ thuật chính thức và duy nhất (Single Source of Truth) quy định chuẩn giao tiếp giữa hệ thống Frontend (`LMS-UI` - Angular 21) và Backend (`LMS-API` - Spring Boot 4 / Java 25). Mọi endpoint, định dạng dữ liệu, quy tắc xử lý mã lỗi và luồng tương tác đều phải tuân thủ nghiêm ngặt tài liệu này.

---

## 1. Quy Ước Chung (General Conventions)

### 1.1. Base URL & Tiền Tố API
- **Môi trường phát triển cục bộ (Local Development):** `http://localhost:8080`
- **Môi trường CI / Docker Staging:** `http://lms-api:8080`
- **Tiền tố định tuyến (Routing Prefix):**
  - Mọi API nghiệp vụ của hệ thống bắt buộc sử dụng tiền tố: `/api/v1`
  - Các endpoint kiểm tra sức khỏe và giám sát hệ thống (Actuator): `/actuator`

### 1.2. Định Dạng Ngày Giờ (Date & Time Format)
- Mọi trường dữ liệu thời gian gửi lên hoặc trả về đều tuân thủ chuẩn **ISO-8601 UTC**:
  - Cú pháp: `YYYY-MM-DDTHH:mm:ss.SSSZ` hoặc `YYYY-MM-DDTHH:mm:ssZ`
  - Ví dụ chuẩn: `2026-10-27T05:00:00Z`
- **Backend:** Sử dụng `java.time.Instant` và được Jackson chuyển đổi chuẩn xác.
- **Frontend:** Xử lý bằng kiểu `string` (hoặc Date đối tượng) và hiển thị theo múi giờ địa phương `Asia/Ho_Chi_Minh` (UTC+7) trên giao diện người dùng.

### 1.3. Định Dạng Khóa Định Danh (ObjectId Format)
- Mọi trường khóa định danh bản ghi (`_id` trong MongoDB hoặc tham chiếu khóa ngoại) là chuỗi thập lục phân gồm đúng **24 ký tự hex**:
  - Biểu thức chính quy (Regex): `^[0-9a-fA-F]{24}$`
  - Ví dụ: `671dcba5f123456789abcdef`
- Khi truyền `ObjectId` qua Path Variable (ví dụ `/api/v1/courses/{id}`) hoặc Query Param:
  - Nếu Frontend truyền chuỗi rỗng hoặc không đúng 24 ký tự hex, Backend sẽ lập tức từ chối với HTTP `400 Bad Request` và mã lỗi `VALIDATION_ERROR`.

### 1.4. Header Truy Vết Phân Tán (`X-Correlation-Id`)
- **Tên header HTTP:** `X-Correlation-Id`
- **Cơ chế hoạt động:**
  1. Frontend HTTP Interceptor có thể tự sinh một chuỗi UUID v4 gửi lên qua header `X-Correlation-Id` cho mỗi request.
  2. Nếu request không chứa header này, Backend `CorrelationIdFilter` sẽ tự động sinh mới một UUID v4.
  3. Giá trị `X-Correlation-Id` được đẩy vào SLF4J MDC (`correlationId`) để in trên từng dòng log server.
  4. Backend luôn trả về header `X-Correlation-Id` trong HTTP Response Header.
- **Ứng dụng trên Frontend:**
  - Khi xảy ra lỗi máy chủ (HTTP 500), Frontend đọc giá trị `X-Correlation-Id` từ response header để hiển thị trên thông báo lỗi (Toast/Modal), giúp người dùng dễ dàng cung cấp mã truy vết này cho đội ngũ kỹ thuật đối soát log.

---

## 2. Chuẩn Phản Hồi Lỗi Thống Nhất (US-40)

Toàn bộ các endpoint khi xảy ra lỗi (HTTP status >= 400) **bắt buộc** trả về định dạng JSON chuẩn mực sau đây, không ngoại lệ:

### 2.1. Cấu Trúc JSON Phản Hồi Lỗi
```json
{
  "timestamp": "2026-10-27T05:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu yêu cầu không hợp lệ",
  "path": "/api/v1/courses",
  "fieldErrors": [
    {
      "field": "code",
      "message": "Mã học phần không được để trống",
      "rejectedValue": ""
    }
  ]
}
```

### 2.2. Ý Nghĩa Các Trường Dữ Liệu
| Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| `timestamp` | String (ISO-8601 UTC) | Có | Thời điểm chính xác phát sinh lỗi tại máy chủ. |
| `status` | Integer | Có | Mã trạng thái HTTP chuẩn RFC (400, 401, 403, 404, 409, 422, 500). |
| `code` | String (Enum `ErrorCode`) | Có | Hằng số mã lỗi nghiệp vụ duy nhất, giúp Frontend rẽ nhánh xử lý. |
| `message` | String | Có | Thông điệp giải thích lỗi bằng tiếng Việt, an toàn, thân thiện với người dùng. |
| `path` | String | Có | Đường dẫn URI của endpoint gây ra lỗi (ví dụ: `/api/v1/courses`). |
| `fieldErrors` | Array of Object | Không | Danh sách lỗi chi tiết theo từng trường (chỉ xuất hiện khi có lỗi xác thực dữ liệu). |
| `fieldErrors[].field` | String | Có | Tên thuộc tính trong payload bị lỗi (ví dụ: `code`, `name`, `items[0].maxScore`). |
| `fieldErrors[].message` | String | Có | Lý do dữ liệu của trường đó bị từ chối. |
| `fieldErrors[].rejectedValue` | Any | Không | Giá trị đầu vào bị từ chối (đã được làm sạch, không lộ mật khẩu/token). |

---

## 3. Bảng Ánh Xạ Mã Lỗi & Hướng Dẫn Xử Lý UI (Status Mapping Table)

Frontend (`LMS-UI`) triển khai một `GlobalHttpInterceptor` để bắt các lỗi HTTP và điều hướng hành vi giao diện người dùng theo bảng chuẩn sau:

| HTTP Status | Enum `ErrorCode` | Nguyên nhân phía Backend | Cách thức Frontend (`LMS-UI`) xử lý giao diện |
|:---:|:---:|---|---|
| **400 Bad Request** | `VALIDATION_ERROR` | Lỗi kiểm tra dữ liệu đầu vào (Bean Validation thất bại, body rỗng/sai định dạng JSON, `ObjectId` ở path/param không đủ 24 ký tự hex). | - Nếu có mảng `fieldErrors`: Duyệt mảng và gán lỗi tương ứng vào các FormControl trong Reactive Form Angular; tô viền đỏ input và hiển thị dòng chữ cảnh báo lỗi ngay dưới ô nhập liệu.<br>- Nếu không có `fieldErrors`: Hiển thị Toast cảnh báo màu cam (Warning Toast) với nội dung từ `message`. |
| **401 Unauthorized** | `UNAUTHORIZED` | Yêu cầu không có JWT Bearer Token, token bị hết hạn, hoặc chữ ký token không hợp lệ. | - Xóa sạch token và thông tin người dùng khỏi LocalStorage / SessionStorage.<br>- Lưu lại URL hiện tại vào query param (ví dụ: `/login?returnUrl=/dashboard`).<br>- Chuyển hướng (Redirect) người dùng về trang đăng nhập `/login`.<br>- Bật Toast thông báo màu vàng: *"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."* |
| **403 Forbidden** | `FORBIDDEN` | Người dùng đã đăng nhập nhưng không có vai trò hoặc quyền hạn thực hiện hành động này (ví dụ Giảng viên cố duyệt ma trận đề thi vốn dành cho Trưởng bộ môn). | - Hiển thị Banner cảnh báo hoặc Modal: *"Bạn không có quyền truy cập chức năng này."*<br>- **Tuyệt đối không** chuyển hướng về trang đăng nhập (vì người dùng đã xác thực).<br>- Vô hiệu hóa hoặc ẩn các nút bấm thao tác tương ứng trên UI. |
| **404 Not Found** | `NOT_FOUND` | Không tìm thấy bản ghi/tài nguyên tương ứng với ID được yêu cầu trong CSDL. | - Hiển thị giao diện Empty State / Trang 404 con với thông báo *"Không tìm thấy dữ liệu yêu cầu"* kèm nút *"Quay lại trang danh sách"*.<br>- Hoặc hiển thị Toast thông báo cảnh báo màu vàng nếu xảy ra khi thực hiện hành động cụ thể. |
| **409 Conflict** | `CONFLICT` | Xung đột dữ liệu: Trùng khóa duy nhất (`DuplicateKeyException` - ví dụ mã học phần, mã sinh viên đã tồn tại) hoặc xung đột phiên bản cập nhật lạc quan (`OptimisticLockingFailureException` - `revision` bị lệch). | - Nếu trùng khóa duy nhất: Đánh dấu lỗi trùng lặp lên ô input tương ứng, yêu cầu người dùng đổi mã định danh khác.<br>- Nếu xung đột `revision`: Hiển thị Modal thông báo *"Dữ liệu này vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại dữ liệu mới nhất để tiếp tục"* kèm nút *"Tải lại dữ liệu"* (Reload). |
| **422 Unprocessable Entity** | `BUSINESS_RULE_VIOLATION` | Vi phạm quy tắc nghiệp vụ hoặc vi phạm schema validator của MongoDB (`$jsonSchema` mã 121 - ví dụ: tổng trọng số không bằng 100%, bài đánh giá đã khóa điểm không được sửa câu hỏi, `SCORE_UPDATE` thiếu lý do). | - Hiển thị Modal hoặc Toast màu đỏ cam giải thích rõ quy tắc nghiệp vụ bị vi phạm từ `message`.<br>- Giữ nguyên dữ liệu người dùng đã nhập trên form để người dùng có thể điều chỉnh lại cho đúng quy định mà không phải nhập lại từ đầu. |
| **500 Internal Server Error** | `INTERNAL_ERROR` | Lỗi hệ thống ngoài dự kiến phía Backend (Ngoại lệ không được bắt, lỗi kết nối mạng nội bộ...). Backend che giấu toàn bộ stack trace và chi tiết nội bộ. | - Hiển thị Toast thông báo lỗi nghiêm trọng màu đỏ (Error Toast): *"Đã xảy ra lỗi nội bộ hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên."*<br>- Hiển thị thêm dòng chữ phụ: *"Mã truy vết: [X-Correlation-Id]"* để người dùng có thể sao chép khi báo cáo sự cố kỹ thuật. |

---

## 4. Đặc Tả Endpoint Nền Tảng Bước 00 (US-39)

### 4.1. Health Check Endpoint
Kiểm tra tình trạng hoạt động của dịch vụ Backend và trạng thái kết nối tới cơ sở dữ liệu MongoDB Replica Set `rs0`.

- **Endpoint:** `GET /actuator/health`
- **Xác thực:** Công khai (`permitAll` - Không cần JWT token).
- **Phản hồi khi hệ thống bình thường (HTTP 200 OK):**
```json
{
  "status": "UP",
  "components": {
    "mongo": {
      "status": "UP",
      "details": {
        "version": "8.0.0"
      }
    },
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": 512000000000,
        "free": 256000000000,
        "threshold": 10485760,
        "path": "D:\\TLCN\\LMS-API\\.",
        "exists": true
      }
    },
    "ping": {
      "status": "UP"
    }
  }
}
```
- **Phản hồi khi mất kết nối CSDL hoặc gặp sự cố (HTTP 503 Service Unavailable):**
```json
{
  "status": "DOWN",
  "components": {
    "mongo": {
      "status": "DOWN",
      "details": {
        "error": "org.springframework.data.mongodb.CannotGetMongoDbConnectionException: Failed to obtain MongoDB connection"
      }
    },
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": 512000000000,
        "free": 256000000000,
        "threshold": 10485760,
        "path": "D:\\TLCN\\LMS-API\\.",
        "exists": true
      }
    },
    "ping": {
      "status": "UP"
    }
  }
}
```

### 4.2. Info Endpoint
Cung cấp thông tin phiên bản và môi trường ứng dụng.

- **Endpoint:** `GET /actuator/info`
- **Xác thực:** Công khai (`permitAll` - Không cần JWT token).
- **Phản hồi (HTTP 200 OK):**
```json
{
  "app": {
    "name": "LMS-API",
    "description": "Learning Outcomes Measurement System API",
    "version": "0.0.1-SNAPSHOT"
  }
}
```

---

## 5. Khung Mục Lục Endpoint Cho Các Bước Tiếp Theo (F01 - F08)

Các mục dưới đây giữ vai trò khung định hướng và sẽ được cập nhật chi tiết (Request/Response DTO, URL, query params) tương ứng qua từng bước phát triển của đề tài:

### 5.1. F01: Xác Thực & Quản Trị Người Dùng (Authentication & User Management)
- `POST /api/v1/auth/login` — Đăng nhập hệ thống, cấp phát JWT Access Token & Refresh Token.
- `POST /api/v1/auth/refresh` — Làm mới Access Token.
- `POST /api/v1/auth/logout` — Đăng xuất, vô hiệu hóa token.
- `GET /api/v1/users/me` — Lấy thông tin tài khoản và danh sách quyền hạn của người dùng đang đăng nhập.
- `GET /api/v1/users` — Danh sách người dùng (phân trang, lọc theo vai trò/khoa).
- `POST /api/v1/users` — Tạo mới tài khoản người dùng.
- `PUT /api/v1/users/{id}` — Cập nhật thông tin tài khoản.
- `DELETE /api/v1/users/{id}` — Vô hiệu hóa người dùng.

### 5.2. F02: Quản Lý Chương Trình Đào Tạo & Chuẩn Đầu Ra (Curriculum & PLO/PI Management)
- `GET /api/v1/programs` — Danh sách Chương trình đào tạo (CTĐT).
- `POST /api/v1/programs` — Thêm mới CTĐT.
- `GET /api/v1/programs/{id}/versions` — Danh sách các phiên bản áp dụng của CTĐT.
- `GET /api/v1/programs/{id}/plos` — Danh sách Chuẩn đầu ra cấp chương trình (PLO) và chỉ số hiệu năng (PI).
- `POST /api/v1/programs/{id}/plos` — Khởi tạo/cập nhật danh mục PLO và PI.
- `PUT /api/v1/programs/{id}/matrix` — Cấu hình ma trận quan hệ giữa các học phần và PLO/PI.

### 5.3. F03: Quản Lý Học Phần, Đề Cương & CLO (Course, Syllabus & CLO Management)
- `GET /api/v1/courses` — Danh sách học phần trong hệ thống.
- `POST /api/v1/courses` — Thêm mới thông tin học phần.
- `GET /api/v1/courses/{id}/syllabus` — Xem đề cương chi tiết học phần.
- `PUT /api/v1/courses/{id}/syllabus` — Cập nhật đề cương chi tiết.
- `GET /api/v1/courses/{id}/clos` — Danh sách Chuẩn đầu ra học phần (CLO) và mức độ thang đo Bloom.
- `POST /api/v1/courses/{id}/clos` — Thêm mới / cập nhật danh mục CLO.
- `PUT /api/v1/courses/{id}/clo-pi-mapping` — Ánh xạ giữa CLO của học phần và PI của CTĐT.

### 5.4. F04: Đề Thi, Ma Trận Đánh Giá & Rubric (Assessment, Question Matrix & Rubrics)
- `GET /api/v1/assessments` — Danh sách bài đánh giá (giữa kỳ, cuối kỳ, đồ án).
- `POST /api/v1/assessments` — Tạo bài đánh giá mới.
- `GET /api/v1/assessments/{id}/matrix` — Xem ma trận cấu trúc câu hỏi ánh xạ với CLO và thang đo Bloom.
- `PUT /api/v1/assessments/{id}/matrix` — Cập nhật ma trận cấu trúc câu hỏi.
- `POST /api/v1/assessments/{id}/submit` — Nộp ma trận đề thi để phê duyệt (`DRAFT` -> `SUBMITTED`).
- `POST /api/v1/assessments/{id}/approve` — Trưởng bộ môn phê duyệt ma trận (`SUBMITTED` -> `APPROVED`).
- `POST /api/v1/assessments/{id}/reject` — Trưởng bộ môn từ chối ma trận kèm lý do (`SUBMITTED` -> `REJECTED`).
- `GET /api/v1/rubrics` — Danh mục tiêu chí Rubric đánh giá năng lực.

### 5.5. F05: Quản Lý Học Kỳ, Lớp Học Phần & Nhập Điểm (Terms, Course Sections & Score Import)
- `GET /api/v1/terms` — Danh sách học kỳ năm học.
- `GET /api/v1/course-sections` — Danh sách lớp học phần theo học kỳ.
- `GET /api/v1/course-sections/{id}/roster` — Danh sách sinh viên thuộc lớp học phần.
- `POST /api/v1/course-sections/{id}/scores/import-preview` — Tải file Excel điểm sinh viên lên để xem trước kết quả parse và kiểm tra lỗi.
- `POST /api/v1/course-sections/{id}/scores/confirm` — Xác nhận lưu điểm sinh viên vào CSDL (yêu cầu transaction và ghi `audit_logs`).
- `PUT /api/v1/course-sections/{id}/scores/{studentId}` — Cập nhật điểm từng phần của sinh viên (bắt buộc nhập `reason`).
- `POST /api/v1/course-sections/{id}/scores/lock` — Khóa bảng điểm học phần sau khi hoàn tất.

### 5.6. F06: Tính Toán & Đo Lường Chuẩn Đầu Ra (Calculation & Outcome Measurement Engine)
- `POST /api/v1/calculations/run` — Khởi chạy tiến trình tính toán đo lường kết quả chuẩn đầu ra theo phạm vi (lớp học phần / toàn khóa).
- `GET /api/v1/calculations/{id}/status` — Kiểm tra tiến độ thực thi của tiến trình tính toán (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- `GET /api/v1/calculations/results/course-sections/{id}` — Lấy kết quả đo lường mức độ đạt chuẩn CLO/PI của một lớp học phần.
- `GET /api/v1/calculations/results/cohort/{cohortId}/program/{programId}` — Lấy kết quả đo lường chuẩn PLO của toàn bộ khóa sinh viên.

### 5.7. F07: Báo Cáo, Thống Kê & Phân Tích Chất Lượng (Reports, Analytics & Dashboards)
- `GET /api/v1/reports/dashboard-summary` — Tổng hợp số liệu KPI phục vụ màn hình Dashboard quản trị.
- `GET /api/v1/reports/clo-attainment` — Báo cáo thống kê phân bổ tỷ lệ sinh viên đạt từng CLO của học phần.
- `GET /api/v1/reports/plo-radar/{studentId}` — Biểu đồ mạng nhện (Radar Chart) thể hiện năng lực chuẩn đầu ra PLO của từng sinh viên.
- `GET /api/v1/reports/cohort-matrix` — Báo cáo ma trận tổng thể mức độ đạt chuẩn PLO của khóa học phục vụ kiểm định chất lượng (AUN-QA / ABET).
- `GET /api/v1/reports/export/excel` — Xuất báo cáo thống kê ra file định dạng Excel.
- `GET /api/v1/reports/export/pdf` — Xuất phiếu đánh giá chuẩn đầu ra định dạng PDF.

### 5.8. F08: Kế Hoạch Cải Tiến Chất Lượng Liên Tục (Continuous Quality Improvement - CQI)
- `GET /api/v1/cqi-plans` — Danh sách các kế hoạch hành động cải tiến chất lượng.
- `POST /api/v1/cqi-plans` — Tạo kế hoạch cải tiến mới cho những CLO/PLO có tỷ lệ đạt dưới ngưỡng kỳ vọng.
- `PUT /api/v1/cqi-plans/{id}` — Cập nhật tiến độ và kết quả thực hiện kế hoạch cải tiến.
- `GET /api/v1/cqi-plans/{id}/history` — Lịch sử theo dõi sự thay đổi chất lượng qua các chu kỳ đào tạo.

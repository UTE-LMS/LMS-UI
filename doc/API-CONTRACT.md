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
- Khi truyền `ObjectId` qua Path Variable (ví dụ `/api/v1/users/{id}`) hoặc Query Param:
  - Nếu Frontend truyền chuỗi rỗng hoặc không đúng 24 ký tự hex, Backend sẽ lập tức từ chối với HTTP `400 Bad Request` và mã lỗi `VALIDATION_ERROR`.

### 1.4. Header Truy Vết Phân Tán (`X-Correlation-Id`)
- **Tên header HTTP:** `X-Correlation-Id`
- **Cơ chế hoạt động:**
  1. Frontend HTTP Interceptor có thể tự sinh một chuỗi UUID v4 gửi lên qua header `X-Correlation-Id` cho mỗi request.
  2. Nếu request không chứa header này, Backend `CorrelationIdFilter` sẽ tự động sinh mới một UUID v4.
  3. Giá trị `X-Correlation-Id` được đẩy vào SLF4J MDC (`correlationId`) để in trên từng dòng log server.
  4. Backend luôn trả về header `X-Correlation-Id` trong HTTP Response Header (thông qua `Access-Control-Expose-Headers: X-Correlation-Id`).
- **Ứng dụng trên Frontend:**
  - Khi xảy ra lỗi máy chủ (HTTP 500), Frontend đọc giá trị `X-Correlation-Id` từ response header để hiển thị trên thông báo lỗi (Toast/Modal), giúp người dùng dễ dàng cung cấp mã truy vết này cho đội ngũ kỹ thuật đối soát log.

### 1.5. Header Xác Thực (`Authorization`)
- **Tên header HTTP:** `Authorization`
- **Cú pháp:** `Bearer <JWT_ACCESS_TOKEN>`
- **Đặc tả Token:**
  - Định dạng: JSON Web Token (JWT) ký bằng thuật toán HS256, thời gian sống mặc định (TTL) là 60 phút.
  - Token payload chứa định danh người dùng (`sub`) và phiên bản token (`tokenVersion`).
  - Quyền hạn và vai trò **không** nhúng cứng trong token mà được nạp động từ CSDL mỗi request và đóng gói trong `UserPrincipal`.
- **Yêu cầu:** Mọi endpoint nghiệp vụ (ngoại trừ các endpoint permitAll: `/api/v1/auth/login`, `/actuator/health/**`, `/actuator/info`, và preflight OPTIONS) bắt buộc phải đính kèm header này. Nếu thiếu hoặc không hợp lệ, Backend sẽ từ chối với HTTP `401 Unauthorized`.

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
  "path": "/api/v1/users",
  "fieldErrors": [
    {
      "field": "username",
      "message": "Tên đăng nhập phải có ít nhất 3 ký tự",
      "rejectedValue": "ad"
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
| `path` | String | Có | Đường dẫn URI của endpoint gây ra lỗi (ví dụ: `/api/v1/users`). |
| `fieldErrors` | Array of Object | Không | Danh sách lỗi chi tiết theo từng trường (chỉ xuất hiện khi có lỗi xác thực dữ liệu). |
| `fieldErrors[].field` | String | Có | Tên thuộc tính trong payload bị lỗi (ví dụ: `username`, `page`, `size`, `email`). |
| `fieldErrors[].message` | String | Có | Lý do dữ liệu của trường đó bị từ chối. |
| `fieldErrors[].rejectedValue` | Any | Không | Giá trị đầu vào bị từ chối (đã được làm sạch, không lộ mật khẩu/token). |

---

## 3. Bảng Ánh Xạ Mã Lỗi & Hướng Dẫn Xử Lý UI (Status Mapping Table)

Frontend (`LMS-UI`) triển khai một `GlobalHttpInterceptor` để bắt các lỗi HTTP và điều hướng hành vi giao diện người dùng theo bảng chuẩn sau:

| HTTP Status | Enum `ErrorCode` | Nguyên nhân phía Backend | Cách thức Frontend (`LMS-UI`) xử lý giao diện |
|:---:|:---:|---|---|
| **400 Bad Request** | `VALIDATION_ERROR` | Lỗi kiểm tra dữ liệu đầu vào (Bean Validation thất bại, body rỗng/sai JSON, `ObjectId` ở path/param không đủ 24 ký tự hex, phân trang `page < 0`, `size < 1` hoặc `size > 100`). | - Nếu có mảng `fieldErrors`: Duyệt mảng và gán lỗi tương ứng vào các FormControl trong Reactive Form Angular; tô viền đỏ input và hiển thị dòng chữ cảnh báo lỗi ngay dưới ô nhập liệu.<br>- Nếu không có `fieldErrors`: Hiển thị Toast cảnh báo màu cam (Warning Toast) với nội dung từ `message`. |
| **401 Unauthorized** | `UNAUTHORIZED` | **1. Trường hợp chung:** Yêu cầu gọi API nghiệp vụ không có JWT Bearer Token, token bị hết hạn, tokenVersion không khớp hoặc chữ ký token không hợp lệ.<br><br>**2. Trường hợp ngoại lệ đặc biệt (§3):** Mã 401 phát sinh từ `POST /api/v1/auth/login` (do sai tài khoản/mật khẩu hoặc tài khoản bị khóa `LOCKED`). | - **Xử lý cho trường hợp chung:**<br>  + Xóa sạch token và thông tin người dùng khỏi LocalStorage / SessionStorage.<br>  + Lưu lại URL hiện tại vào query param (ví dụ: `/login?returnUrl=/dashboard`).<br>  + Chuyển hướng (Redirect) người dùng về trang đăng nhập `/login`.<br>  + Bật Toast thông báo màu vàng: *"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."*<br><br>- **Xử lý cho ngoại lệ `POST /api/v1/auth/login`:**<br>  + **Tuyệt đối KHÔNG** kích hoạt luồng tự động xóa token và chuyển hướng của Interceptor.<br>  + Chuyển tiếp lỗi trực tiếp về Form Đăng nhập Angular để hiển thị câu thông báo lỗi màu đỏ ngay tại giao diện đăng nhập (lấy từ trường `message` của response: *"Tên đăng nhập hoặc mật khẩu không chính xác"*). |
| **403 Forbidden** | `FORBIDDEN` | Người dùng đã đăng nhập nhưng không có vai trò hoặc quyền hạn thực hiện hành động này (ví dụ: Giảng viên gọi API quản lý người dùng `/api/v1/users/**`, hoặc thao tác ngoài phạm vi lớp học được phân công). | - Hiển thị Banner cảnh báo hoặc Modal: *"Bạn không có quyền truy cập chức năng này."*<br>- **Tuyệt đối không** chuyển hướng về trang đăng nhập (vì người dùng đã xác thực).<br>- Vô hiệu hóa hoặc ẩn các nút bấm thao tác tương ứng trên UI. |
| **404 Not Found** | `NOT_FOUND` | Không tìm thấy bản ghi/tài nguyên tương ứng với ID được yêu cầu trong CSDL (ví dụ: `GET /api/v1/users/{id}` với ID không tồn tại). | - Hiển thị giao diện Empty State / Trang 404 con với thông báo *"Không tìm thấy dữ liệu yêu cầu"* kèm nút *"Quay lại trang danh sách"*.<br>- Hoặc hiển thị Toast thông báo cảnh báo màu vàng nếu xảy ra khi thực hiện hành động cụ thể. |
| **409 Conflict** | `CONFLICT` | Xung đột dữ liệu duy nhất: Trùng `username` hoặc `email` khi tạo mới người dùng (`DuplicateKeyException`), hoặc xung đột phiên bản cập nhật lạc quan (`OptimisticLockingFailureException`). | - Nếu trùng khóa duy nhất: Đánh dấu lỗi trùng lặp lên ô input tương ứng (ví dụ trường `username` hoặc `email`), hiển thị thông báo lỗi ngay dưới ô nhập liệu.<br>- Nếu xung đột `revision`: Hiển thị Modal thông báo *"Dữ liệu này vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại dữ liệu mới nhất để tiếp tục"* kèm nút *"Tải lại dữ liệu"* (Reload). |
| **422 Unprocessable Entity** | `BUSINESS_RULE_VIOLATION` | Vi phạm quy tắc nghiệp vụ hệ thống:<br>- Quản trị viên tự khóa chính mình hoặc tự gỡ vai trò `ADMIN` của chính mình.<br>- Thao tác làm mất tài khoản `ADMIN` ở trạng thái `ACTIVE` duy nhất còn lại trong hệ thống.<br>- Phân quyền `scope` chứa `programIds`, `courseIds` hoặc `sectionIds` không tồn tại trong CSDL. | - Hiển thị Modal hoặc Toast màu đỏ cam giải thích rõ quy tắc nghiệp vụ bị vi phạm từ trường `message`.<br>- Giữ nguyên dữ liệu người dùng đã nhập trên form để người dùng có thể điều chỉnh lại cho đúng quy định mà không phải nhập lại từ đầu. |
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

## 5. Đặc Tả Chi Tiết Endpoint F01: Xác Thực & Quản Trị Người Dùng (US-01, US-02, US-03)

### 5.1. Khuôn Dạng Phân Trang Chuẩn Hệ Thống (Standard Pagination Envelope)
Áp dụng thống nhất cho toàn bộ các API danh sách có phân trang trong hệ thống (bắt đầu từ `GET /api/v1/users`).

#### 5.1.1. Tham số truy vấn (Query Parameters)
| Tham số | Kiểu dữ liệu | Mặc định | Giới hạn hợp lệ | Mô tả |
|---|---|---|---|---|
| `page` | Integer | `0` | `>= 0` (zero-indexed) | Số thứ tự trang bắt đầu từ 0. |
| `size` | Integer | `20` | `1 <= size <= 100` | Số lượng phần tử tối đa trên một trang (mặc định 20, tối đa 100). |

#### 5.1.2. Quy tắc kiểm tra tính hợp lệ tham số phân trang
Nếu client gửi giá trị ngoài biên (`page < 0`, `size < 1` hoặc `size > 100`), Backend từ chối ngay lập tức với **HTTP 400 Bad Request**, mã lỗi `VALIDATION_ERROR`, kèm mảng `fieldErrors`:
```json
{
  "timestamp": "2026-10-27T05:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu yêu cầu không hợp lệ",
  "path": "/api/v1/users",
  "fieldErrors": [
    {
      "field": "size",
      "message": "Kích thước trang (size) phải nằm trong khoảng từ 1 đến 100",
      "rejectedValue": 105
    }
  ]
}
```

#### 5.1.3. Cấu trúc Envelope JSON Phản Hồi Phân Trang Chuẩn
```json
{
  "content": [ ... ],
  "page": 0,
  "size": 20,
  "totalElements": 45,
  "totalPages": 3,
  "last": false
}
```
| Tên trường | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `content` | Array | Mảng chứa danh sách đối tượng dữ liệu trong trang hiện tại. |
| `page` | Integer | Chỉ số trang hiện tại (0-indexed). |
| `size` | Integer | Kích thước trang thực tế được áp dụng. |
| `totalElements` | Long | Tổng số lượng bản ghi thỏa mãn điều kiện trong CSDL. |
| `totalPages` | Integer | Tổng số trang (`ceil(totalElements / size)`). Khi `totalElements = 0` thì `totalPages = 0`. |
| `last` | Boolean | `true` nếu đây là trang cuối cùng (hoặc danh sách rỗng); `false` nếu vẫn còn trang tiếp theo. |

---

### 5.2. Nhóm API Xác Thực (US-01: Authentication)

#### 5.2.1. Đăng nhập hệ thống (`POST /api/v1/auth/login`)
Tiếp nhận thông tin tài khoản, xác thực mật khẩu băm BCrypt, cấp phát JWT Access Token và ghi nhận nhật ký kiểm toán `audit_logs` với thao tác `LOGIN`.

- **Endpoint:** `POST /api/v1/auth/login`
- **Xác thực:** Công khai (`permitAll`).
- **Lưu ý bảo mật:**
  - `BearerTokenResolver` bỏ qua kiểm tra token trên endpoint này. Nếu client vô tình gửi kèm Bearer token cũ đã hết hạn trên header `Authorization`, request đăng nhập vẫn được xử lý bình thường.
  - Khi `username` không tồn tại, Backend vẫn thực hiện kiểm tra mật khẩu với một hash giả định (dummy hash) để chống tấn công phân tích thời gian thực thi (Timing Attack).
- **Request Headers:**
  - `Content-Type: application/json`
  - `X-Correlation-Id`: (Tùy chọn) UUID v4
- **Request Body (LoginRequest):**
```json
{
  "username": "admin",
  "password": "Password123!"
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `username` | String | Có | Tối thiểu 3 ký tự, tự động trim và lowercase. |
| `password` | String | Có | Độ dài từ 8 đến 72 bytes UTF-8 theo chính sách mật khẩu. |

- **Phản hồi thành công (HTTP 200 OK - LoginResponse):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "671dcba5f123456789abcdef",
    "username": "admin",
    "email": "admin@hcmute.edu.vn",
    "fullName": "Quản Trị Viên Hệ Thống",
    "status": "ACTIVE",
    "roleAssignments": [
      {
        "role": "ADMIN",
        "scope": null
      }
    ]
  }
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 400 Bad Request (`VALIDATION_ERROR`):** Thiếu username/password hoặc độ dài password không hợp lệ (nhỏ hơn 8 byte hoặc vượt quá 72 byte UTF-8).
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Sai tên đăng nhập, sai mật khẩu, hoặc tài khoản ở trạng thái `LOCKED`. Cả ba trường hợp đều trả về cùng một thông điệp chung: *"Tên đăng nhập hoặc mật khẩu không chính xác"*.
    - *Lưu ý xử lý UI:* Hiển thị thông báo ngay tại form đăng nhập; không kích hoạt luồng tự động redirect/xóa token của HTTP Interceptor.

---

#### 5.2.2. Đăng xuất hệ thống (`POST /api/v1/auth/logout`)
Đăng xuất người dùng hiện tại khỏi phiên làm việc.

- **Endpoint:** `POST /api/v1/auth/logout`
- **Xác thực:** Bắt buộc (`Authorization: Bearer <token>`).
- **Cơ chế hoạt động:** Backend gọi interface `UserRepositoryCustom.incrementTokenVersion(userId)` để tăng nguyên tử `tokenVersion` trong MongoDB. Việc này lập tức vô hiệu hóa toàn bộ các JWT Access Token đã được cấp trước đó trên mọi thiết bị và trình duyệt.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Request Body:** Không có (Body rỗng).
- **Phản hồi thành công (HTTP 200 OK):**
```json
{
  "message": "Đăng xuất thành công"
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Không có Bearer token, token hết hạn, chữ ký không hợp lệ, hoặc `tokenVersion` không khớp.

---

#### 5.2.3. Lấy thông tin tài khoản cá nhân (`GET /api/v1/auth/me`)
Lấy thông tin tài khoản và danh sách quyền hạn gắn với phạm vi của người dùng đang đăng nhập.

- **Endpoint:** `GET /api/v1/auth/me`
- **Xác thực:** Bắt buộc (`Authorization: Bearer <token>`).
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Request Body:** Không có.
- **Phản hồi thành công (HTTP 200 OK - UserProfileResponse):**
```json
{
  "id": "671dcba5f123456789abcdef",
  "username": "admin",
  "email": "admin@hcmute.edu.vn",
  "fullName": "Quản Trị Viên Hệ Thống",
  "status": "ACTIVE",
  "roleAssignments": [
    {
      "role": "ADMIN",
      "scope": null
    }
  ]
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Token không hợp lệ hoặc tài khoản đã bị khóa.

---

### 5.3. Nhóm API Quản Trị Người Dùng (US-02: User Management)

> **Phân quyền truy cập:** Toàn bộ các API quản lý người dùng (`/api/v1/users/**`) chỉ dành riêng cho tài khoản có vai trò `ADMIN`. Người dùng có vai trò khác gọi vào sẽ nhận HTTP `403 Forbidden`.

#### 5.3.1. Danh sách người dùng có phân trang (`GET /api/v1/users`)
Lấy danh sách tài khoản người dùng theo khuôn dạng phân trang chuẩn hệ thống.

- **Endpoint:** `GET /api/v1/users`
- **Xác thực:** Bắt buộc (`Authorization: Bearer <token>`). Vai trò: `ADMIN`.
- **Query Parameters:**
  - `page`: Integer, zero-indexed, mặc định `0`, yêu cầu `page >= 0`.
  - `size`: Integer, mặc định `20`, tối đa `100`, yêu cầu `1 <= size <= 100`.
  - *(Lưu ý: Không hỗ trợ bộ lọc theo vai trò hay khoa; chỉ tiếp nhận tham số phân trang `page` và `size`)*.
- **Phản hồi thành công (HTTP 200 OK - PageResponse<UserResponse>):**
```json
{
  "content": [
    {
      "id": "671dcba5f123456789abcdef",
      "username": "admin",
      "email": "admin@hcmute.edu.vn",
      "fullName": "Quản Trị Viên Hệ Thống",
      "status": "ACTIVE",
      "roleAssignments": [
        {
          "role": "ADMIN",
          "scope": null
        }
      ],
      "createdAt": "2026-10-27T05:00:00Z",
      "updatedAt": "2026-10-27T05:00:00Z"
    },
    {
      "id": "671dcba5f123456789abcde0",
      "username": "gv_nguyenvana",
      "email": "nguyenvana@hcmute.edu.vn",
      "fullName": "Nguyễn Văn A",
      "status": "ACTIVE",
      "roleAssignments": [
        {
          "role": "LECTURER",
          "scope": {
            "programIds": [],
            "courseIds": ["671dcba5f123456789abcd01"],
            "sectionIds": ["671dcba5f123456789abcd02"]
          }
        }
      ],
      "createdAt": "2026-10-27T06:00:00Z",
      "updatedAt": "2026-10-27T06:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1,
  "last": true
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 400 Bad Request (`VALIDATION_ERROR`):** `page < 0`, `size < 1` hoặc `size > 100`.
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Chưa xác thực.
  - **HTTP 403 Forbidden (`FORBIDDEN`):** Người dùng không có vai trò `ADMIN`.

---

#### 5.3.2. Tạo mới tài khoản người dùng (`POST /api/v1/users`)
Quản trị viên tạo mới tài khoản người dùng và gán vai trò cùng phạm vi phụ trách.

- **Endpoint:** `POST /api/v1/users`
- **Xác thực:** Bắt buộc (`Authorization: Bearer <token>`). Vai trò: `ADMIN`.
- **Request Body (CreateUserRequest):**
```json
{
  "username": "gv_tranthib",
  "email": "tranthib@hcmute.edu.vn",
  "password": "Password123!",
  "fullName": "Trần Thị B",
  "roleAssignments": [
    {
      "role": "LECTURER",
      "scope": {
        "programIds": [],
        "courseIds": ["671dcba5f123456789abcd01"],
        "sectionIds": ["671dcba5f123456789abcd02"]
      }
    }
  ]
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc nghiệp vụ |
|---|---|---|---|
| `username` | String | Có | Tối thiểu 3 ký tự, trim, lowercase, bất biến sau khi tạo. |
| `email` | String | Có | Định dạng email RFC 5322 regex, trim, lowercase. |
| `password` | String | Có | Độ dài từ 8 đến 72 bytes UTF-8 (đo qua `PasswordPolicyValidator`). Chỉ lưu băm BCrypt; không lưu mật khẩu gốc. |
| `fullName` | String | Có | Họ và tên hiển thị của người dùng. |
| `roleAssignments` | Array | Có | Tối thiểu 1 phần tử. Mỗi phần tử chứa `role` (enum) và `scope` (Object hoặc `null`). |
| `roleAssignments[].role` | String | Có | Một trong 7 giá trị: `ADMIN`, `PROGRAM_MANAGER`, `DEPARTMENT_HEAD`, `QA_OFFICER`, `LECTURER`, `STUDENT`, `VIEWER`. |
| `roleAssignments[].scope` | Object | Không | Gồm 3 mảng `programIds`, `courseIds`, `sectionIds` hoặc `null`. |

- **Phản hồi thành công (HTTP 201 Created - UserResponse):**
```json
{
  "id": "671dcba5f123456789abcde1",
  "username": "gv_tranthib",
  "email": "tranthib@hcmute.edu.vn",
  "fullName": "Trần Thị B",
  "status": "ACTIVE",
  "roleAssignments": [
    {
      "role": "LECTURER",
      "scope": {
        "programIds": [],
        "courseIds": ["671dcba5f123456789abcd01"],
        "sectionIds": ["671dcba5f123456789abcd02"]
      }
    }
  ],
  "createdAt": "2026-10-27T07:00:00Z",
  "updatedAt": "2026-10-27T07:00:00Z"
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 400 Bad Request (`VALIDATION_ERROR`):** Vi phạm validation dữ liệu đầu vào hoặc độ dài password không hợp lệ theo byte UTF-8.
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Chưa xác thực.
  - **HTTP 403 Forbidden (`FORBIDDEN`):** Không phải `ADMIN`.
  - **HTTP 409 Conflict (`CONFLICT`):** `username` hoặc `email` đã tồn tại trong hệ thống.
  - **HTTP 422 Unprocessable Entity (`BUSINESS_RULE_VIOLATION`):** `scope` chứa `programIds`, `courseIds` hoặc `sectionIds` không tồn tại trong CSDL.

---

#### 5.3.3. Xem chi tiết người dùng (`GET /api/v1/users/{id}`)
- **Endpoint:** `GET /api/v1/users/{id}`
- **Xác thực:** Bắt buộc (`Authorization: Bearer <token>`). Vai trò: `ADMIN`.
- **Path Variable:** `id` — Chuỗi 24 ký tự hex (ObjectId).
- **Phản hồi thành công (HTTP 200 OK - UserResponse):**
```json
{
  "id": "671dcba5f123456789abcde1",
  "username": "gv_tranthib",
  "email": "tranthib@hcmute.edu.vn",
  "fullName": "Trần Thị B",
  "status": "ACTIVE",
  "roleAssignments": [
    {
      "role": "LECTURER",
      "scope": {
        "programIds": [],
        "courseIds": ["671dcba5f123456789abcd01"],
        "sectionIds": ["671dcba5f123456789abcd02"]
      }
    }
  ],
  "createdAt": "2026-10-27T07:00:00Z",
  "updatedAt": "2026-10-27T07:00:00Z"
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 400 Bad Request (`VALIDATION_ERROR`):** `id` không đúng định dạng 24 ký tự hex.
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Chưa xác thực.
  - **HTTP 403 Forbidden (`FORBIDDEN`):** Không phải `ADMIN`.
  - **HTTP 404 Not Found (`NOT_FOUND`):** Không tìm thấy người dùng với `id` tương ứng.

---

#### 5.3.4. Cập nhật thông tin tài khoản người dùng (`PUT /api/v1/users/{id}`)
Cập nhật họ tên, email hoặc danh sách phân quyền của người dùng.

- **Endpoint:** `PUT /api/v1/users/{id}`
- **Xác thực:** Bắt buộc (`Authorization: Bearer <token>`). Vai trò: `ADMIN`.
- **Path Variable:** `id` — Chuỗi 24 ký tự hex (ObjectId).
- **Quy tắc bất biến & Bảo mật:**
  - `username` là bất biến (không cho phép sửa).
  - Không cập nhật mật khẩu qua endpoint này.
  - Cập nhật vai trò/phạm vi có hiệu lực ngay lập tức ở request kế tiếp của người dùng đó (quyền được nạp từ CSDL mỗi request).
- **Request Body (UpdateUserRequest):**
```json
{
  "email": "tranthib_new@hcmute.edu.vn",
  "fullName": "Trần Thị B (Cập nhật)",
  "roleAssignments": [
    {
      "role": "LECTURER",
      "scope": {
        "programIds": [],
        "courseIds": ["671dcba5f123456789abcd01"],
        "sectionIds": ["671dcba5f123456789abcd02", "671dcba5f123456789abcd03"]
      }
    }
  ]
}
```
- **Phản hồi thành công (HTTP 200 OK - UserResponse):**
```json
{
  "id": "671dcba5f123456789abcde1",
  "username": "gv_tranthib",
  "email": "tranthib_new@hcmute.edu.vn",
  "fullName": "Trần Thị B (Cập nhật)",
  "status": "ACTIVE",
  "roleAssignments": [
    {
      "role": "LECTURER",
      "scope": {
        "programIds": [],
        "courseIds": ["671dcba5f123456789abcd01"],
        "sectionIds": ["671dcba5f123456789abcd02", "671dcba5f123456789abcd03"]
      }
    }
  ],
  "createdAt": "2026-10-27T07:00:00Z",
  "updatedAt": "2026-10-27T07:15:00Z"
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 400 Bad Request (`VALIDATION_ERROR`):** Định dạng ID hoặc email không hợp lệ.
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Chưa xác thực.
  - **HTTP 403 Forbidden (`FORBIDDEN`):** Không phải `ADMIN`.
  - **HTTP 404 Not Found (`NOT_FOUND`):** Không tìm thấy người dùng.
  - **HTTP 409 Conflict (`CONFLICT`):** Email mới bị trùng lặp với người dùng khác.
  - **HTTP 422 Unprocessable Entity (`BUSINESS_RULE_VIOLATION`):**
    - ADMIN tự gỡ bỏ vai trò `ADMIN` của chính mình.
    - Thao tác gỡ bỏ vai trò `ADMIN` của tài khoản `ADMIN` ở trạng thái `ACTIVE` duy nhất còn lại trong hệ thống.
    - `scope` chứa mã định danh không tồn tại trong CSDL.

---

#### 5.3.5. Cập nhật trạng thái Khóa / Mở khóa tài khoản (`PUT /api/v1/users/{id}/status`)
Khóa hoặc mở khóa tài khoản người dùng.

- **Endpoint:** `PUT /api/v1/users/{id}/status`
- **Xác thực:** Bắt buộc (`Authorization: Bearer <token>`). Vai trò: `ADMIN`.
- **Path Variable:** `id` — Chuỗi 24 ký tự hex (ObjectId).
- **Cơ chế nghiệp vụ đặc biệt khi Khóa (`LOCKED`):**
  - Khi chuyển trạng thái sang `LOCKED`, hệ thống cập nhật `status = LOCKED` và đồng thời gọi `UserRepositoryCustom.incrementTokenVersion(userId)` để tăng nguyên tử `tokenVersion`. Việc này đảm bảo vô hiệu hóa vĩnh viễn mọi token cũ của người dùng này; ngay cả khi tài khoản được mở khóa lại sau đó (`ACTIVE`), các token cũ được cấp trước thời điểm khóa vẫn vĩnh viễn bị từ chối với HTTP 401.
- **Request Body (UpdateUserStatusRequest):**
```json
{
  "status": "LOCKED"
}
```
| Trường | Kiểu | Bắt buộc | Giá trị hợp lệ |
|---|---|---|---|
| `status` | String | Có | `"ACTIVE"` hoặc `"LOCKED"` |

- **Phản hồi thành công (HTTP 200 OK - UserResponse):**
```json
{
  "id": "671dcba5f123456789abcde1",
  "username": "gv_tranthib",
  "email": "tranthib_new@hcmute.edu.vn",
  "fullName": "Trần Thị B (Cập nhật)",
  "status": "LOCKED",
  "roleAssignments": [ ... ],
  "createdAt": "2026-10-27T07:00:00Z",
  "updatedAt": "2026-10-27T07:30:00Z"
}
```
- **Phản hồi lỗi thường gặp:**
  - **HTTP 400 Bad Request (`VALIDATION_ERROR`):** Trạng thái không hợp lệ.
  - **HTTP 401 Unauthorized (`UNAUTHORIZED`):** Chưa xác thực.
  - **HTTP 403 Forbidden (`FORBIDDEN`):** Không phải `ADMIN`.
  - **HTTP 404 Not Found (`NOT_FOUND`):** Không tìm thấy người dùng.
  - **HTTP 422 Unprocessable Entity (`BUSINESS_RULE_VIOLATION`):**
    - ADMIN tự khóa tài khoản của chính mình.
    - Khóa tài khoản `ADMIN` ở trạng thái `ACTIVE` duy nhất còn lại trong hệ thống.

---

### 5.4. Khung Định Hướng Phân Quyền Theo Phạm Vi (US-03)
Backend kiểm tra quyền hạn của người dùng trên từng tài nguyên theo cặp `(vai trò, phạm vi)` và phân định hành vi `READ` / `WRITE` theo ma trận [ĐỀ XUẤT, chờ Q08]:
- **Nguyên tắc nạp quyền động:** Quyền hạn được nạp từ CSDL mỗi request và đóng gói trong `UserPrincipal` (trong package `dto`). Thay đổi vai trò hoặc phạm vi trên CSDL lập tức có hiệu lực ở request tiếp theo mà không cần cấp lại token.
- **Nguyên tắc hợp quyền (UNION):** Người dùng có nhiều `roleAssignments` sẽ nhận quyền hạn là phép hợp (UNION) của tất cả các assignment.
- **Quy ước phạm vi rỗng (Empty Scope):** Scope rỗng là khi `scope == null` HOẶC cả ba mảng `programIds`, `courseIds`, `sectionIds` đều rỗng hoặc null (`{ programIds: [], courseIds: [], sectionIds: [] }`).
  - `ADMIN`: Toàn quyền hệ thống (READ & WRITE).
  - `VIEWER`: Toàn quyền đọc toàn hệ thống (READ only). Nếu VIEWER có chứa ID trong scope thì chỉ đọc trong phạm vi đó. Nếu VIEWER chỉ có `programIds` thì bị từ chối 403 (không được coi là scope rỗng).
  - Các vai trò nghiệp vụ khác: Scope rỗng bị từ chối truy cập (fail-closed, HTTP 403). Riêng `LECTURER`, nếu tài khoản có tên trong `CourseSection.lecturerIds` của lớp học phần thì vẫn được cấp quyền thao tác trên lớp đó (miễn là user vẫn giữ vai trò LECTURER).

---

### 5.5. Nhóm API Nhật Ký Thao Tác (US-04: Audit Logs)

Chỉ đọc. Quyền: **`ADMIN`** (vai trò khác → 403, chưa đăng nhập → 401).

#### `GET /api/v1/audit-logs`

Danh sách nhật ký có phân trang chuẩn (§5.1), **mới nhất trước**. Mọi tham số đều tùy chọn và kết hợp bằng AND.

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `action` | Enum `AuditAction` | `SCORE_UPDATE`, `IMPORT_CONFIRM`, `ASSESSMENT_APPROVE`, `ASSESSMENT_REJECT`, `RUN_CALCULATION`, `RULE_CONFIRM`, `LOGIN` |
| `entity` | String (≤ 64) | Tên collection của thực thể bị tác động, ví dụ `users`, `scores` |
| `entityId` | String (≤ 64) | ID thực thể bị tác động |
| `userId` | ObjectId (24 hex) | Người thực hiện |
| `from`, `to` | ISO-8601 UTC, ví dụ `2026-11-01T00:00:00Z` | Khoảng thời gian, **bao gồm** hai đầu mút; `from` không được sau `to` |
| `page`, `size` | Integer | Như §5.1 (mặc định `0`/`20`, `size` 1..100) |

Phản hồi `200`:
```json
{
  "content": [
    {
      "id": "6728c0f2a1b2c3d4e5f60718",
      "at": "2026-11-03T08:15:30Z",
      "userId": "6728b9e1a1b2c3d4e5f60001",
      "action": "LOGIN",
      "entity": { "collection": "users", "id": "6728b9e1a1b2c3d4e5f60001" },
      "before": null,
      "after": null,
      "reason": null,
      "ip": "203.0.113.7"
    }
  ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1, "last": true
}
```
- `userId` có thể `null` nếu hành động không gắn với người dùng đã xác thực. `before`/`after` là object hoặc `null`; trường nhạy cảm (mật khẩu, token, secret...) luôn hiển thị là `"[PROTECTED]"`. `reason` bắt buộc có với `SCORE_UPDATE`.
- Lỗi `400 VALIDATION_ERROR`: `page`/`size` ngoài biên, `action` không thuộc danh sách, `userId` sai định dạng, `from`/`to` sai định dạng ISO-8601, hoặc `from` sau `to`.

---

## 6. Khung Mục Lục Endpoint Cho Các Bước Tiếp Theo (F02 - F08)

Các mục dưới đây giữ vai trò khung định hướng và sẽ được cập nhật chi tiết (Request/Response DTO, URL, query params) tương ứng qua từng bước phát triển của đề tài. **Đã có đặc tả chi tiết:** §6.2 (F03: học phần, đề cương, CLO, liên kết CLO–PI) và §6.4.1 (học kỳ, US-18); các mục còn lại vẫn là khung chưa hiện thực:

### 6.1. F02: Quản Lý Chương Trình Đào Tạo & Chuẩn Đầu Ra (Curriculum & PLO/PI Management)
- `GET /api/v1/programs` — Danh sách Chương trình đào tạo (CTĐT).
- `POST /api/v1/programs` — Thêm mới CTĐT.
- `GET /api/v1/programs/{id}/versions` — Danh sách các phiên bản áp dụng của CTĐT.
- `GET /api/v1/programs/{id}/plos` — Danh sách Chuẩn đầu ra cấp chương trình (PLO) và chỉ số hiệu năng (PI).
- `POST /api/v1/programs/{id}/plos` — Khởi tạo/cập nhật danh mục PLO và PI.
- `PUT /api/v1/programs/{id}/matrix` — Cấu hình ma trận quan hệ giữa các học phần và PLO/PI.

### 6.2. F03: Quản Lý Học Phần, Đề Cương & CLO (Course, Syllabus & CLO Management) — US-09, US-10, US-11, US-12

> **Trạng thái:** Các endpoint dưới đây **đã hiện thực** ở backend (nguồn: `CourseController`, `ProgramCourseController`, `SyllabusController`, `CloController`, `CloPiLinkController`, `doc/plan/F03-hoc-phan-clo.md`). Các đường dẫn cũ trong bản khung (`/courses/{id}/syllabus`, `/courses/{id}/clos`, `PUT /courses/{id}/clo-pi-mapping`) **không tồn tại** và đã bị gỡ bỏ: đề cương là tài nguyên riêng theo phiên bản (`/syllabi/...`), CLO thuộc một đề cương (không thuộc trực tiếp học phần), liên kết CLO–PI là tài nguyên riêng (`/clo-pi-links/...`).
>
> Quản lý học kỳ (`/api/v1/terms`, US-18) được đặc tả ở **§6.4.1**; đề cương tham chiếu học kỳ qua `effectiveFromTermId` / `effectiveToTermId`.

#### 6.2.1. Quy ước chung của nhóm F03

**Bảng phân quyền theo endpoint.** Đọc = mọi vai trò đã xác thực (`isAuthenticated()`, kể cả `STUDENT`, `VIEWER`). Ghi = `ADMIN`, `PROGRAM_MANAGER`. Vai trò khác ghi → `403 FORBIDDEN`; chưa đăng nhập → `401`.

| Endpoint | Vai trò được phép | Kiểm tra phạm vi (`scope`) cho `PROGRAM_MANAGER` |
|---|---|---|
| `GET` mọi endpoint ở §6.2 | Mọi vai trò đã xác thực | Không kiểm tra (không có `403` theo scope khi đọc) |
| `POST /courses`, `PUT /courses/{id}` | `ADMIN`, `PROGRAM_MANAGER` | Không kiểm tra theo code hiện tại (cần xác nhận với backend) |
| `DELETE /courses/{id}` | **Chỉ `ADMIN`** | Không áp dụng |
| `POST/PUT/DELETE /program-versions/{pvId}/courses[...]` | `ADMIN`; `PROGRAM_MANAGER` nếu phiên bản `pvId` thuộc CTĐT nằm trong `scope.programIds` | **Đã có** (`canAccessProgramVersion`, WRITE). Ngoài phạm vi → `403` |
| `POST /courses/{courseId}/syllabi` | `ADMIN`; `PROGRAM_MANAGER` | (ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge) `canAccessCourse` |
| `PUT /syllabi/{id}/status` | `ADMIN`; `PROGRAM_MANAGER` | (ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge) `canAccessSyllabus` |
| `POST /syllabi/{syllabusId}/clos` | `ADMIN`; `PROGRAM_MANAGER` | (ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge) `canAccessSyllabus` |
| `PUT/DELETE /clos/{id}` | `ADMIN`; `PROGRAM_MANAGER` | (ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge) `canAccessClo` |
| `POST /syllabi/{syllabusId}/clo-pi-links` | `ADMIN`; `PROGRAM_MANAGER` nếu `programVersionId` **trong body** thuộc CTĐT nằm trong `scope.programIds` | **Đã có** (`canAccessProgramVersion`, WRITE) |
| `DELETE /clo-pi-links/{id}` | `ADMIN`; `PROGRAM_MANAGER` | (ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge) `canAccessCloPiLink` (suy theo `programVersionId` của liên kết) |
| `PUT /clo-pi-links/{id}/verification` | **Chỉ `QA_OFFICER`** (`ADMIN` **không** được phép, không có phân cấp vai trò) | **Đã có**: `scope.programIds` của QA phải chứa CTĐT của phiên bản chứa liên kết, ngược lại `403` |

**Hành vi kiểm tra phạm vi của `PROGRAM_MANAGER` (ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge).** Áp dụng cho các dòng ghi chú "(ADR 0009)" ở bảng trên. Học phần không có `programVersionId` riêng nên phạm vi được suy ra qua `program_courses`:
- `ADMIN` luôn được phép.
- `PROGRAM_MANAGER` chỉ được ghi khi học phần thuộc **ít nhất một** phiên bản CTĐT mà CTĐT đó nằm trong `scope.programIds` của mình (phép HỢP trên mọi `program_courses` chứa học phần). Chỉ `scope.programIds` được dùng; `scope.courseIds` / `scope.sectionIds` không có tác dụng ở nhóm endpoint này.
- Học phần **chưa gán vào CTĐT nào** (hoặc không tồn tại) → chỉ `ADMIN` được ghi; `PROGRAM_MANAGER` nhận `403` (fail-closed), kể cả khi tài nguyên không tồn tại (khi đó `PROGRAM_MANAGER` nhận `403` thay vì `404`).
- Vi phạm → `403 FORBIDDEN`, `message`: *"Bạn không có quyền thực hiện thao tác này"*.
- Ghi nhận trạng thái: hàm `canAccessCourse` / `canAccessSyllabus` / `canAccessClo` / `canAccessCloPiLink` **đã có trong mã nguồn worktree backend F03 nhưng chưa commit/merge**; UI vẫn phải xử lý `403` này như một kết quả hợp lệ trước khi backend phát hành.

**Gợi ý xử lý lỗi cho UI (bám bảng §3).**

| Mã | Khi nào gặp ở F03 | Gợi ý xử lý UI |
|---|---|---|
| `400 VALIDATION_ERROR` | Sai định dạng body/ObjectId/query (`bloomLevel` ngoài 1–6, `code` CLO sai mẫu, `weight` ngoài (0, 1], `measurement.*` ngoài [0, 1], thiếu `programVersionId` ở query ma trận, giá trị enum không hợp lệ...) | Gán lỗi vào FormControl theo `fieldErrors[].field` (với trường lồng nhau là `measurement.defaultWeight`, `measurement.defaultPassThreshold`). Body sai JSON hoặc enum sai giá trị: **không có** `fieldErrors`, chỉ hiện Toast với `message` |
| `403 FORBIDDEN` | Sai vai trò, hoặc `PROGRAM_MANAGER` / `QA_OFFICER` ngoài phạm vi CTĐT | Banner/Toast "Bạn không có quyền...", không điều hướng về `/login`; ẩn/vô hiệu nút ghi theo vai trò, nhưng **không thể suy ra trước** việc ngoài phạm vi nên vẫn phải xử lý `403` sau khi gọi |
| `404 NOT_FOUND` | `courseId`, `syllabusId`, `cloId`, `piId`, `programVersionId` (ở body liên kết và query ma trận), link, term không tồn tại | Empty State / Toast; với tài nguyên vừa bị xóa thì tải lại danh sách |
| `409 CONFLICT` | Trùng `code` học phần; trùng `(courseId, version)` đề cương; trùng `(syllabusId, code)` CLO; trùng `(cloId, piId)` liên kết; học phần đã gán vào phiên bản CTĐT; trùng `code` học kỳ | Đánh dấu lỗi ngay ô nhập tương ứng (`code`, `version`...) bằng `message`; giữ nguyên dữ liệu đã nhập |
| `422 BUSINESS_RULE_VIOLATION` | Vi phạm quy tắc nghiệp vụ: đề cương `CONFIRMED` không sửa CLO; chuyển trạng thái sai chiều; xóa học phần/CLO/học kỳ đang được tham chiếu; PI không thuộc phiên bản CTĐT; ... | Modal/Toast hiển thị nguyên văn `message`; giữ dữ liệu form; với đề cương `CONFIRMED` nên vô hiệu hóa nút sửa/xóa/thêm CLO ngay từ trạng thái đã tải và gợi ý tạo phiên bản đề cương mới |

> **Lưu ý về `message` 422:** một số lỗi 422 có tiền tố tên quy tắc trong `message` dưới dạng `[TÊN_QUY_TẮC] ...` (ví dụ `[COURSE_IN_USE]`, `[COURSE_NOT_FOUND]`, `[PROGRAM_VERSION_NOT_FOUND]`, `[PREREQUISITE_SELF_REFERENCE]`, `[PREREQUISITE_NOT_FOUND]`, `[PREVIOUS_COURSE_SELF_REFERENCE]`, `[PREVIOUS_COURSE_NOT_FOUND]`, `[PREREQUISITE_AND_PREVIOUS_CONFLICT]`). Đây chỉ là tiền tố trong chuỗi `message`; `code` luôn là `BUSINESS_RULE_VIOLATION` và **không có trường riêng** cho tên quy tắc. UI chỉ hiển thị `message`, không rẽ nhánh logic dựa trên chuỗi.

**Quy ước dữ liệu chung.**
- Danh sách học phần có phân trang theo §5.1. Các danh sách khác của F03 (`program-versions/{pvId}/courses`, `courses/{courseId}/syllabi`, `syllabi/{id}/clos`, `syllabi/{id}/clo-pi-links`, `terms`) trả **mảng JSON thuần**, không có envelope phân trang.
- Mọi `*Id` là ObjectId 24 ký tự hex (§1.3). Sai định dạng ở path/query → `400` kèm `fieldErrors` theo tên tham số; sai định dạng ở body → `400` kèm `fieldErrors` theo tên trường.
- Trường `null` luôn được trả về tường minh (không bị lược bỏ).
- Đối tượng `verification` (xuất hiện ở đề cương, CLO, liên kết CLO–PI): `{ "status": "UNVERIFIED" | "VERIFIED" | "NEEDS_CLARIFICATION", "verifiedBy": ObjectId | null, "verifiedAt": ISO-8601 | null, "note": String | null }`. Khi tạo mới, `status = UNVERIFIED` và 3 trường còn lại là `null`.
- Dữ liệu trong các ví dụ dưới đây là **minh họa định dạng**, không phải nội dung đề cương/CLO/PI thật và không phải số liệu đo lường. Nội dung CLO thật phải lấy từ đề cương gốc đã được Khoa duyệt.

---

#### 6.2.2. Học phần (US-09)

**Đối tượng `CourseResponse`:**
```json
{
  "id": "6728d100a1b2c3d4e5f60001",
  "code": "DEMO101",
  "name": "Học phần thử nghiệm [DỮ LIỆU THỬ NGHIỆM]",
  "credits": 3,
  "extra": null
}
```

##### `GET /api/v1/courses`
Danh sách học phần phân trang (§5.1), sắp xếp theo `code` tăng dần. Quyền: mọi vai trò đã xác thực.

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `page`, `size` | Integer | Như §5.1 (mặc định `0` / `20`, `size` 1..100). Ngoài biên → `400 VALIDATION_ERROR` |
| `search` | String (tùy chọn) | Lọc theo `name` **hoặc** `code`, chứa chuỗi con, không phân biệt hoa thường. Chuỗi rỗng/chỉ khoảng trắng = không lọc |

Phản hồi `200`: `PageResponse<CourseResponse>` (`content`, `page`, `size`, `totalElements`, `totalPages`, `last`).

##### `GET /api/v1/courses/{id}`
Chi tiết một học phần. Quyền: mọi vai trò đã xác thực. Phản hồi `200`: `CourseResponse`. Lỗi: `400` (ID sai định dạng), `404` (không tồn tại).

##### `POST /api/v1/courses`
Tạo học phần. Quyền: `ADMIN`, `PROGRAM_MANAGER`.
```json
{ "code": "DEMO101", "name": "Học phần thử nghiệm [DỮ LIỆU THỬ NGHIỆM]", "credits": 3, "extra": null }
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `code` | String | Có | Tối đa 64 ký tự; chỉ chữ cái, chữ số, `_`, `-`, `.` (`^[A-Za-z0-9_.-]+$`); được trim; duy nhất toàn hệ thống |
| `name` | String | Có | Không rỗng, tối đa 255 ký tự; được trim |
| `credits` | Integer | Không | `>= 0` |
| `extra` | Object | Không | Dữ liệu mở rộng tự do |

- `201 Created`: `CourseResponse`.
- Lỗi: `400` (vi phạm ràng buộc trên), `403` (không đủ vai trò), `409 CONFLICT` (trùng `code`, `message`: *"Mã học phần đã tồn tại: DEMO101"*).

##### `PUT /api/v1/courses/{id}`
Cập nhật học phần (thay thế toàn bộ các trường cho phép sửa). `code` **bất biến** (không có trong body). Quyền: `ADMIN`, `PROGRAM_MANAGER`.
```json
{ "name": "Tên học phần cập nhật", "credits": 4, "extra": null }
```
- Ràng buộc: `name` bắt buộc (không rỗng, ≤ 255), `credits` `>= 0` hoặc `null`, `extra` tùy chọn. Trường không gửi/`null` sẽ **ghi đè thành `null`** (`credits`, `extra`) — UI luôn gửi đầy đủ giá trị hiện tại.
- `200 OK`: `CourseResponse`. Lỗi: `400`, `403`, `404`.

##### `DELETE /api/v1/courses/{id}`
Xóa học phần. Quyền: **chỉ `ADMIN`**.
- `204 No Content`.
- Lỗi: `404`; `422 BUSINESS_RULE_VIOLATION` khi học phần đang được gán vào CTĐT (`[COURSE_IN_USE] Không thể xóa học phần đang được gán vào chương trình đào tạo: ...`) hoặc đang được tham chiếu trong ma trận đóng góp PI (`[COURSE_IN_USE] Không thể xóa học phần đang được tham chiếu trong ma trận đóng góp PI: ...`). UI gợi ý gỡ học phần khỏi CTĐT trước.

---

#### 6.2.3. Học phần trong phiên bản CTĐT — `program_courses` (US-09)

Tài nguyên con của một phiên bản CTĐT: `/api/v1/program-versions/{programVersionId}/courses`. Một học phần chỉ được gán một lần vào mỗi phiên bản.

**Enum:** `type` ∈ `COMPULSORY` | `ELECTIVE`; `category` ∈ `FOUNDATION` | `MAJOR_FOUNDATION` | `SPECIALIZED` | `CAPSTONE_PROJECT` | `THESIS`.

**Đối tượng `ProgramCourseResponse`:**
```json
{
  "id": "6728d200a1b2c3d4e5f60011",
  "programVersionId": "6728d0b0a1b2c3d4e5f60101",
  "courseId": "6728d100a1b2c3d4e5f60001",
  "course": { "id": "6728d100a1b2c3d4e5f60001", "code": "DEMO101", "name": "Học phần thử nghiệm [DỮ LIỆU THỬ NGHIỆM]", "credits": 3, "extra": null },
  "semester": 1,
  "credits": 3,
  "type": "COMPULSORY",
  "category": "FOUNDATION",
  "prerequisiteCourseIds": [],
  "previousCourseIds": []
}
```
`course` có thể là `null` nếu học phần tham chiếu không còn tồn tại (dữ liệu lệch); UI nên hiển thị fallback theo `courseId`.

##### `GET /api/v1/program-versions/{programVersionId}/courses`
Danh sách học phần của phiên bản, sắp xếp theo `semester` tăng dần rồi `courseId`. Quyền: mọi vai trò đã xác thực. Phản hồi `200`: mảng `ProgramCourseResponse` (không phân trang).
- Lỗi: `400` (ID sai định dạng); **`422`** (không phải `404`) khi phiên bản không tồn tại: `[PROGRAM_VERSION_NOT_FOUND] Phiên bản chương trình đào tạo không tồn tại: ...`.

##### `GET /api/v1/program-versions/{programVersionId}/courses/{courseId}`
Một bản ghi gán. Phản hồi `200`: `ProgramCourseResponse`. Lỗi: `400`, `404` (học phần chưa được gán vào phiên bản này), `422` (phiên bản không tồn tại, như trên).

##### `POST /api/v1/program-versions/{programVersionId}/courses`
Gán học phần vào phiên bản. Quyền: `ADMIN`; `PROGRAM_MANAGER` có phiên bản trong `scope.programIds` (**đã có**).
```json
{
  "courseId": "6728d100a1b2c3d4e5f60001",
  "semester": 1,
  "credits": 3,
  "type": "COMPULSORY",
  "category": "FOUNDATION",
  "prerequisiteCourseIds": [],
  "previousCourseIds": []
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `courseId` | ObjectId | Có | Phải là học phần đã tồn tại |
| `semester` | Integer | Không | `>= 1` (học kỳ dự kiến trong chương trình) |
| `credits` | Integer | Không | `>= 0`; nếu bỏ trống, backend lấy `credits` của học phần |
| `type` | Enum | **Có** | `COMPULSORY` hoặc `ELECTIVE` |
| `category` | Enum | Không | Một trong 5 giá trị trên |
| `prerequisiteCourseIds` | Array ObjectId | Không | Mặc định `[]`; mỗi phần tử là học phần tồn tại, không phải chính học phần; tự loại trùng |
| `previousCourseIds` | Array ObjectId | Không | Như trên (học phần học trước) |

- `201 Created`: `ProgramCourseResponse`.
- Lỗi: `400`; `403` (ngoài phạm vi/không đủ vai trò); `409 CONFLICT` (*"Học phần đã được gán vào phiên bản chương trình đào tạo: ..."*); `422` khi: phiên bản không tồn tại (`[PROGRAM_VERSION_NOT_FOUND]`), học phần `courseId` không tồn tại (`[COURSE_NOT_FOUND]`), tiên quyết/học trước là chính nó (`[PREREQUISITE_SELF_REFERENCE]`, `[PREVIOUS_COURSE_SELF_REFERENCE]`), không tồn tại (`[PREREQUISITE_NOT_FOUND]`, `[PREVIOUS_COURSE_NOT_FOUND]`), hoặc cùng một học phần nằm đồng thời ở cả hai danh sách (`[PREREQUISITE_AND_PREVIOUS_CONFLICT]`).

##### `PUT /api/v1/program-versions/{programVersionId}/courses/{courseId}`
Cập nhật bản ghi gán (`courseId` và `programVersionId` bất biến). Body như `POST` nhưng **không có `courseId`**; `type` vẫn bắt buộc. Thay thế toàn bộ: trường không gửi sẽ thành `null` / `[]` (kể cả `credits`, không tự lấy lại từ học phần như khi `POST`) — UI luôn gửi đầy đủ.
- `200 OK`: `ProgramCourseResponse`. Quyền như `POST`.
- Lỗi: `400`, `403`, `404` (chưa được gán), `422` (các quy tắc tiên quyết/học trước như trên).

##### `DELETE /api/v1/program-versions/{programVersionId}/courses/{courseId}`
Gỡ học phần khỏi phiên bản. Quyền như `POST`. `204 No Content`. Lỗi: `403`, `404` (chưa được gán), `422` (phiên bản không tồn tại).

---

#### 6.2.4. Đề cương theo phiên bản — Syllabi (US-10)

Mỗi học phần có nhiều đề cương, định danh bởi `(courseId, version)`. Đề cương mới luôn ở trạng thái `DRAFT`. **Không có endpoint sửa nội dung đề cương** (`version`, học kỳ hiệu lực) sau khi tạo; chỉ có chuyển trạng thái. Sửa đề cương đã `CONFIRMED` = tạo phiên bản mới (`version` mới).

**Enum `SyllabusStatus`:** `DRAFT` → `CONFIRMED` → `ARCHIVED`.

**Đối tượng `SyllabusResponse`:**
```json
{
  "id": "6728d300a1b2c3d4e5f60021",
  "courseId": "6728d100a1b2c3d4e5f60001",
  "version": "2026.1",
  "effectiveFromTermId": "6728d0a0a1b2c3d4e5f60201",
  "effectiveToTermId": null,
  "status": "DRAFT",
  "verification": { "status": "UNVERIFIED", "verifiedBy": null, "verifiedAt": null, "note": null },
  "extra": null
}
```

##### `GET /api/v1/courses/{courseId}/syllabi`
Danh sách đề cương của học phần, sắp xếp theo `version` tăng dần (so sánh chuỗi). Quyền: mọi vai trò đã xác thực. Phản hồi `200`: mảng `SyllabusResponse` (rỗng nếu chưa có). Lỗi: `400`, `404` (học phần không tồn tại).

##### `POST /api/v1/courses/{courseId}/syllabi`
Tạo đề cương mới ở trạng thái `DRAFT`. Quyền: `ADMIN`, `PROGRAM_MANAGER` (+ phạm vi — ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge).
```json
{ "version": "2026.1", "effectiveFromTermId": "6728d0a0a1b2c3d4e5f60201", "effectiveToTermId": null, "extra": null }
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `version` | String | Có | Không rỗng; được trim; duy nhất trong cùng học phần |
| `effectiveFromTermId` | ObjectId | Không | Phải là học kỳ tồn tại. Không gửi chuỗi rỗng — gửi `null` hoặc bỏ trường |
| `effectiveToTermId` | ObjectId | Không | Như trên; `null` = chưa kết thúc hiệu lực |
| `extra` | Object | Không | Dữ liệu mở rộng tự do |

- `201 Created`: `SyllabusResponse` (`status = DRAFT`).
- Lỗi: `400`; `403`; `404` (học phần hoặc học kỳ `effective*TermId` không tồn tại); `409 CONFLICT` (trùng `(courseId, version)`); `422` khi `effectiveToTermId` trước `effectiveFromTermId` (*"effectiveToTermId không được trước effectiveFromTermId"*; cùng một học kỳ là hợp lệ; so sánh theo `startDate`, nếu thiếu thì `endDate`, nếu thiếu nữa thì `academicYear`).

##### `GET /api/v1/syllabi/{id}`
Chi tiết đề cương. Quyền: mọi vai trò đã xác thực. Phản hồi `200`: `SyllabusResponse`. Lỗi: `400`, `404`.

##### `PUT /api/v1/syllabi/{id}/status`
Chuyển trạng thái đề cương, **một chiều**. Quyền: `ADMIN`, `PROGRAM_MANAGER` (+ phạm vi — ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge).
```json
{ "status": "CONFIRMED" }
```
| Trạng thái hiện tại | Chuyển sang | Kết quả |
|---|---|---|
| `DRAFT` | `CONFIRMED` | `200` |
| `CONFIRMED` | `ARCHIVED` | `200` |
| Trùng trạng thái hiện tại | (không đổi) | `200`, trả về đề cương không thay đổi (idempotent) |
| Mọi chuyển khác (`DRAFT→ARCHIVED`, quay lui như `CONFIRMED→DRAFT`, `ARCHIVED→...`) | | `422` *"Không thể chuyển trạng thái đề cương từ [X] sang [Y]"* |

- `status` bắt buộc; giá trị ngoài enum → `400` (không có `fieldErrors`).
- Lỗi khác: `403`, `404`. Phản hồi `200`: `SyllabusResponse`.
- Hệ quả: đề cương `CONFIRMED` không cho thêm/sửa/xóa CLO (xem §6.2.5). Hiện **không có API** đổi `verification` của đề cương (chỉ đọc).

---

#### 6.2.5. CLO của đề cương (US-11)

CLO thuộc đúng một đề cương. `code` chỉ duy nhất **trong một đề cương** (`CLO1` của hai đề cương khác nhau là hai CLO khác nhau); UI nhận diện CLO bằng `id`, không bằng `code`.

**Đối tượng `CloResponse`:**
```json
{
  "id": "6728d400a1b2c3d4e5f60031",
  "syllabusId": "6728d300a1b2c3d4e5f60021",
  "courseId": "6728d100a1b2c3d4e5f60001",
  "code": "CLO1",
  "contentOriginal": "",
  "bloomLevel": 2,
  "bloomNote": null,
  "measurement": null,
  "verification": { "status": "UNVERIFIED", "verifiedBy": null, "verifiedAt": null, "note": null },
  "extra": null
}
```
- `contentOriginal`: nội dung gốc theo đề cương; backend lưu chuỗi rỗng `""` khi không gửi. UI **không** tự điền nội dung CLO; để trống tới khi đối chiếu đề cương gốc.
- `bloomLevel`: mức Bloom 1–6, **không phải điểm số**.
- `measurement`: `null` cho tới khi Khoa xác nhận tỷ trọng/ngưỡng. Khi có: `{ "defaultWeight": Double | null, "defaultPassThreshold": Double | null }`, mỗi giá trị nằm trong **[0, 1]**. UI **không** tự đặt giá trị mặc định và hiển thị `null` là "chưa xác nhận" (không hiển thị như 0).

##### `GET /api/v1/syllabi/{syllabusId}/clos`
Danh sách CLO của đề cương, sắp xếp theo `code` tăng dần **theo chuỗi** (nên `CLO10` đứng trước `CLO2`; UI tự sắp xếp theo số nếu cần). Quyền: mọi vai trò đã xác thực. Phản hồi `200`: mảng `CloResponse`. Lỗi: `400`, `404` (đề cương không tồn tại).

##### `POST /api/v1/syllabi/{syllabusId}/clos`
Thêm CLO. Quyền: `ADMIN`, `PROGRAM_MANAGER` (+ phạm vi — ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge).
```json
{
  "code": "CLO1",
  "contentOriginal": "",
  "bloomLevel": 2,
  "bloomNote": null,
  "measurement": null,
  "extra": null
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `code` | String | Có | Khớp `^CLO[0-9]+$` (ví dụ `CLO1`, `CLO12`); được trim; duy nhất trong đề cương |
| `contentOriginal` | String | Không | Tự do; được trim; `null` → lưu `""` |
| `bloomLevel` | Integer | Có | 1..6 |
| `bloomNote` | String | Không | Tự do; được trim |
| `measurement` | Object | Không | `null` hợp lệ. Nếu có: `defaultWeight`, `defaultPassThreshold` mỗi trường `null` hoặc trong [0, 1] |
| `extra` | Object | Không | Dữ liệu mở rộng tự do |

- `201 Created`: `CloResponse` (`courseId` do backend suy từ đề cương).
- Lỗi:
  - `400 VALIDATION_ERROR`: `code` sai mẫu, `bloomLevel` = 0 hoặc 7, `measurement.*` ngoài [0, 1]. Ví dụ:
    ```json
    {
      "timestamp": "2026-11-04T03:00:00Z", "status": 400, "code": "VALIDATION_ERROR",
      "message": "Dữ liệu yêu cầu không hợp lệ", "path": "/api/v1/syllabi/6728d300a1b2c3d4e5f60021/clos",
      "fieldErrors": [ { "field": "bloomLevel", "message": "bloomLevel phải từ 1 đến 6", "rejectedValue": 7 } ]
    }
    ```
  - `403`; `404` (đề cương không tồn tại).
  - `409 CONFLICT`: trùng `code` trong cùng đề cương (*"CLO với mã [CLO1] đã tồn tại trong đề cương id=[...]"*).
  - `422 BUSINESS_RULE_VIOLATION`: đề cương đang `CONFIRMED` (*"Đề cương đã CONFIRMED không cho phép thêm CLO mới; phải tạo phiên bản đề cương mới"*). Backend chỉ chặn trạng thái `CONFIRMED`; việc thêm CLO vào đề cương `ARCHIVED` hiện **không bị chặn** (cần xác nhận với backend đây có phải chủ ý).

##### `GET /api/v1/clos/{id}`
Chi tiết CLO. Quyền: mọi vai trò đã xác thực. Phản hồi `200`: `CloResponse`. Lỗi: `400`, `404`.

##### `PUT /api/v1/clos/{id}`
Cập nhật CLO (thay thế toàn bộ). Quyền: `ADMIN`, `PROGRAM_MANAGER` (+ phạm vi — ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge).
- Body có cùng trường và ràng buộc như `POST` (`code`, `bloomLevel` bắt buộc). Trường không gửi sẽ bị ghi đè: `measurement` bỏ trống/`null` sẽ **xóa** `measurement` đã có; `contentOriginal` `null` → `""`; `bloomNote`, `extra` `null` → `null`. UI luôn gửi đầy đủ giá trị hiện tại.
- `200 OK`: `CloResponse`.
- Lỗi: `400`; `403`; `404`; `409` (đổi `code` sang mã đã có trong cùng đề cương; giữ nguyên `code` không gây xung đột); `422` khi đề cương đang `CONFIRMED` (*"Đề cương đã CONFIRMED không cho phép sửa nội dung CLO; phải tạo phiên bản đề cương mới"*).

##### `DELETE /api/v1/clos/{id}`
Xóa CLO. Quyền: `ADMIN`, `PROGRAM_MANAGER` (+ phạm vi — ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge). `204 No Content`.
- Lỗi: `403`; `404`; `422` khi đề cương đang `CONFIRMED` (*"...không cho phép xóa CLO..."*) hoặc CLO đã có liên kết CLO–PI (*"Không thể xóa CLO đã được liên kết với PI trong ma trận CLO-PI"*) — UI hướng dẫn xóa liên kết trước (§6.2.6).

---

#### 6.2.6. Liên kết CLO–PI & ma trận (US-12)

Liên kết `(cloId, piId)` gắn một CLO của đề cương với một PI của một phiên bản CTĐT (`programVersionId`). Chỉ liên kết có `verification.status = VERIFIED` mới được dùng cho tính chính thức ở các bước đo lường sau (F06).

**Đối tượng `CloPiLinkResponse`:**
```json
{
  "id": "6728d500a1b2c3d4e5f60041",
  "programVersionId": "6728d0b0a1b2c3d4e5f60101",
  "syllabusId": "6728d300a1b2c3d4e5f60021",
  "cloId": "6728d400a1b2c3d4e5f60031",
  "piId": "6728d0c0a1b2c3d4e5f60301",
  "weight": null,
  "verification": { "status": "UNVERIFIED", "verifiedBy": null, "verifiedAt": null, "note": null }
}
```
`weight` ∈ (0, 1] hoặc `null` (chưa có quy tắc trọng số). UI hiển thị `null` là "chưa xác định", không hiển thị như 0.

##### `GET /api/v1/syllabi/{syllabusId}/clo-pi-links`
Danh sách mọi liên kết của đề cương (mọi phiên bản CTĐT). Quyền: mọi vai trò đã xác thực. Phản hồi `200`: mảng `CloPiLinkResponse`. Lỗi: `400`, `404` (đề cương không tồn tại).

##### `POST /api/v1/syllabi/{syllabusId}/clo-pi-links`
Tạo liên kết. Quyền: `ADMIN`; `PROGRAM_MANAGER` nếu `programVersionId` **trong body** thuộc CTĐT nằm trong `scope.programIds` (**đã có**).
```json
{
  "programVersionId": "6728d0b0a1b2c3d4e5f60101",
  "cloId": "6728d400a1b2c3d4e5f60031",
  "piId": "6728d0c0a1b2c3d4e5f60301",
  "weight": null
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `programVersionId` | ObjectId | Có | Phiên bản CTĐT tồn tại |
| `cloId` | ObjectId | Có | CLO tồn tại **và thuộc đề cương `syllabusId`** |
| `piId` | ObjectId | Có | PI tồn tại **và thuộc `programVersionId`** |
| `weight` | Double | Không | `null` hợp lệ; nếu có thì `0 < weight <= 1` (`0` và `> 1` → `400`) |

- `201 Created`: `CloPiLinkResponse` (`verification.status = UNVERIFIED`).
- Lỗi:
  - `400`: sai định dạng ID; `weight` ngoài (0, 1] (*"weight phải lớn hơn 0 và nhỏ hơn hoặc bằng 1"*).
  - `403`: ngoài phạm vi / không đủ vai trò.
  - `404`: đề cương, phiên bản CTĐT, CLO hoặc PI không tồn tại.
  - `409 CONFLICT`: đã có liên kết `(cloId, piId)` (*"Liên kết giữa CLO id=[...] và PI id=[...] đã tồn tại"*).
  - `422 BUSINESS_RULE_VIOLATION`: CLO không thuộc đề cương `syllabusId` (*"CLO id=[...] không thuộc về đề cương id=[...]"*); PI không thuộc phiên bản CTĐT (*"PI id=[...] không thuộc về phiên bản CTĐT id=[...]"*).
- Backend **không** chặn tạo liên kết khi đề cương `CONFIRMED` (khác với CLO).

##### `DELETE /api/v1/clo-pi-links/{id}`
Xóa liên kết. Quyền: `ADMIN`, `PROGRAM_MANAGER` (+ phạm vi — ADR 0009 đề xuất; backend đã hiện thực trên nhánh F03, chờ merge, suy theo `programVersionId` của liên kết). `204 No Content`. Lỗi: `400`, `403`, `404`. Ghi chú: ở thời điểm tài liệu này, backend chưa chặn xóa liên kết đã `VERIFIED` hoặc đã được tham chiếu bởi dữ liệu đo lường (F06 chưa hiện thực) — cần xác nhận với backend khi F06 có.

##### `GET /api/v1/syllabi/{syllabusId}/clo-pi-matrix?programVersionId={programVersionId}`
Ma trận CLO × PI của đề cương trên một phiên bản CTĐT. Quyền: mọi vai trò đã xác thực.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `programVersionId` | ObjectId (query) | **Có** | Thiếu → `400` (*"Thiếu tham số bắt buộc: 'programVersionId'"*); sai định dạng → `400` |

Phản hồi `200` (`CloPiMatrixResponse`):
```json
{
  "syllabusId": "6728d300a1b2c3d4e5f60021",
  "programVersionId": "6728d0b0a1b2c3d4e5f60101",
  "clos": [
    {
      "id": "6728d400a1b2c3d4e5f60031",
      "syllabusId": "6728d300a1b2c3d4e5f60021",
      "courseId": "6728d100a1b2c3d4e5f60001",
      "code": "CLO1",
      "contentOriginal": "",
      "bloomLevel": 2,
      "bloomNote": null,
      "measurement": null,
      "verification": { "status": "UNVERIFIED", "verifiedBy": null, "verifiedAt": null, "note": null },
      "extra": null
    }
  ],
  "pis": [
    {
      "id": "6728d0c0a1b2c3d4e5f60301",
      "programVersionId": "6728d0b0a1b2c3d4e5f60101",
      "ploId": "6728d0d0a1b2c3d4e5f60401",
      "code": "PI1.1",
      "displayOrder": 1,
      "nameOriginalTerm": null,
      "contentOriginal": "",
      "contentShort": null,
      "capabilityLevelRaw": null,
      "targetPassRate": null,
      "verification": { "status": "UNVERIFIED", "verifiedBy": null, "verifiedAt": null, "note": null },
      "reviewNote": null
    }
  ],
  "links": [
    {
      "cloId": "6728d400a1b2c3d4e5f60031",
      "piId": "6728d0c0a1b2c3d4e5f60301",
      "linkId": "6728d500a1b2c3d4e5f60041",
      "weight": null,
      "verification": { "status": "UNVERIFIED", "verifiedBy": null, "verifiedAt": null, "note": null }
    }
  ]
}
```
- `clos`: toàn bộ CLO của đề cương, sắp xếp `code` tăng dần theo chuỗi. `pis`: toàn bộ PI của phiên bản CTĐT, sắp xếp theo `displayOrder`. `links`: chỉ các ô **đã có liên kết** (thưa); ô không có phần tử trong `links` nghĩa là chưa liên kết. Mảng có thể rỗng (đề cương chưa có CLO, phiên bản chưa có PI, hoặc chưa liên kết).
- Mỗi ô mang `verification` riêng; UI phải phân biệt hiển thị `UNVERIFIED` / `VERIFIED` / `NEEDS_CLARIFICATION`.
- Lỗi: `400` (thiếu/sai `programVersionId`, sai `syllabusId`), `404` (đề cương hoặc phiên bản CTĐT không tồn tại).

##### `PUT /api/v1/clo-pi-links/{id}/verification`
Thẩm định (xác nhận) một liên kết CLO–PI. Quyền: **chỉ `QA_OFFICER`** (`ADMIN` nhận `403`), **và** `scope.programIds` của người dùng phải chứa CTĐT của phiên bản chứa liên kết (**đã có**).
```json
{ "status": "VERIFIED", "note": "Đã đối chiếu với ma trận chuẩn của Khoa" }
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `status` | Enum | Có | `UNVERIFIED` \| `VERIFIED` \| `NEEDS_CLARIFICATION` |
| `note` | String | Không | Tối đa 2000 ký tự |

- `200 OK`: `CloPiLinkResponse` với `verification` được ghi `verifiedBy` (ID người dùng hiện tại), `verifiedAt` (thời điểm xử lý, UTC) và `note`. Gọi lại sẽ ghi đè bản xác nhận trước.
- Lỗi: `400` (thiếu/sai `status`, `note` > 2000), `403` (không phải `QA_OFFICER`, hoặc ngoài phạm vi: *"Chuyên viên QA không có quyền thẩm định trong phạm vi phiên bản CTĐT này"*), `404` (liên kết không tồn tại).
- Gợi ý UI: chỉ hiện nút thẩm định cho người dùng có vai trò `QA_OFFICER`; xử lý `403` do ngoài phạm vi bằng thông báo, không điều hướng.

---

### 6.3. F04: Đề Thi, Ma Trận Đánh Giá & Rubric (Assessment, Question Matrix & Rubrics)
- `GET /api/v1/assessments` — Danh sách bài đánh giá (giữa kỳ, cuối kỳ, đồ án).
- `POST /api/v1/assessments` — Tạo bài đánh giá mới.
- `GET /api/v1/assessments/{id}/matrix` — Xem ma trận cấu trúc câu hỏi ánh xạ với CLO và thang đo Bloom.
- `PUT /api/v1/assessments/{id}/matrix` — Cập nhật ma trận cấu trúc câu hỏi.
- `POST /api/v1/assessments/{id}/submit` — Nộp ma trận đề thi để phê duyệt (`DRAFT` -> `SUBMITTED`).
- `POST /api/v1/assessments/{id}/approve` — Trưởng bộ môn phê duyệt ma trận (`SUBMITTED` -> `APPROVED`).
- `POST /api/v1/assessments/{id}/reject` — Trưởng bộ môn từ chối ma trận kèm lý do (`SUBMITTED` -> `REJECTED`).
- `GET /api/v1/rubrics` — Danh mục tiêu chí Rubric đánh giá năng lực.

### 6.4. F05: Quản Lý Học Kỳ, Lớp Học Phần & Nhập Điểm (Terms, Course Sections & Score Import)

#### 6.4.1. Học kỳ — Terms (US-18, thuộc F05a, **đã hiện thực**)

Học kỳ được hiện thực trước các phần còn lại của F05 vì đề cương (§6.2.4) tham chiếu `effectiveFromTermId` / `effectiveToTermId`. Nguồn: `TermController`, `doc/plan/F05a-hoc-ky-lop-sinh-vien.md` (US-18).

**Quyền:** đọc (`GET`) = mọi vai trò đã xác thực. Ghi (`POST`, `PUT`, `PUT .../status`) = `ADMIN`, `PROGRAM_MANAGER`, **không** kiểm tra phạm vi `scope` (học kỳ là dữ liệu dùng chung). `DELETE` = **chỉ `ADMIN`**. Vai trò khác ghi → `403`.

**Enum `TermStatus`:** `OPEN` (đang mở, mặc định khi tạo), `SCORE_LOCKED` (khóa sổ điểm), `CLOSED` (đã đóng).

> **Phạm vi hiện tại của khóa sổ điểm:** Giá trị `SCORE_LOCKED` / `CLOSED` hiện **chỉ được lưu và trả về**. Việc **từ chối nhập/sửa điểm** khi học kỳ ở `SCORE_LOCKED` hoặc `CLOSED` thuộc **F05b (nhập điểm), chưa hiện thực** — chưa có endpoint nhập điểm nào kiểm tra trạng thái này. UI chưa được phép coi `SCORE_LOCKED` là đã chặn ghi ở backend; khi F05b có sẽ trả lỗi qua `422`/`403` (mã cụ thể cần xác nhận với backend lúc đó).

**Đối tượng `TermResponse`:**
```json
{
  "id": "6728d0a0a1b2c3d4e5f60201",
  "code": "2026-HK1",
  "academicYear": "2026-2027",
  "startDate": "2026-09-01T00:00:00Z",
  "endDate": "2027-01-15T00:00:00Z",
  "status": "OPEN"
}
```
`academicYear`, `startDate`, `endDate` có thể `null`. Thời gian theo §1.2.

##### `GET /api/v1/terms`
Danh sách học kỳ, sắp xếp `startDate` **giảm dần** (mới nhất trước). Quyền: mọi vai trò đã xác thực. Phản hồi `200`: mảng `TermResponse`, **không phân trang**.

##### `GET /api/v1/terms/{id}`
Phản hồi `200`: `TermResponse`. Lỗi: `400` (ID sai định dạng), `404`.

##### `POST /api/v1/terms`
Tạo học kỳ (`status = OPEN`). Quyền: `ADMIN`, `PROGRAM_MANAGER`.
```json
{ "code": "2026-HK1", "academicYear": "2026-2027", "startDate": "2026-09-01T00:00:00Z", "endDate": "2027-01-15T00:00:00Z" }
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `code` | String | Có | `^[A-Za-z0-9_-]{2,30}$`; được trim; duy nhất; bất biến sau khi tạo |
| `academicYear` | String | Không | Tự do; được trim |
| `startDate`, `endDate` | ISO-8601 UTC | Không | Nếu cả hai có thì `startDate <= endDate` |

- `201 Created`: `TermResponse`.
- Lỗi: `400` (`code` sai mẫu/thiếu, ngày sai định dạng), `403`, `409 CONFLICT` (trùng `code`: *"Mã học kỳ [...] đã tồn tại trong hệ thống"*), `422 BUSINESS_RULE_VIOLATION` khi `startDate` sau `endDate` (*"Thời điểm bắt đầu học kỳ (startDate) không được sau thời điểm kết thúc (endDate)"*). Lưu ý: `startDate > endDate` trả **`422`**, không phải `400`.

##### `PUT /api/v1/terms/{id}`
Cập nhật thông tin học kỳ (không đổi `code`, không đổi `status`). Quyền: `ADMIN`, `PROGRAM_MANAGER`.
```json
{ "academicYear": "2026-2027", "startDate": "2026-09-01T00:00:00Z", "endDate": "2027-01-15T00:00:00Z" }
```
- `academicYear` không gửi/`null` thì giữ nguyên; **`startDate` và `endDate` không gửi/`null` thì bị ghi đè thành `null`** — UI luôn gửi đủ giá trị hiện tại.
- Kiểm tra `startDate <= endDate` áp dụng trên giá trị hiệu lực (giá trị mới, nếu thiếu thì giá trị cũ).
- `200 OK`: `TermResponse`. Lỗi: `400`, `403`, `404`, `422` (`startDate` sau `endDate`).

##### `PUT /api/v1/terms/{id}/status`
Đổi trạng thái học kỳ. Quyền: `ADMIN`, `PROGRAM_MANAGER`.
```json
{ "status": "OPEN", "reason": "Cần chỉnh sửa điểm sau phúc khảo" }
```
| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `status` | Enum `TermStatus` | Có | `OPEN` \| `SCORE_LOCKED` \| `CLOSED` |
| `reason` | String | **Có điều kiện** | Bắt buộc, không rỗng/không chỉ khoảng trắng **khi mở lại `SCORE_LOCKED → OPEN`**; các chuyển khác bỏ qua |

Quy tắc theo code hiện tại:
- Trùng trạng thái hiện tại → `200`, trả về không đổi (idempotent).
- `SCORE_LOCKED → OPEN` mà thiếu `reason` → `422` (*"Cần nêu rõ lý do giải trình khi mở lại học kỳ đã khóa sổ điểm"*).
- Mọi chuyển trạng thái khác (`OPEN → SCORE_LOCKED`, `OPEN → CLOSED`, `SCORE_LOCKED → CLOSED`, `CLOSED → ...`) hiện **không bị ràng buộc thêm** ở backend (kể cả `CLOSED → OPEN` không đòi `reason`). Quy tắc chiều chuyển hợp lệ (ví dụ có cho phép mở lại `CLOSED` không) **cần xác nhận với backend**; UI nên chỉ đề xuất luồng `OPEN → SCORE_LOCKED → CLOSED` và `SCORE_LOCKED → OPEN` (kèm lý do).
- `reason` hiện chỉ được ghi vào log máy chủ cùng người thao tác; **không** được lưu trong bản ghi học kỳ và **không** có trong `TermResponse` (việc ghi vào `audit_logs` chưa thấy trong code — cần xác nhận với backend).

- `200 OK`: `TermResponse`. Lỗi: `400` (thiếu/sai `status`; không có `fieldErrors` nếu giá trị enum sai), `403`, `404`, `422` (thiếu `reason` như trên).
- Gợi ý UI: khi người dùng chọn mở lại học kỳ `SCORE_LOCKED`, hiển thị ô nhập lý do bắt buộc trước khi gửi; nếu nhận `422` vẫn giữ nội dung đã nhập.

##### `DELETE /api/v1/terms/{id}`
Xóa học kỳ. Quyền: **chỉ `ADMIN`**. `204 No Content`.
- Lỗi: `404`; `422` khi học kỳ đang được đề cương áp dụng (*"Không thể xóa học kỳ mã [...] vì đang được áp dụng trong đề cương môn học"*) hoặc đã có lớp học phần (*"... vì đang có lớp học phần"*).

#### 6.4.2. Phần còn lại của F05 (chưa hiện thực — khung định hướng)
- `GET /api/v1/course-sections` — Danh sách lớp học phần theo học kỳ.
- `GET /api/v1/course-sections/{id}/roster` — Danh sách sinh viên thuộc lớp học phần.
- `POST /api/v1/course-sections/{id}/scores/import-preview` — Tải file Excel điểm sinh viên lên để xem trước kết quả parse và kiểm tra lỗi.
- `POST /api/v1/course-sections/{id}/scores/confirm` — Xác nhận lưu điểm sinh viên vào CSDL (yêu cầu transaction và ghi `audit_logs`).
- `PUT /api/v1/course-sections/{id}/scores/{studentId}` — Cập nhật điểm từng phần của sinh viên (bắt buộc nhập `reason`).
- `POST /api/v1/course-sections/{id}/scores/lock` — Khóa bảng điểm học phần sau khi hoàn tất.

> Lưu ý: kế hoạch backend `doc/plan/F05a-hoc-ky-lop-sinh-vien.md` đề xuất đường dẫn lớp học phần là `/api/v1/sections/...` (khác `/course-sections/...` ở trên). Đường dẫn cuối cùng **cần xác nhận với backend** khi F05a/F05b được hiện thực.

### 6.5. F06: Tính Toán & Đo Lường Chuẩn Đầu Ra (Calculation & Outcome Measurement Engine)
- `POST /api/v1/calculations/run` — Khởi chạy tiến trình tính toán đo lường kết quả chuẩn đầu ra theo phạm vi (lớp học phần / toàn khóa).
- `GET /api/v1/calculations/{id}/status` — Kiểm tra tiến độ thực thi của tiến trình tính toán (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- `GET /api/v1/calculations/results/course-sections/{id}` — Lấy kết quả đo lường mức độ đạt chuẩn CLO/PI của một lớp học phần.
- `GET /api/v1/calculations/results/cohort/{cohortId}/program/{programId}` — Lấy kết quả đo lường chuẩn PLO của toàn bộ khóa sinh viên.

### 6.6. F07: Báo Cáo, Thống Kê & Phân Tích Chất Lượng (Reports, Analytics & Dashboards)
- `GET /api/v1/reports/dashboard-summary` — Tổng hợp số liệu KPI phục vụ màn hình Dashboard quản trị.
- `GET /api/v1/reports/clo-attainment` — Báo cáo thống kê phân bổ tỷ lệ sinh viên đạt từng CLO của học phần.
- `GET /api/v1/reports/plo-radar/{studentId}` — Biểu đồ mạng nhện (Radar Chart) thể hiện năng lực chuẩn đầu ra PLO của từng sinh viên.
- `GET /api/v1/reports/cohort-matrix` — Báo cáo ma trận tổng thể mức độ đạt chuẩn PLO của khóa học phục vụ kiểm định chất lượng (AUN-QA / ABET).
- `GET /api/v1/reports/export/excel` — Xuất báo cáo thống kê ra file định dạng Excel.
- `GET /api/v1/reports/export/pdf` — Xuất phiếu đánh giá chuẩn đầu ra định dạng PDF.

### 6.7. F08: Kế Hoạch Cải Tiến Chất Lượng Liên Tục (Continuous Quality Improvement - CQI)
- `GET /api/v1/cqi-plans` — Danh sách các kế hoạch hành động cải tiến chất lượng.
- `POST /api/v1/cqi-plans` — Tạo kế hoạch cải tiến mới cho những CLO/PLO có tỷ lệ đạt dưới ngưỡng kỳ vọng.
- `PUT /api/v1/cqi-plans/{id}` — Cập nhật tiến độ và kết quả thực hiện kế hoạch cải tiến.
- `GET /api/v1/cqi-plans/{id}/history` — Lịch sử theo dõi sự thay đổi chất lượng qua các chu kỳ đào tạo.

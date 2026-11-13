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

### 5.4. Khung Định Hướng Phân Quyền Theo Phạm Vi (US-03, OBE v0.7 / ADR 0014)
Hệ thống tinh gọn còn **4 vai trò cốt lõi**: `ADMIN`, `PROGRAM_MANAGER`, `LECTURER`, `QA` (loại bỏ `DEPARTMENT_HEAD`, `VIEWER`, `QA_OFFICER` và `STUDENT` khỏi enum `Role`). Backend kiểm tra quyền hạn của người dùng trên từng tài nguyên theo cặp `(vai trò, phạm vi)` và phân định hành vi `READ` / `WRITE`:
- **Nguyên tắc nạp quyền động:** Quyền hạn được nạp từ CSDL mỗi request và đóng gói trong `UserPrincipal` (trong package `dto`). Thay đổi vai trò hoặc phạm vi trên CSDL lập tức có hiệu lực ở request tiếp theo mà không cần cấp lại token.
- **Nguyên tắc hợp quyền (UNION):** Người dùng có nhiều `roleAssignments` sẽ nhận quyền hạn là phép hợp (UNION) của tất cả các assignment.
- **Quy ước phạm vi rỗng (Empty Scope):** Scope rỗng là khi `scope == null` HOẶC cả ba mảng `programIds`, `courseIds`, `sectionIds` đều rỗng hoặc null (`{ programIds: [], courseIds: [], sectionIds: [] }`).
  - `ADMIN`: Toàn quyền quản trị danh mục, người dùng, học kỳ, lớp học phần (lưu ý: thu hồi quyền biên soạn/chấm điểm học thuật trên đề cương, CLO, bài đánh giá, nhập điểm).
  - `QA` (Cán bộ Đảm bảo chất lượng & Khảo thí, hợp nhất từ `VIEWER` + `QA_OFFICER`): Toàn quyền đọc toàn hệ thống (READ only) khi scope rỗng để xem báo cáo đo lường. Nếu `QA` có chứa ID trong scope thì chỉ đọc trong phạm vi đó (nếu chỉ có `programIds` khi truy cập `section` thì bị từ chối 403). Đồng thời `QA` có quyền ghi thẩm định nội dung CTĐT (`PUT .../verification`) và liên kết CLO–PI (`PUT /clo-pi-links/{id}/verification`) trong `scope.programIds`.
  - `PROGRAM_MANAGER` & `LECTURER`: Scope rỗng bị từ chối truy cập (fail-closed, HTTP 403). Riêng `LECTURER`, nếu tài khoản có tên trong `CourseSection.lecturerIds` của lớp học phần thì vẫn được cấp quyền thao tác trên lớp đó (miễn là user vẫn giữ vai trò LECTURER).

---

### 5.5. Nhóm API Nhật Ký Thao Tác (US-04: Audit Logs)

Chỉ đọc. Quyền: **`ADMIN`** (vai trò khác → 403, chưa đăng nhập → 401).

#### `GET /api/v1/audit-logs`

Danh sách nhật ký có phân trang chuẩn (§5.1), **mới nhất trước**. Mọi tham số đều tùy chọn và kết hợp bằng AND.

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `action` | Enum `AuditAction` | `SCORE_UPDATE`, `IMPORT_CONFIRM`, `ASSESSMENT_LOCK`, `ASSESSMENT_UNLOCK`, `RUN_CALCULATION`, `LOGIN` |
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

## 6. Đặc Tả Endpoint Các Phân Hệ Nghiệp Vụ (F02 – F08)

### 6.1. F02: Chương Trình Đào Tạo, Phiên Bản, PLO & PI
> **Trạng thái:** đã hiện thực ở backend (OBE v0.7 / ADR 0012 / ADR 0004). Đã **xóa bỏ** ma trận I/R/M (`/pi-contributions`); tách riêng endpoint cập nhật trạng thái phiên bản CTĐT (`/program-versions/{id}/status`); `QA` thẩm định nội dung (`/verification`). Tiền tố `/api/v1`.

- `GET/POST/PUT /programs`, `GET /programs/{id}` — Danh mục ngành đào tạo (`ADMIN` tạo/sửa; các vai trò đọc).
- `GET/POST /programs/{programId}/versions`, `GET/PUT /program-versions/{id}` — Quản lý phiên bản CTĐT (`PROGRAM_MANAGER` trong `scope.programIds`).
- `PUT /program-versions/{id}/status` — Đổi trạng thái vòng đời `DRAFT -> ACTIVE -> ARCHIVED` (`PROGRAM_MANAGER`).
- `PUT /program-versions/{id}/verification` — Thẩm định chất lượng CTĐT (`QA` trong `scope.programIds`).
- `GET/POST /program-versions/{pvId}/plos`, `PUT/DELETE /plos/{id}` — Quản lý PLO (bắt buộc `passThreshold` ∈ `[0, 1]`).
- `GET/POST /plos/{ploId}/pis`, `GET /program-versions/{pvId}/pis`, `PUT/DELETE /pis/{id}` — Quản lý PI (bắt buộc `passThreshold` ∈ `[0, 1]` và `weight` ∈ `(0, 1]`; tổng `weight` các PI trong cùng PLO = `1.0`).

### 6.2. F03: Học Phần, Đề Cương, CLO & Liên Kết CLO–PI
> **Trạng thái:** đã hiện thực ở backend (ADR 0010, ADR 0014). Tiền tố `/api/v1`.

- `GET/POST/PUT/DELETE /courses`, `POST /courses/import` — Kho học phần cấp trường (`ADMIN` độc quyền quản lý & nhập CSV danh mục).
- `GET/POST /program-versions/{pvId}/courses`, `PUT/DELETE /program-courses/{id}` — Cấu trúc học phần trong CTĐT (`PROGRAM_MANAGER`, hỗ trợ `prerequisiteCourseIds` và `previousCourseIds`).
- `GET /departments/lecturers`, `POST /departments/assign-course`, `POST /departments/unassign-course` — `PROGRAM_MANAGER` tra cứu giảng viên cùng ngành và phân công/gỡ môn học (`scope.courseIds`) cho `LECTURER`.
- `GET /courses/{courseId}/syllabi`, `GET /syllabi/{id}` — Đọc đề cương.
- `POST /courses/{courseId}/syllabi` — Tạo đề cương `DRAFT` (`LECTURER` hoặc `PROGRAM_MANAGER` có quyền ghi học phần).
- `PUT /syllabi/{id}/status` — Chuyển trạng thái đề cương (`DRAFT -> CONFIRMED -> ARCHIVED`, quyền `PROGRAM_MANAGER`).
- `GET/POST /syllabi/{syllabusId}/clos`, `PUT/DELETE /clos/{id}` — Quản lý CLO (`LECTURER` hoặc `PROGRAM_MANAGER` khi đề cương ở `DRAFT`).
- `GET/POST /syllabi/{syllabusId}/clo-pi-links`, `DELETE /clo-pi-links/{id}`, `GET /syllabi/{syllabusId}/clo-pi-matrix` — Liên kết CLO–PI (`PROGRAM_MANAGER` thiết lập, **bắt buộc `weight` ∈ `(0, 1]`**; tổng trọng số về 1 PI = `1.0`).
- `PUT /clo-pi-links/{id}/verification` — Thẩm định liên kết CLO–PI (`QA`).

### 6.3. F04: Bài Đánh Giá & Khóa Ma Trận Đề Thi (OBE v0.7 / ADR 0014)

> **Trạng thái:** đã hiện thực và nâng cấp theo **v0.7 / ADR 0014**. Đã **xóa bỏ** hoàn toàn Rubric (`IRubric`), quy trình duyệt bài của `DEPARTMENT_HEAD` (`submit`, `approve`, `reject`), `totalPoints`, `weightInCourse`, và `dataGranularity`. Thay bằng cơ chế `LECTURER` tự cấu hình `cloWeights` + câu hỏi (`maxScore` theo từng CLO) và tự khóa/mở khóa ma trận đề thi. Tiền tố `/api/v1`.

| Phương thức | Đường dẫn | Ai gọi được (backend kiểm tra) | Phản hồi |
|---|---|---|---|
| GET | `/syllabi/{syllabusId}/assessment-templates` | đọc được đề cương (`canAccessSyllabus` READ) | `AssessmentResponse[]` (khung) |
| POST | `/syllabi/{syllabusId}/assessment-templates` | `LECTURER` hoặc `PROGRAM_MANAGER` có quyền ghi đề cương | 201 `AssessmentResponse` |
| GET | `/sections/{sectionId}/assessments` | đọc được lớp (`canAccessSection` READ) | `AssessmentResponse[]` |
| POST | `/sections/{sectionId}/assessments` | `LECTURER` của lớp | 201 `AssessmentResponse` |
| GET | `/assessments/{id}` | đọc được lớp/đề cương của bài | `AssessmentResponse` |
| PUT | `/assessments/{id}` | `LECTURER` (bản lớp) hoặc `LECTURER`/`PROGRAM_MANAGER` (khung) | `AssessmentResponse` |
| PUT | `/assessments/{id}/items` | như cập nhật | `AssessmentResponse` (thay toàn bộ `items[]`) |
| GET | `/assessments/{id}/coverage` | như đọc | `CoverageResponse` |
| POST | `/assessments/{id}/lock` | `LECTURER` của lớp (chỉ bản lớp) | `AssessmentResponse` (`DRAFT` → `LOCKED`) |
| POST | `/assessments/{id}/unlock` | `LECTURER` của lớp (chỉ bản lớp, chưa có điểm) | `AssessmentResponse` (`LOCKED` → `DRAFT`) |
| DELETE | `/assessments/{id}` | `LECTURER` của lớp (khi ở `DRAFT` hoặc chưa nhập điểm) | 204 No Content |

**`AssessmentResponse`:** `id`, `syllabusId`, `sectionId` (null với khung), `templateId`, `code`, `name`, `scope` (`SYLLABUS_TEMPLATE` | `SECTION`), `type` (`QUIZ`, `PRACTICAL`, `PROJECT`, `MIDTERM`, `FINAL`, `OTHER`), `phase` (`FORMATIVE`, `MIDTERM`, `SUMMATIVE`), `scheduledAt`, `status` (`DRAFT`, `LOCKED`, `SCORE_ENTERED`), **`locked`** (boolean: `true` khi `LOCKED` hoặc `SCORE_ENTERED`), `cloWeights` (`[{ cloId, weight }]`), `coverageSummary`, `items[]`, `revision`.

**Phần tử `items[]` (`AssessmentItemDto`):** `id` (tùy chọn), `code` (bắt buộc, `^[A-Za-z0-9._ -]{1,40}$`, không trùng trong bài), `orderIndex` (≥ 1), `bloomLevel` (1–6, bắt buộc theo UI), `outcomeMappings[]` (bắt buộc ≥ 1; mỗi phần tử `{ cloId, maxScore }`, `maxScore > 0`, không trùng CLO trong cùng câu hỏi).

**Quy tắc nghiệp vụ (v0.7):**
- Câu hỏi chỉ gán **CLO** + **điểm tối đa cho từng CLO** (`{ cloId, maxScore }`); **PI suy ra tự động** từ liên kết CLO–PI (ADR 0011). Một câu hỏi có thể đo nhiều CLO và mỗi CLO có `maxScore` độc lập (nhập điểm riêng cho từng CLO của câu hỏi, không chia theo trọng số).
- `cloWeights`: Trọng số đóng góp của bài đánh giá đối với từng CLO trong học phần (`weight` ∈ `(0, 1]`). Tổng trọng số của cùng một CLO qua các bài đánh giá đã khóa của lớp không vượt quá `1.0` (100%).
- Khóa ma trận (`POST /assessments/{id}/lock`): chỉ thực hiện trên bản lớp (`SECTION`) đang ở `DRAFT`, yêu cầu đã có ≥ 1 phần tử trong `items[]`, mọi CLO xuất hiện trong `items[]` phải có trong `cloWeights` (hoặc ngược lại). Sau khi khóa (`LOCKED`), `items[]` và `cloWeights` bị đóng băng và bài đánh giá sẵn sàng để nhập điểm.
- Mở khóa (`POST /assessments/{id}/unlock`): chuyển `LOCKED` → `DRAFT` để chỉnh sửa lại cấu trúc, chỉ hợp lệ khi bài chưa chuyển sang `SCORE_ENTERED` (chưa có dữ liệu điểm).
- Trùng `code` trong cùng phạm vi → **409**. Xung đột `revision` → **409**.

**Xử lý ở UI (`LMS-UI`):** Hiển thị thông báo lỗi 400/409/422 nguyên văn từ backend và giữ nguyên dữ liệu đang nhập; 409 kèm nút "Tải lại dữ liệu"; 403 hiển thị banner không đủ quyền (không đăng xuất).

### 6.4. F05a: Học Kỳ, Lớp Học Phần, Ghi Danh & Nhập Danh Sách Lớp (Terms, Sections, Enrollments)

> **Trạng thái:** đã hiện thực ở backend. Đối chiếu `TermController`, `SectionController`, `EnrollmentController`. Tiền tố `/api/v1`.

| Phương thức | Đường dẫn | Ai gọi được | Ghi chú |
|---|---|---|---|
| GET | `/terms`, `/terms/{id}` | đã xác thực | `TermResponse[]`/`TermResponse` |
| POST | `/terms` | `ADMIN`, `PROGRAM_MANAGER` | body `{ code (^[A-Za-z0-9_-]{2,30}$), academicYear?, startDate?, endDate? }`; trùng `code` → 409; `startDate > endDate` → 422 |
| PUT | `/terms/{id}` | `ADMIN`, `PROGRAM_MANAGER` | body `{ academicYear?, startDate?, endDate? }` |
| PUT | `/terms/{id}/status` | `ADMIN`, `PROGRAM_MANAGER` | body `{ status: OPEN \| SCORE_LOCKED \| CLOSED, reason? }`; **mở lại `SCORE_LOCKED → OPEN` bắt buộc `reason`** (thiếu → 422) |
| DELETE | `/terms/{id}` | `ADMIN` | 204 |
| GET | `/sections?termId=&courseId=` | đã xác thực | **không phân trang**; chỉ trả lớp người gọi đọc/quản lý được (giảng viên: lớp mình) |
| GET | `/sections/{id}` | đọc được lớp hoặc quản lý được lớp | `SectionResponse` |
| POST | `/sections` | `ADMIN`, hoặc `PROGRAM_MANAGER` mà học phần thuộc CTĐT trong `scope.programIds` | 201; body `{ code (^[A-Za-z0-9._-]{2,40}$), courseId, syllabusId, termId, lecturerIds[≥1] }` |
| PUT | `/sections/{id}` | như POST | body `{ lecturerIds[≥1] }` (học phần/đề cương/học kỳ **bất biến**) |
| PUT | `/sections/{id}/status` | như POST | body `{ status: OPEN \| CLOSED \| LOCKED, reason? }`; mở lại lớp `LOCKED` bắt buộc `reason` |
| GET | `/sections/{id}/enrollments?status=` | đọc được lớp | `EnrollmentListResponse` |
| POST | `/sections/{id}/enrollments/import` | `ADMIN` hoặc giảng viên của lớp (`canAccessSection` WRITE) | `multipart/form-data`, trường **`file`** (CSV) → `EnrollmentImportResponse` |
| PUT | `/enrollments/{id}/status` | `ADMIN` hoặc giảng viên của lớp | body `{ status: ENROLLED \| WITHDRAWN }` |

**DTO:** `TermResponse { id, code, academicYear, startDate, endDate, status }`. `SectionResponse { id, code, courseId, syllabusId, termId, lecturerIds[], enrolledCount, status }`. `EnrollmentListResponse { sectionId, enrolled, withdrawn, enrollments[{ id, sectionId, studentId, studentRef, cohort, majorCode, status, enrolledAt }] }`. `EnrollmentImportResponse { sectionId, totalRows, newStudents, reusedStudents, sectionEnrolledCount, ignoredColumns[] }`.

### 6.5. F05b: Xuất Tệp CSV Mẫu & Nhập Điểm Theo Lô 3 Bước (Score Import Batches)

> **Trạng thái:** đã hiện thực đầy đủ ở backend (`AssessmentController#getScoreTemplateCsv` & `ImportBatchController`). Tiền tố `/api/v1`.

| Phương thức | Đường dẫn | Ai gọi được | Ghi chú |
|---|---|---|---|
| GET | `/assessments/{id}/scores/template-csv` | đọc được bài đánh giá (`canAccessAssessment` READ) | Tải tệp CSV mẫu có UTF-8 BOM, header chuẩn `MaSV,HoTen,<item.code> - <clo.code> (Max: <maxScore>)`, danh sách SV `ENROLLED` với ô điểm để trống. Trả 422 nếu bài chưa `LOCKED`/`SCORE_ENTERED` hoặc là bài khung `SYLLABUS_TEMPLATE`. |
| POST | `/sections/{sectionId}/assessments/{assessmentId}/import-batches` | `LECTURER` của lớp (`canAccessSection` WRITE) | `multipart/form-data`: `file` (CSV), `reimportPolicy` (`REJECT_ON_CONFLICT`), `sourceSystem` (`CSV`\|`MOODLE_EXPORT`, tùy chọn), `columnMapping` (chuỗi JSON, tùy chọn). **Nếu bỏ trống `columnMapping` và CSV dùng header tệp mẫu, hệ thống tự động nhận diện ánh xạ cột.** Trả 201 `ImportBatchResponse` (`UPLOADED`). |
| GET | `/sections/{sectionId}/assessments/{assessmentId}/import-batches` | đọc được lớp | `ImportBatchResponse[]` (mới nhất trước). |
| GET | `/import-batches/{id}` | đọc được lớp của lô | `ImportBatchResponse`. |
| GET | `/import-batches/{id}/errors?page=0&size=20` | đọc được lớp của lô | `PageResponse<ImportRowErrorResponse>` sắp theo `rowNumber`. |
| POST | `/import-batches/{id}/validate` | `LECTURER` của lớp | Kiểm tra từng dòng/ô điểm, trả về `VALIDATED` hoặc `HAS_ERRORS` kèm `stats`. |
| POST | `/import-batches/{id}/confirm` | `LECTURER` của lớp | Xác nhận ghi điểm vào bảng `scores`, cập nhật bài sang `SCORE_ENTERED`, trả `CONFIRMED`. |
| POST | `/import-batches/{id}/rollback` | `LECTURER` của lớp | Hủy lô chưa xác nhận (`UPLOADED`/`VALIDATED`/`HAS_ERRORS`) sang `ROLLED_BACK`. |

**`ImportColumnMappingDto` (chuỗi JSON gửi qua `columnMapping`):**
```json
{
  "studentColumn": "MaSV",
  "items": [
    {
      "column": "Q1 - CLO1 (Max: 4.0)",
      "item": "671dcba5f123456789abc011",
      "cloId": "671dcba5f123456789abc022"
    }
  ]
}
```
- **Lưu ý v0.7:** `emptyCellAs` đã bị loại bỏ; ô trống hợp lệ được xử lý theo quy tắc mặc định (`0.0`), tách biệt với lỗi định dạng số (`SCORE_OUT_OF_RANGE`) hoặc dòng thiếu cột (`MISSING_FIELD`).

### 6.6. F06: Tính Toán & Đo Lường Chuẩn Đầu Ra (Calculation & Outcome Measurement Engine)
- `POST /api/v1/calculations/run` — Khởi chạy tiến trình tính toán đo lường 4 cấp độ (`ASSESSMENT_CLO` $\to$ `CLO` $\to$ `PI` $\to$ `PLO`).
- `GET /api/v1/calculations/{id}/status` — Kiểm tra tiến độ thực thi (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- `GET /api/v1/calculations/results/course-sections/{id}` — Kết quả đo lường CLO của lớp học phần ($N_{\text{section}}$).
- `GET /api/v1/calculations/results/cohort/{cohortId}/program/{programId}` — Kết quả đo lường PI/PLO của khóa sinh viên ($N_{\text{cohort}}$).

### 6.7. F07: Báo Cáo, Thống Kê & Phân Tích Chất Lượng (Reports, Analytics & Dashboards)
- `GET /api/v1/reports/dashboard-summary` — Tổng hợp số liệu KPI phục vụ Dashboard (`QA` / `PROGRAM_MANAGER` / `ADMIN`).
- `GET /api/v1/reports/clo-attainment` — Báo cáo phân bổ tỷ lệ sinh viên đạt từng CLO của học phần.
- `GET /api/v1/reports/cohort-matrix` — Báo cáo ma trận tổng thể mức độ đạt chuẩn PLO/PI của khóa học phục vụ kiểm định (AUN-QA / ABET).
- `GET /api/v1/reports/export/excel` & `GET /api/v1/reports/export/pdf` — Xuất báo cáo thống kê.

### 6.8. F08: Kế Hoạch Cải Tiến Chất Lượng Liên Tục (Continuous Quality Improvement - CQI)
- `GET /api/v1/cqi-plans`, `POST /api/v1/cqi-plans`, `PUT /api/v1/cqi-plans/{id}`, `GET /api/v1/cqi-plans/{id}/history` — Quản lý và theo dõi kế hoạch cải tiến chất lượng.

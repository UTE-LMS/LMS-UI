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

## 6. Khung Mục Lục Endpoint Cho Các Bước Tiếp Theo (F02 - F08)

Các mục dưới đây giữ vai trò khung định hướng và sẽ được cập nhật chi tiết (Request/Response DTO, URL, query params) tương ứng qua từng bước phát triển của đề tài:

### 6.1. F02: Quản Lý Chương Trình Đào Tạo & Chuẩn Đầu Ra (Curriculum & PLO/PI Management)
- `GET /api/v1/programs` — Danh sách Chương trình đào tạo (CTĐT).
- `POST /api/v1/programs` — Thêm mới CTĐT.
- `GET /api/v1/programs/{id}/versions` — Danh sách các phiên bản áp dụng của CTĐT.
- `GET /api/v1/programs/{id}/plos` — Danh sách Chuẩn đầu ra cấp chương trình (PLO) và chỉ số hiệu năng (PI).
- `POST /api/v1/programs/{id}/plos` — Khởi tạo/cập nhật danh mục PLO và PI.
- `PUT /api/v1/programs/{id}/matrix` — Cấu hình ma trận quan hệ giữa các học phần và PLO/PI.

### 6.2. F03: Quản Lý Học Phần, Đề Cương & CLO (Course, Syllabus & CLO Management)
- `GET /api/v1/courses` — Danh sách học phần trong hệ thống.
- `POST /api/v1/courses` — Thêm mới thông tin học phần.
- `GET /api/v1/courses/{id}/syllabus` — Xem đề cương chi tiết học phần.
- `PUT /api/v1/courses/{id}/syllabus` — Cập nhật đề cương chi tiết.
- `GET /api/v1/courses/{id}/clos` — Danh sách Chuẩn đầu ra học phần (CLO) và mức độ thang đo Bloom.
- `POST /api/v1/courses/{id}/clos` — Thêm mới / cập nhật danh mục CLO.
- `PUT /api/v1/courses/{id}/clo-pi-mapping` — Ánh xạ giữa CLO của học phần và PI của CTĐT.

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
- `GET /api/v1/terms` — Danh sách học kỳ năm học.
- `GET /api/v1/course-sections` — Danh sách lớp học phần theo học kỳ.
- `GET /api/v1/course-sections/{id}/roster` — Danh sách sinh viên thuộc lớp học phần.
- `POST /api/v1/course-sections/{id}/scores/import-preview` — Tải file Excel điểm sinh viên lên để xem trước kết quả parse và kiểm tra lỗi.
- `POST /api/v1/course-sections/{id}/scores/confirm` — Xác nhận lưu điểm sinh viên vào CSDL (yêu cầu transaction và ghi `audit_logs`).
- `PUT /api/v1/course-sections/{id}/scores/{studentId}` — Cập nhật điểm từng phần của sinh viên (bắt buộc nhập `reason`).
- `POST /api/v1/course-sections/{id}/scores/lock` — Khóa bảng điểm học phần sau khi hoàn tất.

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

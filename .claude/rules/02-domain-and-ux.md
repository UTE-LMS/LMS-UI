# Rule 02 — Nghiệp vụ hiển thị và trải nghiệm người dùng

Căn cứ: `GiaiThich_CoSoDuLieu.md` (14 nguyên tắc), Rubric TC2.1, TC2.2 (xử lý trạng thái biên, phân quyền, nhất quán,
responsive), TC2.7 (SUS ≥ 80, hoàn thành tác vụ ≥ 90%). Tài liệu lệch nhau thì theo `GiaiThich_CoSoDuLieu.md`.
Rubric Nguyên tắc 2: nghiệp vụ chỉ có "hợp lý / không hợp lý so với mục tiêu và sản phẩm đã thống nhất".

## Ranh giới UI ↔ backend

- UI chỉ gọi API Spring Boot qua một lớp HTTP tập trung. **Không truy cập MongoDB.**
- **UI không tự tính công thức đo lường chính thức** (CLO/PI/PLO, tỷ lệ đạt, trọng số). Hiển thị đúng giá trị API trả
  về. Được phép tính thuần hiển thị (định dạng %, sắp xếp, lọc, tổng đếm dòng đang hiển thị) nhưng không đặt tên hay
  trình bày như kết quả đo.
- Ẩn/hiện nút, menu, route theo vai trò chỉ để tiện dùng; **việc cấm quyền do backend làm**. UI phải xử lý 401/403
  một cách rõ ràng (chuyển đăng nhập / thông báo "không đủ quyền").
- Vai trò hệ thống: ADMIN, PROGRAM_MANAGER, QA_OFFICER, LECTURER, VIEWER; phạm vi theo CTĐT/học phần/lớp. Giảng viên
  chỉ thấy lớp mình phụ trách (do API trả về, UI không tự lọc quyền).
- Không hardcode công thức, ngưỡng, trọng số, danh sách PLO/PI/CLO. Mọi danh mục lấy từ API.

## Hiển thị dữ liệu điểm và kết quả

| Tình huống | Quy tắc hiển thị |
|---|---|
| Trạng thái điểm `SCORED`, `BLANK`, `ABSENT`, `NOT_GRADED`, `EXEMPT`, `MISSING` | Mỗi trạng thái có nhãn và kiểu riêng, có chú thích; **không hiển thị thiếu dữ liệu như số 0**. `BLANK` (đã dự thi bỏ trống) mới là 0 có ghi nhận |
| Tỷ lệ đạt | Luôn đi kèm mẫu số: ghi danh, đủ dữ liệu, đạt, chưa đủ dữ liệu (`counts`) và `passRateOfEnrolled`. Không để một tỷ lệ cao che phần thiếu |
| Kết quả `INSUFFICIENT_DATA` / `NOT_APPLICABLE` | Hiển thị đúng trạng thái và lý do, không để trống hay "0%" |
| Kết quả từ quy tắc `DRAFT` hoặc chưa `CONFIRMED`, liên kết CLO–PI chưa `VERIFIED` | Gắn nhãn **"Không chính thức"** nổi bật; chỉ kết quả `isOfficial` mới được gọi là chính thức |
| Kết quả cũ (`isStale`) | Cảnh báo "điểm đã thay đổi sau lần tính" |
| Nội dung PLO/PI/CLO chưa đối chiếu (`NEEDS_CLARIFICATION`, `UNVERIFIED`) | Hiển thị trạng thái xác nhận |
| Báo cáo | Luôn hiển thị phạm vi, quy tắc và phiên bản đã dùng, `limitations` (ví dụ "dữ liệu chưa đủ để kết luận toàn CTĐT") |
| Truy vết | Từ một kết quả đi được đến điểm gốc, lô nhập và dòng trong tệp gốc khi API cung cấp (mục tiêu ≤ 3 thao tác) |

Không diễn giải Bloom, I/R/M, `capabilityLevelRaw` thành điểm hay trọng số; không tự quy đổi giữa chúng. Mức rubric
(1–4) khác mức Bloom (1–6): dùng nhãn khác nhau trên giao diện. CLO nhận diện cùng học phần/đề cương (hiển thị mã học
phần cạnh `CLO1`); PLO/PI nhận diện bằng mã, không bằng thứ tự dòng.

## Nhập điểm và tệp

- Tải tệp → ánh xạ cột → kiểm tra → xem lỗi → xác nhận. Lỗi hiển thị **theo dòng và cột** (`rowNumber`, `column`,
  `errorType`, `rawValue`, `message`), có lọc, có cách tải danh sách lỗi.
- Người nhập **chọn rõ** ô trống là `BLANK` hay `MISSING` và chính sách nhập lại cho từng lô; UI không có mặc định
  ngầm ẩn đi lựa chọn đó (Q13 còn chờ xác nhận).
- Xác nhận nhập là thao tác nguy hiểm: hiện số bản ghi dự kiến, yêu cầu xác nhận, hiển thị trạng thái xử lý và kết
  quả/rollback.
- Sửa điểm: bắt buộc lý do; xử lý xung đột đồng thời (HTTP 409 / `revision`) bằng thông báo và tải lại, không ghi đè
  im lặng. Học kỳ `SCORE_LOCKED` thì vô hiệu hóa chỉnh sửa và giải thích vì sao.

## Trạng thái biên (TC2.2: bắt buộc cho mọi màn hình dữ liệu)

Mỗi màn hình/danh sách/form phải có: **đang tải**, **rỗng** (kèm hướng dẫn việc kế tiếp), **lỗi** (kèm thử lại),
**hết thời gian**, **mất mạng**, **không đủ quyền**, **dữ liệu lớn** (phân trang/ảo hóa, không treo trình duyệt).
Form: kiểm tra hợp lệ phía client để phản hồi nhanh nhưng luôn hiển thị lỗi do backend trả về; chống bấm đúp khi gửi.

## Giao diện và khả dụng (TC2.2, TC2.7)

- Nhất quán: một bộ thành phần chung (bảng, form, thông báo, hộp thoại xác nhận, huy hiệu trạng thái) tái sử dụng,
  không mỗi màn hình một kiểu. Tailwind CSS 4 đã có sẵn.
- **Thư viện UI: người dùng đã cho phép dùng, nhưng chỉ chọn MỘT bộ** (không trộn nhiều bộ), chốt bằng ADR trước khi
  dựng màn hình đầu tiên. Ứng viên và đánh đổi (đã kiểm tra trên npm, 2026-10-20):
  - **Angular Material + CDK** (MIT; có bản `21.2.x` tương thích Angular 21): bộ chính thức của Angular, tiếp cận
    (a11y) tốt, CDK có sẵn bảng, cuộn ảo, hộp thoại, kéo thả. Bảng dữ liệu phức tạp (lọc, nhóm, chỉnh sửa tại chỗ)
    phải tự dựng nhiều hơn.
  - **PrimeNG** (có bản `21.1.x` tương thích; file giấy phép ghi "SEE LICENSE IN LICENSE.md": **phải đọc LICENSE.md
    xác nhận** trước khi dùng): bảng dữ liệu rất đầy đủ (lọc, sắp xếp, phân trang, chỉnh sửa tại chỗ), nhiều thành
    phần dựng sẵn; kéo thêm CSS/theme riêng, phối hợp với Tailwind cần cấu hình.
  - Không dùng thư viện UI nào, chỉ Tailwind: ít phụ thuộc nhất nhưng tốn công cho bảng, hộp thoại, tiếp cận.

  Khuyến nghị cho đề tài này (nhiều bảng điểm, ma trận CLO–PI, báo cáo): chọn một trong hai bộ đầu theo kinh nghiệm
  của hai sinh viên; **chọn bộ mà cả hai giải thích được** hơn là bộ nhiều tính năng nhất. Dù chọn bộ nào, bọc nó
  trong các component `shared/` của dự án để đổi thư viện sau này không phải sửa khắp nơi.
- Dùng đúng thành phần của thư viện đã chọn cho bảng, form, hộp thoại; không tự viết lại thứ thư viện có sẵn, và
  không kéo thêm thư viện thứ hai làm cùng việc (ví dụ hai bộ bảng). Thư viện biểu đồ cho dashboard chọn riêng,
  cũng ghi lý do.
- Responsive: dùng được trên màn hình máy tính nhỏ và máy tính bảng; bảng dữ liệu rộng cuộn ngang có kiểm soát, không
  vỡ bố cục. Kiểm tra ở ít nhất 3 độ rộng.
- Khả năng tiếp cận cơ bản: nhãn cho mọi ô nhập, thứ tự Tab hợp lý, tương phản đủ, không chỉ dùng màu để truyền đạt
  trạng thái (kèm chữ/biểu tượng), phím tắt/focus cho hộp thoại.
- Ngôn ngữ giao diện: tiếng Việt, thuật ngữ đúng với tài liệu (PLO, PI, CLO, Bloom, I/R/M viết nguyên). Văn bản tập
  trung để dễ sửa; chưa cần đa ngôn ngữ nếu chưa được yêu cầu.
- Thiết kế tác vụ chính ngắn gọn (nhập điểm → xem kết quả → xem báo cáo → truy vết), vì Rubric đo tỷ lệ hoàn thành
  tác vụ ≥ 90% và SUS ≥ 80 với người dùng thật (giảng viên, cán bộ phụ trách CTĐT/đảm bảo chất lượng).
  Agent có thể soạn kịch bản tác vụ và mẫu phiếu SUS; **không** tạo người tham gia hay kết quả thực nghiệm.

## Riêng tư

Dùng `studentRef` (mã thay thế) cho tới khi Khoa cho phép dùng mã thật (Q09). Không hiển thị, lưu trữ trong trình
duyệt hay ghi log thông tin cá nhân thừa. Không đưa dữ liệu thật vào repo, ảnh chụp màn hình, test hay tài liệu.

## Khi gặp điều chưa xác nhận

Các câu hỏi Q01–Q16 (`GiaiThich_CoSoDuLieu.md` §8) còn mở. Làm UI ở dạng cấu hình hoặc hiển thị theo dữ liệu API
(không cố định một đáp án), nêu giả định trong câu trả lời và nhắc người dùng cập nhật bảng Q.

# Rule 01 — Làm chủ sản phẩm và dùng AI có kiểm soát (UI)

Căn cứ: Rubric Nguyên tắc 1, TC2.3 (5 điểm), Mục 6, quy tắc chặn G3, G4.
Mức 5 TC2.3: AI Usage Log đầy đủ và đối chiếu được với commit; giải thích đúng 100% vị trí mã AI sinh khi hội đồng
chọn ≥ 5 vị trí; ≥ 5 lỗi/ảo giác AI tự phát hiện kèm nguyên nhân và commit sửa; có quy trình kiểm soát đầu ra AI.

## 1. AI Usage Log (`logsAI/ai-usage-log.md` của repo LMS-UI)

Mỗi repo có nhật ký riêng để mã commit trong log khớp với `git log` của đúng repo đó (khi nộp, gộp với nhật ký của
`D:\TLCN\LMS-API\logsAI\`). Agent làm việc ở repo này ghi vào file của repo này, không ghi sang repo khác.

Cuối mỗi phiên có tạo/sửa mã hoặc tài liệu, thêm một mục theo mẫu: **sinh viên yêu cầu**, công cụ và mô hình, phạm
vi, prompt chính (tóm tắt), file do AI sinh/sửa, phần sinh viên cần tự sửa hoặc rà soát, kiểm chứng đã làm, commit.

- Chỉ ghi điều đã thực sự xảy ra. Kê khai mâu thuẫn với lịch sử Git hoặc vấn đáp = G4 (TC2.3 = 0 điểm và kích hoạt
  quy trình đạo văn).
- Cột "Sinh viên đã sửa/rà soát" do **sinh viên** điền. Agent chỉ để "chờ sinh viên rà soát".
- Chưa commit thì ghi "chưa commit", nhắc sinh viên cập nhật mã commit sau khi commit.
- Khi người dùng yêu cầu commit có mã do AI sinh, thêm trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  để log đối chiếu được với `git log`.

## 2. Ghi lỗi và ảo giác của chính agent

Mỗi khi phát hiện (bởi test, compiler, `ng build`, review hoặc người dùng) rằng agent đã sinh sai, ghi vào bảng
"Lỗi/ảo giác AI đã phát hiện": mô tả, cách phát hiện, nguyên nhân, commit sửa. Mục tiêu ≥ 5. Ví dụ thường gặp ở
Angular: dùng API đã bị loại bỏ hoặc chưa có ở 21, trộn cú pháp cũ/mới, sai tên hàm `provide*`, đoán schema của API.
Không che giấu lỗi để log trông sạch.

## 3. Quy trình kiểm soát đầu ra AI (checklist cho mọi PR)

- [ ] `ng build` và `ng test` đã chạy thật; kết luận đúng theo output. (Thêm `npm run lint` khi đã có ESLint.)
- [ ] API Angular/RxJS/Tailwind đã đối chiếu tài liệu chính thức của **đúng phiên bản** trong `package.json`.
- [ ] Package mới (được phép dùng thư viện) có lý do, giấy phép đã đọc, phương án thay thế, đúng major tương thích
      Angular 21 (không `@latest`, không `--force`), đã ghi vào nhật ký mục D.
- [ ] Không có secret, dữ liệu sinh viên thật hay dữ liệu nhạy cảm trong mã, test, ảnh chụp, prompt.
- [ ] Không chép mã/thiết kế từ nơi khác; nếu mô phỏng mẫu công khai thì ghi nguồn và giấy phép.
- [ ] Hợp đồng API đối chiếu với backend hoặc tài liệu API thật, không suy diễn tên trường.
- [ ] Nghiệp vụ hiển thị đúng `02-domain-and-ux.md`.

## 4. Mã phải giải thích được (bởi cả hai sinh viên)

- Mỗi khối mã không tầm thường kèm phần "Để vấn đáp". Hội đồng cho tối đa 3 phút mỗi vị trí.
- Phần lõi của UI (nhập điểm và hiển thị lỗi theo dòng, hiển thị kết quả đo lường và mẫu số, truy vết, phân quyền
  hiển thị, HTTP client/interceptor): làm từng bước nhỏ, giải thích trước khi sang bước tiếp, ưu tiên mã thẳng và
  dễ đọc hơn mã "thông minh". Không giải thích được ở đây là V2 (TC2 = 0).
- Không sinh khối lớn nhiều lớp trừu tượng khi một component/service đơn giản đủ dùng. Không thêm tính năng ngoài yêu cầu.
- Mã/ý tưởng người dùng dán từ nơi khác: hỏi nguồn và giấy phép trước khi tích hợp.

## 5. Tài liệu

Chỉ viết dựa trên sự thật đã kiểm chứng trong repo hoặc tài liệu người dùng cung cấp. Không bịa tài liệu tham khảo,
số liệu hay ảnh chụp "kết quả". Bản thảo của agent là nháp để sinh viên đọc, hiểu và viết lại.

## 6. Bảo mật khi dùng AI

Không đưa vào prompt/công cụ ngoài: điểm thật, mã số sinh viên thật, thông tin cá nhân, token, khóa API. Dùng dữ
liệu giả có nhãn "DỮ LIỆU THỬ NGHIỆM". Phát hiện secret hoặc dữ liệu thật trong repo → dừng, báo, đề nghị thu hồi.

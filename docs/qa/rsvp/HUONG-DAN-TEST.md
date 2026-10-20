# Tự kiểm tra luồng RSVP của một đám cưới

File nhập mẫu: [khach-moi-rsvp-30.csv](./khach-moi-rsvp-30.csv). Đây là dữ liệu giả, không có email hoặc số điện thoại thật.

## Chuẩn bị

- Mở FE tại `http://localhost:3000`, đăng nhập bằng tài khoản host. API local cần chạy tại `http://localhost:5043` và đã cập nhật migration mới nhất.
- Dùng wedding QA mới để các số đếm không bị lẫn dữ liệu cũ. Đặt sức chứa **80**, ngày cưới và hạn RSVP ở tương lai.
- File CSV có **30 đầu mối nhận thiệp, 65 chỗ dự kiến**: 10 Nhà gái, 10 Nhà trai, 10 Chung; 6 Gia đình, 6 Nhóm, 18 Cá nhân. Tất cả 9 cột và tên nhóm đều hợp lệ theo FE hiện tại.
- Không bấm gửi email/SMS cho dữ liệu mẫu vì file để trống thông tin liên hệ. Kiểm tra bằng link thiệp cá nhân; muốn thử gửi thật, hãy thay thông tin liên hệ bằng email/số của chính bạn và cấu hình dịch vụ gửi.

## 1. Tạo wedding và nhập khách

1. Tạo wedding mới trong **Weddings**. Ví dụ: `RSVP QA của tôi`, sức chứa `80`, ngày cưới sau hôm nay ít nhất một tháng, hạn RSVP trước ngày cưới nhưng vẫn ở tương lai.
2. Vào **Guests → Nhập Excel / CSV → Chọn file**, chọn `khach-moi-rsvp-30.csv`.
3. Ở preview phải thấy **30 dòng hợp lệ, 65 người dự kiến, 0 dòng lỗi, 0 nhóm cần xác nhận**. Bấm nhập.
4. Danh sách khách phải có **30 đầu mối**. Kiểm tra `Khách QA 01 An` có 4 chỗ, `Khách QA 02 Bình` có 3 chỗ, `Khách QA 03 Chi` có 1 chỗ. Kiểm tra lọc phía Nhà gái/Nhà trai/Chung và nhóm khách.

## 2. Lưu thiệp và mở form RSVP

1. Vào **Invitations → Chọn mẫu thiệp**. Trong Studio, sửa tên/câu chữ mẫu cho phù hợp wedding QA, thêm tiện ích **Form xác nhận tham dự**, rồi bấm **Lưu & áp dụng**.
2. Quay lại **Guests**, mở link thiệp cá nhân của `Khách QA 01 An`. Thiệp phải hiển thị và nút RSVP phải mở được form.
3. Form của An phải có **4 dòng**: người đại diện đã có tên và 3 chỗ còn trống. Đây là 4 chỗ của một thiệp, không phải 4 thiệp.

## 3. Kiểm tra RSVP và dashboard realtime

1. Giữ **RSVP dashboard của host** mở ở tab A. Mở link thiệp của An ở tab B; trước khi trả lời, dashboard là **0/30 thiệp trả lời, 0 người xác nhận, còn 80 chỗ**.
2. Ở tab B, chọn An đi, điền tên và chọn đi cho 2 người cùng, để chỗ thứ tư trống. Thêm ghi chú `QA: muốn gần lối đi`, bấm **Gửi xác nhận**.
3. Không tải lại tab A. Dashboard phải tự đổi thành **1/30 thiệp trả lời, 3 người xác nhận, còn 77 chỗ**. Dòng An hiện **3/4**. Tab khách hiển thị đã lưu và có nút cập nhật.
4. Mở link `Khách QA 03 Chi` (1 chỗ), chọn **Không** rồi gửi. Dashboard phải tăng số thiệp trả lời, số người xác nhận giữ nguyên; Chi hiện không tham dự.

## 4. Waitlist và duyệt người đi thêm

1. Giữ **Waitlist** của host mở ở tab A. Mở link `Khách QA 02 Bình` ở tab B. Bình có 3 chỗ: cho Bình cùng 2 người đi, bấm **+ Khai thêm người đi cùng** để thêm người thứ tư, rồi gửi.
2. Tab khách phải hiển thị **3 người xác nhận, 1 người chờ duyệt**. Tab Waitlist phải xuất hiện yêu cầu của Bình mà không cần tải lại.
3. Host bấm **Nhận khách**. Hàng chờ biến mất. Tải lại tab khách để kiểm tra **4 người xác nhận, 0 người chờ** và thiệp đã có 4 chỗ.
4. Có thể lặp lại với một thiệp khác và bấm **Từ chối** để kiểm tra nhánh còn lại.

## 5. Khóa RSVP và yêu cầu đổi

1. Ở dashboard host, mở chi tiết `Khách QA 04 Dũng` và bật **khóa RSVP** cho thiệp này.
2. Mở link của Dũng trong tab khách, chọn tham dự và gửi. Kết quả phải báo **đang chờ host duyệt**; số người xác nhận trên dashboard chưa tăng.
3. Vào **Waitlist → Yêu cầu thay đổi**, bấm duyệt. Sau đó Dũng mới được tính vào số người xác nhận. Lặp lại với một khách khác và từ chối yêu cầu để kiểm tra số đếm giữ nguyên.

## 6. Xếp ghế và kiểm tra thay đổi RSVP

1. Vào **Seating**, tạo bàn 4 ghế và xếp cả 4 chỗ của An vào bàn. Ghế thứ tư vẫn là chỗ chưa dùng; không tự xóa ghế.
2. Bấm **Công bố chỗ ngồi**. Ở form RSVP của An, sau khi tải lại, chỉ **3 người đã xác nhận** có số bàn/ghế; chỗ trống không hiện cho khách.
3. Giữ Seating của host mở. Ở tab khách, cập nhật một người đi cùng của An thành **Không**. Seating phải tự hiện cảnh báo **1 ghế đã gán cho người không còn tham dự**; ghế vẫn còn để host xử lý.
4. Người mới được nhận từ waitlist sẽ có chỗ mời nhưng **chưa tự được xếp bàn**. Kiểm tra người đó trong hàng chờ xếp chỗ của Seating.

## 7. Kiểm tra nội dung gửi thiệp

1. Trong **Invitations**, lưu bản nháp email với subject `Thiệp mời {{GuestName}}`; nội dung có đủ `{{GuestName}}`, `{{RsvpLink}}`, `{{QrLink}}`. Nội dung SMS có `{{GuestName}}` và `{{RsvpLink}}`.
2. Chọn An và bấm **Xem trước**. Subject phải là `Thiệp mời Khách QA 01 An`; nội dung có link thiệp cá nhân và QR tải được từ API local.
3. File mẫu không có contact, nên UI phải báo thiếu email/điện thoại và không thể gửi hàng loạt cho các dòng đó. Đây là kết quả đúng.

## Ghi lại lỗi nếu có

Gửi kèm **bước đang làm, tên khách QA, số đếm trước/sau, ảnh chụp màn hình và lỗi trong Network/Console**. Nếu API RSVP trả 404 trên DB local cũ, kiểm tra migration trước khi đánh giá luồng FE.

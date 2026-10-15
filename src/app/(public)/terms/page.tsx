import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="public-info-page">
      <p className="landing-eyebrow">THÔNG TIN SẢN PHẨM</p>
      <h1>Điều khoản sử dụng</h1>
      <p>
        InviteMe đang trong quá trình phát triển. Điều khoản sử dụng chính thức chưa được công bố.
      </p>
      <h2>Về bản xem trước</h2>
      <p>
        Các mẫu trên landing dùng dữ liệu minh họa. Thao tác RSVP trong demo không gửi lời mời và
        không lưu phản hồi.
      </p>
      <p>
        Nội dung này là thông báo trạng thái sản phẩm, chưa phải bộ điều khoản cho dịch vụ thương
        mại.
      </p>
      <Link className="landing-button" href="/">
        Về trang chủ
      </Link>
    </article>
  );
}

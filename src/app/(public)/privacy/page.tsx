import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="public-info-page">
      <p className="landing-eyebrow">THÔNG TIN SẢN PHẨM</p>
      <h1>Quyền riêng tư</h1>
      <p>Chính sách quyền riêng tư chính thức của InviteMe đang được hoàn thiện.</p>
      <h2>Dữ liệu trong demo</h2>
      <p>
        Mẫu thiệp và danh sách khách minh họa trên landing không phải dữ liệu khách thật. Phản hồi
        thử trong demo chỉ hiển thị trên màn hình, không gửi đến hệ thống RSVP.
      </p>
      <h2>Thông tin khách mời</h2>
      <p>
        Danh sách khách mời không thuộc nội dung giới thiệu công khai của sản phẩm. Phạm vi truy cập
        và việc xử lý dữ liệu trong dịch vụ sẽ được mô tả trong chính sách chính thức.
      </p>
      <Link className="landing-button" href="/">
        Về trang chủ
      </Link>
    </article>
  );
}

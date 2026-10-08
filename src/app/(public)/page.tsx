import { CalendarDays, HeartHandshake, Users } from "lucide-react";
import { PublicLandingHero } from "@/features/public";

const benefits = [
  {
    Icon: CalendarDays,
    title: "Một nơi cho ngày vui",
    text: "Gom câu chuyện, lịch trình và những thông tin quan trọng vào một trang dễ chia sẻ.",
  },
  {
    Icon: Users,
    title: "Khách mời luôn được kết nối",
    text: "Thiết kế trải nghiệm lời mời gần gũi, dễ xem trên điện thoại của mọi người.",
  },
  {
    Icon: HeartHandshake,
    title: "Chuẩn bị cùng nhau",
    text: "InviteMe đang được xây dựng để hai bạn và người thân cùng chuẩn bị ngày cưới.",
  },
];

export default function HomePage() {
  return (
    <div>
      <PublicLandingHero />

      <section id="features" aria-labelledby="features-heading" className="public-features">
        <div className="public-features__intro">
          <p className="public-features__eyebrow">Ngày vui bắt đầu từ những điều nhỏ</p>
          <h2 id="features-heading">Cùng nhau chuẩn bị, để vui trọn từng khoảnh khắc</h2>
        </div>
        <div className="public-features__grid">
          {benefits.map(({ Icon, title, text }) => (
            <article key={title} className="public-feature-card">
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="public-development-note">
        InviteMe đang trong quá trình phát triển. Một số tính năng quản lý tiệc cưới chưa sẵn sàng.
      </p>
    </div>
  );
}

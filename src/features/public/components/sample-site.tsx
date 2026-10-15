import Image from "next/image";
import { Heart } from "lucide-react";

type Layout = "invite" | "story";

export function SampleSite({ layout }: { layout: Layout }) {
  return (
    <div className={`sample-site sample-site--${layout}`}>
      <div className="sample-site__nav">
        <span>Minh & Lan</span>
        <span>{layout === "story" ? "Câu chuyện · Ngày cưới" : "Lời mời · Ngày cưới"}</span>
      </div>
      <div className="sample-site__hero">
        <div className="sample-site__photo">
          <Image
            src={
              layout === "invite"
                ? "/images/templates/invite-portrait.png"
                : "/images/templates/story-meadow.png"
            }
            alt="Cặp đôi trong mẫu trang cưới minh họa"
            fill
            sizes="(max-width: 700px) 90vw, 540px"
          />
        </div>
        <div className="sample-site__copy">
          <small>CHÚNG MÌNH SẮP CƯỚI</small>
          <h3>Minh & Lan</h3>
          <p>18 · 10 · 2026</p>
          <span className="sample-site__pill">Xác nhận tham dự</span>
        </div>
      </div>
      {layout === "story" ? (
        <div className="sample-site__story">
          <h4>Hành trình của chúng mình</h4>
          <div className="sample-site__timeline">
            <span>Lần đầu gặp gỡ</span>
            <Heart size={14} />
            <span>Cùng đón ngày vui</span>
          </div>
          <div className="sample-site__album">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Image
                  src="/images/templates/story-meadow.png"
                  alt="Ảnh kỷ niệm minh họa"
                  fill
                  sizes="160px"
                  style={{ objectPosition: `${30 + i * 30}% center` }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sample-site__event">
          <span>17:00 · Chủ nhật</span>
          <span>Không gian tiệc cưới · Hà Nội</span>
        </div>
      )}
    </div>
  );
}

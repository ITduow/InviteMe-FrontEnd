import Image from "next/image";
import { Heart } from "lucide-react";

export function StoryCover() {
  return (
    <div
      className="story-cover"
      aria-label="Minh họa Wedding Story với câu chuyện, dấu mốc và album ảnh"
    >
      <div className="story-cover__intro">
        <span>WEDDING STORY</span>
        <h4>
          Câu chuyện
          <br />
          của chúng mình
        </h4>
        <p>
          Từ lần đầu gặp gỡ
          <br />
          đến một đời bên nhau.
        </p>
      </div>
      <div className="story-cover__portrait">
        <Image
          src="/images/templates/story-meadow.png"
          alt="Cặp đôi trong ảnh kỷ niệm AI"
          fill
          sizes="240px"
        />
      </div>
      <div className="story-cover__timeline">
        <span>Gặp gỡ</span>
        <i />
        <Heart size={14} />
        <i />
        <span>Ngày chung đôi</span>
      </div>
      <div className="story-cover__photos">
        {[
          "/images/templates/story-meadow.png",
          "/images/templates/invite-portrait.png",
          "/images/templates/story-meadow.png",
        ].map((src, i) => (
          <div key={i}>
            <div className="story-cover__photo">
              <Image
                src={src}
                alt={`Khoảnh khắc AI minh họa ${i + 1}`}
                fill
                sizes="180px"
                style={{ objectPosition: i === 2 ? "70% center" : "center" }}
              />
            </div>
            <span>{["Một cuộc hẹn", "Một lời hứa", "Một hành trình"][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

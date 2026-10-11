"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Heart,
  Monitor,
  Send,
  Users,
} from "lucide-react";
import Image from "next/image";
import { SampleSite } from "./sample-site";
import { StoryCover } from "./story-cover";

const templates = [
  {
    id: "invite" as const,
    title: "Wedding Invite",
    text: "Lời mời gọn gàng, đầy đủ thông tin ngày vui và xác nhận tham dự.",
  },
  {
    id: "story" as const,
    title: "Wedding Story",
    text: "Kể câu chuyện của hai bạn qua hình ảnh, kỷ niệm và những dấu mốc.",
  },
];

function SectionBotanicals() {
  return (
    <div className="section-botanicals" aria-hidden="true">
      {["left", "right"].map((side) => (
        <div
          className={`section-botanicals__branch section-botanicals__branch--${side}`}
          key={side}
        >
          <Image
            src="/images/hero/botanical-stem-v2.webp"
            alt=""
            fill
            sizes="180px"
            className="section-botanicals__stem"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <span className={`section-botanicals__leaf section-botanicals__leaf--${i}`} key={i}>
              <Image src="/images/hero/botanical-leaf.webp" alt="" fill sizes="90px" />
            </span>
          ))}
          <span className="section-botanicals__gold">
            <Image src="/images/hero/botanical-gold.webp" alt="" fill sizes="150px" />
          </span>
        </div>
      ))}
    </div>
  );
}
const questions = [
  [
    "Khách có cần tài khoản không?",
    "Khách xem lời mời và xác nhận tham dự qua link mời hợp lệ, không cần tài khoản InviteMe.",
  ],
  [
    "Ai xem được danh sách khách mời?",
    "Danh sách khách và phản hồi dành cho chủ tiệc và người được cấp quyền quản lý. Không hiển thị công khai trên trang cưới.",
  ],
  [
    "Wedding Invite và Wedding Story khác nhau thế nào?",
    "Invite ưu tiên thông tin lời mời; Story dành thêm không gian cho câu chuyện và ảnh. Cả hai cùng sử dụng thông tin ngày cưới và RSVP.",
  ],
  [
    "Demo có lưu phản hồi của mình không?",
    "Không. Demo dùng dữ liệu minh họa để bạn xem bố cục; mọi thao tác thử chỉ diễn ra trên màn hình này.",
  ],
  [
    "Link lời mời không mở được thì sao?",
    "Kiểm tra lại link hoặc liên hệ người gửi để nhận lời mời hợp lệ.",
  ],
];

export function LandingContent() {
  return (
    <div className="landing-content">
      <section id="templates" className="landing-section" aria-labelledby="template-title">
        <div className="landing-heading">
          <p className="landing-eyebrow">MẪU TRANG CƯỚI</p>
          <h2 id="template-title">Khám phá các mẫu thiết kế</h2>
          <p>Chọn thiệp mời hoặc trang kể chuyện để khám phá mẫu phù hợp với hai bạn.</p>
        </div>
        <div className="landing-template-grid">
          {templates.map((t) => (
            <article className="landing-template" key={t.id}>
              <div className="landing-template__preview">
                {t.id === "story" ? (
                  <StoryCover />
                ) : (
                  <div className="landing-category-image">
                    <Image
                      src={
                        t.id === "invite"
                          ? "/images/templates/invite-portrait.png"
                          : "/images/templates/story-meadow.png"
                      }
                      alt={
                        t.id === "invite"
                          ? "Ảnh cưới AI minh họa cho nhóm thiệp mời"
                          : "Ảnh cưới AI minh họa cho nhóm trang kể chuyện"
                      }
                      fill
                      sizes="(max-width: 640px) 90vw, 550px"
                    />
                    <span className="landing-category-image__label">
                      {t.id === "invite" ? "THIỆP MỜI ONLINE" : "TRANG CƯỚI & CÂU CHUYỆN"}
                    </span>
                  </div>
                )}
              </div>
              <div className="landing-template__body">
                <h3>{t.title}</h3>
                <p>{t.text}</p>
                <div className="landing-actions">
                  <Link className="landing-button" href={`/templates/${t.id}`}>
                    {t.id === "invite" ? "Xem các mẫu thiệp" : "Xem các mẫu trang cưới"}{" "}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="landing-caption">Khám phá danh sách mẫu và xem demo trước khi đăng nhập.</p>
      </section>
      <section id="features" className="landing-section" aria-labelledby="feature-title">
        <div className="landing-heading">
          <p className="landing-eyebrow">CÙNG NHAU CHUẨN BỊ</p>
          <h2 id="feature-title">Để vui trọn từng khoảnh khắc</h2>
          <p>Trang cưới, lời mời và phản hồi của khách — trong một nơi.</p>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature">
            <div className="landing-feature__visual">
              <div className="mini-website">
                <SampleSite layout="invite" />
              </div>
            </div>
            <div className="landing-feature__body">
              <Monitor />
              <h3>Trang cưới</h3>
              <p>Chia sẻ thông tin ngày cưới, hình ảnh và câu chuyện của hai bạn.</p>
              <span>Giao diện minh họa</span>
            </div>
          </article>
          <article className="landing-feature">
            <div className="landing-feature__visual">
              <div className="mini-rsvp">
                <Heart size={20} />
                <h4>Bạn sẽ đến chung vui?</h4>
                <span className="mini-rsvp__selected">
                  <Check size={14} /> Có, mình sẽ tham dự
                </span>
                <span>Rất tiếc, mình không thể đến</span>
                <div className="sample-site__pill">Gửi xác nhận</div>
              </div>
            </div>
            <div className="landing-feature__body">
              <Send />
              <h3>RSVP</h3>
              <p>Khách xác nhận tham dự dễ dàng qua link lời mời hợp lệ.</p>
              <span>Giao diện minh họa</span>
            </div>
          </article>
          <article className="landing-feature">
            <div className="landing-feature__visual">
              <div className="mini-guests">
                <h4>Danh sách khách mời</h4>
                <div className="mini-guests__head">
                  Khách minh họa <span>Trạng thái</span>
                </div>
                {["Khách A", "Khách B", "Khách C"].map((name, i) => (
                  <div key={name}>
                    <span className="mini-guests__avatar">{name.slice(-1)}</span>
                    {name}
                    <span className={i === 2 ? "pending" : "confirmed"}>
                      {i === 2 ? "Chưa phản hồi" : "Tham dự"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="landing-feature__body">
              <Users />
              <h3>Quản lý khách mời</h3>
              <p>Theo dõi danh sách khách và trạng thái phản hồi trong khu vực riêng.</p>
              <span>Giao diện minh họa · dành cho chủ tiệc</span>
            </div>
          </article>
        </div>
      </section>
      <section
        id="guide"
        className="landing-section landing-decorated"
        aria-labelledby="guide-title"
      >
        <SectionBotanicals />
        <div className="landing-heading">
          <p className="landing-eyebrow">HƯỚNG DẪN BẮT ĐẦU</p>
          <h2 id="guide-title">Bắt đầu với 3 bước</h2>
          <p>Từ lời mời của hai bạn đến những người thân yêu.</p>
        </div>
        <div className="landing-step-grid">
          {[
            {
              Icon: Heart,
              title: "Chọn mẫu",
              text: "Xem thử Invite hoặc Story, chọn cách thể hiện bạn yêu thích.",
            },
            {
              Icon: CalendarDays,
              title: "Điền thông tin",
              text: "Cập nhật tên, thời gian, địa điểm và những hình ảnh của hai bạn.",
            },
            {
              Icon: Copy,
              title: "Chia sẻ link",
              text: "Gửi lời mời để khách xem thông tin và xác nhận tham dự.",
            },
          ].map(({ Icon, title, text }, i) => (
            <article className="landing-step" key={title}>
              <span className="landing-step__number">0{i + 1}</span>
              <Icon className="landing-step__icon" strokeWidth={1.2} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        id="faq"
        className="landing-section landing-faq landing-decorated"
        aria-labelledby="faq-title"
      >
        <SectionBotanicals />
        <div className="landing-heading">
          <p className="landing-eyebrow">CÂU HỎI THƯỜNG GẶP</p>
          <h2 id="faq-title">Một vài thắc mắc thường gặp</h2>
        </div>
        {questions.map(([question, answer], i) => (
          <details key={question} open={i === 0}>
            <summary>
              {question}
              <ChevronDown size={18} />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <section className="landing-section landing-closing">
        <SectionBotanicals />
        <p className="landing-eyebrow">SẴN SÀNG BẮT ĐẦU?</p>
        <h2>Tạo trang cưới của riêng hai bạn</h2>
        <p>Một lời mời thật riêng, cùng đón một ngày thật đẹp.</p>
        <Link className="landing-button" href="/login">
          Bắt đầu cùng InviteMe <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}

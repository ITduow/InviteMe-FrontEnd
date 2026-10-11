"use client";

import Image from "next/image";
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
  X,
} from "lucide-react";
import { useRef, useState } from "react";

type Layout = "invite" | "story";
const photo = "/images/hero/wedding-poster.webp";
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

function SampleSite({ layout }: { layout: Layout }) {
  return (
    <div className={`sample-site sample-site--${layout}`}>
      <div className="sample-site__nav">
        <span>Minh & Lan</span>
        <span>{layout === "story" ? "Câu chuyện · Ngày cưới" : "Lời mời · Ngày cưới"}</span>
      </div>
      <div className="sample-site__hero">
        <div className="sample-site__photo">
          <Image
            src={photo}
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
                  src={photo}
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

export function LandingContent() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Layout>("invite");
  const [sent, setSent] = useState(false);
  function preview(layout: Layout) {
    setSelected(layout);
    setSent(false);
    dialog.current?.showModal();
  }
  return (
    <div className="landing-content">
      <section id="templates" className="landing-section" aria-labelledby="template-title">
        <div className="landing-heading">
          <p className="landing-eyebrow">MẪU TRANG CƯỚI</p>
          <h2 id="template-title">Chọn mẫu cho ngày vui</h2>
          <p>Hai cách thể hiện, cùng một ngày cưới đáng nhớ.</p>
        </div>
        <div className="landing-template-grid">
          {templates.map((t) => (
            <article className="landing-template" key={t.id}>
              <div className="landing-template__preview">
                <span className="landing-demo-label">Dữ liệu minh họa</span>
                <SampleSite layout={t.id} />
              </div>
              <div className="landing-template__body">
                <h3>{t.title}</h3>
                <p>{t.text}</p>
                <div className="landing-actions">
                  <button
                    className="landing-button landing-button--outline"
                    onClick={() => preview(t.id)}
                  >
                    Xem demo
                  </button>
                  <Link className="landing-button" href="/login">
                    Dùng mẫu <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="landing-caption">
          Xem demo không cần tài khoản. Đăng nhập để bắt đầu tạo trang cưới.
        </p>
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
      <section id="guide" className="landing-section" aria-labelledby="guide-title">
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
      <section id="faq" className="landing-section landing-faq" aria-labelledby="faq-title">
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
        <p className="landing-eyebrow">SẴN SÀNG BẮT ĐẦU?</p>
        <h2>Tạo trang cưới của riêng hai bạn</h2>
        <p>Một lời mời thật riêng, cùng đón một ngày thật đẹp.</p>
        <Link className="landing-button" href="/login">
          Bắt đầu cùng InviteMe <ArrowRight size={16} />
        </Link>
      </section>
      <dialog
        aria-labelledby="demo-title"
        className="landing-dialog"
        ref={dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="landing-dialog__toolbar">
          <div>
            <strong id="demo-title">
              {selected === "invite" ? "Wedding Invite" : "Wedding Story"}
            </strong>
            <p>Demo · dữ liệu minh họa · không lưu phản hồi</p>
          </div>
          <button aria-label="Đóng demo" onClick={() => dialog.current?.close()}>
            <X />
          </button>
        </div>
        <div className="landing-dialog__content">
          <SampleSite layout={selected} />
          <div className="demo-event">
            <h3>Hẹn gặp bạn trong ngày vui</h3>
            <p>17:00 · 18/10/2026</p>
            <p>Không gian tiệc cưới minh họa · Hà Nội</p>
          </div>
          <form
            className="demo-rsvp"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <h3>Bạn sẽ đến chung vui?</h3>
            <fieldset>
              <legend>Phản hồi tham dự</legend>
              <label>
                <input type="radio" name="attendance" value="yes" required defaultChecked /> Có,
                mình sẽ tham dự
              </label>
              <label>
                <input type="radio" name="attendance" value="no" /> Rất tiếc, mình không thể đến
              </label>
            </fieldset>
            <button className="landing-button" type="submit">
              Thử xác nhận <ArrowRight size={16} />
            </button>
            <p role="status">
              {sent
                ? "Bạn đã thử gửi phản hồi. Demo không lưu thông tin này."
                : "Đây là demo, không phải lời mời thật."}
            </p>
          </form>
          <Link className="landing-button landing-button--outline" href="/login">
            Đăng nhập để bắt đầu
          </Link>
        </div>
      </dialog>
    </div>
  );
}

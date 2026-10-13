"use client";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import { SampleSite } from "./sample-site";

type Layout = "invite" | "story";
const designs = [
  {
    id: "story" as const,
    title: "Cùng nhau đi tiếp",
    type: "Wedding Story",
    description: "Trang cưới có ảnh mở đầu, hành trình tình yêu, album và RSVP.",
  },
];
export function TemplateCatalog({
  category,
  inviteTemplates = [],
}: {
  category?: Layout;
  inviteTemplates?: { id: string; name: string; description: string; preview: ReactNode }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Layout>("invite");
  const [sent, setSent] = useState(false);
  function preview(layout: Layout) {
    setSelected(layout);
    setSent(false);
    dialog.current?.showModal();
  }
  const visible = designs.filter((t) => !category || t.id === category);
  return (
    <div className={`template-catalog ${category === "invite" ? "template-catalog--invite" : ""}`}>
      <Link href="/#templates" className="template-catalog__back">
        ← Về trang chủ
      </Link>
      <div className="landing-heading">
        <p className="landing-eyebrow">BỘ SƯU TẬP THIẾT KẾ</p>
        <h1>
          {category === "invite"
            ? "Các mẫu thiệp mời"
            : category === "story"
              ? "Các mẫu trang cưới"
              : "Khám phá mẫu thiết kế"}
        </h1>
        <p>Xem trước thiết kế, chọn cách thể hiện ngày vui của hai bạn.</p>
      </div>
      <nav className="template-catalog__tabs" aria-label="Nhóm mẫu thiết kế">
        {[
          { href: "/templates", label: "Tất cả", active: !category },
          { href: "/templates/invite", label: "Wedding Invite", active: category === "invite" },
          { href: "/templates/story", label: "Wedding Story", active: category === "story" },
        ].map((t) => (
          <Link href={t.href} key={t.href} aria-current={t.active ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="template-catalog__note">
        Mẫu minh họa cho bản MVP · ảnh tạo bằng AI · demo không lưu phản hồi.
      </p>
      <div className="invite-template-grid">
        {category !== "story" &&
          inviteTemplates.map((template) => (
            <article className="invite-template-card" key={template.id}>
              <Link
                className="invite-template-card__preview"
                aria-label={`Xem mẫu ${template.name}`}
                href={`/template-studio?template=${template.id}&preview=1`}
              >
                {template.preview}
              </Link>
              <div className="invite-template-card__overlay">
                <h2>{template.name}</h2>
                <p className="invite-template-card__tags">
                  <span>Tùy chỉnh</span>
                  <span>Bìa mở thiệp</span>
                </p>
                <div className="landing-actions">
                  <Link
                    className="landing-button landing-button--outline"
                    href={`/template-studio?template=${template.id}&preview=1`}
                  >
                    Xem demo
                  </Link>
                  <Link
                    className="landing-button"
                    href={`/template-studio?template=${template.id}`}
                  >
                    Dùng mẫu <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
      </div>
      <div className="landing-template-grid">
        {visible.map((t) => (
          <article className="landing-template" key={t.id}>
            <div className="landing-template__preview">
              <span className="landing-demo-label">{t.type} · Minh họa</span>
              <SampleSite layout={t.id} />
            </div>
            <div className="landing-template__body">
              <h2>{t.title}</h2>
              <p>{t.description}</p>
              <div className="landing-actions">
                <button
                  className="landing-button landing-button--outline"
                  onClick={() => preview(t.id)}
                >
                  Xem demo
                </button>
                <Link
                  className="landing-button"
                  href={`/login?returnTo=${encodeURIComponent(`/weddings/new?template=${t.id}`)}`}
                >
                  Dùng mẫu <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="landing-caption">
        15 mẫu thiệp mời có thể chỉnh trong editor. Lưu thiết kế vào tài khoản chưa được kết nối.
      </p>
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
          <Link
            className="landing-button landing-button--outline"
            href={`/login?returnTo=${encodeURIComponent(`/weddings/new?template=${selected}`)}`}
          >
            Đăng nhập để bắt đầu
          </Link>
        </div>
      </dialog>
    </div>
  );
}

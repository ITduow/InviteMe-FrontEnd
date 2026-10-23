import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/brand-logo";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-nav">
        <div className="public-nav__inner">
          <BrandLogo
            href="/"
            size="lg"
            className="public-nav__brand"
            ariaLabel="InviteMe — Trang chủ"
          />
          <nav aria-label="Điều hướng chính" className="public-nav__links">
            <Link href="/templates">Mẫu thiết kế</Link>
            <Link href="/#features">Tính năng</Link>
            <Link href="/#guide">Hướng dẫn</Link>
            <Link href="/login">Đăng nhập</Link>
            <Link href="/register" className="public-nav__cta">
              Bắt đầu
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" className="public-main">
        {children}
      </main>
      <footer className="public-footer">
        <div className="public-footer__top">
          <BrandLogo
            href="/"
            size="sm"
            className="public-footer__brand"
            ariaLabel="InviteMe — Trang chủ"
          />
          <nav aria-label="Điều hướng chân trang" className="public-footer__links">
            <Link href="/templates">Mẫu thiết kế</Link>
            <Link href="/#guide">Hướng dẫn</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/#contact">Liên hệ</Link>
            <Link href="/terms">Điều khoản</Link>
            <Link href="/privacy">Quyền riêng tư</Link>
          </nav>
        </div>
        <div id="contact" className="public-footer__support">
          <strong>Liên hệ & hỗ trợ</strong>
          <p>
            Kênh hỗ trợ của InviteMe sẽ được cập nhật. Nếu link mời không mở được, hãy liên hệ người
            gửi lời mời.
          </p>
        </div>
        <div className="public-footer__bottom">
          <p>Dành cho những ngày vui đáng nhớ.</p>
          <p>InviteMe đang phát triển · Preview dùng dữ liệu minh họa.</p>
        </div>
      </footer>
    </div>
  );
}

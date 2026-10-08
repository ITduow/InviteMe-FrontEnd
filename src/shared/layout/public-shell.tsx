import Link from "next/link";
import { Flower2 } from "lucide-react";
import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-nav">
        <div className="public-nav__inner">
          <Link href="/" className="public-nav__brand" aria-label="InviteMe — Trang chủ">
            <Flower2 className="size-6" aria-hidden="true" />
            InviteMe
          </Link>
          <nav aria-label="Điều hướng chính" className="public-nav__links">
            <Link href="#features">Tính năng</Link>
            <Link href="/pricing">Bảng giá</Link>
            <Link href="/login">Đăng nhập</Link>
            <Link href="/register" className="public-nav__cta">
              Bắt đầu miễn phí
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" className="public-main">
        {children}
      </main>
      <footer className="public-footer">InviteMe · Dành cho những ngày vui đáng nhớ.</footer>
    </div>
  );
}

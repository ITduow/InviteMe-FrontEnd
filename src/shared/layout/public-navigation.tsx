"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/shared/components/brand-logo";

const links = [
  { href: "/templates", label: "Mẫu thiết kế" },
  { href: "/#features", label: "Tính năng" },
  { href: "/#guide", label: "Hướng dẫn" },
  { href: "/login", label: "Đăng nhập" },
  { href: "/register", label: "Bắt đầu" },
] as const;

export function PublicNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeMenu() {
      setOpen(false);
    }
    window.addEventListener("popstate", closeMenu);
    return () => window.removeEventListener("popstate", closeMenu);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <header ref={headerRef} className="public-nav" data-open={open}>
      <div className="public-nav__inner">
        <BrandLogo
          href="/"
          size="lg"
          className="public-nav__brand"
          ariaLabel="InviteMe — Trang chủ"
        />
        <button
          ref={toggleRef}
          type="button"
          className="public-nav__toggle"
          aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={open}
          aria-controls="public-navigation-links"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav
          id="public-navigation-links"
          aria-label="Điều hướng chính"
          className="public-nav__links"
        >
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={href === pathname ? "page" : undefined}
              className={href === "/register" ? "public-nav__cta" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

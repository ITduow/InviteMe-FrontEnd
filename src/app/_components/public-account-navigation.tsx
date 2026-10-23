"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { UserMenu, useCurrentUser } from "@/features/auth";

export function PublicAccountNavigation() {
  const { user, isLoading } = useCurrentUser();
  const { t } = useTranslation("auth");
  if (isLoading)
    return <div className="size-9 animate-pulse rounded-full bg-muted" aria-busy="true" />;
  if (!user)
    return (
      <>
        <Link href="/login">{t("login")}</Link>
        <Link href="/register" className="public-nav__cta">
          {t("register")}
        </Link>
      </>
    );
  return (
    <>
      <Link
        href={user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard"}
        className="public-nav__cta"
      >
        {t("openWorkspace")}
      </Link>
      <UserMenu />
    </>
  );
}

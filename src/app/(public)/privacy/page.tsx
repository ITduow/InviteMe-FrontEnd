"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function PrivacyPage() {
  const { t } = useTranslation("public");
  return (
    <article className="public-info-page">
      <p className="landing-eyebrow">{t("productInformation")}</p>
      <h1>{t("privacyTitle")}</h1>
      <p>{t("privacyDevelopmentNotice")}</p>
      <h2>{t("demoDataHeading")}</h2>
      <p>{t("privacyDemoDescription")}</p>
      <h2>{t("guestDataHeading")}</h2>
      <p>{t("privacyGuestDescription")}</p>
      <Link className="landing-button" href="/">
        {t("homeLink")}
      </Link>
    </article>
  );
}

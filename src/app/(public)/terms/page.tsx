"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function TermsPage() {
  const { t } = useTranslation("public");
  return (
    <article className="public-info-page">
      <p className="landing-eyebrow">{t("productInformation")}</p>
      <h1>{t("termsTitle")}</h1>
      <p>{t("termsDevelopmentNotice")}</p>
      <h2>{t("previewHeading")}</h2>
      <p>{t("termsPreviewDescription")}</p>
      <p>{t("termsDisclaimer")}</p>
      <Link className="landing-button" href="/">
        {t("homeLink")}
      </Link>
    </article>
  );
}

"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { ApiError } from "@/core/api/api-error";
import { Button } from "@/shared/ui/button";
import { authApi } from "../api/auth.api";
import { ConfirmationNotice } from "./confirmation-notice";
export function ConfirmEmailForm() {
  const { t } = useTranslation("auth");
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const code = params.get("code") ?? "";
  const validEmail = z.email().max(255).safeParse(email).success;
  const valid =
    validEmail &&
    code.trim().length > 0 &&
    code.length <= 2048 &&
    params.getAll("email").length === 1 &&
    params.getAll("code").length === 1;
  const { api } = useRuntime();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (!valid || pending) return;
    setPending(true);
    setError("");
    try {
      await authApi.confirmEmail(api, email, code);
      setDone(true);
      window.history.replaceState(window.history.state, "", "/confirm-email");
    } catch (error) {
      setError(
        error instanceof ApiError && error.code === "network"
          ? t("networkError")
          : error instanceof ApiError && error.status === 429
            ? t("tooManyAttempts")
            : error instanceof ApiError && error.status >= 500
              ? t("systemError")
              : t("invalidVerificationLink"),
      );
    } finally {
      setPending(false);
    }
  }
  if (done)
    return (
      <div className="space-y-5">
        <h1 className="font-display text-3xl">{t("emailConfirmed")}</h1>
        <p className="text-sm text-muted-foreground">{t("accountActivated")}</p>
        <Button asChild className="w-full">
          <Link href="/login">{t("goToLogin")}</Link>
        </Button>
      </div>
    );
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl">{t("confirmEmail")}</h1>
      {valid ? (
        <>
          <p className="break-words text-sm text-muted-foreground">
            {t("confirmAddress", { email })}
          </p>
          <Button className="w-full" onClick={confirm} disabled={pending || !env.apiUrl}>
            {pending ? t("confirmingEmail") : t("confirmMyEmail")}
          </Button>
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {t("invalidVerificationLink")}
        </p>
      )}
      {!env.apiUrl && <p className="text-sm text-muted-foreground">{t("confirmationNotReady")}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {(error || !valid) && validEmail && <ConfirmationNotice email={email} />}
      <Link href="/register" className="block text-sm text-primary underline">
        {t("backToRegister")}
      </Link>
    </div>
  );
}

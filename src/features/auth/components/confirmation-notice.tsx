"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { ApiError } from "@/core/api/api-error";
import { Button } from "@/shared/ui/button";
import { authApi } from "../api/auth.api";
export function ConfirmationNotice({
  email,
  initialCooldown = 0,
}: {
  email: string;
  initialCooldown?: number;
}) {
  const { t } = useTranslation("auth");
  const { api } = useRuntime();
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function resend() {
    if (pending || cooldown > 0) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await authApi.resendConfirmation(api, email);
      setMessage(t("confirmationAccepted"));
      setCooldown(60);
    } catch (error) {
      setError(
        error instanceof ApiError && error.status === 429
          ? t("rateLimited")
          : t("confirmationResendFailed"),
      );
      if (error instanceof ApiError && error.status === 429) setCooldown(60);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-5">
      <MailCheck className="size-10 text-primary" aria-hidden="true" />
      <h2 className="font-display text-2xl">{t("emailConfirmationTitle")}</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        {t("confirmationInstructions", { email })}
      </p>
      <p className="text-sm text-muted-foreground">{t("confirmationNotSeen")}</p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        className="w-full"
        onClick={resend}
        disabled={pending || cooldown > 0 || !env.apiUrl}
      >
        {pending
          ? t("sending")
          : cooldown > 0
            ? t("resendIn", { seconds: cooldown })
            : t("resendConfirmation")}
      </Button>
      <Button asChild className="w-full">
        <Link href="/login">{t("backToLogin")}</Link>
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/forms/form-field";
import { authApi } from "../api/auth.api";
import {
  createResetPasswordSchema,
  type ResetPasswordInput,
} from "../schemas/account-management.schema";

export function ResetPasswordForm({ email, code }: { email: string; code: string }) {
  const { t } = useTranslation("auth");
  const { api, session, queryClient } = useRuntime();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const validationSchema = useMemo(
    () =>
      createResetPasswordSchema({
        emailMax: t("validation.emailMax"),
        emailInvalid: t("validation.emailInvalid"),
        passwordMin: t("validation.passwordMin"),
        passwordMax: t("validation.passwordMax"),
        lowercase: t("validation.lowercase"),
        uppercase: t("validation.uppercase"),
        digit: t("validation.digit"),
        special: t("validation.special"),
        confirmRequired: t("validation.confirmRequired"),
        passwordMismatch: t("validation.mismatch"),
        currentPasswordRequired: t("validation.passwordRequired"),
        passwordMustDiffer: t("validation.passwordMustDiffer"),
        nameRequired: t("validation.nameRequired"),
        nameMax: t("validation.nameMax"),
        phoneInvalid: t("validation.phoneInvalid"),
        avatarUrlInvalid: t("validation.avatarUrlInvalid"),
      }),
    [t],
  );
  const validLink =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && code.trim().length > 0 && code.length <= 2048;
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/reset-password");
  }, []);

  async function submit(values: ResetPasswordInput) {
    if (!validLink) return;
    form.clearErrors("root");
    try {
      await authApi.resetPassword(api, { email, code, newPassword: values.newPassword });
      session.clear();
      queryClient.clear();
      setDone(true);
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 429
          ? t("tooManyAttempts")
          : error instanceof ApiError && error.code === "network"
            ? t("networkError")
            : error instanceof ApiError && error.status >= 500
              ? t("systemError")
              : t("resetLinkExpired");
      form.setError("root.server", { message });
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-3xl">{t("passwordChanged")}</h1>
        <p role="status" className="text-sm leading-6 text-muted-foreground">
          {t("passwordChangedDetails")}
        </p>
        <Button asChild className="w-full">
          <Link href="/login">{t("goToLogin")}</Link>
        </Button>
      </div>
    );
  }

  if (!validLink) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-3xl">{t("invalidLink")}</h1>
        <p role="alert" className="text-sm leading-6 text-muted-foreground">
          {t("invalidLinkDetails")}
        </p>
        <Button asChild className="w-full">
          <Link href="/forgot-password">{t("requestNewLink")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h1 className="font-display text-3xl">{t("resetPassword")}</h1>
        <p className="break-all text-sm text-muted-foreground">
          {t("newPasswordFor")} <strong className="text-foreground">{email}</strong>
          {t("newPasswordForEnd")}
        </p>
      </div>
      <FormField control={form.control} name="newPassword" label={t("newPassword")}>
        {(field) => (
          <div className="relative">
            <Input
              {...field}
              value={String(field.value ?? "")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              aria-invalid={field["aria-invalid"]}
              aria-describedby={field["aria-describedby"]}
              disabled={form.formState.isSubmitting}
              className="pr-12"
            />
            <button
              type="button"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        )}
      </FormField>
      <FormField control={form.control} name="confirmPassword" label={t("confirmNewPassword")}>
        {(field) => (
          <Input
            {...field}
            value={String(field.value ?? "")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={field["aria-invalid"]}
            aria-describedby={field["aria-describedby"]}
            disabled={form.formState.isSubmitting}
          />
        )}
      </FormField>
      <p className="text-xs leading-5 text-muted-foreground">{t("passwordRequirements")}</p>
      {form.formState.errors.root?.server && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      )}
      {!env.apiUrl && (
        <p role="alert" className="text-sm text-destructive">
          {t("serverNotConfigured")}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting || !env.apiUrl}
      >
        {form.formState.isSubmitting ? t("updating") : t("saveNewPassword")}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-primary underline"
        onClick={() => router.push("/login")}
      >
        {t("backToLogin")}
      </button>
    </form>
  );
}

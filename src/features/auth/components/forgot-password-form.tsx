"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  createForgotPasswordSchema,
  type ForgotPasswordInput,
} from "../schemas/account-management.schema";

export function ForgotPasswordForm() {
  const { t } = useTranslation("auth");
  const { api } = useRuntime();
  const [sent, setSent] = useState(false);
  const validationSchema = useMemo(
    () =>
      createForgotPasswordSchema({
        emailMax: t("validation.emailMax"),
        emailInvalid: t("validation.emailInvalid"),
      }),
    [t],
  );
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: { email: "" },
  });

  async function submit(values: ForgotPasswordInput) {
    form.clearErrors("root");
    try {
      await authApi.forgotPassword(api, values.email);
      form.setValue("email", values.email);
      setSent(true);
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 429
          ? t("rateLimited")
          : error instanceof ApiError && error.code === "network"
            ? t("networkError")
            : t("resetRequestFailed");
      form.setError("root.server", { message });
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="font-display text-3xl">{t("checkYourEmail")}</h1>
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            {t("ifEmailExists")}{" "}
            <strong className="break-all text-foreground">{form.getValues("email")}</strong>{" "}
            {t("emailResetSentSuffix")}
          </p>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>
          {t("useAnotherEmail")}
        </Button>
        <Link href="/login" className="block text-center text-sm text-primary underline">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h1 className="font-display text-3xl">{t("forgotTitle")}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{t("forgotDescriptionDetailed")}</p>
      </div>
      <FormField control={form.control} name="email" label={t("email")}>
        {(field) => (
          <Input
            {...field}
            value={String(field.value ?? "")}
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            aria-invalid={field["aria-invalid"]}
            aria-describedby={field["aria-describedby"]}
            disabled={form.formState.isSubmitting}
          />
        )}
      </FormField>
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
        {form.formState.isSubmitting ? t("sending") : t("sendResetInstructions")}
      </Button>
      <Link href="/login" className="block text-center text-sm text-primary underline">
        {t("backToLogin")}
      </Link>
    </form>
  );
}

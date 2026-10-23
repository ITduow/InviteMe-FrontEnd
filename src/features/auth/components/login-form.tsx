"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/forms/form-field";
import { createLoginSchema, type LoginInput } from "../schemas/login.schema";
import { authApi } from "../api/auth.api";
import { useCurrentUser } from "../hooks/use-current-user";
import { safeReturnTo } from "@/core/auth/safe-return-to";
import { SessionLoading } from "@/shared/feedback/session-loading";
import { useTranslation } from "react-i18next";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapLoginError(error: unknown, t: (key: string) => string): string {
  if (!(error instanceof ApiError)) {
    return t("loginFailed");
  }
  if (error.code === "network") {
    return t("networkError");
  }
  if (error.status === 429) {
    return t("rateLimited");
  }
  if (error.status === 401 || error.backendCode === "INVALID_CREDENTIALS") {
    return t("invalidCredentials");
  }
  if (error.backendCode === "EMAIL_NOT_CONFIRMED") {
    return t("emailUnconfirmed");
  }
  if (error.backendCode === "UNVERIFIED_GOOGLE_EMAIL") {
    return t("googleEmailUnverified");
  }
  if (error.backendCode === "INVALID_GOOGLE_TOKEN") {
    return t("googleFailed");
  }
  return t("loginFailed");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LoginForm() {
  const { t } = useTranslation("auth");
  const { api, session } = useRuntime();
  const { isAuthenticated, isRestored } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";
  const accountNotice = searchParams.get("passwordChanged")
    ? t("successfullyUpdated")
    : searchParams.get("accountDeleted")
      ? t("accountDeleted")
      : "";
  const validationSchema = useMemo(
    () =>
      createLoginSchema({
        emailMax: t("validation.emailMax"),
        emailInvalid: t("validation.emailInvalid"),
        passwordRequired: t("validation.passwordRequired"),
        passwordMax: t("validation.passwordMax"),
      }),
    [t],
  );

  const [showPassword, setShowPassword] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const form = useForm<LoginInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: { email: "", password: "" },
  });

  // Safe redirect — only allow internal paths.
  const redirect = useCallback(() => {
    const target = safeReturnTo(returnTo);
    router.replace(target);
  }, [returnTo, router]);

  // If already authenticated, redirect to target immediately
  useEffect(() => {
    if (isRestored && isAuthenticated) {
      redirect();
    }
  }, [isRestored, isAuthenticated, redirect]);

  // ── Email + password submit ─────────────────────────────────────────────

  async function submit(values: LoginInput) {
    form.clearErrors("root");
    try {
      const token = await authApi.login(api, values);
      session.setToken(token);
      redirect();
    } catch (error) {
      form.setError("root.server", { message: mapLoginError(error, t) });
    }
  }

  // ── Google credential callback ─────────────────────────────────────────
  async function handleGoogleSuccess(response: CredentialResponse) {
    const idToken = response.credential;
    if (!idToken) {
      setGoogleError(t("googleFailed"));
      return;
    }
    setGoogleError("");
    setGooglePending(true);
    try {
      const token = await authApi.loginWithGoogle(api, idToken);
      session.setToken(token);
      redirect();
    } catch (error) {
      setGoogleError(mapLoginError(error, t));
    } finally {
      setGooglePending(false);
    }
  }

  function handleGoogleError() {
    setGoogleError(t("googleFailed"));
  }

  const apiReady = !!env.apiUrl;
  const hasGoogleAuth = Boolean(env.googleClientId && env.googleClientId.trim().length > 0);
  const isSubmitting = form.formState.isSubmitting;

  // ── Render ─────────────────────────────────────────────────────────────

  if (!isRestored || isAuthenticated) return <SessionLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl">{t("login")}</h1>
        {accountNotice && (
          <p role="status" className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-foreground">
            {accountNotice}
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{t("welcomeBack")}</p>
      </div>

      {/* Google login */}
      <div className="flex flex-col items-stretch gap-1">
        {apiReady && hasGoogleAuth ? (
          <div className="flex justify-center" id="login-google-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              shape="rectangular"
              theme="outline"
              size="large"
              text="continue_with"
              width={380}
            />
          </div>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground opacity-50"
          >
            {t("continueGoogle")} {!hasGoogleAuth && t("continueGoogleNotConfigured")}
          </button>
        )}

        {googlePending && (
          <p role="status" className="text-center text-xs text-muted-foreground">
            {t("googlePending")}
          </p>
        )}
        {googleError && (
          <p role="alert" className="text-center text-sm text-destructive">
            {googleError}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">{t("orEmail")}</span>
        </div>
      </div>

      {/* Email + password form */}
      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="space-y-4"
        aria-busy={isSubmitting}
      >
        <fieldset disabled={isSubmitting || googlePending} className="space-y-4">
          <FormField control={form.control} name="email" label={t("email")}>
            {(field) => (
              <Input
                {...field}
                id="login-email"
                value={String(field.value ?? "")}
                type="email"
                autoComplete="email"
                maxLength={255}
                placeholder="you@example.com"
              />
            )}
          </FormField>

          <FormField control={form.control} name="password" label={t("password")}>
            {(field) => (
              <div className="relative">
                <Input
                  {...field}
                  id="login-password"
                  value={String(field.value ?? "")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={128}
                  className="pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            )}
          </FormField>
        </fieldset>

        {/* Forgot password */}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-primary underline underline-offset-4"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        {/* Server error */}
        {form.formState.errors.root?.server && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.server.message}
          </p>
        )}

        {!apiReady && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("loginNotReady")}
          </p>
        )}

        <Button
          type="submit"
          id="login-submit-btn"
          className="w-full"
          disabled={isSubmitting || googlePending || !apiReady}
        >
          {isSubmitting ? t("loggingIn") : t("login")}
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary underline underline-offset-4">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}

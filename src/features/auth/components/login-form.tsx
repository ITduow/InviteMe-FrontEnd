"use client";
import { useState, useEffect, useCallback } from "react";
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
import { loginSchema, type LoginInput } from "../schemas/login.schema";
import { authApi } from "../api/auth.api";
import { useCurrentUser } from "../hooks/use-current-user";
import { safeReturnTo } from "@/core/auth/safe-return-to";
import { SessionLoading } from "@/shared/feedback/session-loading";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapLoginError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Đăng nhập thất bại. Vui lòng thử lại.";
  }
  if (error.code === "network") {
    return "Không thể kết nối đến máy chủ. Kiểm tra mạng và thử lại.";
  }
  if (error.status === 429) {
    return "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau một phút.";
  }
  if (error.status === 401 || error.backendCode === "INVALID_CREDENTIALS") {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (error.backendCode === "EMAIL_NOT_CONFIRMED") {
    return "Email chưa được xác nhận. Hãy kiểm tra hộp thư và nhấp vào link xác nhận.";
  }
  if (error.backendCode === "UNVERIFIED_GOOGLE_EMAIL") {
    return "Email Google chưa được xác nhận. Vui lòng xác nhận email Google trước.";
  }
  if (error.backendCode === "INVALID_GOOGLE_TOKEN") {
    return "Xác thực Google thất bại. Vui lòng thử lại.";
  }
  return "Đăng nhập thất bại. Vui lòng thử lại sau.";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LoginForm() {
  const { api, session } = useRuntime();
  const { isAuthenticated, isRestored } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
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
      form.setError("root.server", { message: mapLoginError(error) });
    }
  }

  // ── Google credential callback ─────────────────────────────────────────
  async function handleGoogleSuccess(response: CredentialResponse) {
    const idToken = response.credential;
    if (!idToken) {
      setGoogleError("Google không trả về thông tin xác thực. Vui lòng thử lại.");
      return;
    }
    setGoogleError("");
    setGooglePending(true);
    try {
      const token = await authApi.loginWithGoogle(api, idToken);
      session.setToken(token);
      redirect();
    } catch (error) {
      setGoogleError(mapLoginError(error));
    } finally {
      setGooglePending(false);
    }
  }

  function handleGoogleError() {
    setGoogleError("Xác thực Google thất bại. Vui lòng thử lại.");
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
        <h1 className="font-display text-3xl">Đăng nhập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chào mừng trở lại! Đăng nhập để tiếp tục chuẩn bị ngày cưới.
        </p>
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
            Tiếp tục với Google {!hasGoogleAuth && "(chưa cấu hình Client ID)"}
          </button>
        )}

        {googlePending && (
          <p role="status" className="text-center text-xs text-muted-foreground">
            Đang xác thực với Google…
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
          <span className="bg-card px-3 text-muted-foreground">hoặc đăng nhập bằng email</span>
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
          <FormField control={form.control} name="email" label="Địa chỉ email">
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

          <FormField control={form.control} name="password" label="Mật khẩu">
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
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
            Quên mật khẩu?
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
            Chức năng đăng nhập chưa sẵn sàng. Vui lòng thử lại sau.
          </p>
        )}

        <Button
          type="submit"
          id="login-submit-btn"
          className="w-full"
          disabled={isSubmitting || googlePending || !apiReady}
        >
          {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-primary underline underline-offset-4">
          Tạo tài khoản
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ShieldCheck } from "lucide-react";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { loginSchema, type LoginInput } from "../schemas/login.schema";
import { authApi } from "../api/auth.api";
import { useCurrentUser, currentUserKeys } from "../hooks/use-current-user";
import { useLogout } from "../hooks/use-logout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/forms/form-field";
import { BrandLogo } from "@/shared/components/brand-logo";
import { SessionLoading } from "@/shared/feedback/session-loading";

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 429)
    return "Bạn đã thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại.";
  if (error instanceof ApiError && error.code === "network")
    return "Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và thử lại.";
  if (error instanceof ApiError && error.status === 403)
    return "Yêu cầu đăng nhập không hợp lệ từ nguồn này. Hãy mở trang InviteMe chính thức rồi thử lại.";
  if (error instanceof ApiError && error.status === 401)
    return "Thông tin đăng nhập không đúng hoặc tài khoản không có quyền Admin.";
  return "Đăng nhập Admin thất bại. Vui lòng thử lại.";
}

export function AdminLoginForm() {
  const { api, session, queryClient } = useRuntime();
  const router = useRouter();
  const { user, isAuthenticated, isRestored, isLoading } = useCurrentUser();
  const { logout, isLoggingOut } = useLogout();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (isRestored && isAuthenticated && user?.role === "ADMIN") router.replace("/admin");
  }, [isRestored, isAuthenticated, user, router]);

  async function submit(input: LoginInput) {
    form.clearErrors("root");
    try {
      const token = await authApi.adminLogin(api, input);
      session.setToken(token);
      const account = await authApi.me(api);
      if (account.role !== "ADMIN") {
        session.clear();
        form.setError("root.server", { message: "Tài khoản không có quyền Admin." });
        return;
      }
      queryClient.setQueryData(currentUserKeys.me(), account);
      router.replace("/admin");
    } catch (error) {
      form.setError("root.server", { message: errorMessage(error) });
    }
  }

  if (!isRestored || (isAuthenticated && isLoading)) return <SessionLoading />;
  if (isAuthenticated && !isLoading && user && user.role !== "ADMIN") {
    return (
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
        <ShieldCheck className="mx-auto size-9 text-primary-foreground" aria-hidden="true" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          403 · Không có quyền
        </p>
        <h1 className="mt-2 font-display text-3xl">Tài khoản này không phải Admin</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Hãy đăng xuất tài khoản hiện tại hoặc quay lại không gian làm việc.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/dashboard">Về trang làm việc</Link>
          </Button>
          <Button type="button" disabled={isLoggingOut} onClick={() => void logout()}>
            {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9">
      <BrandLogo href="/" size="md" ariaLabel="InviteMe — Trang chủ" />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Cổng quản trị
      </p>
      <h1 className="mt-2 font-display text-3xl">Đăng nhập Admin</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Dành cho tài khoản quản trị viên được cấp sẵn.
      </p>

      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="mt-7 space-y-5"
        aria-busy={form.formState.isSubmitting}
      >
        <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
          <FormField control={form.control} name="email" label="Email quản trị">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                id="admin-login-email"
                type="email"
                autoComplete="username"
                maxLength={255}
                placeholder="admin@example.com"
              />
            )}
          </FormField>
          <FormField control={form.control} name="password" label="Mật khẩu">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                id="admin-login-password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
              />
            )}
          </FormField>
        </fieldset>
        {form.formState.errors.root?.server && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.server.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Đang xác thực…" : "Đăng nhập Admin"}
        </Button>
      </form>

      <Link
        href="/"
        className="mt-6 block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Quay lại InviteMe
      </Link>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
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
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas/account-management.schema";

export function ResetPasswordForm({ email, code }: { email: string; code: string }) {
  const { api, session, queryClient } = useRuntime();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const validLink =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && code.trim().length > 0 && code.length <= 2048;
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
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
          ? "Bạn thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại."
          : error instanceof ApiError && error.code === "network"
            ? "Không thể kết nối đến máy chủ. Kiểm tra mạng và thử lại."
            : error instanceof ApiError && error.status >= 500
              ? "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
              : "Link đặt lại không hợp lệ hoặc đã hết hạn. Hãy yêu cầu gửi link mới.";
      form.setError("root.server", { message });
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-3xl">Đã đổi mật khẩu</h1>
        <p role="status" className="text-sm leading-6 text-muted-foreground">
          Mật khẩu đã được cập nhật. Vì lý do bảo mật, hãy đăng nhập lại bằng mật khẩu mới.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Đến trang đăng nhập</Link>
        </Button>
      </div>
    );
  }

  if (!validLink) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-3xl">Link không hợp lệ</h1>
        <p role="alert" className="text-sm leading-6 text-muted-foreground">
          Link thiếu thông tin hoặc không còn hợp lệ. Hãy yêu cầu gửi link đặt lại mới.
        </p>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Yêu cầu link mới</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h1 className="font-display text-3xl">Đặt lại mật khẩu</h1>
        <p className="break-all text-sm text-muted-foreground">
          Tạo mật khẩu mới cho <strong className="text-foreground">{email}</strong>.
        </p>
      </div>
      <FormField control={form.control} name="newPassword" label="Mật khẩu mới">
        {(field) => (
          <div className="relative">
            <Input
              {...field}
              value={String(field.value ?? "")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ít nhất 12 ký tự"
              aria-invalid={field["aria-invalid"]}
              aria-describedby={field["aria-describedby"]}
              disabled={form.formState.isSubmitting}
              className="pr-12"
            />
            <button
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        )}
      </FormField>
      <FormField control={form.control} name="confirmPassword" label="Nhập lại mật khẩu mới">
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
      <p className="text-xs leading-5 text-muted-foreground">
        Mật khẩu cần tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
      </p>
      {form.formState.errors.root?.server && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      )}
      {!env.apiUrl && (
        <p role="alert" className="text-sm text-destructive">
          Kết nối máy chủ chưa được cấu hình.
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting || !env.apiUrl}
      >
        {form.formState.isSubmitting ? "Đang cập nhật…" : "Lưu mật khẩu mới"}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-primary underline"
        onClick={() => router.push("/login")}
      >
        Quay lại đăng nhập
      </button>
    </form>
  );
}

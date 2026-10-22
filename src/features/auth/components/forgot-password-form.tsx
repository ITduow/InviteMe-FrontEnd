"use client";

import Link from "next/link";
import { useState } from "react";
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
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../schemas/account-management.schema";

export function ForgotPasswordForm() {
  const { api } = useRuntime();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
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
          ? "Bạn gửi yêu cầu quá nhanh. Vui lòng chờ một phút rồi thử lại."
          : error instanceof ApiError && error.code === "network"
            ? "Không thể kết nối đến máy chủ. Kiểm tra mạng và thử lại."
            : "Chưa thể gửi yêu cầu lúc này. Vui lòng thử lại sau.";
      form.setError("root.server", { message });
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="font-display text-3xl">Kiểm tra email của bạn</h1>
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            Nếu email{" "}
            <strong className="break-all text-foreground">{form.getValues("email")}</strong> có tài
            khoản InviteMe, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu. Link có hiệu lực trong 15
            phút.
          </p>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>
          Thử với email khác
        </Button>
        <Link href="/login" className="block text-center text-sm text-primary underline">
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h1 className="font-display text-3xl">Quên mật khẩu?</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Nhập email tài khoản. Nếu tài khoản tồn tại, chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>
      </div>
      <FormField control={form.control} name="email" label="Địa chỉ email">
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
          Kết nối máy chủ chưa được cấu hình.
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting || !env.apiUrl}
      >
        {form.formState.isSubmitting ? "Đang gửi…" : "Gửi hướng dẫn đặt lại"}
      </Button>
      <Link href="/login" className="block text-center text-sm text-primary underline">
        Quay lại đăng nhập
      </Link>
    </form>
  );
}

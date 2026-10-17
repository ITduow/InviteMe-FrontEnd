"use client";
import { useState } from "react";
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
          ? "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại."
          : error instanceof ApiError && error.status === 429
            ? "Bạn thử quá nhiều lần. Vui lòng chờ một phút."
            : error instanceof ApiError && error.status >= 500
              ? "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
              : "Link xác nhận không hợp lệ hoặc đã hết hạn. Hãy dùng link mới nhất hoặc yêu cầu gửi lại.",
      );
    } finally {
      setPending(false);
    }
  }
  if (done)
    return (
      <div className="space-y-5">
        <h1 className="font-display text-3xl">Email đã được xác nhận</h1>
        <p className="text-sm text-muted-foreground">
          Tài khoản đã được kích hoạt. Bạn có thể tiếp tục đến trang đăng nhập.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Đến trang đăng nhập</Link>
        </Button>
      </div>
    );
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl">Xác nhận email</h1>
      {valid ? (
        <>
          <p className="break-words text-sm text-muted-foreground">
            Xác nhận địa chỉ <strong>{email}</strong> để kích hoạt tài khoản InviteMe.
          </p>
          <Button className="w-full" onClick={confirm} disabled={pending || !env.apiUrl}>
            {pending ? "Đang xác nhận…" : "Xác nhận email của tôi"}
          </Button>
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          Link xác nhận thiếu thông tin hoặc không hợp lệ. Hãy mở lại link đầy đủ trong email.
        </p>
      )}
      {!env.apiUrl && (
        <p className="text-sm text-muted-foreground">
          Chức năng xác nhận chưa sẵn sàng. Vui lòng thử lại sau.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {(error || !valid) && validEmail && <ConfirmationNotice email={email} />}
      <Link href="/register" className="block text-sm text-primary underline">
        Về trang đăng ký
      </Link>
    </div>
  );
}

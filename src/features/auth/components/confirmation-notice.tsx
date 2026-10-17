"use client";
import { useEffect, useState } from "react";
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
      setMessage("Đã tiếp nhận yêu cầu gửi lại. Hãy kiểm tra hộp thư và dùng link mới nhất.");
      setCooldown(60);
    } catch (error) {
      setError(
        error instanceof ApiError && error.status === 429
          ? "Bạn gửi yêu cầu quá nhanh. Vui lòng chờ một phút."
          : "Chưa thể gửi lại email. Vui lòng thử lại sau.",
      );
      if (error instanceof ApiError && error.status === 429) setCooldown(60);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-5">
      <MailCheck className="size-10 text-primary" aria-hidden="true" />
      <h2 className="font-display text-2xl">Kiểm tra email của bạn</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Mở email xác nhận dành cho <strong className="break-all text-foreground">{email}</strong> và
        làm theo hướng dẫn để kích hoạt tài khoản. Link có hiệu lực trong 24 giờ.
      </p>
      <p className="text-sm text-muted-foreground">
        Chưa thấy email? Kiểm tra thư rác hoặc yêu cầu gửi lại. Khi gửi lại, link cũ sẽ không còn
        hiệu lực.
      </p>
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
          ? "Đang gửi…"
          : cooldown > 0
            ? `Gửi lại sau ${cooldown}s`
            : "Gửi lại email xác nhận"}
      </Button>
      <Button asChild className="w-full">
        <Link href="/login">Về trang đăng nhập</Link>
      </Button>
    </div>
  );
}

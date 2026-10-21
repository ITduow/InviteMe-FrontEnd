"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, HeartHandshake, ShieldCheck } from "lucide-react";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { LoadingState } from "@/shared/feedback/loading-state";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import {
  acceptCoHostInvitation,
  previewCoHostInvitation,
  type CoHostPermission,
} from "../api/co-host.api";
import { PERMISSION_LABELS } from "../utils/scopes";

const TOKEN_STORAGE_KEY = "inviteme.cohost-invitation-token";
const TOKEN_EVENT = "inviteme:cohost-invitation-token";
let volatileToken = "";

function readInvitationToken() {
  try {
    return (
      window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ??
      volatileToken ??
      new URLSearchParams(window.location.hash.slice(1)).get("token") ??
      ""
    );
  } catch {
    return "";
  }
}

function subscribeToInvitationToken(onChange: () => void) {
  window.addEventListener(TOKEN_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(TOKEN_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function invitationError(error: unknown) {
  if (!(error instanceof ApiError)) return "Không thể xác thực lời mời. Hãy thử lại sau.";
  if (error.code === "network")
    return "Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và thử lại.";
  if (error.status === 401)
    return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại bằng email được mời.";
  if (error.status === 403)
    return "Tài khoản này chưa xác nhận email hoặc email không khớp lời mời.";
  if (error.status === 404)
    return "Lời mời không hợp lệ, đã hết hạn, đã được sử dụng hoặc không dành cho tài khoản này.";
  return "Không thể xác thực lời mời. Hãy thử lại sau.";
}

export function AcceptCoHostInvitation() {
  const { api, session } = useRuntime();
  const token = useSyncExternalStore(subscribeToInvitationToken, readInvitationToken, () => "");
  const isRestored = useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.isRestored,
    () => false,
  );
  const isAuthenticated = useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.authenticated,
    () => false,
  );
  const [accepted, setAccepted] = useState(false);
  const [acceptedWeddingId, setAcceptedWeddingId] = useState("");
  const [acceptError, setAcceptError] = useState("");

  useEffect(() => {
    let fragmentToken = "";
    try {
      fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      if (window.location.hash) {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
      volatileToken = fragmentToken;
      if (fragmentToken) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, fragmentToken);
    } catch {
      // Continue without a token if the browser blocks session storage.
    }
    window.dispatchEvent(new Event(TOKEN_EVENT));
  }, []);

  const preview = useQuery({
    queryKey: ["co-host-invitation-preview", token],
    queryFn: () => previewCoHostInvitation(api, token),
    enabled: Boolean(token && isRestored && isAuthenticated),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => acceptCoHostInvitation(api, token),
    onSuccess: () => {
      setAcceptedWeddingId(preview.data?.weddingId ?? "");
      volatileToken = "";
      try {
        window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // Storage can be disabled; the token is still removed from component state.
      }
      window.dispatchEvent(new Event(TOKEN_EVENT));
      setAccepted(true);
      setAcceptError("");
    },
    onError: (error) => setAcceptError(invitationError(error)),
  });

  if (accepted) {
    return (
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl border bg-card p-7 text-center shadow-sm md:p-10">
        <BadgeCheck className="mx-auto size-12 text-emerald-600" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="font-display text-3xl">Bạn đã tham gia đám cưới</h1>
          <p className="text-muted-foreground">
            Quyền truy cập đã được kích hoạt. Chủ tiệc có thể thay đổi phạm vi quyền bất cứ lúc nào.
          </p>
        </div>
        {acceptedWeddingId && (
          <Button asChild>
            <Link href={`/weddings/${encodeURIComponent(acceptedWeddingId)}/overview`}>
              Mở khu vực đám cưới
            </Link>
          </Button>
        )}
        {!preview.data && (
          <Link className="text-sm text-primary underline" href="/dashboard">
            Về trang tổng quan
          </Link>
        )}
      </div>
    );
  }

  if (!isRestored) return <LoadingState label="Đang kiểm tra phiên đăng nhập…" />;

  if (!token) {
    return (
      <InviteCard>
        <h1 className="font-display text-3xl">Không tìm thấy lời mời</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Mở lại link đầy đủ trong email mời. Vì lý do bảo mật, mã mời được xóa khỏi thanh địa chỉ
          ngay khi trang mở.
        </p>
      </InviteCard>
    );
  }

  if (!isAuthenticated) {
    const returnTo = "/co-host-invitations/accept";
    return (
      <InviteCard>
        <h1 className="font-display text-3xl">Bạn được mời làm co-host</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Đăng nhập hoặc tạo tài khoản bằng đúng email đã nhận lời mời để xem quyền được cấp và xác
          nhận tham gia. Tài khoản mới cần xác nhận email; sau đó quay lại tab này và đăng nhập.
        </p>
        <Button asChild className="w-full">
          <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            Đăng nhập để tiếp tục
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link
            href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Tạo tài khoản mới
          </Link>
        </Button>
      </InviteCard>
    );
  }

  if (preview.isPending) return <LoadingState label="Đang xác minh lời mời…" />;
  if (preview.isError) {
    return (
      <InviteCard>
        <h1 className="font-display text-3xl">Không thể xác minh lời mời</h1>
        <p role="alert" className="text-sm text-destructive">
          {invitationError(preview.error)}
        </p>
        <Button variant="outline" onClick={() => void preview.refetch()}>
          Thử lại
        </Button>
      </InviteCard>
    );
  }
  if (!preview.data) return <LoadingState label="Đang tải thông tin lời mời…" />;

  const hasInvalidCheckInScope = preview.data.grants.some(
    (grant) => grant.permission === "CHECKIN_MANAGE" && !grant.weddingWide,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border bg-card p-6 shadow-sm md:p-9">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <HeartHandshake className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
          Lời mời co-host
        </p>
        <h1 className="font-display text-3xl">{preview.data.weddingTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Lời mời gửi đến {preview.data.email}. Xác nhận chỉ bằng tài khoản email này.
        </p>
      </div>
      <section className="space-y-3 rounded-2xl bg-muted/40 p-5">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Quyền được cấp
        </div>
        {preview.data.grants.length ? (
          <ul className="space-y-2">
            {preview.data.grants.map((grant) => (
              <li
                key={grant.permission}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-sm"
              >
                <span>{PERMISSION_LABELS[grant.permission as CoHostPermission]}</span>
                <Chip>
                  {grant.permission === "CHECKIN_MANAGE" && !grant.weddingWide
                    ? "Phạm vi nhóm không được hỗ trợ"
                    : grant.weddingWide
                      ? "Toàn bộ wedding"
                      : `${grant.groupIds.length} nhóm khách`}
                </Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có quyền nào được cấp.</p>
        )}
        {preview.data.grants.some(
          (grant) => grant.permission === "CHECKIN_MANAGE" && !grant.weddingWide,
        ) && (
          <p role="alert" className="text-sm text-destructive">
            Lời mời có cấu hình check-in theo nhóm cũ. BE yêu cầu quyền này áp dụng cho toàn bộ
            wedding; hãy liên hệ chủ tiệc để cập nhật trước khi chấp nhận.
          </p>
        )}
        <p className="text-xs leading-5 text-muted-foreground">
          Các thao tác vẫn được kiểm tra lại bởi máy chủ. Chủ tiệc có thể thay đổi hoặc thu hồi
          quyền.
        </p>
      </section>
      {acceptError && (
        <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">
          {acceptError}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          disabled={accept.isPending || hasInvalidCheckInScope}
          onClick={() => accept.mutate()}
        >
          {accept.isPending
            ? "Đang xác nhận…"
            : hasInvalidCheckInScope
              ? "Chờ chủ tiệc cập nhật quyền check-in"
              : "Chấp nhận lời mời"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Để sau</Link>
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Hết hạn {new Date(preview.data.expiresAt).toLocaleString("vi-VN")}
      </p>
    </div>
  );
}

function InviteCard({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-xl space-y-5 rounded-3xl border bg-card p-7 shadow-sm md:p-10">
      {children}
    </section>
  );
}

"use client";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRuntime } from "@/core/config/runtime";
import { SessionLoading } from "@/shared/feedback/session-loading";
import { publicInvitationSchema, resolveInvitationDocument } from "../api/design.api";
import { usePublicWeddingSignal } from "@/core/realtime/public-wedding-signal";
import { ApiError } from "@/core/api/api-error";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";

const Invitation = dynamic(
  () => import("./invitation-renderer").then((m) => m.InvitationRenderer),
  {
    ssr: false,
    loading: () => <SessionLoading />,
  },
);
export function GuestInvitation({ token }: { token: string }) {
  const { api, queryClient } = useRuntime();
  usePublicWeddingSignal("invitation", token, () => void queryClient.invalidateQueries({ queryKey: ["guest-invitation", token] }));
  const invitation = useQuery({
    queryKey: ["guest-invitation", token],
    retry: false,
    staleTime: 0,
    queryFn: ({ signal }) =>
      api.request(`/guest-invitations/${encodeURIComponent(token)}`, {
        auth: "none",
        signal,
        schema: publicInvitationSchema,
      }),
  });
  if (invitation.isPending) return <SessionLoading />;
  if (invitation.isError)
    return (
      <section className="fixed inset-0 z-50 grid place-content-center bg-background p-8 text-center">
        <h1 className="font-display text-3xl">Chưa thể mở thiệp</h1>
        <p className="mt-4">
          {invitation.error instanceof ApiError && invitation.error.status === 404
            ? "Thiệp chưa được xuất bản hoặc liên kết không còn khả dụng. Vui lòng liên hệ người gửi."
            : "Không tải được thiệp. Vui lòng thử lại."}
        </p>
        <button className="mt-6 underline" onClick={() => void invitation.refetch()}>
          Thử lại
        </button>
      </section>
    );
  return (
    <Invitation
      document={resolveInvitationDocument(invitation.data.document)}
      content={invitation.data.content}
      token={token}
    />
  );
}

"use client";

import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Mail,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import { usePermission } from "@/shared/components/permission-guard";
import {
  generateInvitationDraft,
  getInvitationBatch,
  getInvitationDraft,
  previewInvitation,
  queueInvitationBatch,
  retryInvitationBatch,
  saveInvitationDraft,
  sendTestInvitation,
  type InvitationChannel,
  type InvitationDraft,
  type InvitationSendBody,
  type InvitationTone,
} from "../api/invitation-messaging.api";
import { z } from "zod";

const recipientSchema = z.object({
  id: z.string(),
  recipientName: z.string(),
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable().optional(),
});
const guestPageSchema = z.object({
  items: z.array(recipientSchema),
  page: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
});
const toneLabels: Record<InvitationTone, string> = {
  FORMAL: "Trang trọng",
  WARM: "Ấm áp",
  HUMOROUS: "Vui vẻ",
};
const batchKey = (weddingId: string) => `inviteme:last-invitation-batch:${weddingId}`;
const draftKey = (weddingId: string) => ["invitation-messaging", weddingId, "draft"] as const;
const pageKey = (weddingId: string, page: number, search: string, groupId: string) =>
  ["invitation-messaging", weddingId, "guests", page, search, groupId] as const;
const batchQueryKey = (weddingId: string, id: string) =>
  ["invitation-messaging", weddingId, "batch", id] as const;
const batchChangeEvent = "inviteme:invitation-batch-change";

function useStoredBatchId(weddingId: string) {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(batchChangeEvent, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(batchChangeEvent, onChange);
      };
    },
    () => window.localStorage.getItem(batchKey(weddingId)) ?? "",
    () => "",
  );
}

function persistBatchId(weddingId: string, id: string) {
  window.localStorage.setItem(batchKey(weddingId), id);
  window.dispatchEvent(new Event(batchChangeEvent));
}

function friendlyError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Không thể hoàn tất thao tác. Vui lòng thử lại.";
  if (error.status === 503 || error.backendCode === "INVITATION_CHANNEL_NOT_CONFIGURED")
    return "Kênh gửi này chưa được cấu hình. Hãy liên hệ quản trị viên.";
  if (error.backendCode === "SPEEDSMS_SENDER_NOT_FOUND")
    return "SpeedSMS chưa nhận diện sender đã cấu hình. Vui lòng liên hệ quản trị viên; FE không tự đổi cấu hình gửi.";
  if (error.backendCode === "SPEEDSMS_INVALID_PHONE") return "Số điện thoại không hợp lệ.";
  if (error.backendCode === "SPEEDSMS_INSUFFICIENT_BALANCE")
    return "Tài khoản SpeedSMS không đủ số dư.";
  if (error.backendCode === "CONCURRENCY_CONFLICT" || error.status === 409)
    return "Dữ liệu đã thay đổi trên máy khác. Hãy tải bản mới và xác nhận trước khi ghi đè.";
  if (error.status === 422)
    return "Backend từ chối nội dung hoặc danh sách gửi. Kiểm tra placeholder, liên hệ, sức chứa 180 khách và độ dài SMS.";
  if (error.status === 404) return "Không tìm thấy bản nháp, khách hoặc nhóm. Hãy tải lại dữ liệu.";
  return error.message;
}

function validateTemplate(subject: string, content: string, smsContent: string) {
  const errors: string[] = [];
  if (!subject.trim() || subject.length > 200 || /[\r\n]/.test(subject))
    errors.push("Tiêu đề email cần có nội dung, tối đa 200 ký tự và chỉ một dòng.");
  if (!content.trim() || content.length > 10000)
    errors.push("Nội dung email cần có tối đa 10.000 ký tự.");
  for (const token of ["{{GuestName}}", "{{RsvpLink}}", "{{QrLink}}"])
    if (!content.includes(token)) errors.push(`Email cần có ${token}.`);
  const emailRemainder = ["{{GuestName}}", "{{RsvpLink}}", "{{QrLink}}"].reduce(
    (value, token) => value.replaceAll(token, ""),
    content,
  );
  if (emailRemainder.includes("{{") || emailRemainder.includes("}}"))
    errors.push("Email chỉ được dùng {{GuestName}}, {{RsvpLink}} và {{QrLink}}.");
  if (!smsContent.trim() || smsContent.length > 10000)
    errors.push("Nội dung SMS cần có tối đa 10.000 ký tự.");
  for (const token of ["{{GuestName}}", "{{RsvpLink}}"])
    if (!smsContent.includes(token)) errors.push(`SMS cần có ${token}.`);
  const smsRemainder = ["{{GuestName}}", "{{RsvpLink}}"].reduce(
    (value, token) => value.replaceAll(token, ""),
    smsContent,
  );
  if (smsRemainder.includes("{{") || smsRemainder.includes("}}"))
    errors.push("SMS chỉ được dùng {{GuestName}} và {{RsvpLink}}.");
  return [...new Set(errors)];
}

function maskRecipient(value: string) {
  const at = value.indexOf("@");
  if (at > 0) return `${value.slice(0, 1)}***${value.slice(at)}`;
  return value.length > 4 ? `${value.slice(0, 2)}••••${value.slice(-2)}` : "••••";
}

function statusLabel(status: string) {
  return (
    (
      {
        PENDING: "Đang chờ",
        SENDING: "Đang gửi",
        SENT: "Đã gửi đến nhà cung cấp",
        FAILED: "Thất bại",
        PARTIAL_FAILED: "Một phần thất bại",
      } as Record<string, string>
    )[status] ?? status
  );
}

export function InvitationMessaging({ weddingId, isPublished }: { weddingId: string; isPublished: boolean }) {
  const { api } = useRuntime();
  const { can } = usePermission();
  const canViewGuests = can("GUEST_VIEW");
  const queryClient = useQueryClient();
  const draftQuery = useQuery({
    queryKey: draftKey(weddingId),
    queryFn: ({ signal }) => getInvitationDraft(api, weddingId, signal),
  });
  const [edits, setEdits] = useState<{
    subject: string;
    content: string;
    smsContent: string;
    tone: InvitationTone;
    version: number;
  } | null>(null);
  const [instructions, setInstructions] = useState("");
  const [conflictDraft, setConflictDraft] = useState<InvitationDraft | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [previewGuestId, setPreviewGuestId] = useState("");
  const [previewTab, setPreviewTab] = useState<"EMAIL" | "SMS">("EMAIL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [recipientMode, setRecipientMode] = useState<"GUESTS" | "GROUP">("GUESTS");
  const [groupId, setGroupId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedContactFlags, setSelectedContactFlags] = useState<
    Record<string, { email: boolean; phone: boolean }>
  >({});
  const [channels, setChannels] = useState<InvitationChannel[]>(["EMAIL"]);
  const activeBatchId = useStoredBatchId(weddingId);
  const [showRecipients, setShowRecipients] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const [uncertainSend, setUncertainSend] = useState<{
    body: InvitationSendBody;
    key: string;
  } | null>(null);

  const form = edits ??
    draftQuery.data ?? {
      subject: "",
      content: "",
      smsContent: "",
      tone: "WARM" as const,
      version: 0,
      weddingId,
      usedFallback: false,
      smsUsedFallback: false,
    };
  const dirty = edits !== null;

  const guestQuery = useQuery({
    queryKey: pageKey(weddingId, page, deferredSearch, recipientMode === "GROUP" ? groupId : ""),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "100",
        search: deferredSearch,
      });
      if (recipientMode === "GROUP" && groupId) params.set("groupId", groupId);
      const result = await api.request(
        `/weddings/${encodeURIComponent(weddingId)}/guest-planning/guests?${params}`,
        {
          signal,
          schema: guestPageSchema,
        },
      );
      return result;
    },
    enabled: canViewGuests,
  });
  const groupsQuery = useQuery({
    queryKey: pageKey(weddingId, 1, "", "all-groups"),
    queryFn: async ({ signal }) => {
      const endpoint = `/weddings/${encodeURIComponent(weddingId)}/guest-planning/guests`;
      const first = await api.request(`${endpoint}?page=1&pageSize=100`, {
        signal,
        schema: guestPageSchema,
      });
      const pages = Math.ceil(first.totalItems / first.pageSize);
      if (pages <= 1) return first.items;
      const remaining = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) =>
          api.request(`${endpoint}?page=${index + 2}&pageSize=100`, {
            signal,
            schema: guestPageSchema,
          }),
        ),
      );
      return [...first.items, ...remaining.flatMap((result) => result.items)];
    },
    staleTime: 60_000,
    enabled: canViewGuests,
  });
  const groups = useMemo(() => {
    const unique = new Map<string, string>();
    for (const guest of groupsQuery.data ?? [])
      if (guest.group?.id) unique.set(guest.group.id, guest.group.name);
    return [...unique].map(([id, name]) => ({ id, name }));
  }, [groupsQuery.data]);

  const previewQuery = useQuery({
    queryKey: ["invitation-messaging", weddingId, "preview", previewGuestId],
    queryFn: () => previewInvitation(api, weddingId, previewGuestId),
    enabled: Boolean(canViewGuests && previewGuestId && draftQuery.data),
    retry: false,
  });
  const generateMutation = useMutation({
    mutationFn: () =>
      generateInvitationDraft(api, weddingId, {
        tone: form.tone,
        ...(instructions.trim() ? { additionalInstructions: instructions.trim() } : {}),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(draftKey(weddingId), next);
      setEdits(null);
      setConflictDraft(null);
      setSaveMessage("Bản nháp AI đã được lưu.");
    },
  });
  const saveMutation = useMutation({
    mutationFn: (input: {
      subject: string;
      content: string;
      smsContent: string;
      tone: InvitationTone;
      version: number;
    }) =>
      saveInvitationDraft(api, weddingId, {
        subject: input.subject,
        content: input.content,
        smsContent: input.smsContent,
        tone: input.tone,
        expectedVersion: input.version,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(draftKey(weddingId), next);
      setEdits(null);
      setConflictDraft(null);
      setSaveMessage("Bản nháp đã được lưu.");
    },
    onError: async (error) => {
      setSaveMessage(friendlyError(error));
      if (error instanceof ApiError && error.status === 409) {
        const latest = await queryClient.fetchQuery({
          queryKey: draftKey(weddingId),
          queryFn: ({ signal }) => getInvitationDraft(api, weddingId, signal),
        });
        if (latest) setConflictDraft(latest);
      }
    },
  });
  const testMutation = useMutation({
    mutationFn: () => sendTestInvitation(api, weddingId, previewGuestId),
  });
  const sendMutation = useMutation({
    mutationFn: (attempt: { body: InvitationSendBody; key: string }) =>
      queueInvitationBatch(api, weddingId, attempt.body, attempt.key),
    onSuccess: (batch) => {
      setUncertainSend(null);
      persistBatchId(weddingId, batch.id);
      void queryClient.invalidateQueries({ queryKey: batchQueryKey(weddingId, batch.id) });
    },
    onError: (error) => {
      if (!(error instanceof ApiError) || error.code === "network") {
        setSaveMessage(
          "Chưa xác định được yêu cầu đã tới server hay chưa. Có thể gửi lại đúng yêu cầu an toàn bằng cùng idempotency key.",
        );
      } else {
        setUncertainSend(null);
        setSaveMessage(friendlyError(error));
      }
    },
  });
  const batchQuery = useQuery({
    queryKey: batchQueryKey(weddingId, activeBatchId),
    queryFn: ({ signal }) => getInvitationBatch(api, weddingId, activeBatchId, signal),
    enabled: Boolean(activeBatchId),
    refetchInterval: (query) => (query.state.data?.pendingCount ? 3000 : false),
    retry: false,
  });
  const retryMutation = useMutation({
    mutationFn: () => retryInvitationBatch(api, weddingId, activeBatchId),
    onSuccess: () => void batchQuery.refetch(),
  });

  const { subject, content, smsContent, tone } = form;
  const templateErrors = validateTemplate(subject, content, smsContent);
  const missingContacts = selectedIds.filter((id) => {
    const contact = selectedContactFlags[id];
    return (
      contact &&
      ((channels.includes("EMAIL") && !contact.email) ||
        (channels.includes("SMS") && !contact.phone))
    );
  });
  const selectionCount =
    recipientMode === "GROUP"
      ? groupId
        ? (guestQuery.data?.totalItems ?? 0)
        : 0
      : selectedIds.length;
  const canSend = Boolean(
    draftQuery.data &&
    isPublished &&
    canViewGuests &&
    selectionCount > 0 &&
    selectionCount <= 180 &&
    channels.length &&
    !dirty &&
    !missingContacts.length &&
    !uncertainSend &&
    !sendMutation.isPending,
  );

  function updateField<K extends "subject" | "content" | "smsContent" | "tone">(
    key: K,
    value: (typeof form)[K],
  ) {
    setEdits((current) => ({
      subject: current?.subject ?? form.subject,
      content: current?.content ?? form.content,
      smsContent: current?.smsContent ?? form.smsContent,
      tone: current?.tone ?? form.tone,
      version: current?.version ?? form.version,
      [key]: value,
    }));
    setSaveMessage("");
  }
  function beginSend() {
    if (!canSend) return;
    const details =
      recipientMode === "GROUP"
        ? `nhóm ${groups.find((group) => group.id === groupId)?.name ?? "đã chọn"}`
        : `${selectedIds.length} khách`;
    if (
      !window.confirm(
        `Gửi thiệp ${channels.join(" + ")} đến ${details}? Backend sẽ kiểm tra quyền, địa chỉ và giới hạn lần cuối.`,
      )
    )
      return;
    const body: InvitationSendBody =
      recipientMode === "GROUP"
        ? { groupId, channels: [...channels] }
        : { guestIds: [...selectedIds], channels: [...channels] };
    const attempt = { body, key: window.crypto.randomUUID() };
    setUncertainSend(attempt);
    sendMutation.mutate(attempt);
  }
  function restoreLatest() {
    if (!conflictDraft) return;
    queryClient.setQueryData(draftKey(weddingId), conflictDraft);
    setEdits(null);
    setConflictDraft(null);
    setSaveMessage("Đã tải bản mới nhất.");
  }
  function retryOnLatest() {
    if (!conflictDraft) return;
    queryClient.setQueryData(draftKey(weddingId), conflictDraft);
    setEdits((current) => ({
      subject: current?.subject ?? subject,
      content: current?.content ?? content,
      smsContent: current?.smsContent ?? smsContent,
      tone: current?.tone ?? tone,
      version: conflictDraft.version,
    }));
    setConflictDraft(null);
    setSaveMessage("Bạn đã chọn giữ phần đang sửa. Nhấn Lưu để thử ghi lên version mới.");
  }

  if (draftQuery.isPending)
    return <div className="p-8 text-sm text-muted-foreground">Đang tải bản nháp…</div>;
  if (draftQuery.isError)
    return (
      <section role="alert" className="rounded-xl border p-5">
        <p>{friendlyError(draftQuery.error)}</p>
        <Button className="mt-3" variant="outline" onClick={() => void draftQuery.refetch()}>
          Tải lại
        </Button>
      </section>
    );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mt-2 font-display text-2xl">Soạn lời mời</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Email và SMS là hai nội dung độc lập. Các link cá nhân hóa được cấp bởi backend, không
              lưu vào trình duyệt.
            </p>
          </div>
          {draftQuery.data && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs">
              Version {draftQuery.data.version}
            </span>
          )}
        </div>
        {!draftQuery.data && (
          <div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có bản nháp. Tạo bằng AI hoặc soạn nội dung bên dưới để bắt đầu.
          </div>
        )}
        {!canViewGuests && (
          <p
            role="note"
            className="mt-4 rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-950"
          >
            Bạn có quyền gửi thiệp nhưng cần thêm quyền xem khách (GUEST_VIEW) để chọn người nhận,
            tạo preview và theo dõi gửi.
          </p>
        )}
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              Tone
              <select
                className="h-11 w-full rounded-lg border bg-background px-3"
                value={tone}
                onChange={(event) => updateField("tone", event.target.value as InvitationTone)}
              >
                {Object.entries(toneLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Chỉ dẫn thêm cho AI{" "}
              <span className="font-normal text-muted-foreground">({instructions.length}/500)</span>
              <textarea
                className="min-h-20 w-full rounded-lg border bg-background p-3 font-normal"
                maxLength={500}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="Ví dụ: lời mời thân mật, ngắn gọn…"
              />
            </label>
            <Button
              onClick={() => {
                if (
                  dirty &&
                  !window.confirm(
                    "Tạo bản AI mới sẽ thay thế bản đã lưu trên server. Các chỉnh sửa hiện tại chưa lưu sẽ bị bỏ. Tiếp tục?",
                  )
                )
                  return;
                generateMutation.mutate();
              }}
              disabled={generateMutation.isPending || instructions.length > 500}
            >
              {generateMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}{" "}
              Tạo nội dung bằng AI
            </Button>
            {generateMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {friendlyError(generateMutation.error)}
              </p>
            )}
            {draftQuery.data?.usedFallback && (
              <p className="rounded-lg bg-muted p-3 text-sm">Email đang dùng mẫu dự phòng.</p>
            )}
            {draftQuery.data?.smsUsedFallback && (
              <p className="rounded-lg bg-muted p-3 text-sm">SMS đang dùng mẫu dự phòng.</p>
            )}
          </div>
          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              Tiêu đề email
              <input
                className="h-11 w-full rounded-lg border bg-background px-3 font-normal"
                maxLength={200}
                value={subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Trân trọng kính mời"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Nội dung email{" "}
              <span className="font-normal text-muted-foreground">({content.length}/10.000)</span>
              <textarea
                className="min-h-36 w-full rounded-lg border bg-background p-3 font-normal"
                maxLength={10000}
                value={content}
                onChange={(event) => updateField("content", event.target.value)}
                placeholder="Dùng {{GuestName}}, {{RsvpLink}}, {{QrLink}}"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Nội dung SMS{" "}
              <span className="font-normal text-muted-foreground">
                ({smsContent.length}/10.000)
              </span>
              <textarea
                className="min-h-28 w-full rounded-lg border bg-background p-3 font-normal"
                maxLength={10000}
                value={smsContent}
                onChange={(event) => updateField("smsContent", event.target.value)}
                placeholder="Dùng {{GuestName}} và {{RsvpLink}}"
              />
            </label>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t pt-4">
          {templateErrors.length > 0 && (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {templateErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          {conflictDraft && (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <p className="flex gap-2">
                <AlertTriangle className="size-5 shrink-0" /> Server có version{" "}
                {conflictDraft.version}; phần đang sửa của bạn vẫn được giữ trong form. Chọn cách xử
                lý trước khi lưu tiếp.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={restoreLatest}>
                  Tải bản mới nhất (bỏ edits)
                </Button>
                <Button onClick={retryOnLatest}>Giữ edits và xác nhận thử trên version mới</Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={
                !dirty ||
                templateErrors.length > 0 ||
                saveMutation.isPending ||
                Boolean(conflictDraft)
              }
              onClick={() =>
                saveMutation.mutate({ subject, content, smsContent, tone, version: form.version })
              }
            >
              {saveMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Check />} Lưu
              bản nháp
            </Button>
            {saveMessage && (
              <p role="status" className="text-sm text-muted-foreground">
                {saveMessage}
              </p>
            )}
            {dirty && <span className="text-sm text-muted-foreground">Có thay đổi chưa lưu.</span>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Mail className="size-5" />
            <h2 className="font-display text-xl">Xem trước & gửi thử</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview dùng dữ liệu đã lưu. Chọn khách có invitation token.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select
              className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3"
              value={previewGuestId}
              onChange={(event) => setPreviewGuestId(event.target.value)}
            >
              <option value="">Chọn khách…</option>
              {(guestQuery.data?.items ?? []).map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {guest.recipientName}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={!previewGuestId || !draftQuery.data || dirty || previewQuery.isFetching}
              onClick={() => void previewQuery.refetch()}
            >
              <RefreshCw className={previewQuery.isFetching ? "animate-spin" : ""} /> Xem trước
            </Button>
          </div>
          {dirty && (
            <p className="mt-2 text-xs text-muted-foreground">
              Lưu bản nháp trước khi tạo preview hoặc gửi để đảm bảo nội dung đồng nhất.
            </p>
          )}
          {previewQuery.isError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {friendlyError(previewQuery.error)}
            </p>
          )}
          {previewQuery.data && (
            <div className="mt-4 space-y-4 rounded-xl border p-4">
              <div role="tablist" aria-label="Kênh xem trước" className="flex gap-2">
                {(["EMAIL", "SMS"] as const).map((channel) => (
                  <button
                    key={channel}
                    role="tab"
                    aria-selected={previewTab === channel}
                    className={`rounded-lg px-3 py-2 text-sm ${previewTab === channel ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => setPreviewTab(channel)}
                  >
                    {channel}
                  </button>
                ))}
              </div>
              {previewTab === "EMAIL" ? (
                <div className="space-y-3">
                  <p className="font-semibold">{previewQuery.data.subject}</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3 font-sans text-sm">
                    {previewQuery.data.content}
                  </pre>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <a
                      className="truncate text-sm underline"
                      href={previewQuery.data.rsvpLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở link RSVP cá nhân
                    </a>
                    <a
                      className="truncate text-sm underline"
                      href={previewQuery.data.qrLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở QR cá nhân
                    </a>
                  </div>
                  <iframe
                    className="size-36 rounded-lg border bg-white p-2"
                    src={previewQuery.data.qrLink}
                    title="QR invitation preview"
                    sandbox=""
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <pre className="whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-sm">
                    {previewQuery.data.smsContent}
                  </pre>
                  <p
                    className={
                      previewQuery.data.smsContent.length > 201
                        ? "text-sm text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    SMS preview: {previewQuery.data.smsContent.length}/201 ký tự UTF-16.
                    {previewQuery.data.smsContent.length > 201 &&
                      " Nội dung vượt giới hạn backend."}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                disabled={testMutation.isPending || dirty || !isPublished}
                onClick={() => {
                  if (
                    window.confirm(
                      "Gửi email thử tới địa chỉ email của tài khoản bạn đang đăng nhập? Email không gửi cho khách.",
                    )
                  )
                    testMutation.mutate();
                }}
              >
                {testMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Send />} Gửi
                thử tới email của tôi
              </Button>
              {dirty && (
                <p className="text-xs text-muted-foreground">Lưu nội dung trước khi gửi thử.</p>
              )}
              {testMutation.isSuccess && (
                <p role="status" className="text-sm text-green-700">
                  Backend đã nhận yêu cầu gửi thử tới tài khoản của bạn.
                </p>
              )}
              {testMutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {friendlyError(testMutation.error)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Send className="size-5" />
            <h2 className="font-display text-xl">Gửi thiệp</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Backend kiểm tra quyền, contact, invitation token và giới hạn batch lần cuối.
          </p>
          <div className="mt-4 flex gap-2">
            {(["GUESTS", "GROUP"] as const).map((mode) => (
              <button
                key={mode}
                className={`rounded-lg px-3 py-2 text-sm ${recipientMode === mode ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => {
                  setRecipientMode(mode);
                  setSelectedIds([]);
                  setSelectedContactFlags({});
                  setPage(1);
                }}
              >
                {mode === "GUESTS" ? "Chọn khách" : "Chọn nhóm"}
              </button>
            ))}
          </div>
          {guestQuery.isError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Không tải được danh sách khách: {friendlyError(guestQuery.error)}
            </p>
          )}
          {groupsQuery.isError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Không tải được danh sách nhóm: {friendlyError(groupsQuery.error)}
            </p>
          )}
          {recipientMode === "GROUP" ? (
            <label className="mt-3 block space-y-2 text-sm">
              Nhóm khách
              <select
                className="h-11 w-full rounded-lg border bg-background px-3"
                value={groupId}
                onChange={(event) => {
                  setGroupId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Chọn nhóm…</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <input
                className="mt-3 h-11 w-full rounded-lg border bg-background px-3 text-sm"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm tên khách…"
                aria-label="Tìm khách nhận thiệp"
              />
              <div className="mt-3 max-h-56 space-y-2 overflow-auto rounded-lg border p-3">
                {(guestQuery.data?.items ?? []).map((guest) => (
                  <label key={guest.id} className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(guest.id)}
                      onChange={(event) => {
                        const selected = event.target.checked;
                        setSelectedIds((current) =>
                          selected
                            ? [...current, guest.id]
                            : current.filter((id) => id !== guest.id),
                        );
                        setSelectedContactFlags((current) => {
                          const next = { ...current };
                          if (selected)
                            next[guest.id] = {
                              email: Boolean(guest.email),
                              phone: Boolean(guest.phone),
                            };
                          else delete next[guest.id];
                          return next;
                        });
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{guest.recipientName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {guest.group?.name ?? "Chưa có nhóm"} ·{" "}
                        {guest.email ? "Có email" : "Thiếu email"} ·{" "}
                        {guest.phone ? "Có điện thoại" : "Thiếu điện thoại"}
                      </span>
                    </span>
                  </label>
                ))}
                {!guestQuery.isPending && !guestQuery.data?.items.length && (
                  <p className="text-sm text-muted-foreground">Không tìm thấy khách.</p>
                )}
                {guestQuery.isPending && (
                  <p className="text-sm text-muted-foreground">Đang tải khách…</p>
                )}
              </div>
              {guestQuery.data && (
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {guestQuery.data.totalItems} khách phù hợp · trang {page}
                  </span>
                  <span className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Trang trước"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Trang sau"
                      disabled={page * guestQuery.data.pageSize >= guestQuery.data.totalItems}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      <ChevronRight />
                    </Button>
                  </span>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Chọn khách trên nhiều trang được giữ trong phiên hiện tại.
              </p>
            </>
          )}
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Kênh gửi</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {(["EMAIL", "SMS"] as const).map((channel) => (
                <label key={channel} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={channels.includes(channel)}
                    onChange={(event) =>
                      setChannels((current) =>
                        event.target.checked
                          ? [...current, channel]
                          : current.filter((item) => item !== channel),
                      )
                    }
                  />
                  {channel === "EMAIL" ? (
                    <Mail className="size-4" />
                  ) : (
                    <MessageSquareText className="size-4" />
                  )}
                  {channel}
                </label>
              ))}
            </div>
          </fieldset>
          {recipientMode === "GUESTS" && missingContacts.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
              {missingContacts.length} khách đã chọn thiếu thông tin cho kênh đã chọn. Backend vẫn
              là nơi xác thực đầy đủ.
            </p>
          )}
          {selectionCount > 180 && (
            <p className="mt-3 text-sm text-destructive">
              Một lần gửi tối đa 180 khách; hãy chia nhóm gửi.
            </p>
          )}
          <p className="mt-3 text-sm">
            Đối tượng: <strong>{selectionCount}</strong> · Kênh:{" "}
            <strong>{channels.join(", ") || "chưa chọn"}</strong>
          </p>
          {uncertainSend && (
            <div className="mt-3 space-y-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm">
              <p>
                Yêu cầu trước chưa có phản hồi xác nhận. Gửi lại sẽ dùng đúng body và idempotency
                key để tránh batch trùng.
              </p>
              <Button
                variant="outline"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate(uncertainSend)}
              >
                {sendMutation.isPending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}{" "}
                Gửi lại cùng yêu cầu
              </Button>
            </div>
          )}
          <Button className="mt-4 w-full" disabled={!canSend} onClick={beginSend}>
            {sendMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Send />} Xếp hàng
            gửi
          </Button>
          {!isPublished &&
            <p className="mt-2 text-sm text-muted-foreground">Publish thiết kế thiệp trước khi gửi link.</p>}
          {dirty && (
            <p className="mt-2 text-xs text-muted-foreground">Lưu bản nháp trước khi gửi.</p>
          )}
          {sendMutation.isError && !uncertainSend && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {friendlyError(sendMutation.error)}
            </p>
          )}
          {sendMutation.isError &&
            uncertainSend &&
            sendMutation.error instanceof ApiError &&
            sendMutation.error.code !== "network" && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {friendlyError(sendMutation.error)} Lần gửi chưa được chấp nhận; kiểm tra lại cấu
                hình rồi bắt đầu lần gửi mới.
              </p>
            )}
        </div>
      </section>

      {activeBatchId && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Kết quả gửi gần nhất</h2>
            </div>
            <Button variant="outline" onClick={() => void batchQuery.refetch()}>
              <RefreshCw className={batchQuery.isFetching ? "animate-spin" : ""} /> Làm mới
            </Button>
          </div>
          {batchQuery.isPending ? (
            <p className="mt-4 text-sm text-muted-foreground">Đang tải trạng thái…</p>
          ) : batchQuery.isError ? (
            <div role="alert" className="mt-4">
              <p className="text-sm">{friendlyError(batchQuery.error)}</p>
              <Button className="mt-2" variant="outline" onClick={() => void batchQuery.refetch()}>
                Thử lại
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ["Trạng thái", statusLabel(batchQuery.data.status)],
                  ["Tổng", batchQuery.data.totalCount],
                  ["Đã nhận", batchQuery.data.sentCount],
                  [
                    "Lỗi / đang chờ",
                    `${batchQuery.data.failedCount} / ${batchQuery.data.pendingCount}`,
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => setShowRecipients((value) => !value)}>
                  {showRecipients ? "Ẩn người nhận" : "Hiện người nhận"}
                </Button>
                {batchQuery.data.jobs.some((job) => job.status === "FAILED") && (
                  <Button disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
                    {retryMutation.isPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}{" "}
                    Thử lại các mục thất bại
                  </Button>
                )}
                {retryMutation.data && (
                  <span className="text-sm text-muted-foreground">
                    Đã xếp lại {retryMutation.data.retried} mục.
                  </span>
                )}
                {retryMutation.isError && (
                  <span role="alert" className="text-sm text-destructive">
                    {friendlyError(retryMutation.error)}
                  </span>
                )}
              </div>
              <div className="mt-4 divide-y rounded-xl border">
                {batchQuery.data.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                  >
                    <div>
                      <span className="font-medium">{job.channel}</span>
                      <span className="ml-2 text-muted-foreground">
                        {showRecipients ? job.recipient : maskRecipient(job.recipient)}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {statusLabel(job.status)}
                      {job.errorCode
                        ? ` · ${friendlyError(new ApiError(422, "business-rule", "", {}, job.errorCode))}`
                        : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Lần thử {job.attemptCount}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                “Đã gửi” nghĩa là nhà cung cấp đã nhận yêu cầu; hiện chưa có xác nhận email vào
                Inbox hay SMS đến điện thoại.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}

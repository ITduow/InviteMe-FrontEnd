"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { getWeddingSetup } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";
import { getWebsite, listWeddingMedia, mediaUrl, publishWebsite, saveWebsite,
  unpublishWebsite, uploadWeddingMedia, websiteTemplates, type Website,
  type WebsiteDocument } from "../api/website.api";
import { WebsiteRenderer } from "./website-renderer";
import { WEDDING_TIME_ZONE, isoToLocalDateTime, localDateTimeToIso } from "../schemas/wedding.schema";
import { usePermission } from "@/shared/components/permission-guard";

const input = "w-full rounded-lg border border-border bg-background px-3 py-2";
function initialHero(url: string | null) {
  if (!url) return null;
  if (url.startsWith("/media/wedding-covers/")) return url;
  try {
    const source = new URL(url);
    return env.apiUrl && source.origin === new URL(env.apiUrl).origin && source.pathname.startsWith("/media/") ? source.pathname : null;
  } catch { return null; }
}

function WebsiteForm({ weddingId, site, slug, fallback }: {
  weddingId: string; site: Website; slug: string; fallback: WebsiteDocument;
}) {
  const { api } = useRuntime();
  const cache = useQueryClient();
  const [draft, setDraft] = useState<WebsiteDocument>(site.document ?? fallback);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(site.version);
  const [status, setStatus] = useState(site.status);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(site.hasUnpublishedChanges);
  const [savedDocument, setSavedDocument] = useState(site.document);
  const media = useQuery({ queryKey: ["wedding-media", weddingId],
    queryFn: () => listWeddingMedia(api, weddingId) });
  const set = <K extends keyof WebsiteDocument>(key: K, value: WebsiteDocument[K]) => {
    if (!busy) setDraft((current) => ({ ...current, [key]: value }));
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDocument);
  const remoteChanged = site.version !== version;
  const scheduleWarnings = [
    ...(Math.abs(Date.parse(draft.eventAt) - Date.parse(fallback.eventAt)) >= 60000
      ? ["Ngày giờ website khác sự kiện chính của wedding. Kiểm tra trước khi publish."] : []),
    ...(draft.venueName.trim().toLowerCase() !== fallback.venueName.trim().toLowerCase() ||
      draft.venueAddress.trim().toLowerCase() !== fallback.venueAddress.trim().toLowerCase()
      ? ["Địa điểm website khác địa điểm chính của wedding."] : []),
  ];
  function load(result: Website) {
    setVersion(result.version); setStatus(result.status); setHasUnpublishedChanges(result.hasUnpublishedChanges);
    setDraft(result.document ?? fallback); setSavedDocument(result.document);
  }
  const url = `${env.appUrl?.replace(/\/$/, "") ?? (typeof window === "undefined" ? "" : window.location.origin)}/wedding/${slug}`;
  async function run(action: () => Promise<Website>, success: string) {
    setBusy(true); setMessage("");
    try {
      const result = await action();
      load(result);
      cache.setQueryData(["website", weddingId], result);
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  async function upload(file: File) {
    setBusy(true);
    try {
      const result = await uploadWeddingMedia(api, weddingId, file);
      setDraft((current) => ({ ...current, heroImageUrl: result.url }));
      void media.refetch();
      setMessage("Đã tải ảnh. Bấm Lưu bản nháp để áp dụng.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được ảnh."); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy} className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="font-serif text-3xl">Website đám cưới</h1>
        <p className="mt-1 text-sm text-muted-foreground">{status === "PUBLISHED" ? "Đang công khai" : status === "UNPUBLISHED" ? "Đã tạm ẩn" : "Chưa xuất bản"}
          {(dirty || hasUnpublishedChanges) ? " · Có thay đổi chưa xuất bản" : ""}</p></div>
      <button className="rounded-lg border px-4 py-2" type="button" onClick={() => setPreview((value) => !value)}>
        {preview ? "Đóng xem trước" : "Xem trước bản nháp"}</button>
    </div>
    {remoteChanged && <div className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-amber-950" role="alert">
      Website đã thay đổi ở nơi khác. Nội dung bạn đang sửa được giữ lại; tải bản mới trước khi tiếp tục.
      <button type="button" className="ml-3 underline" onClick={() => load(site)}>Tải bản mới (bỏ sửa đổi chưa lưu)</button>
    </div>}
    {scheduleWarnings.map((warning) => <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-950" key={warning}>{warning}</p>)}
    {preview ? <WebsiteRenderer document={draft} preview /> : <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Nội dung</h2>
        <label className="block text-sm">Tiêu đề<input className={input} maxLength={160} value={draft.title} onChange={(e) => set("title", e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Người thứ nhất<input className={input} maxLength={100} value={draft.partnerOne} onChange={(e) => set("partnerOne", e.target.value)} /></label>
          <label className="block text-sm">Người thứ hai<input className={input} maxLength={100} value={draft.partnerTwo} onChange={(e) => set("partnerTwo", e.target.value)} /></label>
        </div>
        <label className="block text-sm">Câu chuyện<textarea className={input} rows={6} maxLength={5000} value={draft.story} onChange={(e) => set("story", e.target.value)} /></label>
        <label className="block text-sm">Ngày giờ<input className={input} type="datetime-local" value={isoToLocalDateTime(draft.eventAt, draft.timeZoneId ?? WEDDING_TIME_ZONE)} onChange={(e) => set("eventAt", e.target.value ? localDateTimeToIso(e.target.value, draft.timeZoneId ?? WEDDING_TIME_ZONE) : "")} /></label>
        <label className="block text-sm">Tên địa điểm<input className={input} maxLength={200} value={draft.venueName} onChange={(e) => set("venueName", e.target.value)} /></label>
        <label className="block text-sm">Địa chỉ<input className={input} maxLength={300} value={draft.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} /></label>
        <label className="block text-sm">Liên hệ công khai<input className={input} maxLength={200} value={draft.contact ?? ""} onChange={(e) => set("contact", e.target.value || null)} /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.showStory} onChange={(e) => set("showStory", e.target.checked)} /> Hiển thị câu chuyện</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.showEvent} onChange={(e) => set("showEvent", e.target.checked)} /> Hiển thị sự kiện</label>
        <div className="space-y-3 border-t pt-4"><h3 className="font-serif text-xl">Mốc câu chuyện</h3>
          {(draft.timeline ?? []).map((item, index) => <div className="rounded-lg border p-3" key={index}>
            <input className={input} placeholder="Tên mốc" maxLength={120} value={item.title} onChange={(e) =>
              set("timeline", (draft.timeline ?? []).map((entry, i) => i === index ? { ...entry, title: e.target.value } : entry))} />
            <textarea className={`${input} mt-2`} placeholder="Nội dung" maxLength={1000} value={item.description} onChange={(e) =>
              set("timeline", (draft.timeline ?? []).map((entry, i) => i === index ? { ...entry, description: e.target.value } : entry))} />
            <button type="button" className="text-sm underline" onClick={() => set("timeline", (draft.timeline ?? []).filter((_, i) => i !== index))}>Xóa mốc</button>
          </div>)}
          <button type="button" className="text-sm underline" disabled={(draft.timeline?.length ?? 0) >= 12}
            onClick={() => set("timeline", [...(draft.timeline ?? []), { title: "", description: "" }])}>Thêm mốc</button>
        </div>
        <div className="space-y-3 border-t pt-4"><h3 className="font-serif text-xl">Các buổi lễ</h3>
          {(draft.events ?? []).map((item, index) => <div className="rounded-lg border p-3" key={index}>
            <input className={input} placeholder="Tên buổi lễ" maxLength={120} value={item.name} onChange={(e) =>
              set("events", (draft.events ?? []).map((entry, i) => i === index ? { ...entry, name: e.target.value } : entry))} />
            <input className={`${input} mt-2`} type="datetime-local" value={isoToLocalDateTime(item.startsAt, draft.timeZoneId ?? WEDDING_TIME_ZONE)} onChange={(e) =>
              set("events", (draft.events ?? []).map((entry, i) => i === index ? { ...entry, startsAt: e.target.value ? localDateTimeToIso(e.target.value, draft.timeZoneId ?? WEDDING_TIME_ZONE) : "" } : entry))} />
            <input className={`${input} mt-2`} placeholder="Địa chỉ" maxLength={300} value={item.address} onChange={(e) =>
              set("events", (draft.events ?? []).map((entry, i) => i === index ? { ...entry, address: e.target.value } : entry))} />
            <button type="button" className="text-sm underline" onClick={() => set("events", (draft.events ?? []).filter((_, i) => i !== index))}>Xóa buổi lễ</button>
          </div>)}
          <button type="button" className="text-sm underline" disabled={(draft.events?.length ?? 0) >= 10}
            onClick={() => set("events", [...(draft.events ?? []), { name: "", startsAt: draft.eventAt, address: "" }])}>Thêm buổi lễ</button>
        </div>
      </section>
      <section className="space-y-5 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Mẫu và ảnh</h2>
        <div className="grid grid-cols-2 gap-3">
          {websiteTemplates.map((template) => <button key={template.id} type="button" onClick={() => set("templateId", template.id)}
            aria-pressed={draft.templateId === template.id}
            className={`rounded-xl border-2 p-5 text-left ${draft.templateId === template.id ? "border-primary" : "border-transparent"}`}
            style={{ background: template.background, color: template.color }}>
            <span className="font-serif text-2xl">{template.name}</span></button>)}
        </div>
        <label className="block text-sm">Tải ảnh lên<input className={input} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
          onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label>
        {media.data?.length ? <div className="grid grid-cols-4 gap-2">{media.data.map((item) => <button key={item.id}
          type="button" onClick={() => set("heroImageUrl", item.url)} className="aspect-square overflow-hidden rounded border"
          style={{ backgroundImage: `url(${mediaUrl(item.url)})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-label="Chọn ảnh đã tải" />)}</div> : null}
        {draft.heroImageUrl && <button className="text-sm underline" type="button" onClick={() => set("heroImageUrl", null)}>Bỏ ảnh bìa</button>}
        <div className="border-t pt-4"><h3 className="font-serif text-xl">Album ảnh</h3>
          <p className="text-sm text-muted-foreground">Nhấp ảnh trong thư viện để thêm vào album.</p>
          <div className="mt-3 grid grid-cols-4 gap-2">{media.data?.map((item) => <button key={`gallery-${item.id}`}
            type="button" disabled={(draft.gallery?.length ?? 0) >= 30}
            onClick={() => set("gallery", [...(draft.gallery ?? []), item.url])}
            className="aspect-square rounded border bg-cover bg-center" style={{ backgroundImage: `url(${mediaUrl(item.url)})` }}
            aria-label="Thêm ảnh vào album" />)}</div>
          {(draft.gallery ?? []).map((src, index) => <button key={`${src}-${index}`} type="button" className="mr-2 mt-2 text-xs underline"
            onClick={() => set("gallery", (draft.gallery ?? []).filter((_, i) => i !== index))}>Bỏ ảnh {index + 1}</button>)}
        </div>
      </section>
    </div>}
    <div className="flex flex-wrap items-center gap-3">
      <button className="rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50" disabled={busy || remoteChanged}
        onClick={() => void run(() => saveWebsite(api, weddingId, version, {
          ...draft,
        }), "Đã lưu bản nháp. Website công khai chưa thay đổi.")}>Lưu bản nháp</button>
      <button className="rounded-lg border px-5 py-2 disabled:opacity-50" disabled={busy || remoteChanged || version === 0 || dirty || (!hasUnpublishedChanges && status === "PUBLISHED")}
        onClick={() => void run(() => publishWebsite(api, weddingId, version), "Đã xuất bản website.")}>Xuất bản{status === "PUBLISHED" ? " thay đổi" : ""}</button>
      {status === "PUBLISHED" && <button className="rounded-lg border px-5 py-2 disabled:opacity-50" disabled={busy || dirty || remoteChanged}
        onClick={() => void run(() => unpublishWebsite(api, weddingId, version), "Đã ẩn website công khai.")}>Ẩn website</button>}
      {status === "PUBLISHED" && <a className="underline" href={url} target="_blank" rel="noreferrer">Mở website</a>}
      {status === "PUBLISHED" && <button className="underline" type="button" onClick={() => void navigator.clipboard.writeText(url)}>Sao chép link</button>}
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </fieldset>;
}

export function WebsiteEditor({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { isOwner } = usePermission();
  const site = useQuery({ queryKey: ["website", weddingId], queryFn: ({ signal }) => getWebsite(api, weddingId, signal), enabled: isOwner });
  const wedding = useQuery({ queryKey: weddingKeys.detail(weddingId), queryFn: ({ signal }) => getWeddingSetup(api, weddingId, signal) });
  if (!isOwner) return <p>Chỉ chủ hôn có quyền quản lý website.</p>;
  if (site.isPending || wedding.isPending) return <p>Đang tải website…</p>;
  if (site.isError || wedding.isError) return <p>Không tải được website. Vui lòng tải lại trang.</p>;
  const setup = wedding.data;
  const fallback: WebsiteDocument = {
    templateId: "story-red-velvet", title: setup.name, partnerOne: "", partnerTwo: "", story: "",
    eventAt: setup.eventDateTime ?? new Date().toISOString(), venueName: setup.venueName ?? "",
    venueAddress: setup.venueAddress ?? "", heroImageUrl: initialHero(setup.coverImageUrl),
    showStory: true, showEvent: true, contact: null, timeline: [], events: [], gallery: [],
    timeZoneId: setup.timeZoneId ?? WEDDING_TIME_ZONE,
  };
  return <WebsiteForm key={weddingId} weddingId={weddingId} site={site.data} slug={setup.slug} fallback={fallback} />;
}

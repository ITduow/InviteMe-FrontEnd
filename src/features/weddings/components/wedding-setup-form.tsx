"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Check, Flower2, MapPin, Sparkles, Users } from "lucide-react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { FormField } from "@/shared/forms/form-field";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ErrorState } from "@/shared/feedback/error-state";
import { ConfirmDialog } from "@/shared/feedback/confirm-dialog";
import { weddingKeys } from "../api/wedding.keys";
import {
  createWedding,
  deleteWeddingCover,
  getWeddingSetup,
  updateWeddingSetup,
  uploadWeddingCover,
} from "../api/wedding.api";
import { useWeddingSetup } from "../hooks/use-wedding-setup";
import {
  WEDDING_TIME_ZONE,
  isoToLocalDateTime,
  localDateTimeToIso,
  slugFromWeddingName,
  weddingSlugSchema,
  type WeddingSetup,
} from "../schemas/wedding.schema";
import { WeddingSlugField } from "./wedding-slug-field";
import { validateWeddingCover, WeddingCoverUploader } from "./wedding-cover-uploader";

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Vui lòng nhập tên lễ cưới.").max(200, "Tên tối đa 200 ký tự."),
    slug: weddingSlugSchema,
    eventDateTime: z.string().min(1, "Vui lòng chọn ngày và giờ tổ chức."),
    rsvpDeadline: z.string().min(1, "Vui lòng chọn hạn xác nhận tham dự."),
    venueName: z.string().trim().min(1, "Vui lòng nhập tên địa điểm.").max(200),
    venueAddress: z.string().trim().min(1, "Vui lòng nhập địa chỉ.").max(2000),
    capacity: z
      .string()
      .regex(/^[1-9]\d*$/, "Sức chứa phải là số nguyên lớn hơn 0.")
      .refine(
        (value) => Number.isSafeInteger(Number(value)) && Number(value) <= 2_147_483_647,
        "Sức chứa vượt quá giới hạn cho phép.",
      ),
  })
  .superRefine((value, ctx) => {
    if (value.rsvpDeadline && value.eventDateTime && value.rsvpDeadline > value.eventDateTime)
      ctx.addIssue({
        code: "custom",
        path: ["rsvpDeadline"],
        message: "Hạn xác nhận không được sau ngày tổ chức.",
      });
  });
type FormValues = z.infer<typeof formSchema>;
const EMPTY_VALUES: FormValues = {
  name: "",
  slug: "",
  eventDateTime: "",
  rsvpDeadline: "",
  venueName: "",
  venueAddress: "",
  capacity: "",
};

function formValuesFrom(wedding: WeddingSetup): FormValues {
  return {
    name: wedding.name,
    slug: wedding.slug,
    eventDateTime: isoToLocalDateTime(
      wedding.eventDateTime,
      wedding.timeZoneId || WEDDING_TIME_ZONE,
    ),
    rsvpDeadline: isoToLocalDateTime(wedding.rsvpDeadline, wedding.timeZoneId || WEDDING_TIME_ZONE),
    venueName: wedding.venueName ?? "",
    venueAddress: wedding.venueAddress ?? "",
    capacity: wedding.capacity === null ? "" : String(wedding.capacity),
  };
}

function errorMessage(error: unknown) {
  if (!(error instanceof ApiError))
    return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  if (error.status === 413 || error.backendCode === "WEDDING_COVER_TOO_LARGE")
    return "Ảnh vượt quá dung lượng tối đa 5 MB.";
  if (error.backendCode === "WEDDING_COVER_UNSUPPORTED")
    return "Ảnh không đúng định dạng JPEG, PNG hoặc WebP.";
  if (error.backendCode === "WEDDING_SLUG_ALREADY_EXISTS")
    return "Đường dẫn này đã được sử dụng. Vui lòng chọn đường dẫn khác.";
  if (error.backendCode === "WEDDING_CONCURRENCY_CONFLICT")
    return "Thông tin lễ cưới đã được thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất.";
  if (error.backendCode === "WEDDING_ACCESS_DENIED" || error.status === 403)
    return "Bạn không có quyền thực hiện thao tác này.";
  if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error.status === 404) return "Không tìm thấy lễ cưới.";
  if (error.status === 429) return "Bạn thao tác quá nhanh, vui lòng thử lại sau.";
  return "Chưa thể lưu thông tin. Vui lòng kiểm tra dữ liệu và thử lại.";
}

function WeddingSetupSkeleton() {
  return (
    <section
      role="status"
      aria-label="Đang tải thiết lập lễ cưới"
      className="mx-auto max-w-6xl space-y-7 pb-10"
    >
      <span className="sr-only">Đang tải thông tin lễ cưới…</span>
      <div
        aria-hidden="true"
        className="h-4 w-36 animate-pulse rounded bg-muted motion-reduce:animate-none"
      />
      <div aria-hidden="true" className="space-y-3 border-b border-border pb-6">
        <div className="h-3 w-44 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-10 w-2/3 max-w-lg animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="h-40 animate-pulse rounded-2xl border border-border bg-card motion-reduce:animate-none"
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="hidden h-72 animate-pulse rounded-2xl border border-border bg-card motion-reduce:animate-none xl:block"
        />
      </div>
    </section>
  );
}

export function WeddingSetupForm({ weddingId }: { weddingId?: string }) {
  const isEdit = Boolean(weddingId);
  const router = useRouter();
  const { api } = useRuntime();
  const cache = useQueryClient();
  const { can } = usePermission();
  // WEDDING_EDIT controls the UX; owner-only mutations remain enforced by the backend.
  const canEdit = !isEdit || can("WEDDING_EDIT");
  const setup = useWeddingSetup(weddingId ?? "", isEdit);
  const [serverError, setServerError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const slugTouched = useRef(Boolean(weddingId));
  const initializedFromServer = useRef(false);
  const [created, setCreated] = useState<WeddingSetup | null>(null);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { reset } = form;
  const slugValue = useWatch({ control: form.control, name: "slug" });
  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedEventDate = useWatch({ control: form.control, name: "eventDateTime" });
  const watchedVenue = useWatch({ control: form.control, name: "venueName" });
  const watchedCapacity = useWatch({ control: form.control, name: "capacity" });

  useEffect(() => {
    if (!setup.data || initializedFromServer.current) return;
    reset(formValuesFrom(setup.data));
    initializedFromServer.current = true;
  }, [setup.data, reset]);

  function handleError(error: unknown) {
    const message = errorMessage(error);
    setServerError(message);
    if (error instanceof ApiError) {
      if (error.backendCode === "WEDDING_SLUG_ALREADY_EXISTS")
        form.setError("slug", { type: "server", message });
      const fields: Record<string, keyof FormValues> = {
        Name: "name",
        name: "name",
        Slug: "slug",
        slug: "slug",
        EventDateTime: "eventDateTime",
        eventDateTime: "eventDateTime",
        RsvpDeadline: "rsvpDeadline",
        rsvpDeadline: "rsvpDeadline",
        VenueName: "venueName",
        venueName: "venueName",
        VenueAddress: "venueAddress",
        venueAddress: "venueAddress",
        Capacity: "capacity",
        capacity: "capacity",
      };
      for (const key of Object.keys(error.fieldErrors)) {
        const field = fields[key];
        if (field)
          form.setError(field, { type: "server", message: "Vui lòng kiểm tra lại thông tin này." });
      }
    }
    if (error instanceof ApiError && error.backendCode === "WEDDING_CONCURRENCY_CONFLICT")
      setConflict(true);
  }

  async function refreshList() {
    await cache.invalidateQueries({ queryKey: weddingKeys.lists() });
  }

  async function uploadCover(target: WeddingSetup, file: File) {
    setMutationBusy(true);
    setServerError("");
    try {
      const result = await uploadWeddingCover(api, target.id, file, target.version);
      const latest = { ...target, coverImageUrl: result.coverImageUrl, version: result.version };
      cache.setQueryData(weddingKeys.detail(target.id), latest);
      if (!isEdit) setCreated(latest);
      return latest;
    } catch (error) {
      if (error instanceof ApiError && error.backendCode === "WEDDING_CONCURRENCY_CONFLICT")
        setConflict(true);
      throw new Error(errorMessage(error));
    } finally {
      setMutationBusy(false);
    }
  }

  async function removeCover() {
    if (!setup.data || mutationBusy || !canEdit) return;
    setMutationBusy(true);
    setServerError("");
    try {
      const result = await deleteWeddingCover(api, setup.data.id, setup.data.version);
      cache.setQueryData(weddingKeys.detail(setup.data.id), { ...setup.data, ...result });
    } catch (error) {
      handleError(error);
      throw new Error(errorMessage(error));
    } finally {
      setMutationBusy(false);
    }
  }

  async function submit(values: FormValues) {
    setServerError("");
    setConflict(false);
    const coverValidation = pendingCover ? validateWeddingCover(pendingCover) : undefined;
    if (coverValidation) {
      setServerError(coverValidation);
      return;
    }
    let eventDateTime: string;
    let rsvpDeadline: string;
    try {
      eventDateTime = localDateTimeToIso(
        values.eventDateTime,
        setup.data?.timeZoneId || WEDDING_TIME_ZONE,
      );
      rsvpDeadline = localDateTimeToIso(
        values.rsvpDeadline,
        setup.data?.timeZoneId || WEDDING_TIME_ZONE,
      );
    } catch (error) {
      form.setError("eventDateTime", {
        message: error instanceof Error ? error.message : "Ngày giờ không hợp lệ.",
      });
      return;
    }
    const commonInput = {
      name: values.name,
      slug: values.slug.trim().toLowerCase(),
      eventDateTime,
      venueName: values.venueName,
      venueAddress: values.venueAddress,
      capacity: Number(values.capacity),
      rsvpDeadline,
    };
    if (Date.parse(rsvpDeadline) > Date.parse(eventDateTime)) {
      form.setError("rsvpDeadline", { message: "Hạn xác nhận không được sau ngày tổ chức." });
      return;
    }
    setMutationBusy(true);
    let createdDuringSubmit: WeddingSetup | null = null;
    try {
      if (weddingId && setup.data) {
        const updated = await updateWeddingSetup(api, weddingId, {
          ...commonInput,
          coverImageUrl: setup.data.coverImageUrl,
          expectedVersion: setup.data.version,
        });
        cache.setQueryData(weddingKeys.detail(weddingId), updated);
        void refreshList();
        if (pendingCover) {
          await uploadCover(updated, pendingCover);
          setPendingCover(null);
        }
        router.push(`/weddings/${encodeURIComponent(weddingId)}/overview?updated=1`);
      } else {
        const newWedding = await createWedding(api, { ...commonInput, coverImageUrl: null });
        createdDuringSubmit = newWedding;
        setCreated(newWedding);
        cache.setQueryData(weddingKeys.detail(newWedding.id), newWedding);
        void refreshList();
        if (pendingCover) {
          await uploadCover(newWedding, pendingCover);
          setPendingCover(null);
        }
        router.push(`/weddings/${encodeURIComponent(newWedding.id)}/overview?created=1`);
      }
    } catch (error) {
      if (createdDuringSubmit) {
        setServerError(
          `Đã tạo lễ cưới “${createdDuringSubmit.name}” nhưng chưa tải được ảnh. ${error instanceof Error ? error.message : errorMessage(error)}`,
        );
      } else handleError(error);
    } finally {
      setMutationBusy(false);
    }
  }

  async function retryCreatedCover() {
    if (!created || !pendingCover || mutationBusy) return;
    const validation = validateWeddingCover(pendingCover);
    if (validation) {
      setServerError(validation);
      return;
    }
    try {
      const latest = await uploadCover(created, pendingCover);
      setCreated(latest);
      setPendingCover(null);
      void refreshList();
      router.push(`/weddings/${encodeURIComponent(latest.id)}/overview?created=1`);
    } catch (error) {
      setServerError(
        `Đã tạo lễ cưới “${created.name}” nhưng chưa tải được ảnh. ${error instanceof Error ? error.message : errorMessage(error)}`,
      );
    }
  }

  async function reloadLatestSetup() {
    const latest = await setup.refetch();
    if (latest.data) {
      reset(formValuesFrom(latest.data));
      setConflict(false);
      setServerError("");
    }
  }

  if (isEdit && setup.isPending) return <WeddingSetupSkeleton />;
  if (isEdit && setup.isError)
    return <ErrorState error={setup.error} retry={() => void setup.refetch()} />;
  if (isEdit && !setup.data) return null;

  if (created) {
    const createdWedding = created;
    async function reloadCreatedWedding() {
      try {
        const latest = await getWeddingSetup(api, createdWedding.id);
        setCreated(latest);
        cache.setQueryData(weddingKeys.detail(createdWedding.id), latest);
        setConflict(false);
        setServerError("");
      } catch (error) {
        setServerError(errorMessage(error));
      }
    }
    return (
      <section className="mx-auto max-w-3xl space-y-6 pb-10">
        <Link
          href="/weddings"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Danh sách lễ cưới
        </Link>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
          <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-success/20 text-success-foreground">
            <Check className="size-6" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success-foreground">
            Workspace đã sẵn sàng
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">{created.name}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Thông tin lễ cưới đã được lưu. Bạn có thể mở workspace hoặc hoàn tất tải ảnh bìa bên
            dưới.
          </p>
          {serverError && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive"
            >
              {serverError}
            </p>
          )}
          {conflict && (
            <Button type="button" variant="outline" onClick={() => void reloadCreatedWedding()}>
              Tải dữ liệu mới nhất
            </Button>
          )}
          <div className="mt-7 rounded-2xl border border-border bg-card p-4 sm:p-5">
            {pendingCover && (
              <p className="mb-3 text-sm text-muted-foreground">
                Ảnh đang chờ tải lên:{" "}
                <span className="font-medium text-foreground">{pendingCover.name}</span>
              </p>
            )}
            <WeddingCoverUploader
              currentUrl={created.coverImageUrl}
              disabled={mutationBusy}
              busy={mutationBusy}
              deferUpload
              onSelect={setPendingCover}
              onUpload={async () => undefined}
              onRemove={async () => undefined}
            />
            {pendingCover && (
              <Button
                type="button"
                className="mt-4 min-h-11 w-full rounded-xl sm:w-auto"
                onClick={() => void retryCreatedCover()}
                disabled={mutationBusy || Boolean(validateWeddingCover(pendingCover))}
              >
                {mutationBusy ? "Đang tải ảnh…" : "Thử tải ảnh lên"}
              </Button>
            )}
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              className="min-h-11 rounded-xl px-5"
              onClick={() => router.push(`/weddings/${encodeURIComponent(created.id)}/overview`)}
            >
              Mở workspace
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl px-5"
              onClick={() => router.push("/weddings")}
            >
              Về danh sách lễ cưới
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const initial = setup.data;
  const busy = mutationBusy || form.formState.isSubmitting;
  const hasUnsavedChanges = form.formState.isDirty || Boolean(pendingCover);
  const cancelAction = () =>
    router.push(weddingId ? `/weddings/${encodeURIComponent(weddingId)}/overview` : "/weddings");
  return (
    <section className="mx-auto max-w-6xl space-y-6 pb-10 sm:space-y-8">
      <Link
        href={weddingId ? `/weddings/${encodeURIComponent(weddingId)}/overview` : "/weddings"}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {isEdit ? "Quay lại workspace" : "Danh sách lễ cưới"}
      </Link>
      <header className="border-b border-border pb-6 sm:pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-hover">
          {isEdit ? "THIẾT LẬP LỄ CƯỚI" : "BẮT ĐẦU WORKSPACE"}
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
          {isEdit ? "Thông tin lễ cưới" : "Tạo lễ cưới"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {isEdit
            ? `Cập nhật thông tin chung cho ${initial?.name ?? "lễ cưới của bạn"}.`
            : "Tạo không gian riêng để lưu những thông tin quan trọng cho ngày vui."}
        </p>
      </header>
      {(serverError || conflict) && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <span>
            {serverError ||
              "Thông tin lễ cưới đã được thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất."}
          </span>
          {conflict && (
            <Button
              type="button"
              variant="outline"
              className="min-h-10 shrink-0 rounded-xl border-destructive/30 text-destructive hover:bg-white"
              onClick={() => void reloadLatestSetup()}
            >
              Tải dữ liệu mới nhất
            </Button>
          )}
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-8">
        <form
          onSubmit={form.handleSubmit(submit)}
          noValidate
          aria-busy={busy}
          className="space-y-4"
        >
          <fieldset disabled={!canEdit || busy} className="space-y-4">
            <section
              className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              aria-labelledby="wedding-basic-heading"
            >
              <div className="flex items-start gap-3 border-b border-border pb-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-hover">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-hover">
                    01 · Nhận diện
                  </p>
                  <h2 id="wedding-basic-heading" className="mt-1 font-display text-xl">
                    Thông tin lễ cưới
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tên và đường dẫn riêng cho workspace.
                  </p>
                </div>
              </div>
              <FormField control={form.control} name="name" label="Tên lễ cưới *">
                {(field) => (
                  <Input
                    {...field}
                    required
                    aria-required="true"
                    value={String(field.value ?? "")}
                    maxLength={200}
                    className="h-12 rounded-xl bg-card"
                    placeholder="Ví dụ: Lễ cưới của Minh và Lan"
                    onChange={(event) => {
                      field.onChange(event);
                      if (!slugTouched.current)
                        form.setValue("slug", slugFromWeddingName(event.target.value), {
                          shouldValidate: true,
                        });
                    }}
                  />
                )}
              </FormField>
              <WeddingSlugField
                value={slugValue}
                onChange={(value) => {
                  slugTouched.current = true;
                  form.setValue("slug", value, { shouldValidate: true });
                }}
                weddingId={weddingId}
                initialSlug={initial?.slug}
                error={form.formState.errors.slug?.message}
              />
            </section>

            <section
              className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              aria-labelledby="wedding-time-heading"
            >
              <div className="flex items-start gap-3 border-b border-border pb-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-hover">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-hover">
                    02 · Thời gian
                  </p>
                  <h2 id="wedding-time-heading" className="mt-1 font-display text-xl">
                    Ngày vui
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Múi giờ: {initial?.timeZoneId || WEDDING_TIME_ZONE}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="eventDateTime"
                  label="Ngày và giờ tổ chức *"
                >
                  {(field) => (
                    <Input
                      {...field}
                      required
                      aria-required="true"
                      type="datetime-local"
                      value={String(field.value ?? "")}
                      className="h-12 rounded-xl bg-card"
                    />
                  )}
                </FormField>
                <FormField
                  control={form.control}
                  name="rsvpDeadline"
                  label="Hạn xác nhận tham dự *"
                >
                  {(field) => (
                    <Input
                      {...field}
                      required
                      aria-required="true"
                      type="datetime-local"
                      value={String(field.value ?? "")}
                      className="h-12 rounded-xl bg-card"
                    />
                  )}
                </FormField>
              </div>
            </section>

            <section
              className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              aria-labelledby="wedding-venue-heading"
            >
              <div className="flex items-start gap-3 border-b border-border pb-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-hover">
                  <MapPin className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-hover">
                    03 · Địa điểm
                  </p>
                  <h2 id="wedding-venue-heading" className="mt-1 font-display text-xl">
                    Nơi tổ chức
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Địa chỉ này sẽ giúp bạn nhận diện workspace.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="venueName" label="Tên địa điểm *">
                  {(field) => (
                    <Input
                      {...field}
                      required
                      aria-required="true"
                      value={String(field.value ?? "")}
                      maxLength={200}
                      className="h-12 rounded-xl bg-card"
                      placeholder="White Palace"
                    />
                  )}
                </FormField>
                <FormField control={form.control} name="venueAddress" label="Địa chỉ *">
                  {(field) => (
                    <Input
                      {...field}
                      required
                      aria-required="true"
                      value={String(field.value ?? "")}
                      maxLength={2000}
                      className="h-12 rounded-xl bg-card"
                      placeholder="TP. Hồ Chí Minh"
                    />
                  )}
                </FormField>
              </div>
            </section>

            <section
              className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              aria-labelledby="wedding-capacity-heading"
            >
              <div className="flex items-start gap-3 border-b border-border pb-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-hover">
                  <Users className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-hover">
                    04 · Khách mời
                  </p>
                  <h2 id="wedding-capacity-heading" className="mt-1 font-display text-xl">
                    Sức chứa dự kiến
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Có thể điều chỉnh khi kế hoạch thay đổi.
                  </p>
                </div>
              </div>
              <FormField control={form.control} name="capacity" label="Số lượng khách tối đa *">
                {(field) => (
                  <Input
                    {...field}
                    required
                    aria-required="true"
                    value={String(field.value ?? "")}
                    type="number"
                    min={1}
                    max={2_147_483_647}
                    step={1}
                    inputMode="numeric"
                    className="h-12 max-w-xs rounded-xl bg-card"
                    placeholder="200"
                  />
                )}
              </FormField>
            </section>

            <section
              className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              aria-labelledby="wedding-cover-heading"
            >
              <div className="flex items-start gap-3 border-b border-border pb-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-hover">
                  <Flower2 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-hover">
                    05 · Ảnh bìa
                  </p>
                  <h2 id="wedding-cover-heading" className="mt-1 font-display text-xl">
                    Một dấu ấn của hai bạn
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ảnh sẽ xuất hiện tại trang tổng quan. Có thể thêm hoặc thay sau.
                  </p>
                </div>
              </div>
              <WeddingCoverUploader
                currentUrl={initial?.coverImageUrl ?? null}
                disabled={!canEdit}
                busy={busy}
                deferUpload={!isEdit}
                onSelect={!isEdit ? setPendingCover : undefined}
                onUpload={async (file) => {
                  if (isEdit && initial) {
                    await uploadCover(initial, file);
                    form.clearErrors();
                  }
                }}
                onRemove={removeCover}
              />
            </section>
          </fieldset>
          {!canEdit && (
            <p role="status" className="text-sm text-muted-foreground">
              Bạn có quyền xem thông tin lễ cưới nhưng không có quyền chỉnh sửa.
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:justify-end sm:p-5">
            {hasUnsavedChanges ? (
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-xl px-5"
                    disabled={busy}
                  >
                    Hủy
                  </Button>
                }
                title="Bỏ thay đổi chưa lưu?"
                description="Thông tin bạn vừa nhập sẽ không được lưu."
                onConfirm={cancelAction}
                cancelLabel="Tiếp tục chỉnh sửa"
                confirmLabel="Bỏ thay đổi"
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-xl px-5"
                disabled={busy}
                onClick={cancelAction}
              >
                Hủy
              </Button>
            )}
            {canEdit && (
              <Button
                type="submit"
                className="min-h-11 rounded-xl px-6 shadow-sm"
                disabled={busy || (isEdit && !setup.data)}
              >
                {busy
                  ? isEdit
                    ? "Đang lưu…"
                    : "Đang tạo lễ cưới…"
                  : isEdit
                    ? "Lưu thay đổi"
                    : "Tạo lễ cưới"}
              </Button>
            )}
          </div>
        </form>

        <aside className="hidden xl:block">
          <div className="sticky top-6 space-y-4">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="bg-muted px-5 py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-hover">
                  Xem trước
                </p>
                <h2 className="mt-2 break-words font-display text-2xl leading-snug text-foreground">
                  {watchedName?.trim() || "Tên lễ cưới"}
                </h2>
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  /wedding/{slugValue || "duong-dan-cua-ban"}
                </p>
              </div>
              <div className="space-y-4 p-5">
                <p className="flex items-start gap-3 text-sm leading-5 text-muted-foreground">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {watchedEventDate
                    ? watchedEventDate.replace("T", " · ")
                    : "Chưa chọn ngày tổ chức"}
                </p>
                <p className="flex items-start gap-3 text-sm leading-5 text-muted-foreground">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {watchedVenue?.trim() || "Chưa nhập địa điểm"}
                </p>
                <p className="flex items-start gap-3 text-sm leading-5 text-muted-foreground">
                  <Users
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {watchedCapacity ? `${watchedCapacity} khách tối đa` : "Chưa thiết lập sức chứa"}
                </p>
              </div>
            </section>
            <p className="rounded-2xl border border-border bg-white/65 p-4 text-xs leading-5 text-muted-foreground">
              Đây là bản xem trước thông tin trong workspace. Đường dẫn công khai chỉ hoạt động sau
              khi trang cưới được xuất bản.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

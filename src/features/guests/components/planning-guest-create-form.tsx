"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/shared/forms/form-field";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { planningGuestCreateSchema, type PlanningGuestCreate } from "../api/planning.api";

const sideOptions = [
  ["BRIDE", "Nhà gái"],
  ["GROOM", "Nhà trai"],
  ["MUTUAL", "Chung"],
  ["UNSPECIFIED", "Chưa xác định"],
] as const;

const kindOptions = [
  ["INDIVIDUAL", "Cá nhân"],
  ["FAMILY", "Gia đình"],
  ["GROUP", "Nhóm"],
] as const;

export function PlanningGuestCreateForm({
  groups,
  isWeddingWide,
  busy,
  onCancel,
  onSave,
}: {
  groups: { id: string; name: string }[];
  isWeddingWide: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: PlanningGuestCreate) => void;
}) {
  const form = useForm<PlanningGuestCreate>({
    resolver: zodResolver(planningGuestCreateSchema),
    defaultValues: {
      recipientName: "",
      honorific: "",
      invitationKind: "INDIVIDUAL",
      expectedPeople: 1,
      side: "UNSPECIFIED",
      groupId: !isWeddingWide && groups.length === 1 ? (groups[0]?.id ?? null) : null,
      phone: "",
      note: "",
      email: "",
    },
  });

  function submit(values: PlanningGuestCreate) {
    if (!isWeddingWide && !values.groupId) {
      form.setError("groupId", {
        type: "manual",
        message: "Chọn nhóm khách thuộc phạm vi được giao.",
      });
      return;
    }
    onSave({
      ...values,
      honorific: values.honorific?.trim() || null,
      groupId: values.groupId || null,
      phone: values.phone?.trim() || null,
      note: values.note?.trim() || null,
      email: values.email?.trim() || null,
    });
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
      onSubmit={form.handleSubmit(submit)}
      aria-busy={busy}
      noValidate
    >
      <div>
        <h2 className="text-lg font-semibold">Thêm khách thủ công</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tạo khách và số chỗ dự kiến. Link thiệp riêng sẽ được sinh tự động.
        </p>
      </div>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="recipientName" label="Tên người nhận">
          {(field) => (
            <Input {...field} value={String(field.value ?? "")} maxLength={150} required />
          )}
        </FormField>
        <FormField control={form.control} name="honorific" label="Xưng hô">
          {(field) => (
            <Input
              {...field}
              value={String(field.value ?? "")}
              maxLength={50}
              placeholder="Anh, Chị, Bác…"
            />
          )}
        </FormField>
        <FormField control={form.control} name="email" label="Email">
          {(field) => (
            <Input {...field} value={String(field.value ?? "")} type="email" maxLength={254} />
          )}
        </FormField>
        <FormField control={form.control} name="phone" label="Số điện thoại">
          {(field) => (
            <Input {...field} value={String(field.value ?? "")} type="tel" maxLength={30} />
          )}
        </FormField>
        <FormField control={form.control} name="invitationKind" label="Loại lời mời">
          {(field) => (
            <select
              {...field}
              value={String(field.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {kindOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField control={form.control} name="expectedPeople" label="Số người dự kiến">
          {(field) => (
            <Input
              type="number"
              min={1}
              max={500}
              step={1}
              value={Number(field.value ?? 1)}
              onChange={(event) => field.onChange(Number(event.currentTarget.value))}
            />
          )}
        </FormField>
        <FormField control={form.control} name="side" label="Phía khách mời">
          {(field) => (
            <select
              {...field}
              value={String(field.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {sideOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField control={form.control} name="groupId" label="Nhóm khách">
          {(field) => (
            <select
              {...field}
              value={String(field.value ?? "")}
              onChange={(event) => field.onChange(event.currentTarget.value || null)}
              required={!isWeddingWide}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {isWeddingWide && <option value="">Chưa phân nhóm</option>}
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <div className="sm:col-span-2">
          <FormField control={form.control} name="note" label="Ghi chú">
            {(field) => (
              <textarea
                {...field}
                value={String(field.value ?? "")}
                maxLength={2000}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </FormField>
        </div>
      </fieldset>
      {form.formState.errors.root?.server && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Đang tạo…" : "Tạo khách"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

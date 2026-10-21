"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  planningGuestUpdateSchema,
  type PlanningDetail,
  type PlanningGuestUpdate,
} from "../api/planning.api";
import { FormField } from "@/shared/forms/form-field";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

const sideOptions = [
  ["BRIDE", "Nhà gái"],
  ["GROOM", "Nhà trai"],
  ["MUTUAL", "Chung"],
  ["UNSPECIFIED", "Chưa xác định"],
] as const;

export function PlanningGuestEditForm({
  guest,
  groups,
  busy,
  onCancel,
  onSave,
}: {
  guest: PlanningDetail;
  groups: { id: string; name: string }[];
  busy: boolean;
  onCancel: () => void;
  onSave: (input: PlanningGuestUpdate) => void;
}) {
  const form = useForm<PlanningGuestUpdate>({
    resolver: zodResolver(planningGuestUpdateSchema),
    defaultValues: {
      expectedVersion: guest.version,
      recipientName: guest.recipientName,
      honorific: guest.honorific ?? "",
      side: guest.side,
      groupId: guest.group?.id ?? null,
      phone: guest.phone ?? "",
      note: guest.note ?? "",
      email: guest.email ?? "",
    },
  });

  return (
    <form
      className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
      onSubmit={form.handleSubmit(onSave)}
      aria-busy={busy}
    >
      <h3 className="font-semibold">Chỉnh sửa thông tin khách</h3>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="recipientName" label="Tên người nhận">
          {(field) => <Input {...field} value={String(field.value ?? "")} maxLength={150} />}
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
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Chưa phân nhóm</option>
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
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

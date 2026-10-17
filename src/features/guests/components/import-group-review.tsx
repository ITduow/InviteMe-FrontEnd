"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { addGroup, groupSuggestions, unknownGroups } from "../utils/group-catalog";
import type { CoupleRow } from "../utils/couple-import";

function UnknownGroup({
  item,
  catalog,
  onResolve,
  onCreate,
}: {
  item: ReturnType<typeof unknownGroups>[number];
  catalog: string[];
  onResolve: (key: string, label: string) => void;
  onCreate: (key: string, label: string) => void;
}) {
  const [target, setTarget] = useState("");
  const [name, setName] = useState(item.label);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const suggestions = groupSuggestions(item.label, catalog);
  return (
    <article className="space-y-4 rounded-xl border border-amber-200 bg-card p-4">
      <div>
        <h3 className="font-medium">
          “{item.label}”{" "}
          <span className="text-xs font-normal text-amber-900">chưa được nhận diện</span>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dòng {item.lines.join(", ")} · {item.side || "Chưa xác định phía"}. Hệ thống không tự biết
          đây là tên mới hay lỗi gõ.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium">Dùng nhóm có sẵn</p>
          <label className="block space-y-1 text-xs">
            <span>
              Đổi nhóm {item.label} ({item.side || "chưa rõ phía"}) thành
            </span>
            <select
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Chọn nhóm…</option>
              {catalog.map((label) => (
                <option key={label}>{label}</option>
              ))}
            </select>
          </label>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span>Có thể bạn muốn chọn:</span>
              {suggestions.map((label) => (
                <button
                  type="button"
                  key={label}
                  className="rounded-full border px-2 py-1 underline"
                  onClick={() => setTarget(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" disabled={!target} onClick={() => onResolve(item.key, target)}>
            Áp dụng nhóm có sẵn
          </Button>
        </div>
        <form
          className="space-y-3 border-t pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ack) return;
            try {
              const result = addGroup(catalog, name);
              onCreate(item.key, result.label);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Tên chưa hợp lệ.");
            }
          }}
        >
          <p className="text-sm font-medium">Hoặc tạo nhóm riêng</p>
          <label className="block space-y-1 text-xs">
            <span>
              Tên nhóm mới thay cho {item.label} ({item.side || "chưa rõ phía"})
            </span>
            <input
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              required
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setAck(false);
              }}
            />
          </label>
          <label className="flex items-start gap-2 text-xs leading-5">
            <input
              className="mt-1"
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            Tôi xác nhận đây là tên nhóm muốn dùng, không phải lỗi gõ.
          </label>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button disabled={!ack || !name.trim()} type="submit">
            Xác nhận tên nhóm mới
          </Button>
        </form>
      </div>
    </article>
  );
}

export function ImportGroupReview({
  rows,
  catalog,
  onResolve,
  onCreate,
}: {
  rows: CoupleRow[];
  catalog: string[];
  onResolve: (key: string, label: string) => void;
  onCreate: (key: string, label: string) => void;
}) {
  const pending = unknownGroups(rows, catalog);
  return (
    <section
      className="space-y-4 rounded-2xl border bg-card p-5"
      aria-label="Kiểm tra danh mục nhóm"
    >
      <div>
        <h2 className="font-serif text-2xl">Kiểm tra nhóm khách</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {pending.length
            ? `${pending.length} tên nhóm cần bạn quyết định trước khi thử xếp bàn. Không tự thêm, đoán hoặc gộp nhóm.`
            : "Các tên nhóm đã khớp danh mục. Nhóm cùng tên nhưng khác phía vẫn được phân biệt."}
        </p>
      </div>
      <details className="rounded-lg border bg-background p-3">
        <summary className="cursor-pointer text-sm">
          Danh mục nhóm trong lần nhập này ({catalog.length})
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalog.map((label) => (
            <span key={label} className="rounded-full border bg-card px-3 py-1 text-xs">
              {label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Chỉ kiểm tra tên có trong danh mục; không thể biết khách thực tế có thuộc nhóm đó hay
          không. Nhóm mới chưa được lưu vào hệ thống.
        </p>
      </details>
      {pending.map((item) => (
        <UnknownGroup
          key={item.key}
          item={item}
          catalog={catalog}
          onResolve={onResolve}
          onCreate={onCreate}
        />
      ))}
    </section>
  );
}

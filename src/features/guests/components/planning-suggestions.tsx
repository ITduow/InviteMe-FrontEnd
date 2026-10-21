"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { Plus, Sparkles } from "lucide-react";
import { sideLabels } from "../api/planning.api";
import {
  suggestSeatingPlan,
  type SeatingPlan,
  type SeatingChange,
  type SeatingStrategy,
  type SuggestionMode,
  type SeatingSuggestion,
} from "../api/planning-seating.api";

const strategies: { id: SeatingStrategy; title: string; description: string }[] = [
  {
    id: "AFFINITY",
    title: "Theo nhóm quen biết",
    description:
      "Ưu tiên cùng phía và cùng nhóm khách như Họ ngoại, Bạn đại học. Mỗi nhóm đi cùng giữ chung bàn nếu vừa.",
  },
  {
    id: "PARTY",
    title: "Theo nhóm đi cùng",
    description:
      "Xếp từng người đại diện và các chỗ đi cùng vào một bàn. Không ưu tiên nhóm quan hệ; vẫn giữ riêng phía khách.",
  },
  {
    id: "COMPACT",
    title: "Ưu tiên đầy bàn",
    description:
      "Xếp nhóm đông trước, chọn bàn còn ít chỗ vừa đủ. Có thể ghép các nhóm quan hệ cùng phía; không bảo đảm số bàn ít nhất.",
  },
];

export function PlanningSuggestions({
  plan,
  editable,
  saving,
  onChange,
  saveError,
}: {
  plan: SeatingPlan;
  editable: boolean;
  saving: boolean;
  onChange: (input: SeatingChange) => Promise<void>;
  saveError?: string;
}) {
  const { api } = useRuntime();
  const { access, isWeddingWide } = usePermission();
  const seatingScope = access?.scopes?.find((item) => item.permission === "SEATING_EDIT");
  const weddingWideSeating = isWeddingWide("SEATING_EDIT");
  const groupOptions = useMemo(
    () =>
      weddingWideSeating
        ? Array.from(
            new Map(
              plan.guests.flatMap((guest) =>
                guest.group ? [[guest.group.id, guest.group.name] as const] : [],
              ),
            ).entries(),
          ).map(([id, name]) => ({ id, name }))
        : (seatingScope?.groups ?? []),
    [plan.guests, seatingScope?.groups, weddingWideSeating],
  );
  const requiresGroup = !weddingWideSeating;
  const canSuggest = weddingWideSeating;
  const [dialog, setDialog] = useState<"tables" | "suggestions" | null>(null);
  const [selectedGroupIdValue, setSelectedGroupId] = useState(seatingScope?.groups[0]?.id ?? "");
  const selectedGroupId = groupOptions.some((group) => group.id === selectedGroupIdValue)
    ? selectedGroupIdValue
    : (groupOptions[0]?.id ?? "");
  const [capacity, setCapacity] = useState(10);
  const [count, setCount] = useState<number | null>(null);
  const [strategy, setStrategy] = useState<SeatingStrategy>("AFFINITY");
  const [mode, setMode] = useState<SuggestionMode>("UNASSIGNED");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ source: string; value: SeatingSuggestion } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const source = JSON.stringify(plan);
  const eligiblePlaces = plan.places.filter(
    (p) => p.person?.attendanceStatus !== "DECLINED" && p.person?.attendanceStatus !== "WAITLISTED",
  );
  const eligible = eligiblePlaces.length;
  const sides = new Map<string, number>();
  const guestSides = new Map(plan.guests.map((g) => [g.id, g.side]));
  for (const place of eligiblePlaces) {
    const side = guestSides.get(place.guestId) ?? "UNSPECIFIED";
    sides.set(side, (sides.get(side) ?? 0) + 1);
  }
  const existingCapacity = plan.tables.reduce((n, t) => n + t.capacity, 0);
  const minimum =
    Number.isInteger(capacity) && capacity > 0
      ? plan.tables.length === 0
        ? [...sides.values()].reduce((n, total) => n + Math.ceil(total / capacity), 0)
        : Math.max(0, Math.ceil((eligible - existingCapacity) / capacity))
      : 0;
  const tableCount = count ?? Math.max(1, minimum);
  const validTables =
    Number.isInteger(capacity) &&
    capacity >= 1 &&
    capacity <= 20 &&
    Number.isInteger(tableCount) &&
    tableCount >= 1 &&
    tableCount + plan.tables.length <= 100;
  const proposal =
    preview?.source === source && preview.value.strategy === strategy && preview.value.mode === mode
      ? preview.value
      : null;
  const stale = !!preview && !proposal;
  const selected = strategies.find((s) => s.id === strategy) ?? strategies[0];
  async function load(nextStrategy = strategy, nextMode = mode) {
    if (!plan.tables.length) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setPreview(null);
    setConfirmed(false);
    try {
      const value = await suggestSeatingPlan(
        api,
        plan.weddingId,
        nextStrategy,
        nextMode,
        controller.signal,
      );
      if (!controller.signal.aborted) setPreview({ source, value });
    } catch {
      if (!controller.signal.aborted)
        setError("Chưa lấy được gợi ý. Kiểm tra kết nối và quyền xem sơ đồ rồi thử lại.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {editable && (
          <Button type="button" disabled={saving} onClick={() => setDialog("tables")}>
            <Plus className="size-4" /> Thêm bàn
          </Button>
        )}
        {canSuggest && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setDialog("suggestions")}
          >
            <Sparkles className="size-4" /> Gợi ý sắp xếp thông minh
          </Button>
        )}
      </div>
      <Modal
        open={dialog === "tables"}
        onClose={() => setDialog(null)}
        title="Thêm bàn"
        description="Chọn số bàn và sức chứa, hoặc thêm một bàn với tên riêng."
      >
        <div className="space-y-4">
          {saveError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {saveError}
            </p>
          )}
          {requiresGroup && groupOptions.length === 0 && (
            <p
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            >
              Không tìm thấy nhóm khách trong phạm vi xếp bàn được cấp. Hãy nhờ chủ đám cưới kiểm
              tra quyền nhóm của bạn.
            </p>
          )}
          {editable && (
            <form
              className="space-y-3 rounded-xl border bg-muted/20 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!validTables || saving || (requiresGroup && !selectedGroupId)) return;
                setPreview(null);
                setConfirmed(false);
                void onChange({
                  action: "CREATE_TABLES",
                  tableCount,
                  capacity,
                  groupId: selectedGroupId || null,
                });
              }}
            >
              <h3 className="text-sm font-medium">
                {plan.tables.length ? "Thêm nhiều bàn trống" : "Bắt đầu: mỗi bàn bao nhiêu chỗ?"}
              </h3>
              <div className="flex flex-wrap items-end gap-3">
                {groupOptions.length > 0 && (
                  <label className="text-sm">
                    Nhóm khách của bàn
                    <select
                      aria-label="Nhóm khách của bàn"
                      required={requiresGroup}
                      value={selectedGroupId}
                      onChange={(event) => setSelectedGroupId(event.target.value)}
                      className="mt-1 block min-w-44 rounded border bg-background p-2"
                    >
                      {!requiresGroup && <option value="">Không gắn nhóm</option>}
                      {groupOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-sm">
                  Số ghế mỗi bàn
                  <input
                    aria-label="Số ghế mỗi bàn để chuẩn bị"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={Number.isFinite(capacity) ? capacity : ""}
                    onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : 0)}
                    className="mt-1 block w-28 rounded border bg-background p-2"
                  />
                </label>
                <label className="text-sm">
                  Số bàn cần thêm
                  <input
                    aria-label="Số bàn trống cần tạo"
                    type="number"
                    min={1}
                    max={Math.max(0, 100 - plan.tables.length)}
                    required
                    value={tableCount}
                    onChange={(e) => setCount(e.target.value ? Number(e.target.value) : 0)}
                    className="mt-1 block w-28 rounded border bg-background p-2"
                  />
                </label>
                <Button disabled={saving || !validTables || (requiresGroup && !selectedGroupId)}>
                  Tạo {tableCount} bàn trống · {capacity} ghế/bàn
                </Button>
                <button
                  type="button"
                  className="text-xs underline"
                  disabled={saving}
                  onClick={() => setCount(null)}
                >
                  Dùng số bàn ước tính
                </button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {eligible} chỗ dự kiến đủ điều kiện · hiện có {existingCapacity} ghế. Ước tính tối
                thiểu: thêm {minimum} bàn ({capacity || "?"} ghế/bàn)
                {plan.tables.length === 0
                  ? ", đã tính riêng từng phía"
                  : ", dựa trên tổng sức chứa"}
                . Bàn đã xếp và việc giữ nguyên nhóm đi cùng có thể khiến cần thêm bàn dù tổng ghế
                còn đủ. Số bàn được phép sửa; tối đa 100 bàn, mỗi bàn 1–20 ghế.
              </p>
            </form>
          )}
          {editable && (
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Thêm một bàn với tên riêng
              </summary>
              <form
                className="mt-4 flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (saving || (requiresGroup && !selectedGroupId)) return;
                  const data = new FormData(event.currentTarget);
                  void onChange({
                    action: "CREATE_TABLE",
                    name: String(data.get("name")),
                    capacity: Number(data.get("capacity")),
                    groupId: selectedGroupId || null,
                  });
                }}
              >
                {groupOptions.length > 0 && (
                  <label className="text-sm">
                    Nhóm khách của bàn
                    <select
                      aria-label="Nhóm khách của bàn có tên riêng"
                      required={requiresGroup}
                      value={selectedGroupId}
                      onChange={(event) => setSelectedGroupId(event.target.value)}
                      className="mt-1 block min-w-44 rounded border bg-background p-2"
                    >
                      {!requiresGroup && <option value="">Không gắn nhóm</option>}
                      {groupOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-sm">
                  Tên bàn
                  <input
                    name="name"
                    aria-label="Tên bàn mới"
                    required
                    maxLength={100}
                    placeholder={`Bàn ${plan.tables.length + 1}`}
                    className="mt-1 block w-full rounded border bg-background p-2"
                  />
                </label>
                <label className="text-sm">
                  Số ghế
                  <input
                    name="capacity"
                    aria-label="Số ghế bàn mới"
                    type="number"
                    min={1}
                    max={20}
                    required
                    defaultValue={10}
                    className="mt-1 block w-24 rounded border bg-background p-2"
                  />
                </label>
                <Button disabled={saving || (requiresGroup && !selectedGroupId)}>
                  Thêm bàn có tên
                </Button>
              </form>
            </details>
          )}
        </div>
      </Modal>
      <Modal
        open={dialog === "suggestions"}
        onClose={() => setDialog(null)}
        title="Gợi ý sắp xếp thông minh"
        description="Gợi ý dùng các bàn đã tạo. Bạn có thể xem trước rồi mới áp dụng vào sơ đồ."
      >
        <div className="space-y-4">
          {saveError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {saveError}
            </p>
          )}
          <div role="tablist" aria-label="Kiểu gợi ý xếp chỗ" className="flex flex-wrap gap-2">
            {strategies.map((s) => (
              <button
                key={s.id}
                role="tab"
                tabIndex={strategy === s.id ? 0 : -1}
                onKeyDown={(e) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                  e.preventDefault();
                  const index = strategies.findIndex((item) => item.id === s.id);
                  const next =
                    strategies[
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? strategies.length - 1
                          : (index + (e.key === "ArrowRight" ? 1 : -1) + strategies.length) %
                            strategies.length
                    ];
                  if (next) {
                    setStrategy(next.id);
                    setConfirmed(false);
                    void load(next.id, mode);
                    document.getElementById(`strategy-${next.id}`)?.focus();
                  }
                }}
                id={`strategy-${s.id}`}
                aria-controls="seating-suggestion-panel"
                aria-selected={strategy === s.id}
                className={`rounded-lg border px-3 py-2 text-sm ${strategy === s.id ? "border-primary bg-primary/10 font-medium" : "bg-background"}`}
                onClick={() => {
                  setStrategy(s.id);
                  setConfirmed(false);
                  void load(s.id, mode);
                }}
              >
                {s.title}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="seating-suggestion-panel"
            aria-labelledby={`strategy-${strategy}`}
            className="space-y-3"
          >
            <p className="text-sm">{selected?.description}</p>
            <p className="text-xs text-muted-foreground">
              Dựa trên: phía khách, nhóm khách, chỗ đi cùng và số ghế thực tế từng bàn. Nhà gái /
              Nhà trai / Chung / Chưa xác định được giữ riêng. Không tự hiểu ghi chú hoặc vai vế.
            </p>
            <label className="block text-sm">
              Phạm vi gợi ý
              <select
                aria-label="Phạm vi gợi ý"
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as SuggestionMode;
                  setMode(next);
                  setConfirmed(false);
                  void load(strategy, next);
                }}
                className="mt-1 block max-w-full rounded border bg-background p-2"
              >
                <option value="UNASSIGNED">Chỉ xếp chỗ còn trống — giữ nguyên phần đã xếp</option>
                <option value="REPLACE_ALL">Xếp lại toàn bộ — thay thế cả phần đã kéo tay</option>
              </select>
            </label>
            <Button
              variant="outline"
              disabled={loading || saving || !plan.tables.length || !eligible}
              onClick={() => void load()}
            >
              {loading ? "Đang tính…" : "Xem / tính lại gợi ý"}
            </Button>
            {!plan.tables.length && (
              <p className="text-sm text-amber-900">
                Chưa có bàn. Đóng cửa sổ này và chọn “Thêm bàn” trước khi tính gợi ý.
              </p>
            )}
            {!eligible && (
              <p className="text-sm text-muted-foreground">
                Chưa có chỗ đủ điều kiện. Nhập danh sách hoặc kiểm tra trạng thái tham dự.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {stale && (
              <p role="status" className="text-sm text-amber-900">
                Sơ đồ, danh sách hoặc kiểu gợi ý đã đổi. Tính lại trước khi áp dụng.
              </p>
            )}
            {proposal && (
              <>
                <div className="space-y-2 rounded-lg border bg-background p-3">
                  <h3 className="font-medium">Xem trước · {selected?.title}</h3>
                  <p className="text-sm">
                    {proposal.assignments.length} chỗ được bố trí · {proposal.preservedCount} giữ
                    nguyên vị trí · {proposal.changedPlaceCount} thay đổi ·{" "}
                    {proposal.unassigned.reduce((n, g) => n + g.placeIds.length, 0)} chưa xếp.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chưa lưu phương án này. Sơ đồ hiện tại vẫn giữ nguyên.
                  </p>
                </div>
                <div className="grid max-h-80 gap-2 overflow-auto sm:grid-cols-2">
                  {plan.tables.map((t) => {
                    const reason = proposal.reasons.find((r) => r.tableId === t.id);
                    const members = proposal.assignments
                      .filter((a) => a.tableId === t.id)
                      .sort((a, b) => a.seatNumber - b.seatNumber);
                    return (
                      <article key={t.id} className="space-y-1 rounded-lg border p-3 text-xs">
                        <h4 className="font-medium">
                          {t.name} · {members.length}/{t.capacity} chỗ
                        </h4>
                        <p>
                          {reason?.sides
                            .map((s) => sideLabels[s as keyof typeof sideLabels] ?? s)
                            .join(" · ") || "Bàn trống"}
                        </p>
                        <p>{reason?.groups.join(" · ")}</p>
                        <p className="text-muted-foreground">{reason?.message}</p>
                        <ul className="space-y-1">
                          {members.map((a) => {
                            const p = plan.places.find((p) => p.id === a.placeId),
                              g = plan.guests.find((g) => g.id === p?.guestId);
                            return (
                              <li key={a.placeId}>
                                Ghế {a.seatNumber}:{" "}
                                {p?.person?.fullName ?? `Chỗ ${p?.position} · ${g?.recipientName}`}
                              </li>
                            );
                          })}
                        </ul>
                      </article>
                    );
                  })}
                </div>
                {proposal.unassigned.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                    <p className="font-medium">Các nhóm chưa xếp được</p>
                    <ul className="mt-2 space-y-2">
                      {proposal.unassigned.map((g) => (
                        <li key={g.guestId}>
                          {plan.guests.find((x) => x.id === g.guestId)?.recipientName} ·{" "}
                          {g.placeIds.length} chỗ: {g.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {proposal.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                {mode === "REPLACE_ALL" && plan.assignments.length > 0 && (
                  <label className="flex items-start gap-2 rounded-lg border border-amber-300 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    Tôi đồng ý thay thế các vị trí đã xếp, kể cả phần kéo tay. Chỗ từ chối/đang chờ
                    sẽ không được xếp lại.
                  </label>
                )}
                <Button
                  disabled={
                    !editable ||
                    saving ||
                    loading ||
                    !proposal.changedPlaceCount ||
                    (mode === "REPLACE_ALL" && plan.assignments.length > 0 && !confirmed)
                  }
                  onClick={async () => {
                    await onChange({
                      action: "APPLY_SUGGESTION",
                      strategy,
                      mode,
                      sourceFingerprint: proposal.sourceFingerprint,
                      confirmReplace:
                        mode === "REPLACE_ALL" && (confirmed || plan.assignments.length === 0),
                    });
                    setPreview(null);
                    setConfirmed(false);
                  }}
                >
                  {saving ? "Đang áp dụng…" : "Áp dụng gợi ý này"}
                </Button>
                {!proposal.changedPlaceCount && (
                  <p className="text-xs text-muted-foreground">
                    Phương án không thay đổi vị trí nào nên không cần lưu.
                    {proposal.unassigned.length > 0 &&
                      " Kiểm tra lý do chưa xếp ở trên để điều chỉnh bàn hoặc tự xếp."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

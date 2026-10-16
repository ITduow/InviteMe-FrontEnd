"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowLeft, Armchair, GripVertical, MoveRight, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { CoupleRow } from "../utils/couple-import";
import {
  groupKey,
  movePlaces,
  recipientLabel,
  seatingParties,
  suggestSeating,
  tableOccupancy,
  seatingStrategies,
  type SeatingStrategy,
  type SeatingPlan,
  recommendedTableCount,
  affinityGroupKey,
} from "../utils/seating-demo";
import {
  chairAppearance,
  exampleSeatPeople,
  initialSeatPeople,
  placeKey,
  setPlacePerson,
  tablePlaces,
  type SeatPeople,
} from "../utils/seating-attendance";
import { SeatingPersonDetails } from "./seating-person-details";
import { SeatingTableDetails } from "./seating-table-details";

const palette = ["#9B5972", "#577D78", "#A07840", "#7476A2", "#9B6552", "#587D9E"];
type Selection = { partyId: string; place?: number };

export function CoupleSeatingPreview({ rows, onBack }: { rows: CoupleRow[]; onBack: () => void }) {
  const parties = useMemo(() => seatingParties(rows), [rows]);
  const total = parties.reduce((sum, party) => sum + party.count, 0);
  const [capacity, setCapacity] = useState(10);
  const [tableCount, setTableCount] = useState(recommendedTableCount(parties, 10));
  const [plan, setPlan] = useState<SeatingPlan>(() =>
    Object.fromEntries(
      parties.map((party) => [party.id, Array.from({ length: party.count }, () => null)]),
    ),
  );
  const [draftCapacity, setDraftCapacity] = useState(capacity);
  const [draftTableCount, setDraftTableCount] = useState(tableCount);
  const [strategy, setStrategy] = useState<SeatingStrategy>("affinity");
  const [appliedStrategy, setAppliedStrategy] = useState<SeatingStrategy | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const proposal = useMemo(
    () => suggestSeating(parties, draftCapacity, draftTableCount, strategy),
    [parties, draftCapacity, draftTableCount, strategy],
  );
  const strategyInfo =
    seatingStrategies.find((item) => item.id === strategy) ?? seatingStrategies[0];
  const proposedUnplaced = Object.values(proposal).reduce(
    (sum, places) => sum + places.filter((table) => table === null).length,
    0,
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [destination, setDestination] = useState("0");
  const [notice, setNotice] = useState("");
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const groups = [...new Set(parties.map((party) => groupKey(party.group)))];
  const groupChips = [
    ...new Map(parties.map((party) => [affinityGroupKey(party), party])).values(),
  ];
  const colorFor = (group: string) =>
    palette[groups.indexOf(groupKey(group)) % palette.length] ?? palette[0];
  const selected = parties.find((party) => party.id === selection?.partyId);
  const selectedPlaces = selected ? (plan[selected.id] ?? []) : [];
  const selectedTable =
    selection?.place !== undefined ? selectedPlaces[selection.place] : undefined;
  const unplaced = Object.values(plan).reduce(
    (sum, places) => sum + places.filter((table) => table === null).length,
    0,
  );
  const [openPanel, setOpenPanel] = useState(false);
  const [people, setPeople] = useState<SeatPeople>(() => initialSeatPeople(parties));
  const [inspectedTable, setInspectedTable] = useState<number | null>(null);
  const [demoRsvp, setDemoRsvp] = useState(false);
  const selectedPerson =
    selected && selection?.place !== undefined
      ? people[placeKey(selected.id, selection.place)]
      : undefined;
  const selectedSeatNumber =
    typeof selectedTable === "number"
      ? tablePlaces(parties, plan, selectedTable).findIndex(
          ({ party, place }) => party.id === selection?.partyId && place === selection?.place,
        ) + 1
      : undefined;
  const selectedMembers = selected
    ? (plan[selected.id] ?? []).flatMap((_, place) => {
        const person = people[placeKey(selected.id, place)];
        return person ? [person] : [];
      })
    : [];
  const confirmedCount = Object.values(people).filter(
    (person) => person.attendanceStatus === "ATTENDING",
  ).length;

  function select(partyId: string, place?: number) {
    setInspectedTable(null);
    setSelection({ partyId, place });
    setOpenPanel(true);
    const table = plan[partyId]?.[place ?? 0];
    setDestination(table === null || table === undefined ? "unplaced" : String(table));
    setNotice("");
  }
  function move(partyId: string, table: number | null, place?: number) {
    const next = movePlaces(plan, partyId, table, capacity, tableCount, place);
    if (!next) {
      setNotice("Bàn này không còn đủ chỗ. Chọn bàn khác hoặc chuyển từng chỗ để chia nhóm.");
      return;
    }
    setPlan(next);
    setManual(true);
    setNotice(
      table === null
        ? "Đã đưa chỗ về danh sách chưa xếp."
        : `Đã chuyển ${place === undefined ? "nhóm" : "một chỗ dự kiến"} tới Bàn ${table + 1}. Tổng số người không thay đổi.`,
    );
  }
  function applySuggestion() {
    setCapacity(draftCapacity);
    setTableCount(draftTableCount);
    setPlan(proposal);
    setAppliedStrategy(strategy);
    setShowSuggestions(false);
    setSelection(null);
    setInspectedTable(null);
    setOpenPanel(false);
    setManual(false);
    setNotice(
      `Đã áp dụng: ${strategyInfo?.label}. ${total - proposedUnplaced}/${total} chỗ được bố trí; ${proposedUnplaced} chỗ chưa xếp.`,
    );
  }

  return (
    <section className="min-w-0 space-y-5">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft /> Về danh sách xem trước
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Sau khi nhập danh sách · Bản thử
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Để mọi người ngồi gần nhau</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {parties.length} nhóm nhận thiệp · {total} chỗ dự kiến. Kéo nhóm vào bàn hoặc bấm một
            ghế để chuyển riêng chỗ đó.
          </p>
        </div>
        <span className="rounded-full border bg-card px-3 py-2 text-xs">
          Thử trên thiết bị · chưa lưu
        </span>
      </header>
      <section
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"
        aria-label="Màu ghế theo RSVP"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded border border-emerald-700 bg-emerald-400" />
              Xác nhận tham dự
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded border border-gray-400 bg-gray-200" />
              Chưa phản hồi / chưa có tên
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded border border-dashed border-gray-400 bg-white" />
              Ghế trống
            </span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {confirmedCount} người xác nhận trong {demoRsvp ? "dữ liệu RSVP minh họa" : "bản thử"}.
            Trạng thái tính riêng từng người, không áp dụng thay cả gia đình.
          </p>
        </div>
        <div className="max-w-sm">
          <Button
            variant="outline"
            onClick={() => {
              setPeople(exampleSeatPeople(parties));
              setDemoRsvp(true);
              setOpenPanel(false);
              setNotice(
                "Đã nạp RSVP minh họa: một số đại diện xác nhận, người đi cùng chưa có tên vẫn chưa xác nhận. Đây không phải phản hồi thật.",
              );
            }}
          >
            {demoRsvp ? "Nạp lại RSVP minh họa" : "Thử RSVP minh họa"}
          </Button>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            Nạp mẫu sẽ thay thông tin người và RSVP đang thử. Không ghi dữ liệu vào hệ thống.
          </p>
        </div>
      </section>
      <section
        className="overflow-hidden rounded-2xl border bg-card"
        aria-labelledby="suggestions-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 id="suggestions-title" className="flex items-center gap-2 font-serif text-xl">
              <Sparkles className="size-5" /> Chọn cách gợi ý xếp bàn
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Xem cách xếp và phương án trước. Sơ đồ hiện tại chỉ thay đổi khi bạn bấm Áp dụng.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowSuggestions(!showSuggestions)}>
            {showSuggestions ? "Thu gọn gợi ý" : "Xem các cách gợi ý"}
          </Button>
        </div>
        {showSuggestions && (
          <>
            <div
              className="grid grid-cols-3 gap-1 border-y bg-background p-2"
              role="tablist"
              aria-label="Cách gợi ý xếp bàn"
            >
              {seatingStrategies.map((item) => (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={strategy === item.id}
                  aria-controls="seating-suggestion-panel"
                  tabIndex={strategy === item.id ? 0 : -1}
                  onClick={() => setStrategy(item.id)}
                  onKeyDown={(event) => {
                    const index = seatingStrategies.findIndex((entry) => entry.id === item.id);
                    const next =
                      event.key === "ArrowRight"
                        ? (index + 1) % seatingStrategies.length
                        : event.key === "ArrowLeft"
                          ? (index + seatingStrategies.length - 1) % seatingStrategies.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? seatingStrategies.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      const nextItem = seatingStrategies[next];
                      if (nextItem) {
                        setStrategy(nextItem.id);
                        document.getElementById(`tab-${nextItem.id}`)?.focus();
                      }
                    }
                  }}
                  className={`min-w-0 rounded-lg px-2 py-3 text-xs leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:px-4 sm:text-sm ${strategy === item.id ? "bg-foreground text-card" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id="seating-suggestion-panel"
              aria-labelledby={`tab-${strategy}`}
              className="space-y-5 p-5"
            >
              <div>
                <h3 className="text-base font-semibold">{strategyInfo?.label}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {strategyInfo?.description}
                </p>
                <p className="mt-2 text-xs font-medium">{strategyInfo?.source}</p>
              </div>
              {strategy === "affinity" && (
                <div className="flex flex-wrap gap-2">
                  {groupChips.map((entry) => {
                    const key = affinityGroupKey(entry);
                    const members = parties.filter((party) => affinityGroupKey(party) === key);
                    return (
                      <span
                        key={key}
                        className="rounded-full border bg-background px-3 py-1 text-xs"
                      >
                        {entry.group} · {entry.side || "Chưa xác định phía"} ·{" "}
                        {members.reduce((sum, party) => sum + party.count, 0)} người
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-background p-4">
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span className="block">Chỗ mỗi bàn</span>
                  <select
                    className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground"
                    value={draftCapacity}
                    onChange={(e) => setDraftCapacity(Number(e.target.value))}
                  >
                    {[6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} chỗ
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span className="block">Số bàn</span>
                  <select
                    className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground"
                    value={draftTableCount}
                    onChange={(e) => setDraftTableCount(Number(e.target.value))}
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1} bàn
                      </option>
                    ))}
                  </select>
                </label>
                <p className="flex-1 text-xs leading-5 text-muted-foreground">
                  Cấu hình này chỉ dùng cho bản gợi ý. Chưa thay đổi bàn hoặc chỗ đã xếp.
                </p>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium">
                  Phương án xem trước · {total - proposedUnplaced}/{total} chỗ bố trí được
                </p>
                <div className="grid max-h-80 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: draftTableCount }, (_, table) => {
                    const assigned = parties.filter((party) => proposal[party.id]?.includes(table));
                    const labels = [...new Set(assigned.map((party) => party.group))];
                    return (
                      <article key={table} className="rounded-xl border bg-background p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-serif text-lg">Bàn {table + 1}</h4>
                          <span className="text-xs">
                            {tableOccupancy(proposal, table)}/{draftCapacity} chỗ
                          </span>
                        </div>
                        <ul className="mt-3 space-y-1 text-xs leading-5">
                          {assigned.map((party) => (
                            <li key={party.id}>
                              {recipientLabel(party)} · {party.count} chỗ
                            </li>
                          ))}
                        </ul>
                        {assigned.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Phía: {assigned[0]?.side || "Chưa xác định"}
                          </p>
                        )}
                        <p className="mt-3 border-t pt-2 text-xs leading-5 text-muted-foreground">
                          {!assigned.length
                            ? "Bàn còn trống."
                            : strategy === "affinity"
                              ? `Nhóm khách: ${labels.join(" · ")}.`
                              : strategy === "party"
                                ? "Giữ nguyên nhóm đi cùng, theo thứ tự danh sách."
                                : `Ưu tiên lấp chỗ trống; còn ${draftCapacity - tableOccupancy(proposal, table)} chỗ.`}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
              {proposedUnplaced > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                  Còn {proposedUnplaced} chỗ chưa xếp: nhóm có thể lớn hơn sức chứa hoặc các bàn
                  không còn đủ chỗ. Thử tăng số bàn/sức chứa hoặc chia nhóm thủ công.
                </p>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                {parties.some((party) => party.note)
                  ? "Ghi chú đặc biệt chưa được tự động áp dụng. "
                  : ""}
                Các cách gợi ý đều giữ riêng Nhà gái / Nhà trai / Chung / Chưa xác định, nên có thể
                cần thêm bàn dù còn chỗ trống bên khác. Giữ nhóm đi cùng nếu vừa bàn. Bạn có thể
                chia chỗ thủ công sau khi áp dụng.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                  {total - unplaced > 0
                    ? "Áp dụng sẽ thay thế sơ đồ hiện tại, kể cả các chỗ đã chỉnh tay. "
                    : "Chưa áp dụng: sơ đồ bên dưới vẫn để trống. "}
                  Chỉ thay đổi bản thử trên thiết bị.
                </p>
                <Button disabled={proposedUnplaced === total} onClick={applySuggestion}>
                  <Check /> Áp dụng gợi ý này
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      <div className="flex gap-3 rounded-xl border bg-card p-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-sage" />
        <div>
          <p className="text-sm font-medium">
            {manual
              ? "Sơ đồ hiện tại · đã chỉnh tay"
              : appliedStrategy
                ? `Sơ đồ hiện tại · ${seatingStrategies.find((item) => item.id === appliedStrategy)?.label}`
                : "Sơ đồ hiện tại · chưa áp dụng gợi ý"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {total - unplaced}/{total} chỗ đã bố trí · {unplaced} chưa xếp. Bấm giữa bàn để xem danh
            sách; bấm ghế để xem người ngồi và RSVP.
          </p>
        </div>
      </div>
      {notice && (
        <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="space-y-3 rounded-2xl border bg-card p-4" aria-label="Nhóm nhận thiệp">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Nhóm mời</h2>
            <span className="text-xs text-muted-foreground">{parties.length} nhóm</span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Kéo cả nhóm tới bàn. Dùng nút “Phân bổ” để chuyển bằng lựa chọn bàn.
          </p>
          <div className="max-h-[260px] space-y-2 overflow-y-auto xl:max-h-[680px]">
            {parties.map((party) => {
              const places = plan[party.id] ?? [];
              const distribution = [...new Set(places)]
                .map(
                  (table) =>
                    `${table === null ? "Chưa xếp" : `B${table + 1}`}: ${places.filter((t) => t === table).length}`,
                )
                .join(" · ");
              return (
                <article
                  draggable
                  key={party.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-inviteme-party", party.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={`rounded-xl border bg-background p-3 ${selection?.partyId === party.id ? "ring-2 ring-primary" : ""}`}
                  style={{ borderLeft: `4px solid ${colorFor(party.group)}` }}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{recipientLabel(party)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {party.group} · {party.side || "Chưa xác định phía"}
                      </p>
                      <p className="mt-2 text-xs">
                        {party.count} chỗ · {distribution}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md border py-1.5 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => select(party.id)}
                  >
                    Phân bổ nhóm
                  </button>
                </article>
              );
            })}
          </div>
        </aside>
        <section
          className="min-w-0 overflow-hidden rounded-2xl border bg-[#F8F5EF]"
          aria-label="Sơ đồ bàn thử"
        >
          <div className="border-b bg-white/60 px-5 py-3 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Sân khấu · vị trí minh họa
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-6 p-3 py-7 sm:p-6">
            {Array.from({ length: tableCount }, (_, table) => {
              const occupied = tablePlaces(parties, plan, table);
              const tableConfirmed = occupied.filter(
                ({ party, place }) =>
                  people[placeKey(party.id, place)]?.attendanceStatus === "ATTENDING",
              ).length;
              const labels = [...new Set(occupied.map(({ party }) => party.group))];
              return (
                <article
                  key={table}
                  className={`w-full max-w-[280px] rounded-2xl border p-2 pb-4 transition-colors ${hoveredTable === table ? "border-primary bg-primary/10" : "border-transparent"}`}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("application/x-inviteme-party")) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setHoveredTable(table);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                      setHoveredTable(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHoveredTable(null);
                    const id = e.dataTransfer.getData("application/x-inviteme-party");
                    if (id) move(id, table);
                  }}
                >
                  <div className="relative mx-auto aspect-square w-full max-w-[320px]">
                    <Image
                      src="/images/seating/round-table.svg"
                      alt=""
                      width={240}
                      height={240}
                      className="pointer-events-none absolute left-1/2 top-1/2 w-[68%] -translate-x-1/2 -translate-y-1/2"
                    />
                    <button
                      type="button"
                      aria-label={`Xem danh sách Bàn ${table + 1}`}
                      onClick={() => {
                        setInspectedTable(table);
                        setSelection(null);
                        setOpenPanel(true);
                      }}
                      className="absolute left-1/2 top-1/2 flex size-[58%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full pt-5 transition-colors hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <h3 className="font-serif text-xl">Bàn {table + 1}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {[
                          ...new Set(occupied.map(({ party }) => party.side || "Chưa xác định")),
                        ].join(" · ") || "Chưa có khách"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {occupied.length}/{capacity} chỗ
                      </p>
                      <span className="mt-3 rounded-full border border-[#D9CDB8] bg-white/70 px-2 py-1 text-[10px]">
                        {tableConfirmed} xác nhận
                      </span>
                    </button>
                    {Array.from({ length: capacity }, (_, seat) => {
                      const angle = (seat / capacity) * Math.PI * 2 - Math.PI / 2;
                      const occupant = occupied[seat];
                      const person = occupant
                        ? people[placeKey(occupant.party.id, occupant.place)]
                        : undefined;
                      const appearance = chairAppearance(person);
                      const style = {
                        left: `${50 + 42 * Math.cos(angle)}%`,
                        top: `${50 + 42 * Math.sin(angle)}%`,
                      };
                      const chair = (
                        <>
                          <Image
                            src={`/images/seating/${occupant ? appearance.asset : "chair-empty.svg"}`}
                            alt=""
                            width={36}
                            height={42}
                            className="size-full"
                            style={{ transform: `rotate(${(angle * 180) / Math.PI + 90}deg)` }}
                          />
                        </>
                      );
                      return occupant ? (
                        <button
                          key={seat}
                          type="button"
                          style={style}
                          className={`absolute h-[12%] w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-md transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary ${selection?.partyId === occupant.party.id && selection.place === occupant.place ? "ring-2 ring-primary ring-offset-2" : ""}`}
                          aria-label={`Bàn ${table + 1}, ghế ${seat + 1}: ${person?.fullName || `chỗ dự kiến của ${occupant.party.name}`}, ${appearance.label}`}
                          title={`${person?.fullName || "Chỗ chưa có tên"} · ${appearance.label}`}
                          onClick={() => select(occupant.party.id, occupant.place)}
                        >
                          {chair}
                        </button>
                      ) : (
                        <span
                          key={seat}
                          style={style}
                          className="pointer-events-none absolute h-[12%] w-[10%] -translate-x-1/2 -translate-y-1/2"
                          title={`Ghế ${seat + 1} trống`}
                        >
                          {chair}
                        </span>
                      );
                    })}
                  </div>
                  <div className="space-y-1.5 px-3">
                    {labels.length ? (
                      labels.map((label) => (
                        <p key={label} className="flex items-start gap-2 text-[11px] leading-5">
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full"
                            style={{ background: colorFor(label) }}
                          />
                          {label} · {occupied.filter(({ party }) => party.group === label).length}{" "}
                          chỗ
                        </p>
                      ))
                    ) : (
                      <p className="text-center text-xs text-muted-foreground">
                        Kéo nhóm vào bàn này
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="border-t px-5 py-3 text-xs leading-5 text-muted-foreground">
            Ghế xanh lá: người đã xác nhận tham dự. Ghế xám nhạt: chưa phản hồi hoặc chưa có tên.
            Ghế nét đứt: chưa giữ cho ai. Bấm bàn để xem danh sách, bấm ghế để xem chi tiết.
          </p>
        </section>
        <aside
          className={`rounded-2xl border bg-card p-5 ${(selected || inspectedTable !== null) && openPanel ? "fixed inset-x-3 bottom-3 z-40 max-h-[70dvh] overflow-y-auto shadow-xl xl:static xl:max-h-none xl:shadow-none" : "hidden xl:block"}`}
          aria-label="Chi tiết phân bổ"
        >
          {inspectedTable !== null && openPanel ? (
            <>
              <div className="sticky -top-5 z-10 -mx-5 -mt-5 flex items-start justify-between gap-2 border-b bg-card px-5 py-4">
                <span className="text-xs">Khách trong bàn</span>
                <button
                  type="button"
                  aria-label="Đóng chi tiết"
                  onClick={() => setOpenPanel(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <SeatingTableDetails
                table={inspectedTable}
                capacity={capacity}
                parties={parties}
                plan={plan}
                people={people}
                onSelect={select}
              />
            </>
          ) : selected && openPanel ? (
            <>
              <div className="sticky -top-5 z-10 -mx-5 -mt-5 flex items-start justify-between gap-2 border-b bg-card px-5 py-4">
                <span className="rounded-full bg-muted px-2 py-1 text-[10px]">
                  {selection?.place !== undefined ? "Thông tin chỗ ngồi" : "Nhóm nhận thiệp"}
                </span>
                <button
                  type="button"
                  aria-label="Đóng chi tiết"
                  onClick={() => setOpenPanel(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
              {selection?.place !== undefined ? (
                <SeatingPersonDetails
                  key={placeKey(selected.id, selection.place)}
                  party={selected}
                  person={selectedPerson}
                  table={selectedTable}
                  seat={selectedSeatNumber}
                  onSave={(input) => {
                    try {
                      setPeople(setPlacePerson(people, selected, selection.place ?? 0, input));
                      setNotice(
                        `Đã cập nhật ${input.fullName.trim()} trong bản thử. Tổng số chỗ không đổi.`,
                      );
                      return null;
                    } catch (error) {
                      return error instanceof Error
                        ? error.message
                        : "Chưa cập nhật được thông tin.";
                    }
                  }}
                />
              ) : (
                <>
                  <h2 className="mt-4 break-words font-serif text-xl">
                    {recipientLabel(selected)}
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground">{selected.group}</p>
                </>
              )}
              {selection?.place === undefined && (
                <dl className="my-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tổng dự kiến</dt>
                    <dd>{selected.count} người</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Đã có tên</dt>
                    <dd>{selectedMembers.length} người</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Chưa khai báo tên</dt>
                    <dd>{selected.count - selectedMembers.length} người</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">RSVP</dt>
                    <dd>
                      {
                        selectedMembers.filter((person) => person.attendanceStatus === "ATTENDING")
                          .length
                      }{" "}
                      xác nhận
                    </dd>
                  </div>
                </dl>
              )}
              {selection?.place === undefined && (
                <div className="rounded-xl bg-background p-3">
                  <p className="text-xs text-muted-foreground">Cách ghi người nhận trên thiệp</p>
                  <p className="mt-2 text-sm">Kính gửi {recipientLabel(selected)}</p>
                </div>
              )}
              {selected.note && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
                  <p className="text-xs font-medium">Ghi chú · cần xác nhận</p>
                  <p className="mt-1 text-xs leading-5">{selected.note}</p>
                </div>
              )}
              <label
                className="mb-2 mt-5 block text-xs text-muted-foreground"
                htmlFor="move-destination"
              >
                {selection?.place !== undefined
                  ? "Chuyển riêng chỗ này tới"
                  : "Chuyển toàn bộ nhóm tới"}
              </label>
              <select
                id="move-destination"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="unplaced">Danh sách chưa xếp</option>
                {Array.from({ length: tableCount }, (_, table) => (
                  <option key={table} value={table}>
                    Bàn {table + 1} · {tableOccupancy(plan, table)}/{capacity}
                  </option>
                ))}
              </select>
              <Button
                className="mt-3 w-full"
                onClick={() =>
                  move(
                    selected.id,
                    destination === "unplaced" ? null : Number(destination),
                    selection?.place,
                  )
                }
              >
                <MoveRight /> Chuyển {selection?.place !== undefined ? "chỗ" : "nhóm"}
              </Button>
              {selection?.place === undefined && selected.count > 1 && (
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => {
                    const unassigned = selectedPlaces.findIndex((table) => table === null);
                    select(selected.id, unassigned < 0 ? 0 : unassigned);
                  }}
                >
                  Chuyển riêng một chỗ dự kiến
                </Button>
              )}
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Có thể chia chỗ của nhóm sang nhiều bàn. Cần xác nhận người giám hộ trước khi tách
                trẻ nhỏ khỏi gia đình.
              </p>
            </>
          ) : (
            <div className="py-8 text-center">
              <Armchair className="mx-auto mb-4 size-8 text-muted-foreground" />
              <h2 className="font-serif text-xl">Chọn một nhóm hoặc ghế</h2>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                Xem người nhận thiệp, số chỗ dự kiến và thử chuyển chỗ. Chọn từng ghế để chia nhóm
                sang bàn khác.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

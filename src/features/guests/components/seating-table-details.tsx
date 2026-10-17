import { Button } from "@/shared/ui/button";
import type { SeatingParty, SeatingPlan } from "../utils/seating-demo";
import { placeKey, tablePlaces, type SeatPeople } from "../utils/seating-attendance";
import { RsvpBadge } from "./seating-person-details";

export function SeatingTableDetails({
  table,
  capacity,
  parties,
  plan,
  people,
  onSelect,
}: {
  table: number;
  capacity: number;
  parties: SeatingParty[];
  plan: SeatingPlan;
  people: SeatPeople;
  onSelect: (partyId: string, place: number) => void;
}) {
  const places = tablePlaces(parties, plan, table);
  const confirmed = places.filter(
    ({ party, place }) => people[placeKey(party.id, place)]?.attendanceStatus === "ATTENDING",
  ).length;
  const unnamed = places.filter(({ party, place }) => !people[placeKey(party.id, place)]).length;
  return (
    <div className="mt-4 space-y-4">
      <h2 className="font-serif text-2xl">Danh sách Bàn {table + 1}</h2>
      <p className="text-xs leading-5 text-muted-foreground">
        {places.length}/{capacity} chỗ đã giữ · {confirmed} xác nhận tham dự · {unnamed} chỗ chưa có
        tên.
      </p>
      {!places.length && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Bàn chưa có khách. Kéo nhóm vào bàn hoặc áp dụng một gợi ý.
        </p>
      )}
      <ol className="space-y-2">
        {places.map(({ party, place }, index) => {
          const person = people[placeKey(party.id, place)];
          return (
            <li key={placeKey(party.id, place)}>
              <Button
                variant="ghost"
                className="h-auto w-full justify-start whitespace-normal rounded-xl border px-3 py-3 text-left"
                onClick={() => onSelect(party.id, place)}
              >
                <span className="shrink-0 text-xs text-muted-foreground">Ghế {index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm">
                    {person?.fullName || "Chỗ dự kiến chưa có tên"}
                  </span>
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                    Nhóm {party.name}
                  </span>
                  <span className="mt-2 block">
                    <RsvpBadge person={person} />
                  </span>
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
      <p className="text-xs leading-5 text-muted-foreground">
        Bấm một dòng để xem thông tin hoặc chuyển chỗ của người đó.
      </p>
    </div>
  );
}

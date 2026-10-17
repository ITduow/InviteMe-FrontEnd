import type { SeatingParty, SeatingPlan } from "./seating-demo";

export type AttendanceStatus = "PENDING" | "ATTENDING" | "DECLINED" | "WAITLISTED";
export type SeatPerson = {
  id: string;
  fullName: string;
  type: "PRIMARY" | "SPOUSE" | "CHILD" | "OTHER";
  attendanceStatus: AttendanceStatus;
};
export type SeatPeople = Record<string, SeatPerson>;
export const attendanceLabels: Record<AttendanceStatus, string> = {
  PENDING: "Chưa phản hồi",
  ATTENDING: "Xác nhận tham dự",
  DECLINED: "Đã từ chối",
  WAITLISTED: "Danh sách chờ",
};
export const personRoleLabels: Record<SeatPerson["type"], string> = {
  PRIMARY: "Người đại diện",
  SPOUSE: "Vợ/chồng",
  CHILD: "Con",
  OTHER: "Người đi cùng",
};

export function placeKey(partyId: string, place: number) {
  return `${partyId}:${place}`;
}

export function initialSeatPeople(parties: SeatingParty[]): SeatPeople {
  return Object.fromEntries(
    parties.map((party) => [
      placeKey(party.id, 0),
      {
        id: `primary:${party.id}`,
        fullName: party.name,
        type: "PRIMARY",
        attendanceStatus: "PENDING",
      } satisfies SeatPerson,
    ]),
  );
}

// Explicit opt-in preview fixture: never interpreted as a real RSVP response.
export function exampleSeatPeople(parties: SeatingParty[]): SeatPeople {
  const people = initialSeatPeople(parties);
  parties.forEach((party, index) => {
    const primary = people[placeKey(party.id, 0)];
    if (primary && index % 3 === 0) primary.attendanceStatus = "ATTENDING";
  });
  return people;
}

export function chairAppearance(person?: SeatPerson) {
  if (!person)
    return { asset: "chair-pending.svg", label: "Chỗ dự kiến chưa có tên", confirmed: false };
  return {
    asset: person.attendanceStatus === "ATTENDING" ? "chair-confirmed.svg" : "chair-pending.svg",
    label: attendanceLabels[person.attendanceStatus],
    confirmed: person.attendanceStatus === "ATTENDING",
  };
}

export function tablePlaces(parties: SeatingParty[], plan: SeatingPlan, table: number) {
  return parties.flatMap((party) =>
    (plan[party.id] ?? []).flatMap((assigned, place) =>
      assigned === table ? [{ party, place }] : [],
    ),
  );
}

export function setPlacePerson(
  people: SeatPeople,
  party: SeatingParty,
  place: number,
  input: Omit<SeatPerson, "id">,
): SeatPeople {
  if (!Number.isInteger(place) || place < 0 || place >= party.count)
    throw new Error("Chỗ này không thuộc nhóm mời.");
  if (
    !Object.hasOwn(attendanceLabels, input.attendanceStatus) ||
    !Object.hasOwn(personRoleLabels, input.type)
  )
    throw new Error("Trạng thái hoặc vai trò không hợp lệ.");
  const name = input.fullName.trim();
  if (!name) throw new Error("Nhập tên trước khi cập nhật RSVP cho một người.");
  if (name.length > 150) throw new Error("Tên tối đa 150 ký tự.");
  const key = placeKey(party.id, place);
  const primaryId = `primary:${party.id}`;
  if (
    input.type === "PRIMARY" &&
    Object.entries(people).some(([otherKey, person]) => otherKey !== key && person.id === primaryId)
  )
    throw new Error(
      "Người đại diện đã có chỗ trong nhóm. Hãy chuyển chỗ hiện tại thay vì tạo thêm.",
    );
  if (people[key]?.type === "PRIMARY" && input.type !== "PRIMARY")
    throw new Error("Đây là chỗ của người đại diện. Hãy chọn chỗ khác để thêm người đi cùng.");
  return {
    ...people,
    [key]: { ...input, id: input.type === "PRIMARY" ? primaryId : `member:${key}`, fullName: name },
  };
}

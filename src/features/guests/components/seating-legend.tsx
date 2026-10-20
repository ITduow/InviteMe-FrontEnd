import Image from "next/image";

const seats = [
  { image: "chair-confirmed.svg", label: "Đã xác nhận tham dự" },
  { image: "chair-pending.svg", label: "Chưa xác nhận / chưa có tên" },
  { image: "chair-empty.svg", label: "Ghế trống" },
];

export function SeatingLegend() {
  return (
    <ul
      aria-label="Chú giải trạng thái ghế"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
    >
      {seats.map((seat) => (
        <li key={seat.image} className="flex items-center gap-2">
          <Image
            src={`/images/seating/${seat.image}`}
            alt=""
            width={24}
            height={28}
            className="h-7 w-6 shrink-0"
          />
          <span>{seat.label}</span>
        </li>
      ))}
    </ul>
  );
}

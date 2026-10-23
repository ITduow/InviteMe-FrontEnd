import Image from "next/image";
import { useTranslation } from "react-i18next";

const seats = [
  { image: "chair-confirmed.svg", label: "confirmed" },
  { image: "chair-pending.svg", label: "pending" },
  { image: "chair-empty.svg", label: "empty" },
];

export function SeatingLegend() {
  const { t } = useTranslation("guestPlanning", { keyPrefix: "seating.legend" });
  return (
    <ul
      aria-label={t("aria")}
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
          <span>{t(seat.label)}</span>
        </li>
      ))}
    </ul>
  );
}

import type { Metadata } from "next";
import { AcceptCoHostInvitation } from "@/features/co-hosts";

export const metadata: Metadata = {
  title: "Nhận lời mời co-host | InviteMe",
  description: "Xem quyền được cấp và xác nhận tham gia quản lý đám cưới.",
};

export default function Page() {
  return <AcceptCoHostInvitation />;
}

import type { ReactNode } from "react";
import { PublicShell } from "@/shared/layout/public-shell";
import { PublicAccountNavigation } from "@/app/_components/public-account-navigation";
export default function Layout({ children }: { children: ReactNode }) {
  return <PublicShell account={<PublicAccountNavigation />}>{children}</PublicShell>;
}

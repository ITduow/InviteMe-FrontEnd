import type { ReactNode } from "react";
import { PublicShell } from "@/shared/layout/public-shell";
export default function Layout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}

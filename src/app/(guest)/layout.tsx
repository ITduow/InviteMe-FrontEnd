import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="min-h-screen bg-[#f3f1e9] px-5 py-12">
      <div className="mx-auto max-w-xl space-y-8">
        <p className="text-center font-display text-2xl text-primary">InviteMe</p>
        {children}
      </div>
    </main>
  );
}

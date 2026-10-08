import type { ReactNode } from "react";
import Link from "next/link";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="auth-shell flex min-h-screen flex-col items-center justify-center px-5 py-12"
    >
      <Link href="/" className="auth-shell__brand mb-8 font-display text-3xl text-primary">
        InviteMe
      </Link>
      <div className="auth-shell__panel w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        {children}
      </div>
    </main>
  );
}

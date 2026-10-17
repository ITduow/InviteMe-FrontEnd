"use client";

import { useRouter } from "next/navigation";
import { CoupleImport } from "@/features/guests/components/couple-import";

export function ImportPreview() {
  const router = useRouter();
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <CoupleImport onClose={() => router.push("/")} />
    </main>
  );
}

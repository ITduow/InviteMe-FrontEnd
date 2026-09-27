"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WeddingPermission } from "@/core/auth/auth.types";
import { usePermission } from "@/shared/components/permission-guard";
import { cn } from "@/shared/lib/utils";
const sections: { slug: string; label: string; permission: WeddingPermission }[] = [
  { slug: "overview", label: "Overview", permission: "WEDDING_VIEW" },
  { slug: "website", label: "Website", permission: "WEDDING_EDIT" },
  { slug: "guests", label: "Guests", permission: "GUEST_VIEW" },
  { slug: "invitations", label: "Invitations", permission: "INVITATION_SEND" },
  { slug: "rsvp", label: "RSVP", permission: "RSVP_VIEW" },
  { slug: "waitlist", label: "Waitlist", permission: "RSVP_VIEW" },
  { slug: "seating", label: "Seating", permission: "SEATING_VIEW" },
  { slug: "check-in", label: "Check-in", permission: "CHECKIN_MANAGE" },
  { slug: "gifts", label: "Gifts & wishes", permission: "GIFT_VIEW" },
  { slug: "analytics", label: "Analytics", permission: "ANALYTICS_VIEW" },
  { slug: "settings", label: "Settings", permission: "WEDDING_EDIT" },
  { slug: "co-hosts", label: "Co-hosts", permission: "WEDDING_EDIT" },
];
export function WeddingNavigation({ weddingId }: { weddingId: string }) {
  const { can } = usePermission();
  const pathname = usePathname();
  return (
    <nav aria-label="Wedding sections" className="flex gap-2 overflow-x-auto border-b pb-4">
      {sections
        .filter((section) => can(section.permission))
        .map((section) => {
          const href = `/weddings/${encodeURIComponent(weddingId)}/${section.slug}`;
          return (
            <Link
              key={section.slug}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm hover:bg-muted",
                pathname === href && "bg-primary text-primary-foreground",
              )}
            >
              {section.label}
            </Link>
          );
        })}
    </nav>
  );
}

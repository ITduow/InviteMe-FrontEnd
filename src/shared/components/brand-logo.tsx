import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<BrandLogoSize, { mark: string; wordmark: string; gap: string }> = {
  sm: { mark: "size-8", wordmark: "text-lg", gap: "gap-2" },
  md: { mark: "size-10", wordmark: "text-xl", gap: "gap-2" },
  lg: { mark: "size-11", wordmark: "text-2xl", gap: "gap-2.5" },
  xl: { mark: "size-14", wordmark: "text-3xl sm:text-4xl", gap: "gap-3" },
};
const imageSizes: Record<BrandLogoSize, string> = {
  sm: "78px",
  md: "98px",
  lg: "108px",
  xl: "137px",
};

type BrandLogoProps = {
  href?: string;
  size?: BrandLogoSize;
  className?: string;
  ariaLabel?: string;
};

export function BrandLogo({
  href,
  size = "md",
  className,
  ariaLabel = "InviteMe",
}: BrandLogoProps) {
  const classes = sizeClasses[size];
  const content = (
    <>
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-[28%] bg-[#faf8f2]",
          classes.mark,
        )}
        aria-hidden="true"
      >
        <Image
          src="/images/brand/inviteme-logo.png"
          alt=""
          width={658}
          height={658}
          sizes={imageSizes[size]}
          className="absolute max-w-none"
          style={{ width: "245%", height: "245%", left: "-72.5%", top: "-56%" }}
        />
      </span>
      <span
        className={cn("font-display leading-none tracking-tight text-foreground", classes.wordmark)}
        aria-hidden="true"
      >
        InviteMe
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("inline-flex shrink-0 items-center", classes.gap, className)}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center", classes.gap, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {content}
    </span>
  );
}

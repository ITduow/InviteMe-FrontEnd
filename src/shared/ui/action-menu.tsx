"use client";

import { useLayoutEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/shared/lib/utils";

export function ActionMenu({
  label,
  disabled = false,
  items,
}: {
  label: string;
  disabled?: boolean;
  items: { label: string; onSelect: () => void; disabled?: boolean; destructive?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (trigger && menu) {
      const bounds = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(trigger.right - bounds.width, window.innerWidth - bounds.width - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(trigger.bottom + 4, window.innerHeight - bounds.height - 8))}px`;
    }
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    const scroll = () => setOpen(false);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open]);
  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        ref={triggerRef}
        id={id}
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground hover:bg-foreground/5"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal aria-hidden="true" />
      </Button>
      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={id}
          className="fixed z-20 min-w-40 rounded-xl border border-foreground/10 bg-white p-1 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
              );
              const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
              const index =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                      buttons.length;
              buttons[index]?.focus();
            }
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              className={cn(
                "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-xs outline-none hover:bg-foreground/5 focus-visible:bg-foreground/5 disabled:opacity-40",
                item.destructive && "text-destructive",
              )}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";
import { buttonVariants } from "@/shared/ui/button";
export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel className={buttonVariants({ variant: "outline" })}>
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action className={buttonVariants()} onClick={onConfirm}>
              Confirm
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

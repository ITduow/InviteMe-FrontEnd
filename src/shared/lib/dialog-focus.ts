import type { KeyboardEvent } from "react";

// Keep Tab within this dialog, without intercepting a nested confirmation dialog.
export function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  const dialog = event.currentTarget;
  if (
    event.key !== "Tab" ||
    !(event.target instanceof HTMLElement) ||
    event.target.closest("dialog") !== dialog
  )
    return;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]",
    ),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      element.getClientRects().length > 0 &&
      element.closest("dialog") === dialog,
  );
  const first = focusable[0],
    last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  const outsideOrder = !focusable.some((element) => element === active);
  if (event.shiftKey && (active === first || outsideOrder)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outsideOrder)) {
    event.preventDefault();
    first.focus();
  }
}

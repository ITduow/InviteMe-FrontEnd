export const defaultWordingText = "Trân trọng mời Quý khách đến chung vui trong ngày cưới.";

export function resolveCoverGreeting(
  cover: { greeting?: string; greetingBinding?: "invitationWording" },
  previewContent: string | null = null,
) {
  return cover.greetingBinding === "invitationWording"
    ? (previewContent ?? defaultWordingText)
    : (cover.greeting ?? "Thân mời");
}

/** Bind the block at render time; the document never stores the selected guest's identity. */
export function resolveStudioText(
  props: { text?: string; textBinding?: "invitationWording" },
  previewContent: string | null = null,
) {
  return props.textBinding === "invitationWording"
    ? (previewContent ?? defaultWordingText)
    : (props.text ?? "Viết lời của bạn");
}

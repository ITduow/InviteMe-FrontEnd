"use client";

import { useEditor, useNode } from "@craftjs/core";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

export type ItemProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  src?: string;
  eventDate?: string;
  eventTime?: string;
  timezone?: "Asia/Ho_Chi_Minh" | "UTC";
  fontFamily?: "Arial" | "Georgia" | "EB Garamond";
  background?: string;
  accent?: string;
  title?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  uppercase?: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  opacity?: number;
  objectFit?: "cover" | "contain";
  borderRadius?: number;
  flipX?: boolean;
  address?: string;
  images?: string[];
  action?: "rsvp" | "calendar" | "gift";
  message?: string;
};

export function itemStyle(props: ItemProps, selected: boolean): CSSProperties {
  return {
    position: "absolute",
    left: props.x ?? 40,
    top: props.y ?? 40,
    width: props.width ?? 220,
    height: props.height ?? 70,
    transform: `rotate(${props.rotation ?? 0}deg)`,
    outline: selected ? "1px solid #477565" : undefined,
    cursor: "pointer",
    touchAction: "none",
  };
}

export function StudioText(props: ItemProps) {
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const [editing, setEditing] = useState(false);
  const {
    id,
    connectors: { connect },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected }));
  return (
    <div
      ref={(element) => {
        if (element) connect(element);
        if (element && editing) element.focus();
      }}
      data-studio-node={id}
      contentEditable={editing}
      suppressContentEditableWarning
      onDoubleClick={() => {
        if (enabled) setEditing(true);
      }}
      onBlur={(event) => {
        if (editing) {
          const text = event.currentTarget.innerText.slice(0, 10000);
          setProp((value: ItemProps) => {
            value.text = text;
          });
          setEditing(false);
        }
      }}
      style={{
        ...itemStyle(props, selected),
        fontSize: props.fontSize ?? 32,
        color: props.color ?? "#493a34",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        lineHeight: props.lineHeight ?? 1.2,
        fontFamily: props.fontFamily ?? "Arial",
        fontWeight: props.bold ? 700 : 400,
        fontStyle: props.italic ? "italic" : "normal",
        textDecoration:
          [props.underline ? "underline" : "", props.strike ? "line-through" : ""]
            .filter(Boolean)
            .join(" ") || "none",
        textTransform: props.uppercase ? "uppercase" : "none",
        textAlign: props.textAlign ?? "left",
        background: props.background ?? "transparent",
        borderRadius: props.borderRadius ?? 0,
        opacity: props.opacity ?? 1,
        cursor: editing ? "text" : "pointer",
      }}
    >
      {props.text ?? "Viết lời của bạn"}
    </div>
  );
}
StudioText.craft = {
  displayName: "Chữ",
  props: {
    x: 55,
    y: 80,
    width: 370,
    height: 80,
    rotation: 0,
    text: "Minh & Lan",
    fontSize: 42,
    color: "#493a34",
  },
};

export function StudioImage(props: ItemProps) {
  const {
    id,
    connectors: { connect },
    selected,
  } = useNode((node) => ({ selected: node.events.selected }));
  return (
    <div
      ref={(element) => {
        if (element) connect(element);
      }}
      data-studio-node={id}
      style={{
        ...itemStyle(props, selected),
        opacity: props.opacity ?? 1,
        borderRadius: props.borderRadius ?? 0,
        overflow: "hidden",
      }}
    >
      {/* Editor needs the actual DOM image inside a freely transformed item. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.src ?? "/images/templates/invite-portrait.png"}
        alt="Ảnh minh họa"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: props.objectFit ?? "cover",
          pointerEvents: "none",
          transform: props.flipX ? "scaleX(-1)" : undefined,
        }}
      />
    </div>
  );
}
StudioImage.craft = {
  displayName: "Ảnh",
  props: {
    x: 55,
    y: 210,
    width: 370,
    height: 420,
    rotation: 0,
    src: "/images/templates/invite-portrait.png",
  },
};

export function StudioFrame({
  children,
  background = "#fffaf1",
  width = 480,
  height = 760,
  src,
}: {
  children?: ReactNode;
  background?: string;
  width?: number;
  height?: number;
  src?: string;
}) {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <div
      ref={(element) => {
        if (element) connect(element);
      }}
      data-studio-frame
      style={{
        position: "relative",
        width,
        height,
        background,
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: "100% auto",
        backgroundBlendMode: "multiply",
        boxShadow: "0 12px 50px #00000012",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}
StudioFrame.craft = { displayName: "Khung / nền", props: { background: "#fffaf1" } };

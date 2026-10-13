"use client";

import { useNode } from "@craftjs/core";
import type { CSSProperties, ReactNode } from "react";

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
};

function itemStyle(props: ItemProps, selected: boolean): CSSProperties {
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
        fontSize: props.fontSize ?? 32,
        color: props.color ?? "#493a34",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        lineHeight: 1.2,
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
      style={itemStyle(props, selected)}
    >
      {/* Editor needs the actual DOM image inside a freely transformed item. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.src ?? "/images/templates/invite-portrait.png"}
        alt="Ảnh minh họa"
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
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
}: {
  children?: ReactNode;
  background?: string;
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
        width: 480,
        height: 760,
        background,
        boxShadow: "0 12px 50px #00000012",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}
StudioFrame.craft = { displayName: "Khung / nền", props: { background: "#fffaf1" } };

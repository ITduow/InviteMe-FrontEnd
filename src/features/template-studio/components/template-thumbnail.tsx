"use client";
import type { CSSProperties } from "react";
import type { templateCatalog } from "../templates/catalog";
import { imageShapeStyle } from "./items";
export function TemplateThumbnail({
  document,
  scale = 0.43,
  height = 230,
}: {
  document: (typeof templateCatalog)[number]["document"];
  scale?: number;
  height?: number;
}) {
  const root = document.nodes.ROOT;
  if (!root) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width: 480 * scale,
        maxWidth: "100%",
        marginInline: "auto",
        overflow: "hidden",
        position: "relative",
        background: root.props.background,
        backgroundImage: root.props.src ? `url(${root.props.src})` : undefined,
        backgroundSize: "100% auto",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 480,
          height: 700,
          position: "relative",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {root.nodes.map((id) => {
          const node = document.nodes[id];
          if (!node) return null;
          const p = node.props;
          if ((p.y ?? 0) > 650) return null;
          const style: CSSProperties = {
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.width,
            height: p.height,
            transform: `rotate(${p.rotation ?? 0}deg)`,
            color: p.color,
            background: p.background,
            fontSize: p.fontSize,
            fontFamily: p.fontFamily,
            textAlign: p.textAlign,
            fontStyle: p.italic ? "italic" : undefined,
            whiteSpace: "pre-wrap",
            opacity: p.opacity,
            ...imageShapeStyle(p),
            overflow: "hidden",
          };
          return node.type.resolvedName === "StudioText" ? (
            <div key={id} style={style}>
              {p.text}
            </div>
          ) : node.type.resolvedName === "StudioImage" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={id}
              alt=""
              src={p.src}
              style={{ ...style, objectFit: p.objectFit, margin: 0, border: 0 }}
            />
          ) : null;
        })}
      </div>
    </div>
  );
}

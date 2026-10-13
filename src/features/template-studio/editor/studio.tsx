"use client";

import { Editor, Element, Frame, useEditor } from "@craftjs/core";
import Moveable from "react-moveable";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { StudioFrame, StudioImage, StudioText, type ItemProps } from "../components/items";
import { parseStudioDocument } from "../schemas/document";
import styles from "./studio.module.css";

function Workspace() {
  const { actions, query, selected, canUndo, canRedo, items, serialized, background } = useEditor(
    (state, query) => {
      const id = Array.from(state.events.selected)[0];
      return {
        selected: id && id !== "ROOT" ? { id, node: state.nodes[id] } : undefined,
        canUndo: query.history.canUndo(),
        canRedo: query.history.canRedo(),
        items: state.nodes.ROOT?.data.nodes ?? [],
        serialized: query.serialize(),
        background: (state.nodes.ROOT?.data.props.background as string | undefined) ?? "#fffaf1",
      };
    },
  );
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("Dữ liệu thử nghiệm · chưa lưu vào server");
  const [preview, setPreview] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const moveable = useRef<Moveable>(null);
  const props = (selected?.node?.data.props ?? {}) as ItemProps;
  const selection = selected?.id;
  const layerIndex = selection ? items.indexOf(selection) : -1;

  useEffect(() => {
    if (query.getNodes().ROOT) return;
    const root = (
      <Element is={StudioFrame} canvas>
        <StudioText />
        <StudioImage />
      </Element>
    );
    const tree = query.parseReactElement(root).toNodeTree((node, element) => {
      if (element === root) node.id = "ROOT";
    });
    // Initialize after commit: Frame's JSX initializer mutates the store during render.
    actions.history.ignore().addNodeTree(tree);
  }, [actions, query]);

  const synchronizeTarget = useCallback(() => {
    const elements = stage.current?.querySelectorAll<HTMLElement>("[data-studio-node]");
    const next =
      Array.from(elements ?? []).find((element) => element.dataset.studioNode === selection) ??
      null;
    setTarget((current) => (current === next ? current : next));
    moveable.current?.updateRect();
  }, [selection]);

  useEffect(() => {
    synchronizeTarget();
  }, [serialized, synchronizeTarget]);

  function update(values: Partial<ItemProps>) {
    const bounds = {
      x: [-3000, 3000],
      y: [-3000, 10000],
      width: [20, 2000],
      height: [20, 10000],
      rotation: [-3600, 3600],
      fontSize: [8, 200],
    } as const;
    for (const key of Object.keys(bounds) as (keyof typeof bounds)[]) {
      const value = values[key];
      if (value !== undefined)
        values[key] = Math.min(bounds[key][1], Math.max(bounds[key][0], value));
    }
    if (selection)
      actions.setProp(selection, (current: ItemProps) => Object.assign(current, values));
  }
  function add(kind: "text" | "image") {
    if (items.length >= 100) {
      setMessage("Bản thử hỗ trợ tối đa 100 item.");
      return;
    }
    const component =
      kind === "text" ? (
        <StudioText x={65} y={100 + items.length * 18} />
      ) : (
        <StudioImage x={70} y={200} width={260} height={300} />
      );
    const node = query.parseReactElement(component).toNodeTree();
    actions.addNodeTree(node, "ROOT");
    actions.selectNode(node.rootNodeId);
  }
  function moveLayer(direction: "up" | "down") {
    if (!selection || layerIndex < 0) return;
    if (direction === "up" && layerIndex < items.length - 1) {
      // Craft inserts before removing the old position, so forward moves skip that slot.
      actions.move(selection, "ROOT", layerIndex + 2);
    } else if (direction === "down" && layerIndex > 0) {
      actions.move(selection, "ROOT", layerIndex - 1);
    }
  }
  function exportJson() {
    const value = JSON.stringify(
      { schemaVersion: 1, nodes: JSON.parse(query.serialize()) },
      null,
      2,
    );
    setJson(value);
    setMessage("Đã lấy JSON hiện tại. Bạn có thể tải file hoặc nhập lại.");
    return value;
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "inviteme-studio.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  function importJson(value: string) {
    try {
      const document = parseStudioDocument(value);
      actions.deserialize(JSON.stringify(document.nodes));
      actions.selectNode();
      setJson(value);
      setMessage("Đã mở document JSON. Chưa lưu server.");
    } catch {
      setMessage("Không mở được: JSON sai cấu trúc hoặc có item chưa hỗ trợ.");
    }
  }

  return (
    <main id="main-content" className={styles.studio}>
      <header className={styles.header}>
        <div>
          <small>INVITEME / TEMPLATE STUDIO</small>
          <h1>Bước 1 · Khung editor</h1>
        </div>
        <div className={styles.buttons}>
          <button disabled={!canUndo} onClick={() => actions.history.undo()}>
            Undo
          </button>
          <button disabled={!canRedo} onClick={() => actions.history.redo()}>
            Redo
          </button>
          <button
            onClick={() => {
              actions.selectNode();
              actions.setOptions((options) => {
                options.enabled = preview;
              });
              setPreview(!preview);
            }}
          >
            {preview ? "Về editor" : "Xem trước"}
          </button>
          <button onClick={download}>Tải JSON</button>
        </div>
      </header>
      <p className={styles.status} role="status">
        {message}
      </p>
      <div className={styles.layout}>
        <aside className={styles.panel}>
          <h2>Thêm item</h2>
          <p>Craft giữ dữ liệu, Moveable điều khiển vị trí.</p>
          <div className={styles.buttons}>
            <button disabled={preview} onClick={() => add("text")}>
              + Chữ
            </button>
            <button disabled={preview} onClick={() => add("image")}>
              + Ảnh
            </button>
          </div>
          <h2>Các lớp</h2>
          {items.map((id) => (
            <button
              key={id}
              disabled={preview}
              className={styles.layer}
              aria-pressed={id === selection}
              onClick={() => actions.selectNode(id)}
            >
              {query.node(id).get().data.displayName}
            </button>
          ))}
          <ColorControl
            key={`background-${background}`}
            label="Nền khung"
            value={background}
            disabled={preview}
            onChange={(color) =>
              actions.setProp("ROOT", (value) => {
                value.background = color;
              })
            }
          />
          <p>Khung 480 × 760. Đây là bộ thử thao tác, chưa phải template hoàn chỉnh.</p>
        </aside>
        <section className={styles.workspace} aria-label="Khung thiết kế">
          <div ref={stage} onClick={synchronizeTarget} onPointerUp={synchronizeTarget}>
            <Frame />
          </div>
          {!preview && (
            <Moveable
              ref={moveable}
              target={target}
              draggable
              resizable
              rotatable
              origin={false}
              flushSync={flushSync}
              onDragStart={(event) => event.set([props.x ?? 0, props.y ?? 0])}
              onDrag={(event) => {
                event.target.style.left = `${event.beforeTranslate[0]}px`;
                event.target.style.top = `${event.beforeTranslate[1]}px`;
              }}
              onDragEnd={(event) => {
                if (event.lastEvent)
                  update({
                    x: event.lastEvent.beforeTranslate[0],
                    y: event.lastEvent.beforeTranslate[1],
                  });
              }}
              onResizeStart={(event) => {
                event.setOrigin(["%", "%"]);
                if (event.dragStart) event.dragStart.set([props.x ?? 0, props.y ?? 0]);
              }}
              onResize={(event) => {
                Object.assign(event.target.style, {
                  width: `${event.width}px`,
                  height: `${event.height}px`,
                  left: `${event.drag.beforeTranslate[0]}px`,
                  top: `${event.drag.beforeTranslate[1]}px`,
                });
              }}
              onResizeEnd={(event) => {
                if (event.lastEvent)
                  update({
                    width: Math.max(20, event.lastEvent.width),
                    height: Math.max(20, event.lastEvent.height),
                    x: event.lastEvent.drag.beforeTranslate[0],
                    y: event.lastEvent.drag.beforeTranslate[1],
                  });
              }}
              onRotateStart={(event) => event.set(props.rotation ?? 0)}
              onRotate={(event) => {
                event.target.style.transform = `rotate(${event.beforeRotate}deg)`;
              }}
              onRotateEnd={(event) => {
                if (event.lastEvent) update({ rotation: event.lastEvent.beforeRotate });
              }}
            />
          )}
        </section>
        <aside className={styles.panel}>
          <h2>Thuộc tính</h2>
          {!selection ? (
            <p>Chọn chữ hoặc ảnh trong khung để chỉnh.</p>
          ) : (
            <fieldset disabled={preview}>
              <div className={styles.layerControls}>
                <span>
                  Thứ tự lớp · {layerIndex + 1}/{items.length} (lớp trên có số lớn hơn)
                </span>
                <div className={styles.buttons}>
                  <button disabled={layerIndex >= items.length - 1} onClick={() => moveLayer("up")}>
                    ↑ Lên 1 lớp
                  </button>
                  <button disabled={layerIndex <= 0} onClick={() => moveLayer("down")}>
                    ↓ Xuống 1 lớp
                  </button>
                </div>
              </div>
              {selected?.node?.data.name === "StudioText" && (
                <>
                  <label>
                    Nội dung
                    <textarea
                      maxLength={10000}
                      value={props.text ?? ""}
                      onChange={(event) => update({ text: event.target.value })}
                    />
                  </label>
                  <ColorControl
                    key={`${selection}-${props.color}`}
                    label="Màu chữ"
                    value={props.color ?? "#493a34"}
                    onChange={(color) => update({ color })}
                  />
                  <label>
                    Cỡ chữ
                    <input
                      type="number"
                      min={8}
                      max={200}
                      value={props.fontSize ?? 32}
                      onChange={(event) =>
                        update({ fontSize: Math.max(8, Math.min(200, Number(event.target.value))) })
                      }
                    />
                  </label>
                </>
              )}
              {(["x", "y", "width", "height", "rotation"] as const).map((key) => (
                <label key={key}>
                  {{ x: "X", y: "Y", width: "Rộng", height: "Cao", rotation: "Góc xoay" }[key]}
                  <input
                    type="number"
                    value={Math.round(props[key] ?? 0)}
                    onChange={(event) =>
                      update({
                        [key]:
                          key === "width" || key === "height"
                            ? Math.max(20, Number(event.target.value))
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
              ))}
              <button
                onClick={() => {
                  actions.delete(selection);
                  setTarget(null);
                }}
              >
                Xóa item
              </button>
            </fieldset>
          )}
          <h2>Document JSON</h2>
          <button onClick={exportJson}>Lấy JSON hiện tại</button>
          <textarea
            aria-label="Document JSON"
            className={styles.json}
            value={json}
            onChange={(event) => setJson(event.target.value)}
            placeholder="Lấy JSON rồi thử nhập lại…"
          />
          <button disabled={preview || !json} onClick={() => importJson(json)}>
            Mở JSON này
          </button>
          <label className={styles.file}>
            Mở file JSON
            <input
              type="file"
              accept=".json,application/json"
              disabled={preview}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = event.target.files?.[0];
                if (file && file.size <= 500000) importJson(await file.text());
                else if (file) setMessage("File JSON quá lớn (tối đa 500 KB).");
                input.value = "";
              }}
            />
          </label>
        </aside>
      </div>
    </main>
  );
}

function ColorControl({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  function commit() {
    const hex = draft.trim().replace(/^#/, "");
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
      setError(true);
      return;
    }
    const normalized = `#${
      hex.length === 3
        ? hex
            .split("")
            .map((letter) => letter + letter)
            .join("")
        : hex
    }`.toLowerCase();
    setError(false);
    setDraft(normalized);
    if (normalized !== value) onChange(normalized);
  }
  return (
    <div className={styles.colorControl}>
      <span>{label}</span>
      <div className={styles.colorInputs}>
        <input
          aria-label={`${label} picker`}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          aria-label={`${label} HEX`}
          type="text"
          value={draft}
          disabled={disabled}
          spellCheck={false}
          maxLength={7}
          aria-invalid={error}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(false);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            } else if (event.key === "Escape") {
              setDraft(value);
              setError(false);
            }
          }}
        />
      </div>
      {error && <small role="alert">Nhập mã HEX như #873b46 hoặc #abc.</small>}
    </div>
  );
}

export function TemplateStudio() {
  return (
    <Editor resolver={{ StudioFrame, StudioText, StudioImage }}>
      <Workspace />
    </Editor>
  );
}

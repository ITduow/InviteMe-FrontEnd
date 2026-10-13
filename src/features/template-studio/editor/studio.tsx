"use client";

import { Editor, Element, Frame, useEditor } from "@craftjs/core";
import Moveable from "react-moveable";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import {
  Type,
  ImageIcon,
  Library,
  Shapes,
  Paintbrush,
  Music,
  CalendarDays,
  LayoutTemplate,
  WandSparkles,
  Layers,
  Timer,
  MapPin,
  Phone,
  Bell,
  ClipboardCheck,
  QrCode,
  Mail,
  Images,
  GalleryHorizontal,
  Youtube,
  Sparkles,
} from "lucide-react";
import { StudioFrame, StudioImage, StudioText, type ItemProps } from "../components/items";
import { StudioCalendar, StudioCountdown } from "../components/date-widgets";
import { isValidEventDate } from "../components/date-utils";
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
  const [category, setCategory] = useState("utilities");
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
      opacity: [0, 1],
      lineHeight: [0.8, 3],
    } as const;
    for (const key of Object.keys(bounds) as (keyof typeof bounds)[]) {
      const value = values[key];
      if (value !== undefined)
        values[key] = Math.min(bounds[key][1], Math.max(bounds[key][0], value));
    }
    if (selection)
      actions.setProp(selection, (current: ItemProps) => Object.assign(current, values));
  }
  function add(kind: "text" | "image" | "calendar" | "countdown") {
    if (items.length >= 100) {
      setMessage("Bản thử hỗ trợ tối đa 100 item.");
      return;
    }
    const component =
      kind === "text" ? (
        <StudioText x={65} y={100 + items.length * 18} />
      ) : kind === "image" ? (
        <StudioImage x={70} y={200} width={260} height={300} />
      ) : kind === "calendar" ? (
        <StudioCalendar />
      ) : (
        <StudioCountdown />
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
        <aside className={styles.library} aria-label="Thư viện thiết kế">
          <nav className={styles.rail} aria-label="Danh mục thiết kế">
            {[
              { id: "text", label: "Văn bản", icon: Type },
              { id: "image", label: "Hình ảnh", icon: ImageIcon },
              { id: "stock", label: "Stock", icon: Library },
              { id: "shapes", label: "Hình dạng", icon: Shapes },
              { id: "background", label: "Nền", icon: Paintbrush },
              { id: "music", label: "Âm nhạc", icon: Music },
              { id: "utilities", label: "Tiện ích", icon: CalendarDays },
              { id: "presets", label: "Preset", icon: LayoutTemplate },
              { id: "templates", label: "Mẫu", icon: LayoutTemplate },
              { id: "effects", label: "Hiệu ứng", icon: WandSparkles },
              { id: "layers", label: "Các lớp", icon: Layers },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>
                <Icon size={22} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.libraryContent}>
            {category === "utilities" && (
              <>
                <h2>Tiện ích</h2>
                <p>Chọn tiện ích để thêm vào thiết kế.</p>
                <div className={styles.utilityGrid}>
                  {[
                    { label: "Lịch", icon: CalendarDays, kind: "calendar" as const },
                    { label: "Đếm ngược", icon: Timer, kind: "countdown" as const },
                    { label: "Bản đồ", icon: MapPin },
                    { label: "Nút gọi", icon: Phone },
                    { label: "Thêm lời nhắc", icon: Bell },
                    { label: "Form xác nhận tham dự", icon: ClipboardCheck },
                    { label: "Form tùy chỉnh", icon: ClipboardCheck },
                    { label: "Tên khách tự động", icon: Type },
                    { label: "QR Box", icon: QrCode },
                    { label: "Hiệu ứng phong bì thư", icon: Mail },
                    { label: "Album ảnh", icon: Images },
                    { label: "Carousel ảnh", icon: GalleryHorizontal },
                    { label: "Video YouTube", icon: Youtube },
                    { label: "Hiệu ứng hạt", icon: Sparkles },
                  ].map(({ label, icon: Icon, ...item }) => {
                    const kind = "kind" in item ? item.kind : undefined;
                    return (
                      <button
                        key={label}
                        disabled={preview || !kind}
                        onClick={() => {
                          if (kind) add(kind);
                        }}
                      >
                        <Icon size={32} />
                        <span>{label}</span>
                        {!kind && <small>Sắp có</small>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {category === "text" && (
              <>
                <h2>Văn bản</h2>
                <p>Thêm chữ, sau đó chỉnh nội dung ở Thuộc tính.</p>
                <button className={styles.addCard} disabled={preview} onClick={() => add("text")}>
                  <Type size={30} />
                  Thêm văn bản
                </button>
              </>
            )}
            {category === "image" && (
              <>
                <h2>Hình ảnh</h2>
                <p>Ảnh minh họa có sẵn. Upload ảnh sẽ được bổ sung sau.</p>
                <button className={styles.addCard} disabled={preview} onClick={() => add("image")}>
                  <ImageIcon size={30} />
                  Thêm ảnh
                </button>
              </>
            )}
            {category === "layers" && (
              <>
                <h2>Các lớp</h2>
                <p>Lớp trên cùng nằm đầu danh sách.</p>
                {[...items].reverse().map((id) => (
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
              </>
            )}
            {category === "background" && (
              <>
                <h2>Nền thiết kế</h2>
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
              </>
            )}
            {["stock", "shapes", "music", "presets", "templates", "effects"].includes(category) && (
              <>
                <h2>
                  {
                    (
                      {
                        stock: "Stock",
                        shapes: "Hình dạng",
                        music: "Âm nhạc",
                        presets: "Preset",
                        templates: "Mẫu",
                        effects: "Hiệu ứng",
                      } as Record<string, string>
                    )[category]
                  }
                </h2>
                <p>Mục này sẽ được bổ sung ở bước tiếp theo.</p>
              </>
            )}
          </div>
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
              checkInput
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
            <p>Chọn một item trong khung để chỉnh thuộc tính.</p>
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
              {(selected?.node?.data.name === "StudioCalendar" ||
                selected?.node?.data.name === "StudioCountdown") && (
                <>
                  <label>
                    Tiêu đề
                    <input
                      maxLength={150}
                      value={props.title ?? ""}
                      onChange={(event) => update({ title: event.target.value })}
                    />
                  </label>
                  <label>
                    Ngày sự kiện
                    <input
                      type="date"
                      value={props.eventDate ?? "2027-04-18"}
                      onChange={(event) => {
                        if (isValidEventDate(event.target.value))
                          update({ eventDate: event.target.value });
                      }}
                    />
                  </label>
                  {selected.node.data.name === "StudioCountdown" && (
                    <>
                      <label>
                        Giờ sự kiện
                        <input
                          type="time"
                          value={props.eventTime ?? "17:00"}
                          onChange={(event) => {
                            if (/^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value))
                              update({ eventTime: event.target.value });
                          }}
                        />
                      </label>
                      <label>
                        Múi giờ
                        <select
                          value={props.timezone ?? "Asia/Ho_Chi_Minh"}
                          onChange={(event) =>
                            update({ timezone: event.target.value as ItemProps["timezone"] })
                          }
                        >
                          <option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option>
                          <option value="UTC">UTC (GMT+0)</option>
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Kiểu chữ
                    <select
                      value={props.fontFamily ?? "Georgia"}
                      onChange={(event) =>
                        update({ fontFamily: event.target.value as ItemProps["fontFamily"] })
                      }
                    >
                      <option value="Georgia">Georgia · có chân</option>
                      <option value="Arial">Arial · không chân</option>
                    </select>
                  </label>
                  <label>
                    Cỡ chữ tiện ích
                    <input
                      type="number"
                      min={8}
                      max={200}
                      value={props.fontSize ?? 16}
                      onChange={(event) => update({ fontSize: Number(event.target.value) })}
                    />
                  </label>
                  <ColorControl
                    key={`${selection}-text-${props.color}`}
                    label="Màu chữ tiện ích"
                    value={props.color ?? "#493a34"}
                    onChange={(color) => update({ color })}
                  />
                  <ColorControl
                    key={`${selection}-accent-${props.accent}`}
                    label="Màu nhấn"
                    value={props.accent ?? "#873b46"}
                    onChange={(accent) => update({ accent })}
                  />
                  <ColorControl
                    key={`${selection}-bg-${props.background}`}
                    label="Nền tiện ích"
                    value={props.background ?? "#fffaf1"}
                    onChange={(background) => update({ background })}
                  />
                </>
              )}
              {selected?.node?.data.name === "StudioText" && (
                <>
                  <p>
                    <i>Kích đúp vào văn bản để chỉnh sửa.</i>
                  </p>
                  <label>
                    Nội dung
                    <textarea
                      maxLength={10000}
                      value={props.text ?? ""}
                      onChange={(event) => update({ text: event.target.value })}
                    />
                  </label>
                  <details className={styles.typography} open>
                    <summary>Kiểu chữ</summary>
                    <div className={styles.textTools}>
                      {(
                        [
                          { key: "bold", label: "In đậm", symbol: "B" },
                          { key: "italic", label: "In nghiêng", symbol: "I" },
                          { key: "strike", label: "Gạch ngang", symbol: "S̶" },
                          { key: "underline", label: "Gạch chân", symbol: "U̲" },
                          { key: "uppercase", label: "Chữ hoa", symbol: "Aa" },
                        ] as const
                      ).map(({ key, label, symbol }) => (
                        <button
                          key={key}
                          aria-label={label}
                          aria-pressed={props[key] ?? false}
                          title={label}
                          onClick={() => update({ [key]: !props[key] })}
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                    <div className={styles.textRow}>
                      <span>Căn chỉnh</span>
                      <div className={styles.textTools}>
                        {(
                          [
                            { key: "left", label: "Căn trái", icon: AlignLeft },
                            { key: "center", label: "Căn giữa", icon: AlignCenter },
                            { key: "right", label: "Căn phải", icon: AlignRight },
                            { key: "justify", label: "Căn đều", icon: AlignJustify },
                          ] as const
                        ).map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            aria-label={label}
                            title={label}
                            aria-pressed={(props.textAlign ?? "left") === key}
                            onClick={() => update({ textAlign: key })}
                          >
                            <Icon size={15} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <label>
                      Font
                      <select
                        value={props.fontFamily ?? "Arial"}
                        onChange={(event) =>
                          update({ fontFamily: event.target.value as ItemProps["fontFamily"] })
                        }
                      >
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                      </select>
                    </label>
                    <ColorControl
                      key={`${selection}-${props.color}`}
                      label="Màu chữ"
                      value={props.color ?? "#493a34"}
                      onChange={(color) => update({ color })}
                    />
                    <label>
                      Cỡ chữ
                      <div className={styles.sizeRow}>
                        <button
                          aria-label="Giảm cỡ chữ"
                          onClick={() => update({ fontSize: (props.fontSize ?? 32) - 1 })}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={8}
                          max={200}
                          value={props.fontSize ?? 32}
                          onChange={(event) =>
                            update({
                              fontSize: Math.max(8, Math.min(200, Number(event.target.value))),
                            })
                          }
                        />
                        <button
                          aria-label="Tăng cỡ chữ"
                          onClick={() => update({ fontSize: (props.fontSize ?? 32) + 1 })}
                        >
                          +
                        </button>
                      </div>
                    </label>
                    <ColorControl
                      key={`${selection}-text-bg-${props.background}`}
                      label="Màu nền chữ"
                      value={props.background ?? "#ffffff"}
                      onChange={(background) => update({ background })}
                    />
                    <button
                      onClick={() => {
                        if (selection)
                          actions.setProp(selection, (value: ItemProps) => {
                            delete value.background;
                          });
                      }}
                    >
                      Bỏ nền chữ
                    </button>
                    <label>
                      Giãn dòng
                      <input
                        type="number"
                        min={0.8}
                        max={3}
                        step={0.1}
                        value={props.lineHeight ?? 1.2}
                        onChange={(event) => update({ lineHeight: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      Trong suốt
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={props.opacity ?? 1}
                        onChange={(event) => update({ opacity: Number(event.target.value) })}
                      />
                    </label>
                    <input
                      aria-label="Thanh độ trong suốt"
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={props.opacity ?? 1}
                      onChange={(event) => update({ opacity: Number(event.target.value) })}
                    />
                  </details>
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
    <Editor resolver={{ StudioFrame, StudioText, StudioImage, StudioCalendar, StudioCountdown }}>
      <Workspace />
    </Editor>
  );
}

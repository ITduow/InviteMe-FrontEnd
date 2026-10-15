import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import path from "node:path";
import burgundyTemplate from "../src/features/template-studio/templates/minimalism-burgundy.json";
import brownTemplate from "../src/features/template-studio/templates/minimalism-brown.json";
import {
  templateCatalog,
  storyTemplateCatalog,
  findTemplate,
} from "../src/features/template-studio/templates/catalog";
import { parseStudioDocument } from "../src/features/template-studio/schemas/document";
import {
  calendarMonth,
  countdownParts,
  eventTimestamp,
  isValidEventDate,
} from "../src/features/template-studio/components/date-utils";

function document() {
  return {
    schemaVersion: 1,
    nodes: {
      ROOT: {
        type: { resolvedName: "StudioFrame" },
        isCanvas: true,
        props: { background: "#fffaf1" },
        displayName: "Khung",
        custom: {},
        hidden: false,
        nodes: ["text"],
        linkedNodes: {},
      },
      text: {
        type: { resolvedName: "StudioText" },
        isCanvas: false,
        props: { x: 95, y: 105, text: "Minh & Lan", width: 370, height: 80 },
        displayName: "Chữ",
        custom: {},
        hidden: false,
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
      },
    },
  };
}

test("studio document preserves Vietnamese content and layout across JSON round-trip", () => {
  const input = document();
  assert.deepEqual(parseStudioDocument(JSON.stringify(input)), input);
});

test("studio document rejects broken links and orphan items", () => {
  const broken = document();
  broken.nodes.ROOT.nodes = ["missing"];
  assert.throws(() => parseStudioDocument(JSON.stringify(broken)));
  const orphan = document();
  orphan.nodes.ROOT.nodes = [];
  assert.throws(() => parseStudioDocument(JSON.stringify(orphan)));
});

test("studio document rejects cycles and unsupported component types", () => {
  const cycle = document();
  cycle.nodes.ROOT.nodes.push("ROOT");
  assert.throws(() => parseStudioDocument(JSON.stringify(cycle)));
  const unsupported = document();
  unsupported.nodes.text.type.resolvedName = "UnknownComponent";
  assert.throws(() => parseStudioDocument(JSON.stringify(unsupported)));
});

test("studio document rejects invalid sizes and unsupported schema versions", () => {
  const invalid = document();
  invalid.nodes.text.props.width = -10;
  assert.throws(() => parseStudioDocument(JSON.stringify(invalid)));
  assert.throws(() => parseStudioDocument(JSON.stringify({ ...document(), schemaVersion: 2 })));
});

test("calendar rejects nonexistent dates and aligns a leap month starting on Monday", () => {
  assert.equal(isValidEventDate("2027-02-29"), false);
  assert.equal(isValidEventDate("2028-02-29"), true);
  assert.deepEqual(calendarMonth("2024-02-29"), {
    year: 2024,
    month: 2,
    day: 29,
    offset: 3,
    days: 29,
  });
  assert.equal(calendarMonth("2027-02-30"), null);
});

test("countdown uses the selected timezone rather than the browser timezone", () => {
  assert.equal(
    eventTimestamp("2027-04-18", "17:00", "Asia/Ho_Chi_Minh"),
    Date.parse("2027-04-18T10:00:00Z"),
  );
  assert.equal(eventTimestamp("2027-04-18", "17:00", "UTC"), Date.parse("2027-04-18T17:00:00Z"));
  assert.equal(Number.isNaN(eventTimestamp("2027-04-18", "25:00", "UTC")), true);
  assert.deepEqual(countdownParts(90061000, 0), {
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
    ended: false,
  });
  assert.deepEqual(countdownParts(1000, 2000), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    ended: true,
  });
});

test("calendar and countdown widget settings survive a document round-trip", () => {
  for (const resolvedName of ["StudioCalendar", "StudioCountdown"]) {
    const input = document();
    input.nodes.text.type.resolvedName = resolvedName;
    const props = {
      eventDate: "2028-02-29",
      eventTime: "17:00",
      timezone: "Asia/Ho_Chi_Minh",
      fontFamily: "Georgia",
      accent: "#873b46",
    };
    Object.assign(input.nodes.text.props, props);
    assert.deepEqual(parseStudioDocument(JSON.stringify(input)), input);
    Object.assign(input.nodes.text.props, { eventDate: "2027-02-29" });
    assert.throws(() => parseStudioDocument(JSON.stringify(input)));
  }
});

test("Minimalism Brown loads as an editable document using InviteMe widgets and existing local assets", () => {
  const document = parseStudioDocument(JSON.stringify(brownTemplate));
  const kinds = new Set<string>(
    Object.values(document.nodes).map((node) => node.type.resolvedName),
  );
  for (const type of ["StudioCalendar", "StudioMap", "StudioAlbum", "StudioAction", "StudioWishes"])
    assert.ok(kinds.has(type));
  assert.equal(document.nodes.ROOT?.props.width, 480);
  assert.equal(document.nodes.ROOT?.props.height, 3680);
  for (const node of Object.values(document.nodes)) {
    for (const src of [node.props.src, ...(node.props.images ?? [])]) {
      if (src)
        assert.ok(existsSync(path.join(process.cwd(), "public", src)), `Missing asset: ${src}`);
    }
  }
});

test("album supports uploaded asset references and variable image counts", () => {
  const input = structuredClone(brownTemplate);
  const album = Object.values(input.nodes).find(
    (node) => node.type.resolvedName === "StudioAlbum",
  )!;
  const uploaded = "/api/template-studio/assets?id=12345678-1234-1234-1234-123456789abc";
  Object.assign(album.props, { images: Array(25).fill(uploaded) });
  const result = parseStudioDocument(JSON.stringify(input));
  assert.equal(
    Object.values(result.nodes).find((node) => node.type.resolvedName === "StudioAlbum")!.props
      .images!.length,
    25,
  );
  Object.assign(album.props, { images: ["javascript:alert(1)"] });
  assert.throws(() => parseStudioDocument(JSON.stringify(input)));
});

test("reveal presets round-trip with per-item overrides and reject invalid motion settings", () => {
  const input = structuredClone(brownTemplate);
  Object.assign(input.nodes.ROOT.props, { revealPreset: "slide-up", revealDuration: 800 });
  const image = Object.values(input.nodes).find(
    (node) => node.type.resolvedName === "StudioImage",
  )!;
  Object.assign(image.props, { revealPreset: "none", revealDelay: 150 });
  const saved = parseStudioDocument(JSON.stringify(input));
  assert.equal(saved.nodes.ROOT!.props.revealPreset, "slide-up");
  assert.equal(
    Object.values(saved.nodes).find((node) => node.type.resolvedName === "StudioImage")!.props
      .revealPreset,
    "none",
  );
  Object.assign(input.nodes.ROOT.props, { revealDuration: -1 });
  assert.throws(() => parseStudioDocument(JSON.stringify(input)));
  Object.assign(input.nodes.ROOT.props, { revealDuration: 800, revealPreset: "unknown" });
  assert.throws(() => parseStudioDocument(JSON.stringify(input)));
});

test("burgundy template uses shared widgets and original local assets", () => {
  const value = parseStudioDocument(JSON.stringify(burgundyTemplate));
  assert.equal(value.nodes.ROOT!.props.revealPreset, "fade");
  const names = Object.values(value.nodes).map((node) => node.type.resolvedName);
  for (const name of ["StudioAlbum", "StudioCalendar", "StudioMap", "StudioAction", "StudioWishes"])
    assert.ok(names.includes(name as (typeof names)[number]));
  for (const node of Object.values(value.nodes)) {
    for (const src of [node.props.src, ...(node.props.images ?? [])].filter(
      (src): src is string => !!src,
    )) {
      assert.ok(src.startsWith("/images/template-studio/minimalism-burgundy/"));
      assert.ok(existsSync(path.join(process.cwd(), "public", src)));
    }
  }
});

test("cover is optional and preserves template node positions", () => {
  const value = parseStudioDocument(JSON.stringify(burgundyTemplate));
  assert.equal(value.nodes.ROOT!.props.cover!.enabled, true);
  const positions = Object.values(value.nodes).map((node) => [
    node.props.x,
    node.props.y,
    node.props.width,
    node.props.height,
  ]);
  delete value.nodes.ROOT!.props.cover;
  const without = parseStudioDocument(JSON.stringify(value));
  assert.deepEqual(
    Object.values(without.nodes).map((node) => [
      node.props.x,
      node.props.y,
      node.props.width,
      node.props.height,
    ]),
    positions,
  );
  const invalid = structuredClone(burgundyTemplate);
  Object.assign(invalid.nodes.ROOT.props.cover, { background: "url(javascript:alert(1))" });
  assert.throws(() => parseStudioDocument(JSON.stringify(invalid)));
});

test("cover appearance, particles and opening animation survive JSON round-trip", () => {
  const input = structuredClone(burgundyTemplate);
  Object.assign(input.nodes.ROOT.props.cover, {
    style: "traditional",
    particles: "happiness",
    opening: "fly",
  });
  const saved = parseStudioDocument(JSON.stringify(input));
  assert.equal(saved.nodes.ROOT!.props.cover!.opening, "fly");
  assert.equal(saved.nodes.ROOT!.props.cover!.particles, "happiness");
  Object.assign(input.nodes.ROOT.props.cover, { opening: "invalid" });
  assert.throws(() => parseStudioDocument(JSON.stringify(input)));
});

test("all 15 catalog templates round-trip, use shared widgets and resolve original assets", () => {
  assert.equal(templateCatalog.length, 15);
  assert.equal(new Set(templateCatalog.map((item) => item.id)).size, 15);
  for (const template of templateCatalog) {
    const doc = parseStudioDocument(JSON.stringify(template.document));
    assert.equal(findTemplate(template.id)?.name, template.name);
    const kinds = Object.values(doc.nodes).map((node) => node.type.resolvedName);
    for (const kind of [
      "StudioAlbum",
      "StudioCalendar",
      "StudioMap",
      "StudioAction",
      "StudioWishes",
    ])
      assert.ok(kinds.includes(kind as (typeof kinds)[number]), `${template.id}: ${kind}`);
    for (const node of Object.values(doc.nodes)) {
      for (const src of [
        node.props.src,
        node.props.cover?.decoration,
        ...(node.props.images ?? []),
      ]) {
        if (!src) continue;
        assert.ok(!src.includes("minimalism-brown/"), `${template.id}: copied asset ${src}`);
        assert.ok(
          existsSync(path.join(process.cwd(), "public", src)),
          `${template.id}: missing ${src}`,
        );
      }
      if (!["StudioImage", "StudioText", "StudioFrame"].includes(node.type.resolvedName)) {
        assert.ok((node.props.x ?? 0) >= 0);
        assert.ok((node.props.x ?? 0) + (node.props.width ?? 0) <= doc.nodes.ROOT!.props.width!);
        assert.ok((node.props.y ?? 0) + (node.props.height ?? 0) <= doc.nodes.ROOT!.props.height!);
      }
    }
  }
  assert.equal(findTemplate("unknown"), undefined);
});

test("optional image shapes preserve older documents and reject unsupported shapes", () => {
  const input = structuredClone(brownTemplate);
  const photo = Object.values(input.nodes).find(
    (node) => node.type.resolvedName === "StudioImage",
  )!;
  Object.assign(photo.props, { imageShape: "arch" });
  assert.equal(
    Object.values(parseStudioDocument(JSON.stringify(input)).nodes).find(
      (node) => node.type.resolvedName === "StudioImage",
    )!.props.imageShape,
    "arch",
  );
  Object.assign(photo.props, { imageShape: "arbitrary-css" });
  assert.throws(() => parseStudioDocument(JSON.stringify(input)));
});

test("five new Story documents preserve distinct section order and use only original local photos", () => {
  assert.equal(storyTemplateCatalog.length, 6);
  const ids = [
    "story-editorial-61",
    "story-garden-02",
    "story-seaside-01",
    "story-scarlet-39",
    "story-sage-53",
  ];
  for (const id of ids) {
    const template = findTemplate(id);
    assert.ok(template, id);
    const doc = parseStudioDocument(JSON.stringify(template.document));
    assert.deepEqual(doc, template.document);
    assert.ok(doc.nodes.ROOT!.props.height! < 10000);
    assert.ok(doc.nodes.ROOT!.nodes.length <= 100);
    for (const node of Object.values(doc.nodes)) {
      for (const src of [node.props.src, ...(node.props.images ?? [])].filter(
        (value): value is string => !!value,
      )) {
        assert.ok(src.startsWith("/images/template-studio/story-collection/"));
        assert.ok(existsSync(path.join(process.cwd(), "public", src)), `${id}: ${src}`);
      }
    }
    const all = Object.values(doc.nodes);
    const firstY = (kind: string) =>
      Math.min(
        ...all.filter((node) => node.type.resolvedName === kind).map((node) => node.props.y ?? 0),
      );
    const textY = (label: string) =>
      all.find((node) => node.props.text === label)?.props.y ?? Infinity;
    if (id === "story-editorial-61") assert.ok(firstY("StudioInterview") < firstY("StudioAlbum"));
    if (id === "story-garden-02") assert.ok(textY("OUR LOVE STORY") < firstY("StudioCalendar"));
    if (id === "story-seaside-01")
      assert.ok(
        textY("Đôi mình") < firstY("StudioCountdown") &&
          firstY("StudioCountdown") < firstY("StudioCalendar"),
      );
    if (id === "story-scarlet-39")
      assert.ok(
        firstY("StudioCalendar") < textY("Đôi mình") &&
          firstY("StudioTimeline") < firstY("StudioCountdown"),
      );
    if (id === "story-sage-53")
      assert.ok(
        firstY("StudioTimeline") < textY("Đôi mình") && textY("Dresscode") < textY("Đôi mình"),
      );
  }
});

test("Interview and Timeline support empty drafts, multiline content and bounded lists in JSON", () => {
  const template = findTemplate("story-editorial-61")!;
  const doc = structuredClone(template.document);
  const interview = Object.values(doc.nodes).find(
    (node) => node.type.resolvedName === "StudioInterview",
  )!;
  interview.props.questions = [{ question: "", answer: "A".repeat(600) }];
  assert.deepEqual(parseStudioDocument(JSON.stringify(doc)).nodes, doc.nodes);
  const timelineDoc = structuredClone(findTemplate("story-sage-53")!.document);
  const timeline = Object.values(timelineDoc.nodes).find(
    (node) => node.type.resolvedName === "StudioTimeline",
  )!;
  timeline.props.milestones = Array.from({ length: 8 }, () => ({
    time: "18:00",
    title: "",
    description: Array(35).fill("dòng").join("\n"),
  }));
  assert.deepEqual(parseStudioDocument(JSON.stringify(timelineDoc)).nodes, timelineDoc.nodes);
  timeline.props.milestones.push({ time: "19:00", title: "Ninth", description: "" });
  assert.throws(() => parseStudioDocument(JSON.stringify(timelineDoc)));
});

test("Wedding Story uses shared widgets and preserves chapters across export/import", () => {
  const template = storyTemplateCatalog[0];
  assert.ok(template);
  const saved = parseStudioDocument(JSON.stringify(template.document));
  assert.equal(findTemplate("story-red-velvet")?.name, template.name);
  const types = Object.values(saved.nodes).map((node) => node.type.resolvedName);
  for (const name of [
    "StudioCountdown",
    "StudioCalendar",
    "StudioAlbum",
    "StudioMap",
    "StudioAction",
    "StudioWishes",
  ])
    assert.ok(types.includes(name as (typeof types)[number]));
  assert.ok(
    Object.values(saved.nodes).some((node) => node.props.text?.includes("LOVE, IN CHAPTERS")),
  );
  for (const node of Object.values(saved.nodes))
    for (const src of [node.props.src, ...(node.props.images ?? [])])
      if (src) assert.ok(existsSync(path.join(process.cwd(), "public", src)));
});

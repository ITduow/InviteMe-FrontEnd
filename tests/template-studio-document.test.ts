import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import path from "node:path";
import brownTemplate from "../src/features/template-studio/templates/minimalism-brown.json";
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

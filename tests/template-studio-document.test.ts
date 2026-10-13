import assert from "node:assert/strict";
import test from "node:test";
import { parseStudioDocument } from "../src/features/template-studio/schemas/document";

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

import { z } from "zod";

const props = z
  .object({
    x: z.number().min(-3000).max(3000).optional(),
    y: z.number().min(-3000).max(10000).optional(),
    width: z.number().min(20).max(2000).optional(),
    height: z.number().min(20).max(10000).optional(),
    rotation: z.number().min(-3600).max(3600).optional(),
    text: z.string().max(10000).optional(),
    fontSize: z.number().min(8).max(200).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    background: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    src: z
      .enum(["/images/templates/invite-portrait.png", "/images/templates/story-meadow.png"])
      .optional(),
  })
  .strict();

const node = z
  .object({
    type: z.object({ resolvedName: z.enum(["StudioFrame", "StudioText", "StudioImage"]) }).strict(),
    isCanvas: z.boolean(),
    props,
    displayName: z.string(),
    custom: z.object({}).strict(),
    hidden: z.boolean(),
    nodes: z.array(z.string()).max(100),
    linkedNodes: z.object({}).strict(),
    parent: z.string().optional(),
  })
  .strict();

export const studioDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    nodes: z.record(z.string(), node),
  })
  .strict()
  .superRefine(({ nodes }, ctx) => {
    const root = nodes.ROOT;
    const invalid = () => ctx.addIssue({ code: "custom", message: "Cây item không hợp lệ." });
    if (
      !root ||
      root.type.resolvedName !== "StudioFrame" ||
      !root.isCanvas ||
      root.parent !== undefined ||
      Object.keys(nodes).length > 101
    ) {
      invalid();
      return;
    }
    const children = new Set(root.nodes);
    if (
      children.size !== root.nodes.length ||
      children.has("ROOT") ||
      Object.keys(nodes).length !== children.size + 1
    )
      invalid();
    for (const [id, item] of Object.entries(nodes)) {
      if (id === "ROOT") continue;
      if (
        !children.has(id) ||
        item.parent !== "ROOT" ||
        item.isCanvas ||
        item.nodes.length ||
        item.type.resolvedName === "StudioFrame"
      )
        invalid();
    }
    for (const id of children) if (!nodes[id]) invalid();
  });

export function parseStudioDocument(value: string) {
  if (value.length > 500000) throw new Error("Document quá lớn.");
  return studioDocumentSchema.parse(JSON.parse(value));
}

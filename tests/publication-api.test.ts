import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient } from "../src/core/api/api-client";
import { publishInvitationDesign, saveInvitationDesign } from "../src/features/template-studio/api/design.api";
import { templateCatalog } from "../src/features/template-studio/templates/catalog";
import { getPublicWebsite, unpublishWebsite } from "../src/features/weddings/api/website.api";

test("saving a couple design stores portable media and publishing guards both design and wording", async () => {
  const document = structuredClone(templateCatalog[0]!.document);
  const image = Object.values(document.nodes).find((node) => node.type.resolvedName === "StudioImage")!;
  const mediaPath = `/media/wedding-covers/${"a".repeat(32)}/${"b".repeat(48)}.png`;
  image.props.src = `https://localhost:7043${mediaPath}`;
  const requests: { path: string; options: Record<string, unknown> }[] = [];
  const api = { request: async (path: string, options: Record<string, unknown>) => {
    requests.push({ path, options });
    return { version: 2, document, status: "DRAFT", hasUnpublishedChanges: true, wordingVersion: 4 };
  } } as unknown as ApiClient;
  await saveInvitationDesign(api, "couple", 1, JSON.stringify(document));
  const body = requests[0]!.options.body as { expectedVersion: number; document: typeof document };
  assert.equal(body.expectedVersion, 1);
  assert.equal(Object.values(body.document.nodes).find((node) => node.type.resolvedName === "StudioImage")!.props.src, mediaPath);
  await publishInvitationDesign(api, "couple", 2, 4);
  assert.equal(requests[1]!.path, "/weddings/couple/invitation-design/publish");
  assert.deepEqual(requests[1]!.options.body, { expectedVersion: 2, expectedWordingVersion: 4 });
});

test("website unpublish guards its version and public reads stay anonymous", async () => {
  const requests: { path: string; options: Record<string, unknown> }[] = [];
  const api = { request: async (path: string, options: Record<string, unknown>) => {
    requests.push({ path, options }); return {};
  } } as unknown as ApiClient;
  await unpublishWebsite(api, "couple", 7);
  assert.deepEqual(requests[0]!.options.body, { expectedVersion: 7 });
  await getPublicWebsite(api, "minh-lan");
  assert.equal(requests[1]!.options.auth, "none");
});

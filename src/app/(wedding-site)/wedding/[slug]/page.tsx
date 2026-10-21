import { env } from "@/core/config/env";
import { publicWebsiteSchema } from "@/features/weddings";
import { PublicWebsiteClient } from "./public-website-client";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let initial;
  if (env.apiUrl) {
    try {
      const response = await fetch(`${env.apiUrl.replace(/\/$/, "")}/public/weddings/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (response.ok) initial = publicWebsiteSchema.parse(await response.json());
    } catch { /* Let the client show the API error, including locally untrusted server certificates. */ }
  }
  return <PublicWebsiteClient slug={slug} initial={initial} />;
}

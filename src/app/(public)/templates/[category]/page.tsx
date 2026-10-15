import { notFound } from "next/navigation";
import { TemplateCatalog } from "@/features/public";

import { inviteTemplates, storyTemplates } from "../invite-catalog";

export default async function TemplateCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (category !== "invite" && category !== "story") notFound();
  return (
    <TemplateCatalog
      category={category}
      inviteTemplates={inviteTemplates}
      storyTemplates={storyTemplates}
    />
  );
}

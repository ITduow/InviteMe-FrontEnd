import { TemplateStudio } from "@/features/template-studio";
import { WeddingTemplateStudio } from "@/app/_components/wedding-template-studio";
import { z } from "zod";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    template?: string;
    preview?: string;
    weddingId?: string;
    wording?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.weddingId) {
    const id = z.uuid().safeParse(params.weddingId);
    if (!id.success) return <main id="main-content">Wedding không hợp lệ.</main>;
    return (
      <WeddingTemplateStudio
        key={`${id.data}:${params.template ?? "blank"}:${params.preview ?? "0"}`}
        weddingId={id.data}
        template={params.template}
        preview={params.preview === "1"}
        wording={params.wording === "1"}
      />
    );
  }
  return (
    <TemplateStudio
      key={`${params.template ?? "blank"}:${params.preview === "1" ? "preview" : "edit"}`}
      initialTemplate={params.template ?? false}
      initialPreview={params.preview === "1"}
    />
  );
}

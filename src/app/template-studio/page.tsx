import { TemplateStudio } from "@/features/template-studio";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; preview?: string }>;
}) {
  const params = await searchParams;
  return (
    <TemplateStudio
      key={`${params.template ?? "blank"}:${params.preview === "1" ? "preview" : "edit"}`}
      initialTemplate={params.template ?? false}
      initialPreview={params.preview === "1"}
    />
  );
}

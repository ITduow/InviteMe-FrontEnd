import { notFound } from "next/navigation";
import { TemplateStudio } from "@/features/template-studio";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <TemplateStudio initialTemplate={params.template ?? false} />;
}

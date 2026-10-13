import { templateCatalog, TemplateThumbnail } from "@/features/template-studio";
export const inviteTemplates = templateCatalog.map((template) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  preview: <TemplateThumbnail document={template.document} scale={0.6} height={380} />,
}));

import {
  templateCatalog,
  storyTemplateCatalog,
  TemplateThumbnail,
} from "@/features/template-studio";
export const inviteTemplates = templateCatalog.map((template) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  preview: <TemplateThumbnail document={template.document} fluid />,
}));

export const storyTemplates = storyTemplateCatalog.map((template) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  story: true,
  preview: <TemplateThumbnail document={template.document} fluid />,
}));

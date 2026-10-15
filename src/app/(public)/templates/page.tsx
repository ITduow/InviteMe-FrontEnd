import { TemplateCatalog } from "@/features/public";

import { inviteTemplates, storyTemplates } from "./invite-catalog";

export default function TemplatesPage() {
  return <TemplateCatalog inviteTemplates={inviteTemplates} storyTemplates={storyTemplates} />;
}

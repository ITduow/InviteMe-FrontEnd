import { TemplateCatalog } from "@/features/public";

import { inviteTemplates } from "./invite-catalog";

export default function TemplatesPage() {
  return <TemplateCatalog inviteTemplates={inviteTemplates} />;
}

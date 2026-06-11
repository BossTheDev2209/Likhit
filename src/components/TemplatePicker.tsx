// src/components/TemplatePicker.tsx
import { useProject } from "../store/useProject";

export function TemplatePicker() {
  const { templates, templateId, setTemplateId } = useProject((s) => ({
    templates: s.templates, templateId: s.templateId, setTemplateId: s.setTemplateId,
  }));
  return (
    <label>
      กระดาษ (paper):{" "}
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </label>
  );
}

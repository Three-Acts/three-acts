import { MarkdownPreview } from "./markdown-preview";
import { FormField, Textarea } from "../atoms";
import type { CmsField } from "../../cms/types";
export function MarkdownControl({ field, value, onChange, readOnly }: { field: CmsField; value: string; onChange: (value: string) => void; readOnly?: boolean }) {
  return <FormField label={field.label} description={field.helpText} required={!readOnly && field.required}>
    {!readOnly ? <><p className="text-ui text-cms-muted">Markdown: # heading, **bold**, *italic*, [link](https://…), lists, &gt; quotes and fenced code.</p><Textarea aria-label={`${field.label} Markdown source`} className="min-h-60 font-mono" value={value} onChange={event => onChange(event.target.value)} /></> : null}
    <MarkdownPreview source={value} />
  </FormField>;
}

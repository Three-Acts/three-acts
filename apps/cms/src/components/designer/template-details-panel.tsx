import { X } from "lucide-react";
import { contentFields, type ContentObject, type EditorDocument } from "@three-acts/static-content";
import { FormField, IconButton, Input, PanelHeader, Textarea } from "../atoms";
import { fieldLabel } from "./drafts";

export type TemplateDetails = {
  document: EditorDocument;
  content: ContentObject;
  onChange: (path: string[], value: string | number | boolean) => void;
};

/** Template copy shares the canvas draft; collection values remain owned by CMS. */
export function TemplateDetailsPanel({ details, disabled, onClose }: {
  details: TemplateDetails;
  disabled: boolean;
  onClose: () => void;
}) {
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <PanelHeader className="h-8 shrink-0 justify-between px-2">
      <strong className="text-ui font-semibold">Page details</strong>
      <IconButton aria-label="Close page details" className="size-6" disabled={disabled} onClick={onClose}><X size={13}/></IconButton>
    </PanelHeader>
    <div className="shrink-0 border-b border-cms-line px-3 py-2">
      <h2 className="m-0 text-ui font-semibold">{details.document.label}</h2>
      <p className="mb-0 mt-1 text-ui text-cms-subtle">{details.document.route}</p>
      <p className="mb-0 mt-2 text-ui text-cms-muted">Collection fields are managed in CMS. These details apply to every page using this template.</p>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {contentFields(details.content).map((field) => {
        const id = `template-detail-${details.document.id}-${field.path.join("-")}`;
        return <FormField key={id} htmlFor={id} label={fieldLabel(field.path)} className="mb-3 gap-1">
          {typeof field.value === "boolean" ? <input id={id} type="checkbox" checked={field.value} disabled={disabled} onChange={(event) => details.onChange(field.path, event.target.checked)}/>
            : field.path.some((part) => /description/.test(part)) ? <Textarea id={id} rows={3} disabled={disabled} value={String(field.value)} onChange={(event) => details.onChange(field.path, event.target.value)}/>
              : <Input id={id} disabled={disabled} value={String(field.value)} onChange={(event) => details.onChange(field.path, typeof field.value === "number" ? Number(event.target.value) : event.target.value)}/>}
        </FormField>;
      })}
    </div>
    <p className="m-0 shrink-0 border-t border-cms-line px-3 py-2 text-ui text-cms-subtle">Changes are saved in your browser draft. Use Review &amp; push to publish to GitHub.</p>
  </div>;
}

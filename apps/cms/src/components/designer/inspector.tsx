import { useRef, useState } from "react";
import { FormField, Input, Textarea } from "../atoms";
import { contentFields, isSafeContentUrl, type ContentObject, type ContentField } from "@three-acts/static-content";
import type { CanvasSelection } from "./canvas-types";

type FieldBinding = { id: string; path: string };

function fieldForBinding(content: ContentObject | null, binding?: FieldBinding): ContentField | undefined {
  if (!content || !binding) return undefined;
  return contentFields(content).find((field) => field.path.join(".") === binding.path);
}

function safeAttributeUrl(value: string): boolean {
  return value === "" || isSafeContentUrl(value);
}

function AttributeInput({ id, value, name, disabled, onCommit }: { id: string; value: string; name: string; disabled: boolean; onCommit: (value: string) => void }) {
  const validateUrl = name === "href" || name === "src";
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const cancelBlurCommit = useRef(false);
  function commit() {
    if (cancelBlurCommit.current) { cancelBlurCommit.current = false; return; }
    if (validateUrl && !safeAttributeUrl(draft)) { setInvalid(true); return; }
    setInvalid(false);
    if (draft !== value) onCommit(draft);
  }
  return <>
    <Input id={id} value={draft} disabled={disabled} onChange={(event) => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit} onKeyDown={(event) => {
      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { cancelBlurCommit.current = true; setDraft(value); setInvalid(false); event.currentTarget.blur(); }
    }} aria-invalid={invalid || undefined} className="shadow-none"/>
    {invalid && <p role="alert" className="m-0 text-ui text-cms-danger">Enter a safe relative or http, mailto, or tel URL.</p>}
  </>;
}

function NumericField({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const cancelCommit = useRef(false);
  function commit() {
    if (cancelCommit.current) { cancelCommit.current = false; return; }
    const number = Number(draft);
    if (!draft.trim() || !Number.isFinite(number)) { setInvalid(true); return; }
    setInvalid(false);
    setDraft(String(number));
    if (number !== value) onChange(number);
  }
  return <>
    <Input id="selected-text" inputMode="decimal" value={draft} disabled={disabled} aria-invalid={invalid || undefined} className="shadow-none" onChange={(event) => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit} onKeyDown={(event) => {
      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { cancelCommit.current = true; setDraft(String(value)); setInvalid(false); event.currentTarget.blur(); }
    }}/>
    {invalid && <p role="alert" className="m-0 text-ui text-cms-danger">Enter a valid number.</p>}
  </>;
}

export function Inspector({ content, canvasSelection, onChange, resolveField, disabled }: {
  content: ContentObject | null;
  selected?: string | null;
  canvasSelection?: CanvasSelection | null;
  onChange: (field: ContentField, value: string | number | boolean, documentId?: string) => void;
  resolveField?: (binding: FieldBinding) => ContentField | undefined;
  disabled: boolean;
}) {
  const textBinding = canvasSelection?.textField;
  const textField = textBinding ? resolveField ? resolveField(textBinding) : fieldForBinding(content, textBinding) : undefined;
  const selectedField = textField;

  return (
    <aside aria-label="Content inspector" className="flex min-h-0 w-full flex-1 flex-col bg-cms-bg">
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {!canvasSelection ? (
          <div className="grid gap-0.5 py-1">
            <h3 className="m-0 text-ui font-medium text-cms-text">Select something to edit</h3>
            <p className="m-0 text-ui leading-4 text-cms-subtle">Click an element on the canvas to inspect its saved content.</p>
          </div>
        ) : (
          <div className="grid content-start gap-3">
            <section aria-label={selectedField ? "Text content" : "Element details"} className="grid gap-1">
              {!selectedField && <h3 className="m-0 text-ui font-medium text-cms-text">{canvasSelection.category === "cms" ? "CMS field" : canvasSelection.category === "component" ? "Component" : "Element"}</h3>}
              {selectedField ? (
                <FormField className="mb-0 gap-1" htmlFor="selected-text" label="Text">
                  {typeof selectedField.value === "number" ? (
                    <NumericField key={`${selectedField.path.join(".")}:${selectedField.value}`} value={selectedField.value} disabled={disabled} onChange={(value) => onChange(selectedField, value, textBinding?.id)}/>
                  ) : typeof selectedField.value === "boolean" ? (
                    <input id="selected-text" type="checkbox" checked={selectedField.value} disabled={disabled} onChange={(event) => onChange(selectedField, event.target.checked, textBinding?.id)} className="size-4 accent-cms-accent"/>
                  ) : (
                    <Textarea id="selected-text" rows={String(selectedField.value).length > 120 ? 6 : 2} value={String(selectedField.value)} disabled={disabled} onChange={(event) => onChange(selectedField, event.target.value, textBinding?.id)} className="resize-y shadow-none"/>
                  )}
                </FormField>
              ) : canvasSelection.category === "cms" ? (
                <p className="m-0 text-ui leading-4 text-cms-subtle">This CMS content is read-only in the designer. Edit its source in the CMS workspace.</p>
              ) : canvasSelection.textState === "structured" ? (
                <p className="m-0 text-ui leading-4 text-cms-subtle">This element contains structured content that cannot be safely edited as one text field.</p>
              ) : canvasSelection.textState === "empty" ? (
                <p className="m-0 text-ui leading-4 text-cms-subtle">This element has no direct text content.</p>
              ) : (
                <p className="m-0 text-ui leading-4 text-cms-subtle">This text is not connected to a saved content field.</p>
              )}
              {selectedField && <p className="m-0 text-ui leading-4 text-cms-subtle">Changes are saved in your draft until you push.</p>}
            </section>

            {canvasSelection.attributes?.length ? <section aria-label="Element attributes" className="grid gap-2">
              <h3 className="m-0 text-ui font-medium text-cms-text">Attributes</h3>
              {canvasSelection.attributes.map((attribute) => {
                const field = attribute.binding ? resolveField ? resolveField(attribute.binding) : fieldForBinding(content, attribute.binding) : undefined;
                const id = `attribute-${attribute.name}`;
                return <FormField key={attribute.name} className="mb-0 gap-1" htmlFor={id} label={attribute.name}>
                  {field && typeof field.value === "string" ? <AttributeInput key={`${attribute.name}:${field.value}`} id={id} name={attribute.name} value={field.value} disabled={disabled} onCommit={(value) => onChange(field, value, attribute.binding?.id)}/> : <Input id={id} value={attribute.value} disabled readOnly className="shadow-none"/>}
                  {!field && <p className="m-0 text-ui leading-4 text-cms-subtle">Read-only: this attribute is not connected to a saved content field.</p>}
                  {field && typeof field.value !== "string" && <p className="m-0 text-ui leading-4 text-cms-subtle">This attribute has a non-text saved value and is read-only here.</p>}
                </FormField>;
              })}
            </section> : null}
          </div>
        )}
      </div>
    </aside>
  );
}

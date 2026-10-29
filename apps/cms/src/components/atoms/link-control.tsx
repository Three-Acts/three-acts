import { useId, useState } from "react";
import { File, FileText, Heading, Layers, Link2, Mail, Phone } from "lucide-react";
import type { LinkField, LinkType, LinkValue } from "../../cms/types";
import { normalizeLinkHref, parseLinkValue, resolveLinkValue, serializeFileValue, serializeLinkValue, validateLinkValue } from "../../cms/types";
import { Button } from "./button";
import { FormField } from "./form-field";
import { Input } from "./input";
import { FileControl } from "./media-controls";
import { Select, type SelectOption } from "./select";

const iconProps = { "aria-hidden": true, size: 13 } as const;
const typeOptions: Array<SelectOption & { value: LinkType }> = [
  { value: "url", label: "URL", icon: <Link2 {...iconProps} /> },
  { value: "page", label: "Page", icon: <FileText {...iconProps} /> },
  { value: "collection", label: "Collection page", icon: <Layers {...iconProps} /> },
  { value: "section", label: "Page section", icon: <Heading {...iconProps} /> },
  { value: "email", label: "Email", icon: <Mail {...iconProps} /> },
  { value: "phone", label: "Phone", icon: <Phone {...iconProps} /> },
  { value: "file", label: "File", icon: <File {...iconProps} /> }
];

type LinkControlProps = {
  field: LinkField;
  value: string;
  onChange: (value: string) => void;
  onFile: (file: File) => void;
  isUploading: boolean;
  readOnly?: boolean;
  inputId: string;
};

export function LinkControl({ field, value, onChange, onFile, isUploading, readOnly, inputId }: LinkControlProps) {
  const radioName = useId();
  const descriptionId = useId();
  const [touched, setTouched] = useState(false);
  const parsed = parseLinkValue(value);
  const link: LinkValue = parsed ?? { type: "url", href: "", target: "_self" };
  const resolved = resolveLinkValue(link, field) ?? link;
  const validation = validateLinkValue(value, { field, allowLocalBlob: true });
  const missingDestination = (link.type === "page" || link.type === "section" || link.type === "collection") && Boolean(link.destinationId || link.recordId);
  const error = touched || missingDestination || (!parsed && value.trim()) ? validation : null;
  const typeOption = typeOptions.find((option) => option.value === link.type);
  const navigable = link.type !== "email" && link.type !== "phone";
  const catalog = link.type === "page" ? field.pages : link.type === "section" ? field.sections : undefined;
  const collection = field.collections?.find((item) => item.id === link.collectionId);

  function update(next: Partial<LinkValue>) {
    onChange(serializeLinkValue({ ...link, ...next }));
  }

  function changeType(type: LinkType) {
    setTouched(false);
    onChange(serializeLinkValue({ type, href: "", target: type === "email" || type === "phone" ? "_self" : link.target ?? "_self" }));
  }

  function destinationInput(label: string, placeholder: string, type: "text" | "email" | "tel" = "text") {
    const display = link.type === "email" ? link.href.replace(/^mailto:/i, "") : link.type === "phone" ? link.href.replace(/^tel:/i, "") : link.href;
    return (
      <FormField className="mb-0" label={label} required={field.required}>
        <Input
          inputMode={type === "text" ? "url" : type}
          onBlur={(event) => {
            setTouched(true);
            const href = link.type === "email" ? `mailto:${event.target.value.replace(/^mailto:/i, "")}` : link.type === "phone" ? `tel:${event.target.value.replace(/^tel:/i, "")}` : event.target.value;
            const invalid = validateLinkValue({ ...link, href }, { field, allowLocalBlob: true });
            update({ href: invalid ? href : normalizeLinkHref(link.type, href) });
          }}
          onChange={(event) => update({ href: link.type === "email" ? `mailto:${event.target.value}` : link.type === "phone" ? `tel:${event.target.value}` : event.target.value })}
          placeholder={placeholder}
          type={type}
          value={display}
        />
      </FormField>
    );
  }

  const destinationLabel = catalog?.find((option) => option.id === link.destinationId)?.label
    ?? collection?.items.find((option) => option.id === link.recordId)?.label
    ?? link.fileName;

  return (
    <fieldset aria-describedby={field.helpText ? descriptionId : undefined} className="mb-4 min-w-0 border-0 p-0 last:mb-0">
      <legend className="mb-1.5 flex items-center gap-1 text-ui font-medium text-cms-muted">
        {field.label}{field.required && !readOnly ? <span aria-hidden="true" className="text-cms-danger">*</span> : null}
      </legend>
      {field.helpText ? <p className="mb-2 mt-0 text-ui text-cms-subtle" id={descriptionId}>{field.helpText}</p> : null}

      <div className="grid min-w-0 gap-3 rounded-cms border border-cms-line-strong bg-cms-surface p-3">
        {readOnly ? (
          <>
            <div className="flex items-center gap-1.5 text-ui text-cms-muted">{typeOption?.icon}{typeOption?.label}{navigable && link.target === "_blank" ? <span className="ml-auto text-cms-subtle">New tab</span> : null}</div>
            {destinationLabel ? <p className="m-0 text-ui font-medium text-cms-text">{destinationLabel}</p> : null}
            <p className="m-0 wrap-anywhere font-mono text-field text-cms-muted">{resolved.href || "No link"}</p>
            {validation ? <p className="m-0 text-ui text-cms-danger" role="alert">{validation}</p> : null}
          </>
        ) : (
          <>
            <FormField className="mb-0" label="Type">
              <Select disabled={isUploading} onValueChange={(next) => changeType(next as LinkType)} options={typeOptions} value={link.type} />
            </FormField>

            {link.type === "url" ? destinationInput("URL", "https://example.com or /about") : null}
            {link.type === "email" ? destinationInput("Email address", "hello@example.com", "email") : null}
            {link.type === "phone" ? destinationInput("Phone number", "+27 21 555 0123", "tel") : null}

            {link.type === "page" || link.type === "section" ? (
              catalog?.length ? (
                <FormField className="mb-0" label={link.type === "page" ? "Page" : "Section"} required={field.required}>
                  <Select
                    onValueChange={(id) => {
                      setTouched(true);
                      update({ destinationId: id || undefined, href: catalog.find((option) => option.id === id)?.href ?? "" });
                    }}
                    options={[{ value: "", label: link.type === "page" ? "Choose a page…" : "Choose a section…" }, ...catalog.map((option) => ({ value: option.id, label: option.label }))]}
                    value={link.destinationId ?? ""}
                  />
                </FormField>
              ) : (
                <div className="grid justify-items-start gap-2 text-ui text-cms-muted">
                  <p className="m-0">No {link.type === "page" ? "pages" : "sections"} are available to choose.</p>
                  <Button onClick={() => changeType("url")}>Enter a URL instead</Button>
                </div>
              )
            ) : null}

            {link.type === "collection" ? (
              field.collections?.length ? (
                <>
                  <FormField className="mb-0" label="Collection">
                    <Select
                      onValueChange={(id) => {
                        setTouched(false);
                        update({ collectionId: id || undefined, recordId: undefined, href: "" });
                      }}
                      options={[{ value: "", label: "Choose a collection…" }, ...field.collections.map((option) => ({ value: option.id, label: option.label }))]}
                      value={link.collectionId ?? ""}
                    />
                  </FormField>
                  <FormField className="mb-0" label="Item" required={field.required}>
                    <Select
                      disabled={!collection || collection.items.length === 0}
                      onValueChange={(id) => {
                        setTouched(true);
                        update({ recordId: id || undefined, href: collection?.items.find((option) => option.id === id)?.href ?? "" });
                      }}
                      options={[{ value: "", label: !collection ? "Choose a collection first" : collection.items.length ? "Choose an item…" : "No items available" }, ...(collection?.items ?? []).map((option) => ({ value: option.id, label: option.label }))]}
                      value={link.recordId ?? ""}
                    />
                  </FormField>
                </>
              ) : (
                <div className="grid justify-items-start gap-2 text-ui text-cms-muted">
                  <p className="m-0">No collections are available to choose.</p>
                  <Button onClick={() => changeType("url")}>Enter a URL instead</Button>
                </div>
              )
            ) : null}

            {link.type === "file" ? (
              field.bucket ? (
                <FormField className="mb-0" label="File" required={field.required}>
                  <FileControl
                    field={{ type: "file", key: field.key, label: field.label, bucket: field.bucket, accept: field.accept }}
                    inputId={`${inputId}-file`}
                    isUploading={isUploading}
                    onClear={() => update({ href: "", fileName: undefined, size: undefined, contentType: undefined })}
                    onFile={onFile}
                    value={serializeFileValue(link.href ? { src: link.href, fileName: link.fileName, size: link.size, contentType: link.contentType } : null)}
                  />
                </FormField>
              ) : destinationInput("File URL", "https://example.com/document.pdf")
            ) : null}

            {navigable ? (
              <div className="grid gap-1.5">
                <span className="text-ui font-medium text-cms-muted" id={`${radioName}-label`}>Open in</span>
                <div aria-labelledby={`${radioName}-label`} className="grid grid-cols-2 gap-0.5 rounded-cms border border-cms-line-strong bg-cms-bg p-0.5" role="radiogroup">
                  {([{ value: "_self", label: "This tab" }, { value: "_blank", label: "New tab" }] as const).map((option) => (
                    <label className="min-w-0 cursor-pointer" key={option.value}>
                      <input checked={(link.target ?? "_self") === option.value} className="peer sr-only" disabled={isUploading} name={radioName} onChange={() => update({ target: option.value })} type="radio" value={option.value} />
                      <span className="flex min-h-6 items-center justify-center rounded-cms-sm px-2 text-ui text-cms-muted peer-checked:bg-cms-raised peer-checked:text-cms-text peer-focus-visible:outline-2 peer-focus-visible:outline-solid peer-focus-visible:outline-cms-accent">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="m-0 text-ui text-cms-danger" role="alert">{error}</p> : null}
            {resolved.href && !validation ? (
              <div className="flex min-w-0 items-start gap-1.5 border-t border-cms-line-strong pt-2 text-cms-subtle">
                <Link2 aria-hidden="true" className="mt-0.5 shrink-0" size={12} />
                <span className="min-w-0 wrap-anywhere font-mono text-micro">{resolved.href}</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </fieldset>
  );
}

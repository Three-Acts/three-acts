import { useEffect, useRef, useState } from "react";
import { moveValue, parseMultipleValue, parseObjectValue, parseImageGallery, parseImageValue, serializeImageGallery, type CmsField, type CmsRecordValue } from "../../cms/types";
import { getImageDimensions } from "../../lib/image-dimensions";
import { useCmsBackend } from "../../cms/backend-context";
import { FormField } from "../atoms";
import { FieldControl, type FieldControlProps } from "./field-control";

function emptyValue(field: CmsField): CmsRecordValue {
  if (field.type === "object") return JSON.stringify({ id: crypto.randomUUID(), values: {} });
  return field.type === "boolean" ? false : "";
}
export function StructuredControl(props: FieldControlProps) {
  const { field, record, onUpdateValue, readOnly, collectionId, schemaPath = field.key } = props;
  const { storage } = useCmsBackend();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef({ active: true });
  useEffect(() => { const scope = { active: true }; alive.current = scope; return () => { scope.active = false; }; }, [record.id]);
  const multiple = field.cardinality === "multiple";
  let items: CmsRecordValue[] = [];
  let parseError = "";
  try { items = multiple ? parseMultipleValue(record.values[field.key]) : record.values[field.key] ? [record.values[field.key]] : []; }
  catch (e) { parseError = e instanceof Error ? e.message : String(e); }
  const single = { ...field, cardinality: "single" as const, required: field.itemRequired };
  function change(next: CmsRecordValue[]) { onUpdateValue(field.key, multiple ? JSON.stringify(next) : next[0] ?? ""); }
  function update(index: number, value: CmsRecordValue) { change(items.map((item, i) => i === index ? value : item)); }
  const disabled = readOnly || busy;
  return <FormField label={field.label} description={field.helpText} required={!readOnly && field.required}>
    {parseError || error ? <p role="alert">{parseError || error}</p> : null}
    {busy ? <p role="status">Uploading…</p> : null}
    {items.map((raw, index) => {
      let children: Array<{ field: CmsField; value: CmsRecordValue }>;
      let identity = `${record.id}-${field.key}-${index}`;
      if (field.type === "object") {
        let item;
        try { item = parseObjectValue(raw); } catch { return <p key={index} role="alert">Invalid structured item {index + 1}.</p>; }
        if (!item) return null;
        identity = item.id;
        children = field.fields.map(child => ({ field: child, value: item.values[child.key] }));
      } else children = [{ field: single, value: raw }];
      return <fieldset key={identity} disabled={busy} className="grid gap-3 rounded-cms border border-cms-line-strong p-3">
        <legend>{field.label}{multiple ? ` ${index + 1}` : ""}</legend>
        {children.map(({ field: child, value }) => {
          const path = field.type === "object" ? `${schemaPath}.${child.key}` : schemaPath;
          const commit = (next: CmsRecordValue) => {
            if (field.type === "object") {
              const item = parseObjectValue(raw)!;
              update(index, JSON.stringify({ ...item, values: { ...item.values, [child.key]: next } }));
            } else update(index, next);
          };
          async function upload(uploadField: CmsField, file: File): Promise<string> {
            if (!collectionId) throw new Error("Collection unavailable for upload.");
            const [result, dimensions] = await Promise.all([storage.uploadAsset(collectionId, path, file), uploadField.type === "image" ? getImageDimensions(file) : Promise.resolve(null)]);
            if (uploadField.type === "asset") return result.url;
            const metadata = { fileName: result.fileName, size: result.size, contentType: file.type, ...(dimensions ?? {}), ...(uploadField.type === "image" ? { alt: parseImageValue(value)?.alt } : {}) };
            return JSON.stringify(uploadField.type === "link" ? { type: "file", href: result.url, ...metadata } : { src: result.url, ...metadata });
          }
          async function runUpload(task: () => Promise<CmsRecordValue>) {
            const scope = alive.current;
            setBusy(true); setError("");
            try { const next = await task(); if (scope.active) commit(next); }
            catch (e) { if (scope.active) setError(e instanceof Error ? e.message : String(e)); }
            finally { if (scope.active) setBusy(false); }
          }
          return <FieldControl key={child.key} {...props} schemaPath={path} referenceExcludedIds={field.type === "reference" ? items.filter((_, i) => i !== index).map(String) : undefined} field={child} readOnly={disabled} record={{ ...record, id: `${record.id}-${identity}`, values: { [child.key]: value } }} onUpdateValue={(_, next) => commit(next)}
            onAssetUpload={(uploadField, file) => { void runUpload(() => upload(uploadField, file)); }}
            onGalleryUpload={(_, files) => { void runUpload(async () => serializeImageGallery([...parseImageGallery(value), ...await Promise.all(files.map(async file => JSON.parse(await upload({ ...child, type: "image" } as CmsField, file))))])); }}
            onGalleryItemUpload={(_, itemIndex, file) => { void runUpload(async () => { const gallery = parseImageGallery(value); gallery[itemIndex] = JSON.parse(await upload({ ...child, type: "image" } as CmsField, file)); return serializeImageGallery(gallery); }); }} />;
        })}
        {!readOnly ? <div className="flex gap-3">
          <button type="button" disabled={busy} onClick={() => change(items.filter((_, i) => i !== index))}>Remove {multiple ? `item ${index + 1}` : field.label}</button>
          {multiple ? <><button type="button" disabled={busy || index === 0} onClick={() => change(moveValue(items, index, index - 1))}>Move up</button><button type="button" disabled={busy || index === items.length - 1} onClick={() => change(moveValue(items, index, index + 1))}>Move down</button></> : null}
        </div> : null}
      </fieldset>;
    })}
    {!readOnly && !parseError && (multiple || !items.length) ? <button type="button" disabled={busy || (field.maxItems !== undefined && items.length >= field.maxItems)} onClick={() => change([...items, emptyValue(single)])}>Add {field.label}</button> : null}
  </FormField>;
}

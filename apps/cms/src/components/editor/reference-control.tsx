import { useEffect, useState } from "react";
import { useCmsBackend } from "../../cms/backend-context";
import { collectionRegistry } from "../../cms/types";
import type { CmsRecord, ReferenceField } from "../../cms/types";
import { FormField } from "../atoms";

export function ReferenceControl({ field, value, onChange, readOnly, excludedIds = [] }: { field: ReferenceField; value: string; onChange: (value: string) => void; readOnly?: boolean; excludedIds?: string[] }) {
  const { data } = useCmsBackend();
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading references…");
  useEffect(() => {
    let active = true;
    data.listRecords(field.collectionId, {}).then(result => { if (active) { setItems(result.records); setStatus(""); } }).catch(() => { if (active) setStatus("Unable to load references. Try reopening this record."); });
    return () => { active = false; };
  }, [data, field.collectionId]);
  const titleKey = collectionRegistry.find(item => item.id === field.collectionId)?.titleField ?? "name";
  const title = (item: CmsRecord) => String(item.values[titleKey] || item.values.name || item.values.title || item.id);
  const filtered = items.filter(item => item.id === value || (!excludedIds.includes(item.id) && title(item).toLowerCase().includes(query.toLowerCase())));
  return <FormField label={field.label} description={field.helpText} required={!readOnly && field.required}>
    {status ? <p role="status">{status}</p> : null}
    {value && !status && !items.some(item => item.id === value) ? <p role="alert">Missing or deleted item ({value}). Choose another item or clear this reference.</p> : null}
    {!readOnly ? <input aria-label={`Search ${field.label}`} placeholder="Search items…" value={query} onChange={event => setQuery(event.target.value)} /> : null}
    <select aria-label={field.label} disabled={readOnly || Boolean(status)} value={value} onChange={event => onChange(event.target.value)}>
      <option value="">Select…</option>
      {value && !items.some(item => item.id === value) ? <option value={value}>Missing item ({value})</option> : null}
      {filtered.map(item => <option key={item.id} value={item.id}>{title(item)}</option>)}
    </select>
  </FormField>;
}

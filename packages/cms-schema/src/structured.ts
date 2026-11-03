import { CmsError } from "./errors";
import type { CmsField, CmsRecordValue } from "./types";

export type ObjectValue = { id: string; values: Record<string, CmsRecordValue> };
function invalid(message: string): never { throw new CmsError("validation", message); }
function decode(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { return invalid("Structured value must be valid JSON."); }
}
export function parseMultipleValue(raw: unknown): CmsRecordValue[] {
  if (raw === "" || raw === null || raw === undefined) return [];
  const value = decode(raw);
  if (!Array.isArray(value) || value.some(item => item !== null && !["string", "number", "boolean"].includes(typeof item))) return invalid("Multiple values must be a JSON array of CMS values.");
  return value;
}
export function parseObjectValue(raw: unknown): ObjectValue | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  const value = decode(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("Object value must be a structured item.");
  const item = value as ObjectValue;
  if (typeof item.id !== "string" || !item.id || !item.values || typeof item.values !== "object" || Array.isArray(item.values)) return invalid("Structured items need stable identity and named values.");
  if (Object.values(item.values).some(v => v !== null && !["string", "number", "boolean"].includes(typeof v))) return invalid("Object children must use CMS primitive values.");
  return item;
}
export function moveValue<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [item] = next.splice(from, 1); next.splice(to, 0, item); return next;
}
/** Schema paths omit item identity: uploads share the configured primitive contract. */
export function resolveFieldPath(fields: CmsField[], path: string): CmsField | undefined {
  const [key, ...rest] = path.split(".");
  const field = fields.find(item => item.key === key);
  if (!field || !rest.length) return field;
  return field.type === "object" ? resolveFieldPath(field.fields, rest.join(".")) : undefined;
}

/** Preserve protected children by stable object identity, including after a reorder. */
export function preserveReadOnlyChildren(field: CmsField, raw: CmsRecordValue, existing: CmsRecordValue): CmsRecordValue {
  if (field.type !== "object") return raw;
  if (field.cardinality === "multiple") {
    const previous = new Map(parseMultipleValue(existing).map(value => { const item = parseObjectValue(value); return [item?.id, value]; }));
    return JSON.stringify(parseMultipleValue(raw).map(value => preserveReadOnlyChildren({ ...field, cardinality: "single" }, value, previous.get(parseObjectValue(value)?.id))));
  }
  const item = parseObjectValue(raw);
  if (!item) return raw;
  const old = parseObjectValue(existing);
  const values = { ...item.values };
  for (const child of field.fields) {
    const prior = old?.id === item.id ? old.values[child.key] : undefined;
    values[child.key] = child.readOnly || child.type === "readonly" ? prior ?? "" : preserveReadOnlyChildren(child, values[child.key], prior);
  }
  return JSON.stringify({ ...item, values });
}

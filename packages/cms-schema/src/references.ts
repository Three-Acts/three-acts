import { CmsError } from "./errors";
import { parseMultipleValue, parseObjectValue } from "./structured";
import type { CmsField, CmsRecord, CmsRecordValue } from "./types";

/** Walk the same schema for top-level, repeated and composed relationships. */
export async function validateReferences(fields: CmsField[], values: Record<string, CmsRecordValue>, exists: (collectionId: string, id: string) => Promise<boolean>): Promise<void> {
  for (const field of fields) {
    const items = field.cardinality === "multiple" ? parseMultipleValue(values[field.key]) : [values[field.key]];
    for (const raw of items) {
      if (field.type === "object") {
        const item = parseObjectValue(raw);
        if (item) await validateReferences(field.fields, item.values, exists);
      } else if (field.type === "reference" && raw) {
        if (typeof raw !== "string" || !(await exists(field.collectionId, raw))) throw new CmsError("validation", `${field.label}: referenced record is missing. Choose another item.`, { details: { field: field.key } });
      }
    }
  }
}
/** Preserve saved order; null explicitly represents a missing/deleted destination. */
export async function resolveReferences(ids: string[], get: (id: string) => Promise<CmsRecord | null>): Promise<Array<CmsRecord | null>> { return Promise.all(ids.map(get)); }

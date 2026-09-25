import type { CmsCollection, CmsCollectionSummary, CmsRecord, CmsRecordValue, CollectionMode } from "../cms/types";
import { canCreateRecords, recordSourceFor } from "../cms/types";

export function getRecordTitle(collection: CmsCollectionSummary, record: CmsRecord) {
  const titleKey = collection.titleField ?? "name";
  // A brand-new or imported record can have an empty title; show a readable
  // placeholder rather than a blank cell or a raw UUID.
  const fallback = record.values.name || record.values.title || "Untitled";

  return String(record.values[titleKey] || fallback);
}

export function getCollectionMode(collection: CmsCollection): CollectionMode {
  return collection.mode ?? "editorial";
}

/** Editors can change field values, create records, and import. */
export function isEditable(collection: CmsCollection) {
  return getCollectionMode(collection) !== "readonly";
}

/** Records carry a Publish Status and publish controls. */
export function hasPublishWorkflow(collection: CmsCollection) {
  return getCollectionMode(collection) === "editorial";
}

/** Whether editors may create or import records in this collection (New / Import / Duplicate). False for site-sourced collections. */
export function canCreate(collection: CmsCollection): boolean {
  return canCreateRecords(collection);
}

/** Where this collection's records come from — see `RecordSource`. */
export function recordSource(collection: CmsCollection) {
  return recordSourceFor(collection);
}

/**
 * Per-collection copy explaining where a site-sourced collection's records
 * come from, keyed by collection id. Any site-sourced collection not listed
 * here falls back to a generic sentence built from its label.
 */
const SITE_SOURCE_COPY: Record<string, string> = {
  orders: "Orders are created when a shopper checks out on the site.",
  customers: "Customers appear when they sign up or check out on the site.",
  "form-submissions": "Submissions arrive from the site's forms."
};

/**
 * Explains where a collection's records come from, for the empty state and
 * toolbar copy of a collection editors can't create records in. `null` for
 * an editor-created collection — there's nothing to explain.
 */
export function sourceDescription(collection: CmsCollection): string | null {
  if (recordSourceFor(collection) !== "site") {
    return null;
  }

  return SITE_SOURCE_COPY[collection.id] ?? `${collection.label} are created by the site, not in the CMS.`;
}

/**
 * Initial values seeded when an editor creates a record, keyed by collection
 * id — e.g. a product review added in the CMS defaults to "manual" so it
 * reads apart from ones the site's checkout/review flow submits. Only keys
 * that are actually fields on the collection are applied, so a registry
 * change can't silently seed an unknown key.
 */
const CREATE_DEFAULTS: Record<string, Record<string, CmsRecordValue>> = {
  "product-reviews": { source: "manual" }
};

export function createDefaultsFor(collection: CmsCollection): Record<string, CmsRecordValue> {
  const defaults = CREATE_DEFAULTS[collection.id];

  if (!defaults) {
    return {};
  }

  const fieldKeys = new Set(collection.fields.map((field) => field.key));
  return Object.fromEntries(Object.entries(defaults).filter(([key]) => fieldKeys.has(key)));
}

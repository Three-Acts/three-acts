import { CmsError } from "./errors";
import { parseLinkValue, resolveLinkValue, serializeLinkValue, validateLinkValue } from "./links";
import { parseFileValue, parseVideoValue, serializeFileValue, serializeVideoValue } from "./files";
import { parseImageGallery, parseImageValue, serializeImageGallery, serializeImageValue } from "./images";
import { parseSchemaMarkup } from "./schema-markup";
import type { CmsField, CmsRecordValue, ImageGalleryField, LinkField, SelectField } from "./types";
import { parseMultipleValue, parseObjectValue } from "./structured";
function validationError(field: CmsField, message: string): CmsError {
  return new CmsError("validation", message, { details: { field: field.key } });
}

export function validateFieldValue(field: CmsField, raw: CmsRecordValue, enforceRequired: boolean): CmsRecordValue {
  if (field.cardinality === "multiple") {
    const items = parseMultipleValue(raw);
    if (enforceRequired && ((field.required && !items.length) || (field.minItems !== undefined && items.length < field.minItems) || (field.maxItems !== undefined && items.length > field.maxItems))) throw validationError(field, `${field.label} has an invalid item count.`);
    if (field.type === "object") {
      const ids = items.map(item => parseObjectValue(item)?.id);
      if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw validationError(field, `${field.label} has duplicate item identities.`);
    }
    const single = { ...field, cardinality: "single" as const, required: field.itemRequired };
    const normalized = items.map((item, index) => {
      try {
        const value = validateFieldValue(single, item, enforceRequired);
        if (["image", "video", "file"].includes(field.type) && item && (!value || (typeof item === "string" && !item.trim().startsWith("{") && !/^(https?:\/\/|\/|blob:)/.test(item)))) throw validationError(field, `${field.label} contains invalid media.`);
        return value;
      }
      catch (error) { throw validationError(field, `${field.label}, item ${index + 1}: ${error instanceof Error ? error.message : String(error)}`); }
    });
    if (field.type === "reference" && new Set(normalized).size !== normalized.length) throw validationError(field, `${field.label} cannot contain duplicate references.`);
    return JSON.stringify(normalized);
  }
  switch (field.type) {
    case "object": {
      const item = parseObjectValue(raw);
      if (!item) {
        if (enforceRequired && field.required) throw validationError(field, `${field.label} is required.`);
        return "";
      }
      const values: Record<string, CmsRecordValue> = {};
      for (const child of field.fields) values[child.key] = validateFieldValue(child, item.values[child.key], enforceRequired);
      return JSON.stringify({ id: item.id, values });
    }
    case "reference": {
      if (raw === "" || raw === null || raw === undefined) {
        if (enforceRequired && field.required) throw validationError(field, `${field.label} is required.`);
        return "";
      }
      if (typeof raw !== "string" || !raw.trim()) throw validationError(field, `${field.label} must contain a record ID.`);
      return raw;
    }
    case "markdown":
    case "text":
    case "textarea":
    case "slug":
    case "asset": {
      const text = raw === null || raw === undefined ? "" : String(raw);
      if (enforceRequired && field.required && !text.trim()) {
        throw validationError(field, `${field.label} is required.`);
      }
      // Schema markup fields must hold valid JSON-LD on every save, drafts
      // included: a malformed value is a format error, not a missing one.
      if ((field.type === "text" || field.type === "textarea") && field.format === "json-ld") {
        const markup = parseSchemaMarkup(text);
        if (!markup.ok) {
          throw validationError(field, markup.error);
        }
      }
      // `format: "json"` fields (e.g. an order's line items) hold any JSON
      // value, not just an object/array-of-objects like json-ld: "" is valid
      // (nothing yet), anything else must parse.
      if ((field.type === "text" || field.type === "textarea") && field.format === "json" && text.trim()) {
        try {
          JSON.parse(text);
        } catch (parseError) {
          const detail = parseError instanceof Error && parseError.message ? ` (${parseError.message})` : "";
          throw validationError(field, `${field.label} is not valid JSON${detail}.`);
        }
      }
      return text;
    }
    case "image": {
      // Single typed image: stored as an ImageValue JSON string, read back
      // leniently so legacy plain-URL rows keep validating.
      const parsed = parseImageValue(raw);
      if (enforceRequired && field.required && !parsed) {
        throw validationError(field, `${field.label} is required.`);
      }
      return serializeImageValue(parsed);
    }
    case "video": {
      // Single typed video: stored as a VideoValue JSON string, read back
      // leniently so legacy plain-URL rows keep validating. Uploads only —
      // there is no external-URL input, so a value without a src is empty.
      const parsed = parseVideoValue(raw);
      if (enforceRequired && field.required && !parsed) {
        throw validationError(field, `${field.label} is required.`);
      }
      return serializeVideoValue(parsed);
    }
    case "file": {
      // Single typed file: stored as a FileValue JSON string, read back
      // leniently so legacy plain-URL rows keep validating.
      const parsed = parseFileValue(raw);
      if (enforceRequired && field.required && !parsed) {
        throw validationError(field, `${field.label} is required.`);
      }
      return serializeFileValue(parsed);
    }
    case "link": {
      const linkField = field as LinkField;
      const error = validateLinkValue(raw, { field: linkField, required: enforceRequired && field.required });
      if (error) throw validationError(field, error);
      const parsed = parseLinkValue(raw);
      return serializeLinkValue(parsed ? resolveLinkValue(parsed, linkField) : null);
    }
    case "image-gallery": {
      // Ordered gallery: stored as an ImageValue[] JSON string. Like
      // `required`, `minItems`/`maxItems` gate publishing, not drafting.
      const items = parseImageGallery(raw);
      if (enforceRequired) {
        const galleryField = field as ImageGalleryField;
        if (field.required && items.length === 0) {
          throw validationError(field, `${field.label} is required.`);
        }
        if (galleryField.minItems !== undefined && items.length > 0 && items.length < galleryField.minItems) {
          throw validationError(field, `${field.label} needs at least ${galleryField.minItems} image(s).`);
        }
        if (galleryField.maxItems !== undefined && items.length > galleryField.maxItems) {
          throw validationError(field, `${field.label} accepts at most ${galleryField.maxItems} image(s).`);
        }
      }
      return serializeImageGallery(items);
    }
    case "number": {
      if (raw === "" || raw === null || raw === undefined) {
        if (enforceRequired && field.required) {
          throw validationError(field, `${field.label} is required.`);
        }
        return 0;
      }
      const num = typeof raw === "number" ? raw : Number(raw);
      if (typeof raw === "boolean" || !Number.isFinite(num)) {
        throw validationError(field, `${field.label} must be a number.`);
      }
      return num;
    }
    case "boolean": {
      if (typeof raw === "boolean") {
        return raw;
      }
      if (raw === null || raw === undefined) {
        return false;
      }
      throw validationError(field, `${field.label} must be true or false.`);
    }
    case "select": {
      const text = raw === null || raw === undefined ? "" : String(raw);
      if (!text) {
        if (enforceRequired && field.required) {
          throw validationError(field, `${field.label} is required.`);
        }
        return "";
      }
      const selectField = field as SelectField;
      if (!selectField.options.some((option) => option.value === text)) {
        throw validationError(field, `${field.label} must be one of the configured options.`);
      }
      return text;
    }
    case "datetime": {
      const text = raw === null || raw === undefined ? "" : String(raw).trim();
      if (!text) {
        if (enforceRequired && field.required) {
          throw validationError(field, `${field.label} is required.`);
        }
        return "";
      }
      const parsed = Date.parse(text);
      if (Number.isNaN(parsed)) {
        throw validationError(field, `${field.label} must be a valid date/time.`);
      }
      return new Date(parsed).toISOString();
    }
    default:
      return raw ?? "";
  }
}

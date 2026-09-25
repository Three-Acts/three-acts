import { collectionRegistry } from "@three-acts/cms-schema";
import { formTypes } from "./models";

const FORM_SUBMISSIONS_COLLECTION_ID = "form-submissions";
const FORM_FIELD_KEY = "form";

export type RegistryFormFieldCheck = { ok: true; optionValues: string[] } | { ok: false; reason: string };

/**
 * Cross-checks `formTypes` against the `form-submissions` collection's
 * `form` select options in the Collection Registry, so the two can't drift
 * apart silently. Used by `./registry-check.test` — see that file for what
 * happens while the registry still calls the field `source`.
 */
export function checkFormTypesMatchRegistry(): RegistryFormFieldCheck {
  const collection = collectionRegistry.find((candidate) => candidate.id === FORM_SUBMISSIONS_COLLECTION_ID);
  if (!collection) {
    return { ok: false, reason: `registry ${FORM_SUBMISSIONS_COLLECTION_ID} collection missing` };
  }

  const field = collection.fields.find((candidate) => candidate.key === FORM_FIELD_KEY);
  if (!field) {
    return { ok: false, reason: `registry ${FORM_SUBMISSIONS_COLLECTION_ID}.${FORM_FIELD_KEY} field missing` };
  }

  if (field.type !== "select") {
    return { ok: false, reason: `registry ${FORM_SUBMISSIONS_COLLECTION_ID}.${FORM_FIELD_KEY} field is not a select field` };
  }

  const optionValues = field.options.map((option) => option.value);
  const expected = [...formTypes].sort();
  const actual = [...optionValues].sort();
  const matches = expected.length === actual.length && expected.every((value, index) => value === actual[index]);

  if (!matches) {
    return {
      ok: false,
      reason: `registry ${FORM_SUBMISSIONS_COLLECTION_ID}.${FORM_FIELD_KEY} options [${actual.join(", ")}] do not match formTypes [${expected.join(", ")}]`
    };
  }

  return { ok: true, optionValues };
}

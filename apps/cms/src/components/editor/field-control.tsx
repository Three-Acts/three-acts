import { ExternalLink, Lock } from "lucide-react";
import { cn } from "@three-acts/utils";
import type {
  AssetField,
  CmsField,
  CmsRecord,
  CmsRecordValue,
  FileField,
  ImageField,
  ImageGalleryField,
  SelectField,
  SlugField,
  VideoField
} from "../../cms/types";
import { isReadOnlyField, moveImageItem, parseImageGallery, parseImageValue, serializeImageGallery, serializeImageValue } from "../../cms/types";
import {
  AssetControl,
  FileControl,
  FormField,
  ImageControl,
  ImageGalleryControl,
  Input,
  inputVariants,
  NumberInput,
  Select,
  Textarea,
  Toggle,
  Tooltip,
  VideoControl
} from "../atoms";
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "../../lib/format";

const READ_ONLY_FIELD_HINT = "Set by the site";

type FieldControlProps = {
  field: CmsField;
  onAssetUpload: (field: AssetField | ImageField | VideoField | FileField, file: File) => void;
  onGalleryUpload: (field: ImageGalleryField, files: File[]) => void;
  onGalleryItemUpload: (field: ImageGalleryField, index: number, file: File) => void;
  onUpdateValue: (fieldKey: string, value: CmsRecordValue) => void;
  /** Render the value as a plain display instead of an editable control. */
  readOnly?: boolean;
  record: CmsRecord;
  uploadingField: string | null;
};

function readOnlyDisplay(field: CmsField, value: CmsRecordValue): string {
  if (field.type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (field.type === "datetime") {
    return value ? formatDateTime(String(value)) : "—";
  }

  if (field.type === "number") {
    if (value === "" || value === null || value === undefined) {
      return "—";
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? String(value) : parsed.toLocaleString();
  }

  if (field.type === "select") {
    const selectField = field as SelectField;
    const match = selectField.options.find((option) => option.value === String(value ?? ""));
    return match?.label ?? (String(value ?? "") || "—");
  }

  return String(value ?? "") || "—";
}

/** `text`/`textarea` fields are the only ones carrying `format`; every other field type has none. */
function fieldFormat(field: CmsField): "json" | "json-ld" | undefined {
  return (field as { format?: "json" | "json-ld" }).format;
}

function isCodeFormat(field: CmsField): boolean {
  const format = fieldFormat(field);
  return format === "json" || format === "json-ld";
}

/** Pretty-prints a stored JSON string for read-only display; falls back to the raw text when it doesn't parse. */
function formatJsonDisplay(value: CmsRecordValue): string {
  const text = value === null || value === undefined ? "" : String(value);

  if (!text.trim()) {
    return "—";
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function toNumberValue(value: CmsRecordValue): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function FieldControl({ field, onAssetUpload, onGalleryUpload, onGalleryItemUpload, onUpdateValue, readOnly, record, uploadingField }: FieldControlProps) {
  const value = record.values[field.key] ?? "";
  // Base UI Field wires labels to its own control parts; only the raw file input needs an id.
  const uploadId = `${record.id}-${field.key}`;
  // A field can be read-only either because the whole collection is
  // (`readOnly`, e.g. form submissions) or because this specific field is
  // (`isReadOnlyField`, e.g. an order's total — editors may still change its
  // status even though the money fields are set by checkout).
  const fieldReadOnly = readOnly || isReadOnlyField(field);

  if (field.type === "image" || field.type === "image-gallery") {
    // Image controls render their own read-only state (card with alt text, no
    // inputs), so they branch before the generic read-only display — a JSON
    // string would be meaningless there.
    const isGallery = field.type === "image-gallery";
    const galleryField = field as ImageGalleryField;
    const imageField = field as ImageField;

    return (
      <FormField
        description={field.helpText}
        label={field.label}
        required={fieldReadOnly ? undefined : field.required}
      >
        {isGallery ? (
          <ImageGalleryControl
            field={galleryField}
            inputIdBase={uploadId}
            isUploading={uploadingField === field.key}
            onAddFiles={(files) => onGalleryUpload(galleryField, files)}
            onAltChange={(index, alt) => {
              const items = parseImageGallery(record.values[field.key]);
              if (items[index]) {
                const next = [...items];
                next[index] = { ...next[index], alt };
                onUpdateValue(field.key, serializeImageGallery(next));
              }
            }}
            onRemoveItem={(index) => {
              const items = parseImageGallery(record.values[field.key]);
              onUpdateValue(field.key, serializeImageGallery(items.filter((_, itemIndex) => itemIndex !== index)));
            }}
            onReorder={(fromIndex, toIndex) =>
              onUpdateValue(field.key, serializeImageGallery(moveImageItem(parseImageGallery(record.values[field.key]), fromIndex, toIndex)))
            }
            onReplaceItem={(index, file) => onGalleryItemUpload(galleryField, index, file)}
            readOnly={fieldReadOnly}
            value={String(value ?? "")}
          />
        ) : (
          <ImageControl
            field={imageField}
            inputId={uploadId}
            isUploading={uploadingField === field.key}
            onAltChange={(alt) => {
              const current = parseImageValue(record.values[field.key]);
              onUpdateValue(field.key, current ? serializeImageValue({ ...current, alt }) : "");
            }}
            onClear={() => onUpdateValue(field.key, "")}
            onFile={(file) => onAssetUpload(imageField, file)}
            readOnly={fieldReadOnly}
            value={String(value ?? "")}
          />
        )}
      </FormField>
    );
  }

  if (field.type === "video" || field.type === "file") {
    // Video/file controls render their own read-only state (icon tile with
    // an open link, no inputs), so they branch before the generic read-only
    // display — a JSON string would be meaningless there.
    const isVideo = field.type === "video";
    const videoField = field as VideoField;
    const fileField = field as FileField;

    return (
      <FormField
        description={field.helpText}
        label={field.label}
        required={fieldReadOnly ? undefined : field.required}
      >
        {isVideo ? (
          <VideoControl
            field={videoField}
            inputId={uploadId}
            isUploading={uploadingField === field.key}
            onClear={() => onUpdateValue(field.key, "")}
            onFile={(file) => onAssetUpload(videoField, file)}
            readOnly={fieldReadOnly}
            value={String(value ?? "")}
          />
        ) : (
          <FileControl
            field={fileField}
            inputId={uploadId}
            isUploading={uploadingField === field.key}
            onClear={() => onUpdateValue(field.key, "")}
            onFile={(file) => onAssetUpload(fileField, file)}
            readOnly={fieldReadOnly}
            value={String(value ?? "")}
          />
        )}
      </FormField>
    );
  }

  if (fieldReadOnly) {
    // A required marker is meaningless when nothing can be edited.
    // Only an identifier-shaped `readonly`-type field (key contains "id")
    // should fall back to the record id when empty; any other read-only
    // field just reads as empty.
    const isIdField = field.type === "readonly" && /id/i.test(field.key);
    const shown = value || (isIdField ? record.id : "");
    const codeFormat = isCodeFormat(field);

    return (
      <FormField description={field.helpText} label={field.label}>
        <div className="flex items-start gap-1.5">
          {codeFormat ? (
            <pre className="m-0 min-h-13 min-w-0 flex-1 overflow-auto whitespace-pre-wrap wrap-break-word rounded-cms border border-cms-line-strong bg-cms-surface px-2 py-1.5 font-mono text-field text-cms-muted leading-5">
              {formatJsonDisplay(shown)}
            </pre>
          ) : (
            <div
              className={cn(
                inputVariants({ tone: "display" }),
                "min-w-0 flex-1 whitespace-pre-wrap",
                field.type === "textarea" && "min-h-13 items-start py-1.5",
                // Mono is for identifiers, not for every read-only value — a
                // `readonly` field can just as easily hold a person's name.
                shown === record.id && "font-mono tabular-nums"
              )}
            >
              {readOnlyDisplay(field, shown)}
            </div>
          )}
          <Tooltip content={READ_ONLY_FIELD_HINT} side="left">
            <span className="mt-1.5 inline-flex shrink-0 items-center text-cms-subtle">
              <Lock aria-hidden="true" size={12} />
              <span className="sr-only">{READ_ONLY_FIELD_HINT}</span>
            </span>
          </Tooltip>
        </div>
      </FormField>
    );
  }

  if (field.type === "textarea") {
    const codeFormat = isCodeFormat(field);

    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Textarea
          className={cn("min-h-22 resize-y leading-6", codeFormat && "font-mono text-field leading-5")}
          onChange={(event) => onUpdateValue(field.key, event.target.value)}
          required={field.required}
          spellCheck={codeFormat ? false : undefined}
          value={String(value)}
        />
      </FormField>
    );
  }

  if (field.type === "boolean") {
    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Toggle checked={Boolean(value)} onChange={(checked) => onUpdateValue(field.key, checked)} />
      </FormField>
    );
  }

  if (field.type === "number") {
    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <NumberInput onValueChange={(next) => onUpdateValue(field.key, next)} required={field.required} value={toNumberValue(value)} />
      </FormField>
    );
  }

  if (field.type === "select") {
    const selectField = field as SelectField;

    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Select
          onValueChange={(next) => onUpdateValue(field.key, next)}
          options={[{ label: "Select…", value: "" }, ...selectField.options]}
          value={String(value)}
        />
      </FormField>
    );
  }

  if (field.type === "asset") {
    const assetField = field as AssetField;

    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <AssetControl
          accept={assetField.accept}
          inputId={uploadId}
          isUploading={uploadingField === field.key}
          onClear={() => onUpdateValue(field.key, "")}
          onFile={(file) => onAssetUpload(assetField, file)}
          value={String(value)}
        />
      </FormField>
    );
  }

  if (field.type === "slug") {
    const slugField = field as SlugField;

    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Input mono onChange={(event) => onUpdateValue(field.key, event.target.value)} required={field.required} value={String(value)} />
        {slugField.urlPrefix ? (
          <div className="flex min-h-6 items-center gap-1.5 overflow-hidden rounded-cms bg-cms-surface px-2 font-mono text-ui text-cms-subtle">
            <ExternalLink size={12} aria-hidden="true" />
            {/* Prefix and slug are one URL, so they must not be split by a gap. */}
            <span className="truncate">
              {slugField.urlPrefix}
              <span className="text-cms-muted">{String(value)}</span>
            </span>
          </div>
        ) : null}
      </FormField>
    );
  }

  return (
    <FormField description={field.helpText} label={field.label} required={field.required}>
      <Input
        onChange={(event) =>
          onUpdateValue(field.key, field.type === "datetime" ? fromDateTimeLocal(event.target.value) : event.target.value)
        }
        required={field.required}
        type={field.type === "datetime" ? "datetime-local" : "text"}
        value={field.type === "datetime" ? toDateTimeLocal(String(value ?? "")) : String(value)}
      />
    </FormField>
  );
}

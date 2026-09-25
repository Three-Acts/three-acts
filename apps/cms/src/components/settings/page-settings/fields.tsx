import { Field } from "@base-ui-components/react/field";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@three-acts/utils";
import { parseSchemaMarkup } from "../../../cms/types";
import { Button, FormField, Input, Textarea } from "../../atoms";

type SeoTextFieldProps = {
  /** What the counter measures when it differs from `value` (e.g. the templated title). */
  countValue?: string;
  /** Inline validation message; replaces the hint while set. */
  error?: string | null;
  /** Hint shown under the control. */
  hint?: string;
  label: string;
  limit?: number;
  mono?: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
  /** The fallback value the live site uses when this is left empty. */
  placeholder?: string;
  required?: boolean;
  value: string;
};

/**
 * A text control with the two things SEO fields need that FieldControl
 * doesn't carry: the fallback as a placeholder, and a soft length budget.
 */
export function SeoTextField({ countValue, error, hint, label, limit, mono, multiline, onChange, placeholder, required, value }: SeoTextFieldProps) {
  const counted = countValue ?? value;
  const isOver = limit !== undefined && counted.length > limit;
  const showMeta = Boolean(error || hint || limit);

  return (
    <FormField label={label} required={required}>
      {showMeta ? (
        <div className="flex items-start justify-between gap-3 text-ui">
          <Field.Description className={cn("m-0 min-w-0", error ? "text-cms-danger" : "text-cms-subtle")}>{error || hint}</Field.Description>
          {limit !== undefined && counted.length > 0 ? (
            <span className={cn("shrink-0 tabular-nums", isOver ? "text-cms-danger" : "text-cms-subtle")}>
              {counted.length} / {limit}
              <span className="sr-only">{isOver ? " characters, over the recommended length" : " characters"}</span>
            </span>
          ) : null}
        </div>
      ) : null}
      {multiline ? (
        <Textarea
          aria-invalid={error ? true : undefined}
          className="min-h-16 resize-y leading-5"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <Input
          aria-invalid={error ? true : undefined}
          className={cn(error && "border-cms-danger")}
          mono={mono}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
    </FormField>
  );
}

const SCHEMA_PLACEHOLDER = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "About"
}`;

/** JSON-LD for one page, validated as it is typed with the same parser the site build uses. */
export function SchemaMarkupField({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  const result = parseSchemaMarkup(value);
  const isEmpty = value.trim().length === 0;

  return (
    <FormField label="JSON-LD">
      <div className="flex min-h-6 items-center justify-between gap-3 text-ui">
        <Field.Description
          className={cn(
            "m-0 flex min-w-0 items-start gap-1.5",
            isEmpty ? "text-cms-subtle" : result.ok ? "text-cms-success" : "text-cms-danger"
          )}
        >
          {isEmpty ? (
            "Optional. Added to this page’s structured data alongside the sitewide markup."
          ) : result.ok ? (
            <>
              <CircleCheck aria-hidden="true" className="mt-0.5 shrink-0" size={12} />
              Valid JSON-LD · {result.value.length} object{result.value.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={12} />
              {result.error}
            </>
          )}
        </Field.Description>
        {result.ok && !isEmpty ? (
          <Button
            onClick={() => onChange(JSON.stringify(result.value.length === 1 ? result.value[0] : result.value, null, 2))}
            variant="ghost"
          >
            Format
          </Button>
        ) : null}
      </div>
      <Textarea
        aria-invalid={result.ok ? undefined : true}
        className={cn("min-h-40 resize-y font-mono leading-5", !result.ok && "border-cms-danger")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={SCHEMA_PLACEHOLDER}
        spellCheck={false}
        value={value}
      />
    </FormField>
  );
}

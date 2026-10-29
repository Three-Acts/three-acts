import type { ReactNode } from "react";
import { Field } from "@base-ui-components/react/field";
import { cn } from "@three-acts/utils";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  /** Help text, wired to the control with `aria-describedby`. */
  description?: string;
  /** Only needed for controls Base UI cannot discover itself (e.g. a raw file input). */
  htmlFor?: string;
  label: string;
  /** Marks the label; set `required` on the control too so validation can fire. */
  required?: boolean;
};

/**
 * Base UI Field wrapper for one labelled editor control. Base UI Input, Select,
 * Switch, and NumberField parts associate themselves with the label and the
 * description automatically, so no id threading is needed for those.
 */
export function FormField({ children, className, description, htmlFor, label, required }: FormFieldProps) {
  return (
    <Field.Root className={cn("mb-4 grid gap-1.5 last:mb-0", className)} validationMode="onBlur">
      <Field.Label className="flex items-center gap-1 text-ui font-medium text-cms-muted" htmlFor={htmlFor}>
        {label}
        {/* The accent is reserved for actions, so "you must fill this in" borrows the danger hue. */}
        {required ? (
          <span aria-hidden="true" className="text-cms-danger">
            *
          </span>
        ) : null}
      </Field.Label>
      {description ? <Field.Description className="m-0 text-ui text-cms-subtle">{description}</Field.Description> : null}
      {children}
      <Field.Error className="m-0 text-ui text-cms-danger" />
    </Field.Root>
  );
}

/* eslint-disable react-refresh/only-export-components */
import { createContext, forwardRef, useContext, useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@three-acts/utils";

type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

const CONTROL_BASE =
  "focus-ring block w-full rounded-card border border-line bg-surface-raised px-3.5 py-2.5 text-sm text-ink transition-colors duration-150 placeholder:text-muted aria-invalid:border-red-400 disabled:cursor-not-allowed disabled:opacity-60";

/** Reads the enclosing Field.Root's id/aria wiring; every Field.* control uses this so it "just works" nested in Root without repeating props. */
function useFieldContext() {
  return useContext(FieldContext);
}

type FieldRootProps = {
  /** Stable id for the control; generated when omitted. */
  id?: string;
  label: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Composes a label, a single form control, an optional hint and an error
 * message with the id/`aria-describedby`/`aria-invalid` wiring done for you.
 * Wrap one Field.Input/Textarea/Select per Root. Field.Checkbox is
 * self-contained (its label sits beside the box) and is used standalone,
 * without Root.
 */
function Root({ id: idProp, label, error, hint, required, className, children }: FieldRootProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-accent">
              *
            </span>
          )}
        </label>
        {children}
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** A single-line text control. Works controlled (`value`/`onChange`) or uncontrolled (`defaultValue`). */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ id, className, ...props }, ref) {
  const field = useFieldContext();
  return (
    <input
      ref={ref}
      id={id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(CONTROL_BASE, className)}
      {...props}
    />
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** A multi-line text control (messages, addresses, descriptions). */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ id, className, rows = 4, ...props }, ref) {
  const field = useFieldContext();
  return (
    <textarea
      ref={ref}
      id={id ?? field?.id}
      rows={rows}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(CONTROL_BASE, "resize-y", className)}
      {...props}
    />
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** A native `<select>` control — grind, size, country, sort order. */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ id, className, children, ...props }, ref) {
  const field = useFieldContext();
  return (
    <select
      ref={ref}
      id={id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(CONTROL_BASE, "pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
});

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  className?: string;
};

/**
 * A standalone checkbox with its label beside the box (consent, marketing
 * opt-in, "remember me"). Not nested in Field.Root — it manages its own id
 * and `aria-describedby` the same way Root does.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id: idProp, label, error, hint, className, ...props },
  ref
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className="focus-ring mt-0.5 size-4 shrink-0 rounded-card border border-line-strong/40 accent-accent"
          {...props}
        />
        <span>{label}</span>
      </label>
      {hint && !error && (
        <p id={hintId} className="pl-6 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="pl-6 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
});

export const Field = {
  Checkbox,
  Input,
  Root,
  Select,
  Textarea
};

export type { CheckboxProps, FieldRootProps, InputProps, SelectProps, TextareaProps };

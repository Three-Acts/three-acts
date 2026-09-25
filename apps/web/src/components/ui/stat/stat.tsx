/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type RootProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  label: ReactNode;
  value: ReactNode;
  /** An optional supporting line under the label — 14px. */
  description?: ReactNode;
};

/** A single labelled number in a 1px black border on white — trust metrics, order totals, review counts. `dt`/`dd` pair; wrap a group of them in a `<dl>`. */
function Root({ className, label, value, description, ...props }: RootProps) {
  return (
    <div className={cn("flex flex-col gap-2 border border-line-strong bg-surface p-6", className)} {...props}>
      <dt className="text-h2 font-normal text-ink">{value}</dt>
      <dd className="text-body text-ink">{label}</dd>
      {description && <p className="text-small text-ink">{description}</p>}
    </div>
  );
}

export const Stat = {
  Root
};

export type { RootProps };

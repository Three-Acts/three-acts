/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type RootProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  label: ReactNode;
  value: ReactNode;
};

/** A single labelled number — trust metrics, order totals, review counts. Renders as a `<dl>` term/definition pair; wrap a group of them in a `<dl>`. */
function Root({ className, label, value, ...props }: RootProps) {
  return (
    <div className={cn("border-l-2 border-line-strong pl-4", className)} {...props}>
      <dt className="text-3xl font-semibold tracking-tight text-ink font-serif">{value}</dt>
      <dd className="mt-1 text-sm leading-5 text-muted">{label}</dd>
    </div>
  );
}

export const Stat = {
  Root
};

export type { RootProps };

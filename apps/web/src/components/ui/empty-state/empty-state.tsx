/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type RootProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  className?: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

/** A centered placeholder for an empty cart, no search results, no reviews yet, etc. */
function Root({ icon, title, description, action, className, ...props }: RootProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 border border-dashed border-line-strong bg-surface p-10 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <span aria-hidden="true" className="text-ink">
          {icon}
        </span>
      )}
      <p className="text-h3 font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-body text-ink">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export const EmptyState = {
  Root
};

export type { RootProps as EmptyStateRootProps };

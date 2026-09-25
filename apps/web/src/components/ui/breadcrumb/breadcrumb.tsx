/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes } from "react";
import { cn } from "@three-acts/utils";

type BreadcrumbItem = {
  label: string;
  /** Omit on the current page — it renders as plain text with `aria-current="page"`. */
  href?: string;
};

type RootProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  className?: string;
  items: BreadcrumbItem[];
};

/** Wayfinding trail above a page's title, e.g. Home / Shop / Single origin / Ethiopia Yirgacheffe. */
function Root({ items, className, ...props }: RootProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted", className)} {...props}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-line-strong/30">
                  /
                </span>
              )}
              {item.href && !isLast ? (
                <a href={item.href} className="focus-ring transition-colors duration-150 hover:text-ink">
                  {item.label}
                </a>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-medium text-ink" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const Breadcrumb = {
  Root
};

export type { BreadcrumbItem, RootProps as BreadcrumbRootProps };

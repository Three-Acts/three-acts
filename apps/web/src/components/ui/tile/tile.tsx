/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type RootProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  className?: string;
  title: ReactNode;
  /** A short prefix like "01", set top-left above the title. */
  mark?: ReactNode;
  description?: ReactNode;
  /** Renders the tile as an `<a>` when given; a plain `<div>` otherwise. */
  href?: string;
};

const BASE = "group flex aspect-tile flex-col justify-between border border-line-strong bg-surface p-6 desktop:p-8";

/** The bordered square feature tile: a `mark` top-left, `title`/`description` bottom-left. Used for value/feature grids (no photos). */
function Root({ title, mark, description, href, className, ...props }: RootProps) {
  const content = (
    <>
      {mark && (
        <span aria-hidden="true" className="text-small text-ink">
          {mark}
        </span>
      )}
      <span className="flex flex-col gap-1">
        <span className={cn("text-body font-medium text-ink", href && "group-hover:underline")}>{title}</span>
        {description && <span className="text-small text-ink">{description}</span>}
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cn(BASE, "focus-ring", className)} {...(props as HTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }

  return (
    <div className={cn(BASE, className)} {...props}>
      {content}
    </div>
  );
}

export const Tile = {
  Root
};

export type { RootProps as TileRootProps };

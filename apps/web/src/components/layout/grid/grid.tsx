/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn, cv } from "@three-acts/utils";

type GridCols = 2 | 3 | 4;

/**
 * Mobile-first responsive tracks: 1-up portrait, 2-up landscape, then step up
 * to the requested column count at tablet (`cols=3`) / desktop (`cols=4`).
 * Gaps are always the system's Relume tokens: `gap-x-gap` (2rem) columns, `gap-y-gap-y` (3rem) rows.
 */
const gridVariants = cv({
  base: "grid gap-x-gap gap-y-gap-y",
  variants: {
    cols: {
      "2": ["grid-cols-1", "landscape:grid-cols-2"],
      "3": ["grid-cols-1", "landscape:grid-cols-2", "tablet:grid-cols-3"],
      "4": ["grid-cols-1", "landscape:grid-cols-2", "tablet:grid-cols-3", "desktop:grid-cols-4"]
    }
  },
  defaultVariants: { cols: "3" }
});

type RootProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
  cols?: GridCols;
  /** Renders as this element instead of `<div>` — e.g. `"dl"` to wrap a grid of Stat.Root term/definition pairs. */
  as?: "div" | "dl" | "ul";
};

/** A responsive card grid — product listings, article listings, testimonials, tiles. Pick `cols` for the widest breakpoint; it steps down automatically. */
function Root({ children, className, cols = 3, as: Tag = "div", ...props }: RootProps) {
  const Element = Tag as "div";
  return (
    <Element className={cn(gridVariants({ cols: String(cols) as "2" | "3" | "4" }), className)} {...props}>
      {children}
    </Element>
  );
}

export const Grid = {
  Root
};

export type { GridCols, RootProps as GridRootProps };

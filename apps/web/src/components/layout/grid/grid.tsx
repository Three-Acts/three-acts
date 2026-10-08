import { componentAttributes, componentClass, componentIdentity, componentProps } from "../../../lib/design";
/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";

import type { GridCols } from "@three-acts/design";

/**
 * Mobile-first responsive tracks: 1-up portrait, 2-up landscape, then step up
 * to the requested column count at tablet (`cols=3`) / desktop (`cols=4`).
 * Gaps are always the system's Relume tokens: `gap-x-gap` (2rem) columns, `gap-y-gap-y` (3rem) rows.
 */

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
  const instance = componentIdentity(props);
  const sourceProps = { cols: String(cols) };
  const resolved = componentProps("Grid.Root", instance, sourceProps);
  return (
    <Element className={componentClass("Grid.Root", resolved, className)} {...props} {...componentAttributes("Grid.Root", instance, sourceProps, className)}>
      {children}
    </Element>
  );
}

export const Grid = {
  Root
};

export type { GridCols, RootProps as GridRootProps };

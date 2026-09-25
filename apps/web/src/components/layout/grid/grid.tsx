/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn, cv } from "@three-acts/utils";

type GridCols = 2 | 3 | 4;

/**
 * Mobile-first responsive tracks: 1-up portrait, 2-up landscape, then step up
 * to the requested column count at tablet (`cols=3`) / desktop (`cols=4`).
 * `cols=3`/`4` reuse the named `--grid-template-columns-products-*` tokens
 * from theme.css so the shop/article/testimonial grids share one recipe.
 */
const gridVariants = cv({
  base: "grid gap-8",
  variants: {
    cols: {
      "2": ["grid-cols-1", "landscape:grid-cols-2"],
      "3": ["grid-cols-1", "landscape:grid-cols-products-sm", "tablet:grid-cols-products-lg"],
      "4": ["grid-cols-1", "landscape:grid-cols-products-sm", "tablet:grid-cols-products-lg", "desktop:grid-cols-products-xl"]
    }
  },
  defaultVariants: { cols: "3" }
});

type RootProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  cols?: GridCols;
};

/** A responsive card grid — product listings, article listings, testimonials. Pick `cols` for the widest breakpoint; it steps down automatically. */
function Root({ children, className, cols = 3, ...props }: RootProps) {
  return (
    <div className={cn(gridVariants({ cols: String(cols) as "2" | "3" | "4" }), className)} {...props}>
      {children}
    </div>
  );
}

export const Grid = {
  Root
};

export type { GridCols, RootProps as GridRootProps };

/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn, cv } from "@three-acts/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";
type BadgeVariant = "outline" | "solid";

/** The monochrome kit has only two visual treatments; every legacy tone name aliases to one of them. */
const TONE_VARIANT: Record<BadgeTone, BadgeVariant> = {
  neutral: "outline",
  warning: "outline",
  success: "solid",
  danger: "solid",
  accent: "solid"
};

const badgeVariants = cv({
  base: "inline-flex items-center gap-1 border px-2 py-0.5 text-small uppercase tracking-eyebrow",
  variants: {
    variant: {
      outline: ["border-line-strong bg-surface text-ink"],
      solid: ["border-line-strong bg-ink text-surface"]
    }
  },
  defaultVariants: { variant: "outline" }
});

type RootProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  className?: string;
  /** Legacy tone name — aliases to `variant` (see `TONE_VARIANT`). Prefer `variant` in new code. */
  tone?: BadgeTone;
  /** `outline` = 1px black border; `solid` = black fill. Derived from `tone` when omitted. */
  variant?: BadgeVariant;
};

/**
 * A small status/category tag — product availability ("In stock", "Low
 * stock"), category labels, order status, tags. Not for counts (see a cart
 * badge, which is numeric-only chrome, not this component).
 */
function Root({ children, className, tone = "neutral", variant, ...props }: RootProps) {
  const resolvedVariant = variant ?? TONE_VARIANT[tone];
  return (
    <span className={cn(badgeVariants({ variant: resolvedVariant }), className)} {...props}>
      {children}
    </span>
  );
}

export const Badge = {
  Root
};

export type { BadgeTone, BadgeVariant, RootProps as BadgeRootProps };

/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn, cv } from "@three-acts/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";

const badgeVariants = cv({
  base: "inline-flex items-center gap-1 rounded-card border px-2 py-0.5 text-xs font-semibold uppercase tracking-eyebrow",
  variants: {
    tone: {
      neutral: ["border-line bg-ink/[0.06] text-ink"],
      success: ["border-moss/30 bg-moss/10 text-moss"],
      warning: ["border-amber-200 bg-amber-50 text-amber-800"],
      danger: ["border-red-200 bg-red-50 text-red-700"],
      accent: ["border-accent bg-accent text-panel"]
    }
  },
  defaultVariants: { tone: "neutral" }
});

type RootProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
};

/**
 * A small status/category tag — product availability ("In stock", "Low
 * stock"), category labels, order status, tags. Not for counts (see a cart
 * badge, which is numeric-only chrome, not this component).
 */
function Root({ children, className, tone = "neutral", ...props }: RootProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}

export const Badge = {
  Root
};

export type { BadgeTone, RootProps as BadgeRootProps };

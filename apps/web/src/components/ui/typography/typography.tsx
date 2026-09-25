/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type EyebrowProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  className?: string;
};

/** Small caps label above a heading (e.g. "Single origin", "Error 404"). */
function Eyebrow({ children, className, ...props }: EyebrowProps) {
  return (
    <p className={cn("flex items-center gap-2 text-sm font-semibold uppercase tracking-eyebrow text-moss", className)} {...props}>
      {children}
    </p>
  );
}

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
  className?: string;
  /** Renders as this element; defaults to the visual level's natural tag. Use to keep one <h1> per page. */
  as?: "h1" | "h2" | "h3" | "p";
};

/** The largest headline on a page — the hero. Use once per page, as `<h1>`. */
function Display({ children, className, as: Tag = "h1", ...props }: HeadingProps) {
  return (
    <Tag
      className={cn(
        "text-5xl font-semibold leading-display tracking-tight text-ink font-serif landscape:text-7xl",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** A section-level heading (Section.Header uses this). Defaults to `<h2>`. */
function Title({ children, className, as: Tag = "h2", ...props }: HeadingProps) {
  return (
    <Tag className={cn("text-3xl font-semibold leading-tight tracking-tight text-ink font-serif landscape:text-4xl", className)} {...props}>
      {children}
    </Tag>
  );
}

type LedeProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  className?: string;
};

/** The intro sentence beneath a Display/Title — larger, relaxed body copy. */
function Lede({ children, className, ...props }: LedeProps) {
  return (
    <p className={cn("max-w-2xl text-lg leading-8 text-muted", className)} {...props}>
      {children}
    </p>
  );
}

export const Typography = {
  Display,
  Eyebrow,
  Lede,
  Title
};

export type { EyebrowProps, HeadingProps, LedeProps };

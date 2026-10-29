/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type EyebrowProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  className?: string;
  /** A short prefix rendered ahead of the label, e.g. "01" (rendered as "01 /"). */
  mark?: ReactNode;
};

/** Small uppercase label above a heading, e.g. "01 / Shop", "This week's roast". */
function Eyebrow({ children, mark, className, ...props }: EyebrowProps) {
  return (
    <p className={cn("flex items-center gap-2 text-small uppercase tracking-eyebrow text-ink", className)} {...props}>
      {mark && <span aria-hidden="true">{mark} /</span>}
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

/** The largest headline on a page — the hero, the closing CTA band. Regular weight; size carries the hierarchy. Use once per page, as `<h1>`. */
function Display({ children, className, as: Tag = "h1", ...props }: HeadingProps) {
  return (
    <Tag className={cn("text-display font-normal text-ink", className)} {...props}>
      {children}
    </Tag>
  );
}

/** A section-level heading (Section.Header uses this). Regular weight. Defaults to `<h2>`. */
function Title({ children, className, as: Tag = "h2", ...props }: HeadingProps) {
  return (
    <Tag className={cn("text-h2 font-normal text-ink", className)} {...props}>
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
    <p className={cn("max-w-2xl text-lede text-ink", className)} {...props}>
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

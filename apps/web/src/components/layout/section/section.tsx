/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";
import { Typography } from "../../ui/typography";

type RootProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
};

/** A page section's outer `<section>` — vertical rhythm only (py-16, py-24 on desktop). Nest Section.Container inside for the horizontal max-width. */
function Root({ children, className, ...props }: RootProps) {
  return (
    <section className={cn("py-16 desktop:py-24", className)} {...props}>
      {children}
    </section>
  );
}

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

/** The horizontal container every section's content sits in: `max-w-6xl`, centered, with a mobile-first side gutter. */
function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6", className)} {...props}>
      {children}
    </div>
  );
}

type HeaderProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  /** A button/link rendered beside (or below, when centered) the title — "View all", "Sort by". */
  action?: ReactNode;
  align?: "left" | "center";
};

/** A section's heading block: eyebrow + title + optional lede, with an optional action slot. Use once at the top of a Section.Container. */
function Header({ eyebrow, title, lede, action, align = "left", className, ...props }: HeaderProps) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-6",
        centered ? "items-center text-center" : "items-start text-left landscape:flex-row landscape:items-end landscape:justify-between",
        className
      )}
      {...props}
    >
      <div className={cn("flex flex-col gap-4", centered && "items-center")}>
        {eyebrow && <Typography.Eyebrow className={centered ? "justify-center" : undefined}>{eyebrow}</Typography.Eyebrow>}
        <Typography.Title>{title}</Typography.Title>
        {lede && <Typography.Lede className={centered ? "mx-auto" : undefined}>{lede}</Typography.Lede>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export const Section = {
  Container,
  Header,
  Root
};

export type { ContainerProps, HeaderProps, RootProps };

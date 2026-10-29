/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";
import { Typography } from "../../ui/typography";

type RootProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
};

/** A page section's outer `<section>` — no frame, no borders: bands run edge to edge of the viewport. Nest Section.Container inside to centre and constrain the content. */
function Root({ children, className, ...props }: RootProps) {
  return (
    <section className={cn("py-section-sm landscape:py-section-md desktop:py-section", className)} {...props}>
      {children}
    </section>
  );
}

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

/** The Relume-style content container: centred, capped at `max-w-content` (80rem), 5% side padding. Nothing else sets a max-width or draws a border around it. */
function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-content px-gutter", className)} {...props}>
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
        "mb-12 flex flex-col gap-6 desktop:mb-20",
        centered ? "items-center text-center" : "items-start text-left landscape:flex-row landscape:items-end landscape:justify-between",
        className
      )}
      {...props}
    >
      <div className={cn("flex max-w-[48rem] flex-col gap-4", centered && "items-center")}>
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

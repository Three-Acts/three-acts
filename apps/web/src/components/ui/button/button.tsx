/* eslint-disable react-refresh/only-export-components */
import { Button as BaseButton } from "@base-ui-components/react/button";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn, cv } from "@three-acts/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "light";
type ButtonSize = "sm" | "md" | "lg";

const FOCUS = "focus-ring";

const buttonVariants = cv({
  base: [
    FOCUS,
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-card border-2 font-semibold no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
  ],
  variants: {
    variant: {
      // rust fill — the primary call to action.
      primary: ["border-accent bg-accent text-panel hover:border-accent-hover hover:bg-accent-hover"],
      // outline ink — the standard secondary action.
      secondary: ["border-line-strong bg-transparent text-ink hover:bg-ink hover:text-paper"],
      // no border/fill until interacted with — low-emphasis actions.
      ghost: ["border-transparent bg-transparent text-ink hover:bg-ink/5"],
      // ink fill — an alternative strong CTA for light surfaces.
      dark: ["border-ink bg-ink text-paper hover:border-accent-hover hover:bg-accent-hover"],
      // paper fill — for use on dark ("roastery") sections.
      light: ["border-panel bg-panel text-ink hover:border-ink hover:bg-ink hover:text-panel"]
    },
    size: {
      sm: ["min-h-9 px-3.5 py-2 text-xs"],
      md: ["min-h-11 px-5 py-3 text-sm"],
      lg: ["min-h-13 px-7 py-4 text-base"]
    }
  },
  defaultVariants: { variant: "primary", size: "md" }
});

const spinnerSize: Record<ButtonSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5"
};

/** Small inline spinner shown by both Button.Root and Button.Link while `loading`. */
function Spinner({ size }: { size: ButtonSize }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin", spinnerSize[size])}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type RootProps = ComponentProps<typeof BaseButton> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button, sets `aria-busy`, and shows a spinner ahead of the label. */
  loading?: boolean;
};

/**
 * The primary interactive control across the storefront: form submits, cart
 * actions, filters. Use `Button.Root` whenever the action stays on the page
 * (submits a form, opens a menu, runs a client handler); use `Button.Link`
 * whenever it navigates.
 */
function Root({ children, className, variant = "primary", size = "md", loading = false, disabled, ...props }: RootProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {children}
    </BaseButton>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Visually and semantically disables navigation (no native `disabled` on `<a>`). */
  loading?: boolean;
};

/** The anchor-tag twin of `Button.Root`, styled identically, for real navigation. */
function Link({ children, className, variant = "primary", size = "md", loading = false, ...props }: LinkProps) {
  return (
    <a
      className={cn(buttonVariants({ variant, size }), loading && "pointer-events-none", className)}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {children}
    </a>
  );
}

export const Button = {
  Root,
  Link
};

export type { ButtonSize, ButtonVariant, LinkProps, RootProps };

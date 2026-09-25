/* eslint-disable react-refresh/only-export-components */
import { Button as BaseButton } from "@base-ui-components/react/button";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn, cv } from "@three-acts/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse";
type ButtonSize = "sm" | "md" | "lg";
type ButtonIcon = "arrow";

const FOCUS = "focus-ring";

const buttonVariants = cv({
  base: [
    FOCUS,
    "inline-flex items-center justify-center gap-2 whitespace-nowrap border text-body font-medium tracking-ui no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
  ],
  variants: {
    variant: {
      // black fill / white text — the primary call to action.
      primary: ["border-ink bg-ink text-surface hover:bg-surface hover:text-ink"],
      // white fill / black border+text — the standard secondary action.
      secondary: ["border-line-strong bg-surface text-ink hover:bg-ink hover:text-surface"],
      // no border/fill, underlined text — low-emphasis actions.
      ghost: ["border-transparent bg-transparent text-ink underline decoration-1 underline-offset-4 hover:no-underline"],
      // white fill / black text with a white border — for black bands.
      inverse: ["border-surface bg-surface text-ink hover:bg-ink hover:text-surface"]
    },
    size: {
      sm: ["px-[17px] py-[11px]"],
      md: ["px-5 py-3"],
      lg: ["px-7 py-4"]
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
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("animate-spin", spinnerSize[size])}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** The trailing "↗" glyph used by `icon="arrow"`. */
function ArrowIcon() {
  return (
    <span aria-hidden="true">
      ↗
    </span>
  );
}

type RootProps = ComponentProps<typeof BaseButton> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button, sets `aria-busy`, and shows a spinner ahead of the label. */
  loading?: boolean;
  /** Renders a trailing glyph after the label — currently only "arrow" (↗). */
  icon?: ButtonIcon;
};

/**
 * The primary interactive control across the storefront: form submits, cart
 * actions, filters. Use `Button.Root` whenever the action stays on the page
 * (submits a form, opens a menu, runs a client handler); use `Button.Link`
 * whenever it navigates.
 */
function Root({ children, className, variant = "primary", size = "md", loading = false, icon, disabled, ...props }: RootProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {children}
      {icon === "arrow" && <ArrowIcon />}
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
  /** Renders a trailing glyph after the label — currently only "arrow" (↗). */
  icon?: ButtonIcon;
};

/** The anchor-tag twin of `Button.Root`, styled identically, for real navigation. */
function Link({ children, className, variant = "primary", size = "md", loading = false, icon, ...props }: LinkProps) {
  return (
    <a
      className={cn(buttonVariants({ variant, size }), loading && "pointer-events-none", className)}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {children}
      {icon === "arrow" && <ArrowIcon />}
    </a>
  );
}

export const Button = {
  Root,
  Link
};

export type { ButtonIcon, ButtonSize, ButtonVariant, LinkProps, RootProps };

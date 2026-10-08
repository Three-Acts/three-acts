import { componentAttributes, componentClass, componentIdentity, componentProps, partClass } from "../../../lib/design";
/* eslint-disable react-refresh/only-export-components */
import { Button as BaseButton } from "@base-ui-components/react/button";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@three-acts/utils";

import type { ButtonVariant, ButtonSize } from "@three-acts/design";
type ButtonIcon = "arrow";



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
  const name = "Button.Root";
  const instance = componentIdentity(props);
  const sourceProps = { variant, size };
  const resolved = componentProps(name, instance, sourceProps);
  variant = resolved.variant as ButtonVariant;
  size = resolved.size as ButtonSize;
  return (
    <BaseButton
      className={componentClass(name, { variant, size }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      {...componentAttributes(name, instance, sourceProps, className)}
    >
      {loading && <Spinner size={size} />}
      <span data-editor-part="label" className={partClass(name, "label")}>{children}</span>
      {icon === "arrow" && <span data-editor-part="icon" className={partClass(name, "icon")}><ArrowIcon /></span>}
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
  const name = "Button.Link";
  const instance = componentIdentity(props);
  const sourceProps = { variant, size };
  const resolved = componentProps(name, instance, sourceProps);
  variant = resolved.variant as ButtonVariant;
  size = resolved.size as ButtonSize;
  return (
    <a
      className={componentClass(name, { variant, size }, cn(loading && "pointer-events-none", className))}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      {...props}
      {...componentAttributes(name, instance, sourceProps, className)}
    >
      {loading && <Spinner size={size} />}
      <span data-editor-part="label" className={partClass(name, "label")}>{children}</span>
      {icon === "arrow" && <span data-editor-part="icon" className={partClass(name, "icon")}><ArrowIcon /></span>}
    </a>
  );
}

export const Button = {
  Root,
  Link
};

export type { ButtonIcon, ButtonSize, ButtonVariant, LinkProps, RootProps };

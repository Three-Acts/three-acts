import { cn, cv } from "@three-acts/utils";

// The CMS design system in one file: shared class fragments and cv variants that
// every atom composes from. Colors, type sizes, radii, and shadows are tokens in
// apps/cms/src/theme.css — nothing here hard-codes a value.

/**
 * One focus treatment for every interactive surface. The offset keeps the ring
 * visible on filled controls, including the accent primary button.
 *
 * `outline-solid` is required: Tailwind v4's `outline-hidden`/`outline-none` set
 * `--tw-outline-style: none`, which silently suppresses a later `outline-2`.
 */
export const focusRing =
  "outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cms-accent";

/**
 * Same ring as `focusRing`, for a `<label>` standing in for a button around a
 * visually hidden file input (`sr-only`): the input is what receives focus,
 * not the label, so the ring keys off `:has(:focus-visible)` instead.
 */
export const fileLabelFocusRing =
  "outline-hidden has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cms-accent";

/** Raised bevel for controls that sit above a panel (buttons, steppers). */
export const controlShadow = "shadow-cms-control";

/** Recessed well for controls you type into (inputs, textareas, select triggers). */
export const wellShadow = "shadow-cms-well";

/** Chrome header: 40px, shared by the top bar, sidebar, records toolbar, list pane, and editor. */
export const panelHeaderClass = "flex h-10 shrink-0 items-center gap-2.5 border-b border-cms-line px-3";

/** Floating surface shared by every Base UI popup (select, menu, tooltip, dialog, toast). */
export const popupClass = "rounded-cms-lg border border-cms-line-strong bg-cms-surface text-cms-text shadow-cms-popup outline-none";

/** Uppercase eyebrow used for collection groups and table headers. */
export const eyebrowClass = "text-ui font-medium uppercase tracking-label text-cms-text";

/**
 * Column header row: 32px, uppercase eyebrow label. Shared by the record
 * table's header and the record list pane's single-column header so both
 * bands align pixel-for-pixel when a record is opened and the table
 * "collapses" to its first column.
 */
export const columnHeaderClass = cn("h-8 items-center border-b border-cms-line-strong", eyebrowClass);

/** Selectable row: sidebar collections, table rows, record list entries. 32px on the 4px grid. */
export const rowClass = "h-8 w-full items-center border-b border-cms-line text-left text-ui text-cms-text transition-colors hover:bg-cms-raised";

export type ButtonVariant = "normal" | "primary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

export const buttonVariants = cv({
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-cms font-medium leading-none transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    focusRing
  ],
  variants: {
    variant: {
      normal: [`bg-cms-surface text-cms-text hover:bg-cms-raised ${controlShadow}`],
      // The signature: light text on the accent. The accent means "you can act here".
      primary: [`bg-cms-accent text-cms-accent-ink hover:bg-cms-accent-hover active:bg-cms-accent-press ${controlShadow}`],
      danger: [`bg-cms-danger text-cms-accent-ink hover:brightness-110 ${controlShadow}`],
      ghost: ["bg-transparent text-cms-muted hover:bg-cms-raised hover:text-cms-text"]
    },
    size: {
      sm: ["h-6 px-2 text-ui"],
      md: ["h-8 px-3 text-ui-lg"]
    }
  },
  defaultVariants: { variant: "normal", size: "sm" }
});

/** Square icon-only buttons. `bare` sits flat in chrome; `raised` matches input height. */
export const iconButtonVariants = cv({
  base: ["grid shrink-0 place-items-center rounded-cms transition-colors disabled:cursor-not-allowed disabled:opacity-50", focusRing],
  variants: {
    tone: {
      bare: ["size-6 text-cms-muted hover:bg-cms-raised hover:text-cms-text"],
      raised: [`size-7 bg-cms-surface text-cms-text hover:bg-cms-raised ${controlShadow}`]
    }
  },
  defaultVariants: { tone: "bare" }
});

/** Field control surface. 28px tall, 13px text — larger than the chrome around it. */
export const inputVariants = cv({
  base: [
    "min-h-7 w-full rounded-cms border border-cms-line-strong bg-cms-surface px-2 py-1 text-field text-cms-text",
    "placeholder:text-cms-subtle",
    `${wellShadow} transition-colors`,
    "outline-cms-accent/20",
    // Inputs ring on their own edge rather than outside it, so dense rows stay aligned.
    "outline-hidden focus-visible:border-cms-accent focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-0",
    "data-disabled:cursor-not-allowed data-disabled:opacity-50"
  ],
  variants: {
    tone: {
      editable: [],
      // Read-only mirrors of a value: same footprint, no affordance.
      display: ["flex items-center text-cms-muted"]
    }
  },
  defaultVariants: { tone: "editable" }
});

/** Publish Status. Shape carries the state as well as hue, so it survives at 8px. */
export const statusDotVariants = cv({
  base: ["inline-block size-2 shrink-0 rounded-full border"],
  variants: {
    status: {
      published: ["border-cms-success bg-cms-success"],
      not_published: ["border-cms-track"],
      queued_to_publish: ["border-cms-pending"]
    }
  }
});

export const statusTextVariants = cv({
  base: ["inline-flex min-w-0 max-w-full items-center gap-2 text-ui"],
  variants: {
    status: {
      published: ["text-cms-success"],
      not_published: ["text-cms-muted"],
      queued_to_publish: ["text-cms-pending"]
    }
  }
});

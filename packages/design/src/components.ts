export const buttonConfig = {
  base: [
    "focus-ring",
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
} as const;

export const gridConfig = {
  base: "grid gap-x-gap gap-y-gap-y",
  variants: {
    cols: {
      "2": ["grid-cols-1", "landscape:grid-cols-2"],
      "3": ["grid-cols-1", "landscape:grid-cols-2", "tablet:grid-cols-3"],
      "4": ["grid-cols-1", "landscape:grid-cols-2", "tablet:grid-cols-3", "desktop:grid-cols-4"]
    }
  },
  defaultVariants: { cols: "3" }
} as const;

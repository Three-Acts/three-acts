import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge classifies unknown `text-*` values as colors, so a custom font
 * size (`text-field`) and a custom color (`text-cms-text`) look like the same
 * conflict group and one gets dropped. Registering the project's `--text-*`
 * scale keeps size and color independent. The other entries let named layout
 * tokens (`w-pane`, `max-w-viewport`, `tracking-label`, ...) dedupe against
 * their numeric siblings instead of both surviving in the class string.
 *
 * Keep in sync with the tokens in apps/cms/src/theme.css and
 * apps/web/src/theme.css.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "ui", "ui-lg", "field", "display"],
      spacing: ["pane", "select-col", "col-min", "modal-max-h", "hero"],
      container: ["viewport", "viewport-tight"],
      tracking: ["label", "eyebrow"],
      leading: ["display"]
    }
  }
});

export function cn(...classes: Array<string | false | null | undefined>) {
  return merge(classes.filter(Boolean).join(" "));
}

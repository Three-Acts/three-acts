/**
 * Renders a page title through the site settings `titleTemplate`
 * ("%s | Three Acts"). Only the first `%s` is replaced; a template without
 * `%s` is ignored so the page keeps its own title. Shared so every consumer
 * (CMS previews, the public site) renders titles identically.
 */
export function applyTitleTemplate(template: string | null | undefined, title: string): string {
  return template?.includes("%s") ? template.replace("%s", title) : title;
}

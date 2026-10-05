import copy from "@three-acts/static-content/documents/shared.json";
export type NavLink = { label: string; href: string };

export type FooterNavGroup = { title: string; links: NavLink[] };

export type OpeningHours = { days: string; hours: string };

/**
 * Brand fallbacks for the Three Acts template's own site — the template
 * selling itself. These mirror the organisation JSON-LD in
 * `packages/cms-schema/src/seed/site.ts` so the layout renders sensible
 * chrome even when the API returns no `site-settings` record. `lib/seo.ts`
 * and `page-meta` read `name`/`url`/`description`/`defaultImage`/`locale`/
 * `twitter` — keep those keys stable. The static editor owns brand copy in packages/static-content; this file keeps the runtime URL.
 */
export const site = { ...copy.site, url: import.meta.env.SITE.replace(/\/+$/, "") };

/** Public primary navigation, decoupled from the page files so content routes can appear too. */
export const navLinks: NavLink[] = copy.navLinks;

/** Footer nav columns: Shop / Journal / Company / Help. */
export const footerNav: FooterNavGroup[] = copy.footerNav;

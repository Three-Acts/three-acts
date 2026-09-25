# ADR 0002: Migrate the web app to Astro

- Status: Accepted (supersedes ADR 0001)
- Date: 2026-08-13

## Context

ADR 0001 delivered zero-JS static rendering, islands, and client-shell routes with hand-rolled machinery (`server.mjs`, `entry-server.tsx`, `scripts/prerender.mjs`, an island runtime + registry). It also predicted that "adding a meta-framework later would replace `server.mjs` + `prerender.mjs`, but the route/content/island contracts would largely carry over." Astro provides the exact same model natively — static-first output, per-component hydration, Vite under the hood — while keeping React for all components and Tailwind v4 via the same `@tailwindcss/vite` plugin.

## Decision

Replace the custom rendering machinery with Astro (`output: "static"` + `@astrojs/react`), keeping the contracts:

1. **Routes** — the `routes.tsx` / `build-routes.tsx` table becomes file-based pages in `src/pages/*.astro`. Content routes use `getStaticPaths` over the unchanged content source (`src/content/`). React page views live in `src/views/` and are composed by the `.astro` pages.
2. **Rendering modes** — unchanged semantics, now native:
   - Static, no interactivity → Astro pages with no `client:*` directive ship **zero JavaScript**.
   - Static with islands → `<Component client:visible />` in the `.astro` page replaces `<Island>` + registry + `islands-client.tsx`.
   - Client routes → `client:load` on the page's root React component (now also server-rendered as a static shell instead of an empty `#root`).
3. **SEO/AEO** — per-page metadata is centralized in `src/page-meta.ts` (the successor of the route table) and rendered by `src/layouts/BaseLayout.astro`; `sitemap.xml`, `robots.txt`, and `llms.txt` are static-file endpoints in `src/pages/` reusing the same metadata.
4. **Content stays build-only** — the content source is imported only from page frontmatter and `page-meta.ts`, which run at build. At the time of this decision it could use a Supabase-backed source; [ADR 0004](./0004-registry-driven-schema-and-public-content.md) later replaced that provider-specific path with the API's public content route. No privileged data client ships to the browser.
5. **Kept as-is** — Tailwind v4 theme pipeline, `@three-acts/utils` (`cn`/`cv`) component conventions, the AVIF post-build script (`scripts/optimize-images.mjs`, now over `dist/`), and the same-origin `/api/*` convention (Vite proxy in dev via `astro.config.mjs`, Vercel rewrite in prod).

`react-router-dom` was removed entirely: the only client route (`/dashboard`) is a self-contained hydrated component, and navigation is plain anchors (MPA).

## Consequences

- ~350 lines of bespoke SSR/prerender/island-runtime code are deleted; dev/build parity is Astro's responsibility (`astro dev` renders live data per request, `astro build` freezes it — same lifecycle as before).
- Hydration markers change from `data-island` divs to Astro's `<astro-island>` elements; island props must remain JSON-serializable (unchanged constraint).
- The Vercel project uses `framework: "astro"` with `outputDirectory: "dist"` (previously `dist/client`).
- `VITE_SITE_URL` feeds Astro's `site` config and is read as `import.meta.env.SITE`. The provider-specific web content variables that existed when this ADR was accepted were later removed by ADR 0004; current configuration is documented in `apps/web/.env.example`.
- Typechecking runs through `astro check` (covers `.astro` files as well as TS/TSX).

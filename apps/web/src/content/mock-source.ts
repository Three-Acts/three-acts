import type { ContentEntry, ContentSource } from "./content-source";

/**
 * Default content source. Ships seed data so `npm run build:web` produces a
 * complete static site with zero credentials. Swap in the API-backed source
 * by setting `CONTENT_SOURCE=api` (see `./index.ts`).
 */

const posts: ContentEntry[] = [
  {
    slug: "static-first-launch-playbook",
    title: "The static-first launch playbook",
    excerpt:
      "How Three Acts prerenders marketing pages to fast, indexable HTML while keeping editorial data in its own API.",
    body: "Static-first means the browser receives finished HTML, not a loading spinner. We fetch content from the project's own API at build time, prerender every marketing route, and ship zero JavaScript on pages that do not need it. Interactive pieces become islands that hydrate on their own.",
    coverImage: "/content/launch-playbook.png",
    publishedAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-28T12:00:00.000Z",
    author: "Three Acts",
    tags: ["performance", "seo", "workflow"]
  },
  {
    slug: "islands-without-a-framework",
    title: "Islands, the Astro way",
    excerpt:
      "Astro renders every route to static HTML by default and hydrates only the components that ask for it, with no bespoke runtime to maintain.",
    body: "An island is a self-contained React component that server-renders into the page's HTML and hydrates independently, once a `client:*` directive tells Astro it needs to run in the browser. Astro's own tiny hydration runtime finds each island marker and loads only that component's chunk, so a page with one interactive form ships one small script instead of a full app bundle. Everything else on the page stays static HTML.",
    coverImage: "/content/islands.png",
    publishedAt: "2026-06-25T09:00:00.000Z",
    author: "Three Acts",
    tags: ["astro", "react", "architecture"]
  },
  {
    slug: "publishing-from-the-cms",
    title: "Publishing from the CMS to Vercel",
    excerpt:
      "Editors change data, hit Publish, and watch a real Vercel deploy move from queued to ready.",
    body: "The CMS talks to a small server-side API that triggers a Vercel deploy hook and polls deployment status. The editor sees live progress: queued, building, and finally deployed. The static site rebuilds with the latest published content.",
    publishedAt: "2026-06-30T09:00:00.000Z",
    author: "Three Acts",
    tags: ["cms", "vercel", "workflow"]
  }
];

const sorted = [...posts].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
);

export const mockContentSource: ContentSource = {
  name: "mock",
  async listPosts() {
    return sorted.map((post) => ({ ...post }));
  },
  async getPost(slug) {
    const match = sorted.find((post) => post.slug === slug);
    return match ? { ...match } : null;
  }
};

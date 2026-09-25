import type { CmsRecord, CmsRecordValue } from "@three-acts/cms-schema";
import { seedCollections } from "@three-acts/cms-schema/seed";
import type { ContentEntry, ContentSource } from "./content-source";

/**
 * Default content source. Builds the blog from the shared "Fynbos & Fire"
 * seed (`@three-acts/cms-schema/seed`) — the same records the CMS mock and the
 * dev API serve — so `npm run build:web` produces a complete static site with
 * zero credentials. Swap in the API-backed source by setting
 * `CONTENT_SOURCE=api` (see `./index.ts`).
 *
 * Like the live site, it renders each article's `liveValues` snapshot and
 * skips articles that have none (never published), so draft edits don't show.
 */

/**
 * Cover images: seed covers are remote picsum.photos URLs. The shared
 * <Image> would render those as a plain <img> (no build-time fetch), but the
 * default build should also be viewable offline and keep going through the
 * local AVIF pipeline (`scripts/optimize-images.mjs`), so mock covers are
 * mapped onto the site's own images in `public/content/`, rotated
 * deterministically by position. The API source keeps real (remote) URLs.
 */
const LOCAL_COVERS = ["/content/launch-playbook.png", "/content/islands.png"];

function text(value: CmsRecordValue): string {
  return typeof value === "string" ? value.trim() : "";
}

const authorNames = new Map(
  (seedCollections.authors ?? []).map((author) => {
    const values = author.liveValues ?? author.values;
    return [text(values.slug), text(values.name)] as const;
  })
);

function toEntry(record: CmsRecord & { liveValues: Record<string, CmsRecordValue> }, index: number): ContentEntry {
  const values = record.liveValues;
  const authorSlug = text(values.author);
  const tags = text(values.tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    slug: text(values.slug),
    title: text(values.title),
    excerpt: text(values.excerpt),
    body: text(values.body),
    coverImage: text(values.coverImage) ? LOCAL_COVERS[index % LOCAL_COVERS.length] : undefined,
    publishedAt: text(values.publishedAt) || record.createdAt,
    updatedAt: record.modifiedAt,
    author: authorNames.get(authorSlug) || authorSlug || undefined,
    tags: tags.length > 0 ? tags : undefined
  };
}

const sorted: ContentEntry[] = (seedCollections.articles ?? [])
  .filter((record): record is CmsRecord & { liveValues: Record<string, CmsRecordValue> } => Boolean(record.liveValues))
  .map(toEntry)
  .filter((post) => post.slug.length > 0)
  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

export const mockContentSource: ContentSource = {
  name: "mock",
  async listPosts() {
    return sorted.map((post) => ({ ...post, tags: post.tags ? [...post.tags] : undefined }));
  },
  async getPost(slug) {
    const match = sorted.find((post) => post.slug === slug);
    return match ? { ...match, tags: match.tags ? [...match.tags] : undefined } : null;
  }
};

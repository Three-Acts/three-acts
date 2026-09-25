/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes } from "react";
import type { Author } from "@three-acts/content";
import { cn } from "@three-acts/utils";
import { Avatar } from "../../ui/avatar";

type AuthorSocialLink = { label: string; href: string };

/** `Author`'s social fields resolved into real hrefs — `websiteUrl`/`linkedinUrl` pass through, handles get their platform's URL prefix. Mirrors `page-meta/builders.ts`'s `authorMeta` `sameAs` list. */
export function authorSocialLinks(author: Author): AuthorSocialLink[] {
  const links: AuthorSocialLink[] = [];
  if (author.websiteUrl) links.push({ label: "Website", href: author.websiteUrl });
  if (author.xHandle) links.push({ label: "X", href: `https://x.com/${author.xHandle.replace(/^@/, "")}` });
  if (author.instagramHandle) links.push({ label: "Instagram", href: `https://www.instagram.com/${author.instagramHandle.replace(/^@/, "")}` });
  if (author.linkedinUrl) links.push({ label: "LinkedIn", href: author.linkedinUrl });
  return links;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

type AuthorCardProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  className?: string;
  author: Author;
};

/** The "written by" card at the end of an article: avatar, name (linked to `/authors/:slug`), role, a bio excerpt, and social links. */
function Root({ author, className, ...props }: AuthorCardProps) {
  const links = authorSocialLinks(author);

  return (
    <figure
      className={cn(
        "flex flex-col gap-5 border border-line bg-surface-raised p-6 landscape:flex-row landscape:items-start landscape:gap-6",
        className
      )}
      {...props}
    >
      <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
      <figcaption className="flex flex-1 flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-moss">Written by</p>
        <a href={`/authors/${author.slug}`} className="focus-ring font-serif text-xl font-semibold text-ink hover:text-accent">
          {author.name}
        </a>
        {author.role && <p className="text-sm text-muted">{author.role}</p>}
        {author.bio && <p className="text-sm leading-6 text-ink">{truncate(author.bio, 220)}</p>}
        {links.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-4">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring text-sm font-semibold text-ink hover:text-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  );
}

export const AuthorCard = {
  Root
};

export type { AuthorCardProps, AuthorSocialLink };

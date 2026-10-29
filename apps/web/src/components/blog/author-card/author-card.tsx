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

/** The "written by" module at the end of an article: avatar, name (linked to `/authors/:slug`), role, a bio excerpt, and social links, in a 1px black border on white. */
function Root({ author, className, ...props }: AuthorCardProps) {
  const links = authorSocialLinks(author);

  return (
    <figure
      className={cn(
        "flex flex-col gap-5 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-start landscape:gap-6 desktop:p-8",
        className
      )}
      {...props}
    >
      <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
      <figcaption className="flex flex-1 flex-col gap-2">
        <p className="text-small uppercase tracking-eyebrow text-ink">Written by</p>
        <a href={`/authors/${author.slug}`} className="focus-ring text-h3 font-medium text-ink hover:underline">
          {author.name}
        </a>
        {author.role && <p className="text-small text-ink">{author.role}</p>}
        {author.bio && <p className="text-body text-ink">{truncate(author.bio, 220)}</p>}
        {links.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-4">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring text-small text-ink underline decoration-1 underline-offset-4 hover:no-underline"
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

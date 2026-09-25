import type { HTMLAttributes } from "react";
import type { Author } from "@three-acts/content";
import { cn } from "@three-acts/utils";
import { Avatar, type AvatarSize } from "../../ui/avatar";
import { formatDate } from "../../../lib/format";

type BylineProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  className?: string;
  author?: Author;
  /** Links the author's name to `/authors/:slug`. Defaults to `true`; set `false` when already on that author's own page. */
  linkAuthor?: boolean;
  publishedAt?: string;
  readingTime?: number;
  avatarSize?: AvatarSize;
};

/** Author avatar (square) + name (linked to `/authors/:slug`) + date/reading-time, all in one row. Used on the lead article, the article header, and anywhere else a byline appears. */
export function Byline({ author, linkAuthor = true, publishedAt, readingTime, avatarSize = "sm", className, ...props }: BylineProps) {
  const metaParts = [publishedAt ? formatDate(publishedAt) : null, typeof readingTime === "number" ? `${readingTime} min read` : null].filter(
    (part): part is string => Boolean(part)
  );

  if (!author && metaParts.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      {author && <Avatar.Root name={author.name} src={author.avatar?.src} size={avatarSize} />}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink">
        {author &&
          (linkAuthor ? (
            <a href={`/authors/${author.slug}`} className="focus-ring font-medium text-ink hover:underline">
              {author.name}
            </a>
          ) : (
            <span className="font-medium text-ink">{author.name}</span>
          ))}
        {metaParts.length > 0 && (
          <span>
            {author && "· "}
            {metaParts.join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}

export type { BylineProps };

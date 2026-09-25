/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";
import { Avatar } from "../avatar";
import { Image } from "../image";
import { Price } from "../price";
import { Rating } from "../rating";

/** Plain, JSON-serializable image reference — Card never imports a domain image type. */
type CardImage = { src: string; alt: string; width?: number; height?: number };

const LINK_CARD =
  "focus-ring group flex flex-col overflow-hidden border border-line bg-surface-raised transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-soft";

type ProductProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  title: string;
  href: string;
  image: CardImage;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  /** Short line under the price, e.g. "Ethiopia · Washed". */
  excerpt?: string;
  /** Rendered above the title — an availability/category Badge, typically. */
  meta?: ReactNode;
};

/** A shop grid tile: image, title, optional meta badge, price. The whole card is one link. */
function Product({ title, href, image, price, compareAtPrice, currency, excerpt, meta, className, ...props }: ProductProps) {
  return (
    <article className={cn(LINK_CARD, className)} {...props}>
      <a href={href} className="flex flex-1 flex-col">
        <span className="aspect-square w-full overflow-hidden bg-surface">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width ?? 800}
            height={image.height ?? 800}
            className="size-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
          />
        </span>
        <span className="flex flex-1 flex-col gap-2 p-5">
          {meta && <span className="**:pointer-events-none">{meta}</span>}
          <span className="font-serif text-lg font-semibold leading-snug tracking-tight text-ink">{title}</span>
          {excerpt && <span className="text-sm text-muted">{excerpt}</span>}
          <span className="mt-auto pt-2">
            <Price.Root amount={price} compareAtPrice={compareAtPrice} currency={currency} />
          </span>
        </span>
      </a>
    </article>
  );
}

type ArticleProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  title: string;
  href: string;
  image?: CardImage;
  excerpt?: string;
  /** e.g. "5 min read · Brew guides". */
  meta?: ReactNode;
};

/** A journal grid tile: cover image, title, excerpt, meta line (read time, category, byline). */
function Article({ title, href, image, excerpt, meta, className, ...props }: ArticleProps) {
  return (
    <article className={cn(LINK_CARD, className)} {...props}>
      <a href={href} className="flex flex-1 flex-col">
        {image && (
          <span className="aspect-[16/10] w-full overflow-hidden bg-surface">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width ?? 900}
              height={image.height ?? 563}
              className="size-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
            />
          </span>
        )}
        <span className="flex flex-1 flex-col gap-2 p-5">
          {meta && <span className="text-xs font-semibold uppercase tracking-eyebrow text-moss">{meta}</span>}
          <span className="font-serif text-xl font-semibold leading-snug tracking-tight text-ink">{title}</span>
          {excerpt && <span className="text-sm leading-6 text-muted">{excerpt}</span>}
        </span>
      </a>
    </article>
  );
}

type CategoryProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  title: string;
  href: string;
  image?: CardImage;
  excerpt?: string;
};

/** A shop/journal category tile: image with a title overlay, optional description underneath. */
function Category({ title, href, image, excerpt, className, ...props }: CategoryProps) {
  return (
    <article className={cn(LINK_CARD, className)} {...props}>
      <a href={href} className="flex flex-1 flex-col">
        <span className="relative aspect-[4/3] w-full overflow-hidden bg-ink">
          {image && (
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width ?? 800}
              height={image.height ?? 600}
              className="size-full object-cover opacity-90 transition-transform duration-150 group-hover:scale-[1.02]"
            />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/80 to-transparent p-5 pt-10">
            <span className="font-serif text-xl font-semibold text-paper">{title}</span>
          </span>
        </span>
        {excerpt && <span className="p-5 text-sm leading-6 text-muted">{excerpt}</span>}
      </a>
    </article>
  );
}

type TestimonialProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  quote: string;
  customerName: string;
  customerTitle?: string;
  company?: string;
  avatar?: CardImage;
  rating?: number;
};

/** A customer quote card: not a link — a static blockquote with attribution and an optional rating. */
function Testimonial({ quote, customerName, customerTitle, company, avatar, rating, className, ...props }: TestimonialProps) {
  const byline = [customerTitle, company].filter(Boolean).join(", ");
  return (
    <figure className={cn("flex flex-col gap-4 border border-line bg-surface-raised p-6", className)} {...props}>
      {typeof rating === "number" && <Rating.Root value={rating} size="sm" />}
      <blockquote className="flex-1 text-lg leading-8 text-ink font-serif">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar.Root name={customerName} src={avatar?.src} size="sm" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-ink">{customerName}</span>
          {byline && <span className="text-xs text-muted">{byline}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

export const Card = {
  Article,
  Category,
  Product,
  Testimonial
};

export type { ArticleProps, CardImage, CategoryProps, ProductProps, TestimonialProps };

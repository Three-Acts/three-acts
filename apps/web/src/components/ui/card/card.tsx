/* eslint-disable react-refresh/only-export-components */
import { cmsAttributes, type CmsSource } from "@three-acts/cms-schema";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";
import { Avatar } from "../avatar";
import { Image } from "../image";
import { Price } from "../price";
import { Rating } from "../rating";

/** Plain, JSON-serializable image reference — Card never imports a domain image type. */
type CardImage = { src: string; alt: string; width?: number; height?: number };

const LINK_CARD = "focus-ring group flex flex-col border border-line-strong bg-surface";

/** The shared card image block: `bg-block`, always rendered even with no `image`. */
function CardMedia({ image, className, cmsSource, field }: { image?: CardImage; className?: string; cmsSource?: CmsSource; field?: string }) {
  return (
    <span {...cmsAttributes(cmsSource, field)} className={cn("block aspect-3/2 w-full overflow-hidden bg-block", className)}>
      {image && (
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width ?? 800}
          height={image.height ?? 1000}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}

type ProductProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  cmsSource?: CmsSource;
  title: string;
  href: string;
  image: CardImage;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  /** Short line under the price, e.g. "Ethiopia · Washed". Not shown in the compact grid treatment — kept for callers that still pass it. */
  excerpt?: string;
  /** Rendered above the title — an availability/category Badge, typically. */
  meta?: ReactNode;
};

/** A shop grid tile: 1px black border on white, image on top, price below. The whole card is one link — hover underlines the title. */
function Product({ title, href, image, price, compareAtPrice, currency, meta, className, cmsSource, ...props }: ProductProps) {
  return (
    <article className={cn(LINK_CARD, className)} {...props} {...cmsAttributes(cmsSource)}>
      <a href={href} className="flex flex-1 flex-col">
        <CardMedia image={image} cmsSource={cmsSource} field="images" />
        <span className="flex flex-1 flex-col gap-2 p-6">
          {meta && <span className="**:pointer-events-none">{meta}</span>}
          <span className="text-body font-medium text-ink group-hover:underline" {...cmsAttributes(cmsSource, "title")}>{title}</span>
          <Price.Root {...cmsAttributes(cmsSource, "price")} amount={price} compareAtPrice={compareAtPrice} currency={currency} className="text-small" />
        </span>
      </a>
    </article>
  );
}

type ArticleProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  cmsSource?: CmsSource;
  title: string;
  href: string;
  image?: CardImage;
  excerpt?: string;
  /** e.g. "5 min read", "12 Mar 2026 · 5 min read". */
  meta?: ReactNode;
  /** On the black band the card stays white, with a white border instead of black. */
  inverse?: boolean;
};

/** A journal grid tile: cover image, title, meta line (date · read time). White card, black hairline border (white border on the black band). */
function Article({ title, href, image, excerpt, meta, inverse, className, cmsSource, ...props }: ArticleProps) {
  return (
    <article className={cn(LINK_CARD, inverse && "border-surface", className)} {...props} {...cmsAttributes(cmsSource)}>
      <a href={href} className="flex flex-1 flex-col">
        <CardMedia image={image} cmsSource={cmsSource} field="coverImage" />
        <span className="flex flex-1 flex-col gap-2 p-6 text-ink">
          <span className="text-h3 font-medium group-hover:underline" {...cmsAttributes(cmsSource, "title")}>{title}</span>
          {excerpt && <span {...cmsAttributes(cmsSource, "excerpt")} className="text-body">{excerpt}</span>}
          {meta && <span className="text-small">{meta}</span>}
        </span>
      </a>
    </article>
  );
}

type CategoryProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  cmsSource?: CmsSource;
  title: string;
  href: string;
  image?: CardImage;
  excerpt?: string;
};

/** A shop/journal category tile: `aspect-tile`, 1px black border on white, name (and optional description) bottom-left; an optional image sits behind at reduced presence. */
function Category({ title, href, image, excerpt, className, cmsSource, ...props }: CategoryProps) {
  return (
    <article className={cn(LINK_CARD, className)} {...props} {...cmsAttributes(cmsSource)}>
      <a href={href} className="relative flex aspect-tile w-full flex-col justify-end overflow-hidden p-6">
        {image && (
          <Image {...cmsAttributes(cmsSource, "image")} src={image.src} alt="" width={image.width ?? 800} height={image.height ?? 800} className="absolute inset-0 size-full object-cover opacity-40" />
        )}
        <span className="relative flex flex-col gap-1">
          <span className="text-body font-medium text-ink group-hover:underline" {...cmsAttributes(cmsSource, "name")}>{title}</span>
          {excerpt && <span className="text-small text-ink" {...cmsAttributes(cmsSource, "description")}>{excerpt}</span>}
        </span>
      </a>
    </article>
  );
}

type TestimonialProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  cmsSource?: CmsSource;
  quote: string;
  customerName: string;
  customerTitle?: string;
  company?: string;
  avatar?: CardImage;
  rating?: number;
};

/** A customer quote card: not a link — a static blockquote with attribution and an optional rating, in a 1px black border on white. */
function Testimonial({ quote, customerName, customerTitle, company, avatar, rating, className, cmsSource, ...props }: TestimonialProps) {
  const byline = [customerTitle, company].filter(Boolean).join(", ");
  return (
    <figure className={cn("flex flex-col gap-4 border border-line-strong bg-surface p-6", className)} {...props} {...cmsAttributes(cmsSource)}>
      {typeof rating === "number" && <Rating.Root {...cmsAttributes(cmsSource, "rating")} value={rating} size="sm" />}
      <blockquote {...cmsAttributes(cmsSource, "quote")} className="flex-1 text-body text-ink">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar.Root {...cmsAttributes(cmsSource, "avatar")} name={customerName} src={avatar?.src} size="sm" />
        <span className="flex flex-col">
          <span className="text-small font-medium text-ink" {...cmsAttributes(cmsSource, "customerName")}>{customerName}</span>
          {byline && <span className="text-small text-ink">{customerTitle && <span {...cmsAttributes(cmsSource, "customerTitle")}>{customerTitle}</span>}{customerTitle && company && ", "}{company && <span {...cmsAttributes(cmsSource, "company")}>{company}</span>}</span>}
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

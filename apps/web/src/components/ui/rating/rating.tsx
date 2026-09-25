/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@three-acts/utils";

const STAR_PATH = "M10,1 L12.12,7.09 L18.56,7.22 L13.42,11.11 L15.29,17.28 L10,13.6 L4.71,17.28 L6.58,11.11 L1.44,7.22 L7.88,7.09 Z";

type RatingSize = "sm" | "md" | "lg";

const SIZE_PX: Record<RatingSize, number> = { sm: 14, md: 16, lg: 20 };

type RootProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  /** 0–5, fractional values fill a partial star (e.g. 3.5). */
  value: number;
  /** Review count shown after the stars, e.g. "(128)". Omit to show stars only. */
  count?: number;
  size?: RatingSize;
};

/** Black filled / gray empty stars — the numeric value is also exposed to assistive tech via `aria-label`. */
function Star({ fill, sizePx }: { fill: number; sizePx: number }) {
  const style: CSSProperties = { width: sizePx, height: sizePx };
  return (
    <span className="relative inline-block shrink-0" style={style} aria-hidden="true">
      <svg viewBox="0 0 20 20" className="absolute inset-0 size-full">
        <path d={STAR_PATH} fill="var(--color-block)" />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.round(fill * 100)}%` }}>
        <svg viewBox="0 0 20 20" style={style}>
          <path d={STAR_PATH} fill="var(--color-ink)" />
        </svg>
      </span>
    </span>
  );
}

/** A 0–5 star rating, e.g. on Card.Product and product reviews. Always pass the real numeric value in `aria-label`, never rely on fill alone. */
function Root({ value, count, size = "md", className, ...props }: RootProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const sizePx = SIZE_PX[size];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)} {...props}>
      <span className="flex items-center gap-0.5" role="img" aria-label={`${clamped} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} fill={Math.max(0, Math.min(1, clamped - index))} sizePx={sizePx} />
        ))}
      </span>
      {typeof count === "number" && <span className="text-small text-ink">({count})</span>}
    </div>
  );
}

export const Rating = {
  Root
};

export type { RatingSize, RootProps as RatingRootProps };

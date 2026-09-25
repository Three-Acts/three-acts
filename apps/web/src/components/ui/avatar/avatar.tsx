/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes } from "react";
import { cn } from "@three-acts/utils";
import { Image } from "../image";

type AvatarSize = "sm" | "md" | "lg";

const SIZE: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg"
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

type RootProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  className?: string;
  /** Photo URL. Omit to fall back to initials derived from `name`. */
  src?: string;
  /** Person's full name — used for the image `alt` and for the initials fallback. */
  name: string;
  size?: AvatarSize;
};

/** A person's photo (author byline, testimonial, reviewer) with an initials fallback when there's no image. Square, per the system's radius-0 shape language. */
function Root({ src, name, size = "md", className, ...props }: RootProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-block font-medium text-ink",
        SIZE[size],
        className
      )}
      {...props}
    >
      {src ? (
        <Image src={src} alt={name} className="size-full object-cover" width={128} height={128} />
      ) : (
        <span role="img" aria-label={name}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}

export const Avatar = {
  Root
};

export type { AvatarSize, RootProps as AvatarRootProps };

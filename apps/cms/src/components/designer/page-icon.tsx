import { Database, File, House } from "lucide-react";
import type { ComponentProps } from "react";

type PageIconProps = {
  route?: string;
  collectionId?: string;
  size?: number;
  className?: string;
} & Omit<ComponentProps<typeof File>, "size" | "className">;

/** A shared page and collection marker for the designer's page navigation. */
export function PageIcon({ route, collectionId, size = 14, className, ...props }: PageIconProps) {
  const iconClassName = `shrink-0 ${className ?? ""}`.trim();
  const iconProps = { "aria-hidden": true as const, className: iconClassName || undefined, size, ...props };

  if (!collectionId) return route === "/" ? <House {...iconProps} /> : <File {...iconProps} />;

  return <Database {...iconProps} />;
}

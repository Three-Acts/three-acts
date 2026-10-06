import { Database, File, House, Newspaper, Package, Tags, UserRound } from "lucide-react";
import type { ComponentProps } from "react";

type PageIconProps = {
  route?: string;
  collectionId?: string;
  size?: number;
  className?: string;
} & Omit<ComponentProps<typeof File>, "size" | "className">;

/** A shared page and collection marker for the designer's page navigation. */
export function PageIcon({ route, collectionId, size = 14, className, ...props }: PageIconProps) {
  const iconClassName = `shrink-0 ${className ?? ""} ${collectionId ? "text-violet-400" : ""}`.trim();
  const iconProps = { "aria-hidden": true as const, className: iconClassName || undefined, size, ...props };

  if (!collectionId) return route === "/" ? <House {...iconProps} /> : <File {...iconProps} />;

  switch (collectionId.toLocaleLowerCase()) {
    case "products": return <Package {...iconProps} />;
    case "articles": return <Newspaper {...iconProps} />;
    case "authors": return <UserRound {...iconProps} />;
    case "product-categories":
    case "article-categories":
    case "categories": return <Tags {...iconProps} />;
    default: return <Database {...iconProps} />;
  }
}

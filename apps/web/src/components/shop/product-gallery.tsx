import type { ImageRef } from "@three-acts/ecommerce";
import { Image } from "../ui/image";

type ProductGalleryProps = {
  images: readonly ImageRef[];
  /** Fallback `alt` text for any image whose own `alt` is empty. */
  title: string;
  className?: string;
};

/**
 * Zero-JS product gallery: the first image renders large and eager; any
 * remaining images render underneath as a plain static strip — real `<img>`s,
 * no lightbox, no `<a href="#img-n">` linking, no client JS at all.
 */
export function ProductGallery({ images, title, className }: ProductGalleryProps) {
  const [first, ...rest] = images;

  if (!first) {
    return (
      <div className={className}>
        <div className="flex aspect-square w-full items-center justify-center border border-line bg-surface-raised text-sm text-muted">No image available</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="aspect-square w-full overflow-hidden border border-line bg-surface-raised">
        <Image
          src={first.src}
          alt={first.alt || title}
          width={first.width ?? 1200}
          height={first.height ?? 1200}
          loading="eager"
          className="size-full object-cover"
        />
      </div>
      {rest.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {rest.map((image, index) => (
            <div key={index} className="aspect-square overflow-hidden border border-line bg-surface-raised">
              <Image src={image.src} alt={image.alt || title} width={image.width ?? 400} height={image.height ?? 400} className="size-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductGallery;

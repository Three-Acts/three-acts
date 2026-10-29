import type { ImgHTMLAttributes } from "react";

const RASTER_PATTERN = /\.(png|jpe?g|webp)$/i;

function isLocalRaster(src: string) {
  return src.startsWith("/") && RASTER_PATTERN.test(src);
}

function avifSrc(src: string) {
  return src.replace(RASTER_PATTERN, ".avif");
}

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
};

/**
 * Zero-JS responsive image.
 *
 * For locally-owned raster images (served from `public/`), the build step
 * (`scripts/optimize-images.mjs`) emits an `.avif` sibling. This renders a
 * `<picture>` with an AVIF `<source>` and the original as fallback — pure HTML,
 * so it works on static pages that ship no JavaScript.
 *
 * External / CDN images pass through as a plain `<img>` (no AVIF assumptions).
 */
export function Image({ src, alt, loading = "lazy", decoding = "async", ...props }: ImageProps) {
  if (!isLocalRaster(src)) {
    return <img src={src} alt={alt} loading={loading} decoding={decoding} {...props} />;
  }

  return (
    <picture>
      <source srcSet={avifSrc(src)} type="image/avif" />
      <img src={src} alt={alt} loading={loading} decoding={decoding} {...props} />
    </picture>
  );
}

import { useState } from "react";
import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { eyebrowClass } from "../../atoms";
import { breadcrumbUrl, clip, DESCRIPTION_LIMIT, hostOf, TITLE_LIMIT } from "./seo";

// Previews are approximations drawn in the workspace palette rather than
// pixel copies of Google or a social network: they exist to show truncation,
// fallbacks and the title template at a glance, not to impersonate a product.

function PreviewFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <figure className="m-0 grid max-w-2xl gap-2">
      <figcaption className={eyebrowClass}>{label}</figcaption>
      {children}
    </figure>
  );
}

type SearchResultPreviewProps = {
  description: string;
  faviconSrc: string;
  siteName: string;
  title: string;
  url: string;
};

export function SearchResultPreview({ description, faviconSrc, siteName, title, url }: SearchResultPreviewProps) {
  const [failedFavicon, setFailedFavicon] = useState<string | null>(null);
  return (
    <PreviewFrame label="Search result">
      <div className="grid gap-1.5 rounded-cms-lg border border-cms-line-strong bg-cms-surface p-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-cms-raised">
            {faviconSrc && failedFavicon !== faviconSrc ? (
              <img alt="" className="size-4 object-contain" onError={() => setFailedFavicon(faviconSrc)} src={faviconSrc} />
            ) : <Globe aria-hidden="true" className="text-cms-subtle" size={12} />}
          </span>
          <span className="grid min-w-0">
            <span className="truncate text-ui text-cms-text">{siteName || hostOf(url)}</span>
            <span className="truncate text-micro text-cms-subtle">{breadcrumbUrl(url)}</span>
          </span>
        </div>
        <p className="m-0 text-field font-medium text-cms-pending">{clip(title, TITLE_LIMIT) || "Untitled page"}</p>
        <p className="m-0 line-clamp-3 text-ui leading-5 text-cms-muted">
          {description ? clip(description, DESCRIPTION_LIMIT) : <span className="text-cms-subtle">No description — search engines will pick text from the page.</span>}
        </p>
      </div>
    </PreviewFrame>
  );
}

type SocialCardPreviewProps = {
  description: string;
  imageSrc: string;
  title: string;
  url: string;
};

export function SocialCardPreview({ description, imageSrc, title, url }: SocialCardPreviewProps) {
  // Mock-storage and not-yet-deployed URLs may not resolve; omit the image frame rather than showing a broken image.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasImage = Boolean(imageSrc && failedSrc !== imageSrc);
  return (
    <PreviewFrame label="Social share">
      <div className="overflow-hidden rounded-cms-lg border border-cms-line-strong bg-cms-surface">
        {hasImage ? (
          <div className="grid aspect-[1200/630] place-items-center overflow-hidden border-b border-cms-line bg-cms-raised">
            <img alt="" className="size-full object-cover" onError={() => setFailedSrc(imageSrc)} src={imageSrc} />
          </div>
        ) : null}
        <div className="grid gap-0.5 px-3 py-2.5">
          <span className="truncate text-micro uppercase tracking-label text-cms-subtle">{hostOf(url)}</span>
          <p className="m-0 line-clamp-2 text-ui-lg font-semibold text-cms-text">{title || "Untitled page"}</p>
          {description ? <p className="m-0 line-clamp-2 text-ui text-cms-muted">{description}</p> : null}
        </div>
      </div>
    </PreviewFrame>
  );
}

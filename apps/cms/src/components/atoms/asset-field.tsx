import { useState } from "react";
import { FileText, Film, Image as ImageIcon } from "lucide-react";
import { getAssetMeta } from "./asset-meta";
import { AssetTile } from "./asset-tile";
import { FileDropZone } from "./file-drop-zone";
import { fileNameFromMedia, formatFileSize } from "./file-utils";

type AssetKind = "image" | "video" | "file";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

function kindFromAccept(accept?: string): AssetKind {
  if (accept?.startsWith("image/")) {
    return "image";
  }

  if (accept?.startsWith("video/")) {
    return "video";
  }

  return "file";
}

/** Extension first (the value the field actually holds); `accept` only fills in when the extension is inconclusive. */
function kindFromUrl(url: string, accept?: string): AssetKind {
  const path = url.split(/[?#]/)[0];
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  return kindFromAccept(accept);
}

/**
 * Returns an icon element rather than a component reference: assigning the
 * component itself to a variable and rendering it as `<Icon />` recreates a
 * "component" on every render, which `react-hooks/static-components` flags.
 */
function renderKindIcon(kind: AssetKind, size: number) {
  if (kind === "image") {
    return <ImageIcon aria-hidden="true" className="text-cms-muted" size={size} />;
  }

  if (kind === "video") {
    return <Film aria-hidden="true" className="text-cms-muted" size={size} />;
  }

  return <FileText aria-hidden="true" className="text-cms-muted" size={size} />;
}

function kindNoun(kind: AssetKind): string {
  if (kind === "image") {
    return "image";
  }

  if (kind === "video") {
    return "video";
  }

  return "file";
}

type AssetControlProps = {
  accept?: string;
  /** Id of whichever file input is currently mounted, so `FormField`'s label stays wired to it. */
  inputId: string;
  isUploading: boolean;
  onClear: () => void;
  onFile: (file: File) => void;
  value: string;
  readOnly?: boolean;
};

/** Webflow-style asset picker: a drop zone when empty, a preview card with actions once a file is set. */
export function AssetControl({ accept, inputId, isUploading, onClear, onFile, value, readOnly }: AssetControlProps) {
  const [hasRejectedFile, setHasRejectedFile] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Reset the per-file UI state whenever the stored value itself changes
  // (a fresh upload, a replace, a record switch) — set during render, the
  // same "adjust state when a prop changes" shape `useCmsWorkspace` already
  // uses for `prevFilteredRecords`, not inside an effect.
  const [trackedValue, setTrackedValue] = useState(value);
  if (value !== trackedValue) {
    setTrackedValue(value);
    setHasRejectedFile(false);
    setMediaFailed(false);
    setNaturalSize(null);
  }

  function acceptFile(file: File) {
    setHasRejectedFile(false);
    onFile(file);
  }

  if (!value) {
    if (readOnly) {
      return <p className="m-0 text-ui text-cms-subtle">No asset</p>;
    }
    const kind = kindFromAccept(accept);

    return (
      <div className="grid gap-1.5">
        <FileDropZone
          accept={accept}
          icon={renderKindIcon(kind, 20)}
          inputId={inputId}
          isUploading={isUploading}
          onFiles={(files) => {
            const file = files[0];
            if (file) {
              acceptFile(file);
            }
          }}
          onRejected={() => setHasRejectedFile(true)}
          subtitle="or click to browse for a file"
          title={`Drag your ${kindNoun(kind)} here`}
        />
        <AssetTile.RejectedNote visible={hasRejectedFile} />
      </div>
    );
  }

  const kind = kindFromUrl(value, accept);
  const meta = getAssetMeta(value);
  const fileName = fileNameFromMedia({ src: value, fileName: meta?.fileName });
  const dimensionLabel = kind === "image" && naturalSize ? `${naturalSize.width} × ${naturalSize.height}` : null;
  const sizeLabel = meta ? formatFileSize(meta.size) : null;
  const detailLabel = [dimensionLabel, sizeLabel].filter(Boolean).join(" • ");

  return (
    <div className="grid gap-1.5">
      <AssetTile.Root label={fileName}>
        <AssetTile.Preview>
          {kind === "image" && !mediaFailed ? (
            <img
              alt=""
              className="size-full object-cover"
              onError={() => setMediaFailed(true)}
              onLoad={(event) => {
                const target = event.currentTarget;
                setNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
              }}
              src={value}
            />
          ) : kind === "video" && !mediaFailed ? (
            <video
              className="size-full object-contain"
              muted
              onError={() => setMediaFailed(true)}
              playsInline
              preload="metadata"
              src={value}
            />
          ) : (
            <AssetTile.Icon>{renderKindIcon(kind, 22)}</AssetTile.Icon>
          )}
        </AssetTile.Preview>
        <AssetTile.Details>
          <div className="min-w-0 px-0.5">
            <AssetTile.Title>{fileName}</AssetTile.Title>
            {detailLabel ? <AssetTile.Meta>{detailLabel}</AssetTile.Meta> : null}
          </div>
          <AssetTile.OpenLink href={value} label={`Open ${fileName} in new tab`}>Open</AssetTile.OpenLink>
          {readOnly ? null : (
            <AssetTile.Actions>
              <AssetTile.Replace
                accept={accept}
                inputId={inputId}
                isUploading={isUploading}
                onFile={acceptFile}
                onRejected={() => setHasRejectedFile(true)}
              />
              <AssetTile.Delete onClick={onClear} />
            </AssetTile.Actions>
          )}
        </AssetTile.Details>
      </AssetTile.Root>
      <AssetTile.RejectedNote visible={hasRejectedFile} />
    </div>
  );
}

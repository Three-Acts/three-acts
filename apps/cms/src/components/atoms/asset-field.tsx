import { useState } from "react";
import { ArrowUpRight, FileText, Film, Image as ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@three-acts/utils";
import { BareIconButton } from "./bare-icon-button";
import { getAssetMeta } from "./asset-meta";
import { Button } from "./button";
import { FileDropZone } from "./file-drop-zone";
import { matchesAccept } from "./file-utils";
import { Tooltip } from "./tooltip";
import { buttonVariants, fileLabelFocusRing } from "./styles";

type AssetKind = "image" | "video" | "file";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const BYTE_UNITS = ["B", "kB", "MB", "GB", "TB"];

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

function formatFileSize(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  const rounded = value.toFixed(1).replace(/\.0$/, "");
  return `${rounded} ${BYTE_UNITS[unitIndex]}`;
}

function fileNameFromUrl(url: string): string {
  const path = url.split(/[?#]/)[0];
  const segment = path.slice(path.lastIndexOf("/") + 1);

  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

type AssetControlProps = {
  accept?: string;
  /** Id of whichever file input is currently mounted, so `FormField`'s label stays wired to it. */
  inputId: string;
  isUploading: boolean;
  onClear: () => void;
  onFile: (file: File) => void;
  value: string;
};

/** Webflow-style asset picker: a drop zone when empty, a preview card with actions once a file is set. */
export function AssetControl({ accept, inputId, isUploading, onClear, onFile, value }: AssetControlProps) {
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
    if (!matchesAccept(file, accept)) {
      setHasRejectedFile(true);
      return;
    }
    setHasRejectedFile(false);
    onFile(file);
  }

  const errorMessage = hasRejectedFile ? <p className="m-0 text-ui text-cms-danger">That file type isn&apos;t accepted here.</p> : null;

  if (!value) {
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
        {errorMessage}
      </div>
    );
  }

  const kind = kindFromUrl(value, accept);
  const meta = getAssetMeta(value);
  const fileName = meta?.fileName ?? fileNameFromUrl(value);
  const dimensionLabel = kind === "image" && naturalSize ? `${naturalSize.width} × ${naturalSize.height}` : null;
  const sizeLabel = meta ? formatFileSize(meta.size) : null;
  const detailLabel = [dimensionLabel, sizeLabel].filter(Boolean).join(" • ");

  return (
    <div className="grid gap-1.5">
      <div className="relative flex items-center gap-3 rounded-cms border border-cms-line-strong bg-cms-surface p-2 pr-9">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-cms bg-cms-bg">
          {kind === "image" && !mediaFailed ? (
            <img
              alt=""
              className="size-full object-contain"
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
            renderKindIcon(kind, 22)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-ui font-medium text-cms-text">{fileName}</p>
          {detailLabel ? <p className="m-0 truncate text-ui text-cms-subtle">{detailLabel}</p> : null}
        </div>
        <Tooltip content="Open">
          <BareIconButton
            aria-label="Open file in new tab"
            className="absolute right-2 top-2"
            nativeButton={false}
            render={<a href={value} rel="noreferrer" target="_blank" />}
          >
            <ArrowUpRight aria-hidden="true" size={13} />
          </BareIconButton>
        </Tooltip>
      </div>

      <div className="flex gap-1.5">
        <label className={cn(buttonVariants({ variant: "normal" }), isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer", fileLabelFocusRing)}>
          <RefreshCw aria-hidden="true" size={13} />
          Replace
          <input
            accept={accept}
            className="sr-only"
            disabled={isUploading}
            id={inputId}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                acceptFile(file);
              }
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        <Button className="text-cms-muted hover:text-cms-danger" onClick={onClear}>
          <Trash2 aria-hidden="true" size={13} />
          Delete
        </Button>
      </div>
      {errorMessage}
    </div>
  );
}

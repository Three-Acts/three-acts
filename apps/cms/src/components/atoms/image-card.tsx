import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { Image as ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { ImageValue } from "../../cms/types";
import { Button } from "./button";
import { fileNameFromImage, formatFileSize, matchesAccept } from "./file-utils";
import { Input } from "./input";
import { buttonVariants, fileLabelFocusRing } from "./styles";

type ImageCardProps = {
  image: ImageValue;
  accept?: string;
  readOnly?: boolean;
  isUploading?: boolean;
  /** Alt-text edits; omitted in read-only mode, where the alt just displays. */
  onAltChange?: (alt: string) => void;
  /** Per-item replace; omitted when the card has no replace action. */
  onReplace?: (file: File) => void;
  onDelete?: () => void;
  /** Fired when a Replace pick fails the `accept` filter, so the control can show its rejection note. */
  onRejected?: () => void;
  /** Id for the replace file input; required when `onReplace` is set. */
  replaceInputId?: string;
  /** Gallery reorder: the whole card is natively draggable, no handle. */
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  onMoveKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  /** Accessible position label, e.g. "Image 2 of 5". */
  positionLabel?: string;
};

/**
 * Reusable full-width image card: a wide preview over the filename,
 * resolution/size meta, an alt-text input, and Replace + quiet Delete
 * (hover-danger) actions. Used populated by the single image control and per
 * item by the gallery control.
 */
export function ImageCard({
  image,
  accept,
  readOnly,
  isUploading,
  onAltChange,
  onReplace,
  onDelete,
  onRejected,
  replaceInputId,
  draggable,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveKeyDown,
  positionLabel
}: ImageCardProps) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const fileName = fileNameFromImage(image);
  const resolution = image.width && image.height ? `${image.width} × ${image.height}` : naturalSize ? `${naturalSize.width} × ${naturalSize.height}` : null;
  const sizeLabel = image.size !== undefined ? formatFileSize(image.size) : null;
  const detailLabel = [resolution, sizeLabel].filter(Boolean).join(" • ");
  const canReplace = Boolean(onReplace && replaceInputId) && !readOnly;
  const canDelete = Boolean(onDelete) && !readOnly;

  return (
    <article
      aria-label={positionLabel ? `${positionLabel}: ${fileName}` : fileName}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-2 rounded-cms border border-cms-line-strong bg-cms-surface p-2 transition-opacity",
        isDragging && "opacity-50",
        isDropTarget && "border-cms-accent"
      )}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onKeyDown={onMoveKeyDown}
      tabIndex={draggable ? 0 : undefined}
    >
      <div className="aspect-square h-full min-h-0 w-auto overflow-hidden rounded-cms bg-cms-bg">
        {mediaFailed ? (
          <div className="grid h-full w-full place-items-center">
            <ImageIcon aria-hidden="true" className="text-cms-muted" size={22} />
          </div>
        ) : (
          <img
            alt={image.alt ?? ""}
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => setMediaFailed(true)}
            onLoad={(event) => {
              const target = event.currentTarget;
              setNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
            }}
            src={image.src}
          />
        )}
      </div>

      <div className="grid min-w-0 content-start gap-1.5">
        <div className="min-w-0 px-0.5">
          <p className="m-0 truncate text-ui font-medium text-cms-text">{fileName}</p>
          {detailLabel ? <p className="m-0 truncate text-ui text-cms-subtle">{detailLabel}</p> : null}
        </div>

        {readOnly ? (
          image.alt ? (
            <p className="m-0 truncate px-0.5 text-ui text-cms-subtle">Alt: {image.alt}</p>
          ) : null
        ) : (
          <Input
            aria-label={`Alt text for ${fileName}`}
            onChange={(event) => onAltChange?.(event.target.value)}
            placeholder="Alt text…"
            value={image.alt ?? ""}
          />
        )}

        {canReplace || canDelete ? (
          <div className="flex gap-1.5">
            {canReplace ? (
              <label
                className={cn(
                  buttonVariants({ variant: "normal" }),
                  isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                  fileLabelFocusRing
                )}
              >
                <RefreshCw aria-hidden="true" size={13} />
                Replace
                <input
                  accept={accept}
                  className="sr-only"
                  disabled={isUploading}
                  id={replaceInputId}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      if (matchesAccept(file, accept)) {
                        onReplace?.(file);
                      } else {
                        onRejected?.();
                      }
                    }
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            ) : null}
            {canDelete ? (
              <Button className="text-cms-muted hover:text-cms-danger" onClick={onDelete} variant="ghost">
                <Trash2 aria-hidden="true" size={13} />
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

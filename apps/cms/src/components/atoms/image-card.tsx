import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { ImageValue } from "../../cms/types";
import { AssetTile } from "./asset-tile";
import { fileNameFromImage, formatFileSize } from "./file-utils";
import { Input } from "./input";

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
 * Single image / gallery item card, composed from `AssetTile` pieces: square
 * preview left, filename + resolution/size meta + alt caption + Replace and
 * quiet Delete right. Gallery drag/keyboard ride on `AssetTile.Root`.
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
    <AssetTile.Root
      label={positionLabel ? `${positionLabel}: ${fileName}` : fileName}
      draggable={draggable}
      isDragging={isDragging}
      isDropTarget={isDropTarget}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMoveKeyDown={onMoveKeyDown}
    >
      <AssetTile.Preview>
        {mediaFailed ? (
          <AssetTile.Icon>
            <ImageIcon aria-hidden="true" className="text-cms-muted" size={22} />
          </AssetTile.Icon>
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
      </AssetTile.Preview>

      <AssetTile.Details>
        <div className="min-w-0 px-0.5">
          <AssetTile.Title>{fileName}</AssetTile.Title>
          {detailLabel ? <AssetTile.Meta>{detailLabel}</AssetTile.Meta> : null}
        </div>

        <AssetTile.Caption>
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
        </AssetTile.Caption>

        {canReplace || canDelete ? (
          <AssetTile.Actions>
            {canReplace ? (
              <AssetTile.Replace
                accept={accept}
                inputId={replaceInputId as string}
                isUploading={isUploading}
                onFile={(file) => onReplace?.(file)}
                onRejected={onRejected}
              />
            ) : null}
            <AssetTile.Delete onClick={canDelete ? onDelete : undefined} />
          </AssetTile.Actions>
        ) : null}
      </AssetTile.Details>
    </AssetTile.Root>
  );
}

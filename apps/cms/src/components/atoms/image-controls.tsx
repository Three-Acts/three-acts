import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import { parseImageGallery, parseImageValue } from "../../cms/types";
import type { ImageGalleryField, ImageField, ImageValue } from "../../cms/types";
import { FileDropZone } from "./file-drop-zone";
import { ImageCard } from "./image-card";

function RejectedNote({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }
  return <p className="m-0 text-ui text-cms-danger">That file type isn&apos;t accepted here.</p>;
}

type ImageControlProps = {
  field: ImageField;
  /** Stored value: ImageValue JSON or a legacy plain URL. */
  value: string;
  inputId: string;
  isUploading: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onAltChange: (alt: string) => void;
  readOnly?: boolean;
};

/** Single image: an empty dropzone, or the populated full-width image card. */
export function ImageControl({ field, value, inputId, isUploading, onFile, onClear, onAltChange, readOnly }: ImageControlProps) {
  const [hasRejectedFile, setHasRejectedFile] = useState(false);
  const image = parseImageValue(value);

  if (!image) {
    if (readOnly) {
      return <p className="m-0 text-ui text-cms-subtle">No image</p>;
    }

    return (
      <div className="grid gap-1.5">
        <FileDropZone
          accept={field.accept}
          icon={<ImageIcon aria-hidden="true" className="text-cms-muted" size={20} />}
          inputId={inputId}
          isUploading={isUploading}
          onFiles={(files) => {
            const file = files[0];
            if (file) {
              setHasRejectedFile(false);
              onFile(file);
            }
          }}
          onRejected={() => setHasRejectedFile(true)}
          subtitle="or click to browse for a file"
          title="Drag your image here"
        />
        <RejectedNote visible={hasRejectedFile} />
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <ImageCard
        accept={field.accept}
        image={image}
        isUploading={isUploading}
        onAltChange={onAltChange}
        onDelete={onClear}
        onRejected={() => setHasRejectedFile(true)}
        onReplace={(file) => {
          setHasRejectedFile(false);
          onFile(file);
        }}
        readOnly={readOnly}
        replaceInputId={inputId}
      />
      <RejectedNote visible={hasRejectedFile} />
    </div>
  );
}

type ImageGalleryControlProps = {
  field: ImageGalleryField;
  /** Stored value: ImageValue[] JSON (or legacy single URL / empty). */
  value: string;
  /** Base id; the dropzone and per-item replace inputs derive theirs from it. */
  inputIdBase: string;
  isUploading: boolean;
  onAddFiles: (files: File[]) => void;
  onReplaceItem: (index: number, file: File) => void;
  onRemoveItem: (index: number) => void;
  onAltChange: (index: number, alt: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  readOnly?: boolean;
};

/**
 * Gallery: always a multi-file dropzone, then the stacked image cards. Every
 * card is natively draggable (no handle) and ArrowUp/ArrowDown reorder from
 * the keyboard; moves are announced through an aria-live region.
 */
export function ImageGalleryControl({
  field,
  value,
  inputIdBase,
  isUploading,
  onAddFiles,
  onReplaceItem,
  onRemoveItem,
  onAltChange,
  onReorder,
  readOnly
}: ImageGalleryControlProps) {
  const [hasRejectedFile, setHasRejectedFile] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const items: ImageValue[] = parseImageGallery(value);
  const atMax = field.maxItems !== undefined && items.length >= field.maxItems;
  const keyOccurrences = new Map<string, number>();

  function announce(from: number, to: number) {
    setAnnouncement(`Image ${from + 1} moved to position ${to + 1} of ${items.length}.`);
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) {
      return;
    }
    onReorder(from, to);
    announce(from, to);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    move(index, event.key === "ArrowUp" ? index - 1 : index + 1);
  }

  function handleDragStart(index: number, event: DragEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, input, label, a")) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    // Some browsers need payload data before dragstart fires drop targets.
    event.dataTransfer.setData("text/plain", String(index));
    setDragIndex(index);
  }

  function handleDragOver(index: number, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }

  function handleDrop(index: number, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const from = dragIndex ?? Number(event.dataTransfer.getData("text/plain"));
    setDragIndex(null);
    setDropIndex(null);
    if (Number.isInteger(from) && from >= 0 && from < items.length) {
      move(from, index);
    }
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className="grid gap-2">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {readOnly ? null : (
        <div className="grid gap-1.5">
          <FileDropZone
            accept={field.accept}
            icon={<ImageIcon aria-hidden="true" className="text-cms-muted" size={20} />}
            inputId={`${inputIdBase}-add`}
            disabled={atMax}
            isUploading={isUploading}
            multiple
            onFiles={(files) => {
              setHasRejectedFile(false);
              onAddFiles(files);
            }}
            onRejected={() => setHasRejectedFile(true)}
            subtitle="or click to browse for files"
            title={atMax ? `Maximum of ${field.maxItems} images reached` : items.length === 0 ? "Drag your images here" : "Drag more images here"}
          />
          <RejectedNote visible={hasRejectedFile} />
        </div>
      )}
      {atMax && !readOnly ? (
        <p className="m-0 text-ui text-cms-subtle">
          Maximum of {field.maxItems} image{field.maxItems === 1 ? "" : "s"} reached — remove one to add another.
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-2" role="list" aria-label={`${field.label} images`}>
          {items.map((image, index) => {
            const occurrence = (keyOccurrences.get(image.src) ?? 0) + 1;
            keyOccurrences.set(image.src, occurrence);

            return (
              <div key={`${image.src}#${occurrence}`} role="listitem">
                <ImageCard
                  accept={field.accept}
                  draggable={!readOnly && !isUploading}
                  image={image}
                  isDragging={dragIndex === index}
                  isDropTarget={dropIndex === index && dragIndex !== index}
                  isUploading={isUploading}
                  onAltChange={(alt) => onAltChange(index, alt)}
                  onDelete={isUploading ? undefined : () => onRemoveItem(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(event) => handleDragOver(index, event)}
                  onDragStart={(event) => handleDragStart(index, event)}
                  onDrop={(event) => handleDrop(index, event)}
                  onMoveKeyDown={(event) => handleKeyDown(index, event)}
                  onRejected={() => setHasRejectedFile(true)}
                  onReplace={isUploading ? undefined : (file) => onReplaceItem(index, file)}
                  positionLabel={`Image ${index + 1} of ${items.length}`}
                  readOnly={readOnly}
                  replaceInputId={`${inputIdBase}-${index}`}
                />
              </div>
            );
          })}
        </div>
      ) : readOnly ? <p className="m-0 text-ui text-cms-subtle">No images</p> : null}
    </div>
  );
}

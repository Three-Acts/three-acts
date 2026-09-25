import { useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@three-acts/utils";
import { Button } from "./button";
import { matchesAccept } from "./file-utils";

type FileDropZoneProps = {
  accept?: string;
  /** Allow selecting/dropping several files at once (galleries). Single file otherwise. */
  multiple?: boolean;
  /** Id of the hidden file input, so `FormField`'s label stays wired to it. */
  inputId: string;
  disabled?: boolean;
  isUploading?: boolean;
  uploadingLabel?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Only files matching `accept`; rejected files go to `onRejected` instead. */
  onFiles: (files: File[]) => void;
  onRejected?: () => void;
  className?: string;
};

/**
 * Reusable drag-and-drop file target: the dashed drop zone the asset, image,
 * and gallery controls all share when they need files from the editor.
 * Accept-filtering lives here so every control rejects the same way.
 */
export function FileDropZone({
  accept,
  multiple,
  inputId,
  disabled,
  isUploading,
  uploadingLabel = "Uploading…",
  title,
  subtitle,
  icon,
  onFiles,
  onRejected,
  className
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFiles(files: FileList | null) {
    if (!files || disabled || isUploading) {
      return;
    }

    const list = Array.from(files);
    if (list.length === 0) {
      return;
    }

    const valid = list.filter((file) => matchesAccept(file, accept));
    if (valid.length > 0) {
      onFiles(multiple ? valid : valid.slice(0, 1));
    }
    // Notify after accepted files so a mixed gallery batch cannot immediately
    // clear the rejection message while still keeping its valid files.
    if (valid.length < list.length) {
      onRejected?.();
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!disabled && !isUploading) {
      acceptFiles(event.dataTransfer.files);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-28 flex-col items-center justify-center gap-1 rounded-cms border border-dashed border-cms-track bg-cms-surface px-4 py-4 text-center transition-colors [overflow-anchor:none]",
        disabled || isUploading ? "opacity-60" : null,
        isDragging && "border-cms-accent bg-cms-raised",
        className
      )}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin text-cms-muted" size={20} />
          <span className="text-ui font-medium text-cms-text">{uploadingLabel}</span>
        </>
      ) : (
        <>
          {icon}
          <span className="text-ui font-medium text-cms-text">{title}</span>
          {subtitle ? <span className="text-ui text-cms-subtle">{subtitle}</span> : null}
          <Button className="mt-1" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden="true" size={12} />
            Browse files
          </Button>
        </>
      )}
      <input
        accept={accept}
        aria-label={`${title}: browse files`}
        className="sr-only"
        disabled={disabled || isUploading}
        id={inputId}
        multiple={multiple}
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.target.value = "";
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
    </div>
  );
}

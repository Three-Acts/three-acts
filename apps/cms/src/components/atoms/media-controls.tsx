import { useState } from "react";
import { FileText, Film } from "lucide-react";
import { parseFileValue, parseVideoValue } from "../../cms/types";
import type { FileField, VideoField } from "../../cms/types";
import { AssetTile } from "./asset-tile";
import { FileDropZone } from "./file-drop-zone";
import { fileNameFromMedia, formatFileSize } from "./file-utils";

function metaLabel(size: number | undefined, contentType: string | undefined): string | null {
  const parts = [size !== undefined ? formatFileSize(size) : null, contentType ?? null].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : null;
}

type VideoControlProps = {
  field: VideoField;
  /** Stored value: VideoValue JSON or a legacy plain URL. */
  value: string;
  inputId: string;
  isUploading: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  readOnly?: boolean;
};

/** Single video: an empty dropzone, or the populated icon tile (no preview, no caption). */
export function VideoControl({ field, value, inputId, isUploading, onFile, onClear, readOnly }: VideoControlProps) {
  const [hasRejectedFile, setHasRejectedFile] = useState(false);
  const video = parseVideoValue(value);

  if (!video) {
    if (readOnly) {
      return <p className="m-0 text-ui text-cms-subtle">No video</p>;
    }

    return (
      <div className="grid gap-1.5">
        <FileDropZone
          accept={field.accept}
          icon={<Film aria-hidden="true" className="text-cms-muted" size={20} />}
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
          title="Drag your video here"
        />
        <AssetTile.RejectedNote visible={hasRejectedFile} />
      </div>
    );
  }

  const fileName = fileNameFromMedia(video);
  const detailLabel = metaLabel(video.size, video.contentType);
  const canReplace = !readOnly;
  const canDelete = !readOnly;

  return (
    <div className="grid gap-1.5">
      <AssetTile.Root label={fileName}>
        <AssetTile.Preview>
          <AssetTile.Icon>
            <Film aria-hidden="true" className="text-cms-muted" size={22} />
          </AssetTile.Icon>
        </AssetTile.Preview>

        <AssetTile.Details>
          <div className="min-w-0 px-0.5">
            <AssetTile.Title>{fileName}</AssetTile.Title>
            {detailLabel ? <AssetTile.Meta>{detailLabel}</AssetTile.Meta> : null}
          </div>
          <AssetTile.OpenLink href={video.src} label={`Play ${fileName} in new tab`}>
            Play
          </AssetTile.OpenLink>
          {canReplace || canDelete ? (
            <AssetTile.Actions>
              {canReplace ? (
                <AssetTile.Replace
                  accept={field.accept}
                  inputId={inputId}
                  isUploading={isUploading}
                  onFile={(file) => {
                    setHasRejectedFile(false);
                    onFile(file);
                  }}
                  onRejected={() => setHasRejectedFile(true)}
                />
              ) : null}
              <AssetTile.Delete onClick={canDelete ? onClear : undefined} />
            </AssetTile.Actions>
          ) : null}
        </AssetTile.Details>
      </AssetTile.Root>
      <AssetTile.RejectedNote visible={hasRejectedFile} />
    </div>
  );
}

type FileControlProps = {
  field: FileField;
  /** Stored value: FileValue JSON or a legacy plain URL. */
  value: string;
  inputId: string;
  isUploading: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  readOnly?: boolean;
};

/** Single file: an empty dropzone, or the populated icon tile (no preview, no caption). */
export function FileControl({ field, value, inputId, isUploading, onFile, onClear, readOnly }: FileControlProps) {
  const [hasRejectedFile, setHasRejectedFile] = useState(false);
  const file = parseFileValue(value);

  if (!file) {
    if (readOnly) {
      return <p className="m-0 text-ui text-cms-subtle">No file</p>;
    }

    return (
      <div className="grid gap-1.5">
        <FileDropZone
          accept={field.accept}
          icon={<FileText aria-hidden="true" className="text-cms-muted" size={20} />}
          inputId={inputId}
          isUploading={isUploading}
          onFiles={(files) => {
            const next = files[0];
            if (next) {
              setHasRejectedFile(false);
              onFile(next);
            }
          }}
          onRejected={() => setHasRejectedFile(true)}
          subtitle="or click to browse for a file"
          title="Drag your file here"
        />
        <AssetTile.RejectedNote visible={hasRejectedFile} />
      </div>
    );
  }

  const fileName = fileNameFromMedia(file);
  const detailLabel = metaLabel(file.size, file.contentType);
  const canReplace = !readOnly;
  const canDelete = !readOnly;

  return (
    <div className="grid gap-1.5">
      <AssetTile.Root label={fileName}>
        <AssetTile.Preview>
          <AssetTile.Icon>
            <FileText aria-hidden="true" className="text-cms-muted" size={22} />
          </AssetTile.Icon>
        </AssetTile.Preview>

        <AssetTile.Details>
          <div className="min-w-0 px-0.5">
            <AssetTile.Title>{fileName}</AssetTile.Title>
            {detailLabel ? <AssetTile.Meta>{detailLabel}</AssetTile.Meta> : null}
          </div>
          <AssetTile.OpenLink href={file.src} label={`Open ${fileName} in new tab`}>
            Open
          </AssetTile.OpenLink>
          {canReplace || canDelete ? (
            <AssetTile.Actions>
              {canReplace ? (
                <AssetTile.Replace
                  accept={field.accept}
                  inputId={inputId}
                  isUploading={isUploading}
                  onFile={(next) => {
                    setHasRejectedFile(false);
                    onFile(next);
                  }}
                  onRejected={() => setHasRejectedFile(true)}
                />
              ) : null}
              <AssetTile.Delete onClick={canDelete ? onClear : undefined} />
            </AssetTile.Actions>
          ) : null}
        </AssetTile.Details>
      </AssetTile.Root>
      <AssetTile.RejectedNote visible={hasRejectedFile} />
    </div>
  );
}

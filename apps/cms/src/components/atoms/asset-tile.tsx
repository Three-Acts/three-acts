/* eslint-disable react-refresh/only-export-components */
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@three-acts/utils";
import { Button } from "./button";
import { matchesAccept } from "./file-utils";
import { buttonVariants, fileLabelFocusRing } from "./styles";

type RootProps = {
  children: ReactNode;
  label: string;
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  onMoveKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

function Root({
  children,
  label,
  draggable,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveKeyDown
}: RootProps) {
  return (
    <article
      aria-label={label}
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
      {children}
    </article>
  );
}

function Preview({ children }: { children: ReactNode }) {
  return <div className="aspect-square h-full min-h-0 w-auto overflow-hidden rounded-cms bg-cms-bg">{children}</div>;
}

function Icon({ children }: { children: ReactNode }) {
  return <div className="grid h-full w-full place-items-center">{children}</div>;
}

function Details({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 content-start gap-1.5">{children}</div>;
}

function Title({ children }: { children: ReactNode }) {
  return <p className="m-0 truncate text-ui font-medium text-cms-text">{children}</p>;
}

function Meta({ children }: { children: ReactNode }) {
  return <p className="m-0 truncate text-ui text-cms-subtle">{children}</p>;
}

function Caption({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex gap-1.5">{children}</div>;
}

type ReplaceProps = {
  accept?: string;
  inputId: string;
  isUploading?: boolean;
  onFile: (file: File) => void;
  onRejected?: () => void;
};

function Replace({ accept, inputId, isUploading, onFile, onRejected }: ReplaceProps) {
  return (
    <label
      className={cn(buttonVariants({ variant: "normal" }), isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer", fileLabelFocusRing)}
    >
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
            if (matchesAccept(file, accept)) {
              onFile(file);
            } else {
              onRejected?.();
            }
          }
          event.target.value = "";
        }}
        type="file"
      />
    </label>
  );
}

function Delete({ onClick, label = "Delete" }: { onClick?: () => void; label?: string }) {
  if (!onClick) {
    return null;
  }
  return (
    <Button className="text-cms-muted hover:text-cms-danger" onClick={onClick} variant="ghost">
      <Trash2 aria-hidden="true" size={13} />
      {label}
    </Button>
  );
}

function OpenLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a className="w-fit truncate px-0.5 text-ui text-cms-subtle underline underline-offset-2 hover:text-cms-text" href={href} rel="noreferrer" target="_blank" aria-label={label}>
      {children}
    </a>
  );
}

function RejectedNote({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }
  return <p className="m-0 text-ui text-cms-danger">That file type isn&apos;t accepted here.</p>;
}

/**
 * Composable populated-asset tile: the square-left/details-right card the
 * single image, video, and file controls all share. Callers compose only
 * the pieces they need — `ImageCard` keeps `Caption` (alt text) and the
 * gallery keeps whole-card drag/keyboard via `Root`, while video/file use
 * `Icon` + `OpenLink` and no `Caption`.
 */
export const AssetTile = {
  Root,
  Preview,
  Icon,
  Details,
  Title,
  Meta,
  Caption,
  Actions,
  Replace,
  Delete,
  OpenLink,
  RejectedNote
};

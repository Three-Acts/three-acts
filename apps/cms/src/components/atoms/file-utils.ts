import type { ImageValue } from "../../cms/types";

const BYTE_UNITS = ["B", "kB", "MB", "GB", "TB"];
const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;
const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|m4v)$/i;

export function matchesAccept(file: File, accept?: string): boolean {
  const patterns = accept
    ? accept
        .split(",")
        .map((pattern) => pattern.trim())
        .filter(Boolean)
    : [];

  if (patterns.length === 0) {
    return true;
  }

  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) {
      return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    }

    if (pattern.endsWith("/*")) {
      const typePrefix = pattern.slice(0, -1);
      if (file.type) {
        return file.type.startsWith(typePrefix);
      }
      if (pattern === "image/*") {
        return IMAGE_FILE_PATTERN.test(file.name);
      }
      if (pattern === "video/*") {
        return VIDEO_FILE_PATTERN.test(file.name);
      }
      return false;
    }

    return file.type === pattern;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  return `${value.toFixed(1).replace(/\.0$/, "")} ${BYTE_UNITS[unitIndex]}`;
}

export function fileNameFromImage(image: ImageValue): string {
  return fileNameFromMedia(image);
}

/** Display name for a typed media value: the stored `fileName` first, then the URL's last segment. */
export function fileNameFromMedia(value: { src: string; fileName?: string }): string {
  if (value.fileName?.trim()) {
    return value.fileName;
  }

  const path = value.src.split(/[?#]/)[0];
  const segment = path.slice(path.lastIndexOf("/") + 1);

  try {
    return decodeURIComponent(segment) || value.src;
  } catch {
    return segment || value.src;
  }
}

import type { ImageValue } from "../../cms/types";

const BYTE_UNITS = ["B", "kB", "MB", "GB", "TB"];
const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;

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
      return pattern === "image/*" && IMAGE_FILE_PATTERN.test(file.name);
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
  if (image.fileName?.trim()) {
    return image.fileName;
  }

  const path = image.src.split(/[?#]/)[0];
  const segment = path.slice(path.lastIndexOf("/") + 1);

  try {
    return decodeURIComponent(segment) || image.src;
  } catch {
    return segment || image.src;
  }
}

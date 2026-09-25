export type ImageDimensions = { width: number; height: number };

/**
 * Reads pixel dimensions from an in-browser `File` without uploading it.
 * Never rejects: anything unreadable (non-image, corrupt, no browser APIs)
 * resolves to `null` so uploads still succeed, just without dimensions.
 */
export function getImageDimensions(file: File): Promise<ImageDimensions | null> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return Promise.resolve(null);
  }

  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then(
      (bitmap) => {
        const dimensions = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return dimensions;
      },
      () => readViaElement(file)
    );
  }

  return readViaElement(file);
}

function readViaElement(file: File): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    function done(dimensions: ImageDimensions | null) {
      URL.revokeObjectURL(url);
      resolve(dimensions);
    }

    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done(null);
    img.src = url;
  });
}

import type { Breakpoint } from "@three-acts/design";

export const viewportPresets = { desktop: 1280, tablet: 1024, landscape: 768, mobile: 390 } as const;
export const viewportBounds = { min: 320, max: 3840 } as const;
export const zoomChoices = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type CanvasZoom = "fit" | number;

export function readViewportWidth(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const width = Number(value);
  return Number.isInteger(width) && width >= viewportBounds.min && width <= viewportBounds.max ? width : null;
}
export function clampViewportWidth(width: number): number {
  return Number.isFinite(width) ? Math.min(viewportBounds.max, Math.max(viewportBounds.min, Math.round(width))) : viewportPresets.desktop;
}
export function viewportBreakpoint(width: number): Breakpoint {
  return width >= 1280 ? "desktop" : width >= 1024 ? "tablet" : width >= 768 ? "landscape" : "base";
}
export function readCanvasZoom(value: string): CanvasZoom | null {
  if (value === "fit") return value;
  const zoom = Number(value);
  return value.trim() && Number.isFinite(zoom) && zoom >= 0.25 && zoom <= 2 ? zoom : null;
}
export function canvasGeometry(width: number, zoom: CanvasZoom, availableWidth: number, availableHeight: number) {
  // Leave a small unscaled gutter for the resize grip. Decorations never
  // subtract from the iframe's actual logical viewport.
  const space = Math.max(1, availableWidth - 12);
  const scale = zoom === "fit" ? Math.max(0.25, Math.min(1, space / width)) : zoom;
  const logicalHeight = Math.max(320, Math.floor(availableHeight));
  const visualWidth = width * scale;
  return { scale, logicalHeight, visualWidth, visualHeight: logicalHeight * scale, stageWidth: Math.max(space, visualWidth) + 12, marginLeft: Math.max(0, (space - visualWidth) / 2), scrollLeft: Math.max(0, (visualWidth - space) / 2) };
}
export function resizedViewportWidth(startWidth: number, physicalDelta: number, scale: number): number {
  return clampViewportWidth(startWidth + 2 * physicalDelta / scale);
}
export function zoomLabel(scale: number): string { return `${Math.round(scale * 1000) / 10}%`; }

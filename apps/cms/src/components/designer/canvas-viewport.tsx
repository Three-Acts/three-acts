import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Tooltip } from "../atoms";
import { canvasGeometry, resizedViewportWidth, viewportBounds, type CanvasZoom } from "./viewport-model";

type Resize = { pointerId: number; clientX: number; width: number; scale: number; marginLeft: number; zoom: CanvasZoom };

export function CanvasViewport({ width, zoom, disabled, unavailable, onWidth, onZoom, onScale, children }: {
  width: number; zoom: CanvasZoom; disabled: boolean; unavailable: boolean; children: ReactNode;
  onWidth: (width: number) => void; onZoom: (zoom: CanvasZoom) => void; onScale: (scale: number) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const resize = useRef<Resize | null>(null);
  const [dragView, setDragView] = useState<{ marginLeft: number } | null>(null);
  const dragging = dragView !== null;
  const [size, setSize] = useState({ width: 1280, height: 640 });
  const geometry = canvasGeometry(width, zoom, size.width, size.height);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // A CMS handoff hides this still-mounted surface; retain its geometry.
      if (width > 0 && height > 0) setSize(current => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => onScale(geometry.scale), [geometry.scale, onScale]);
  function stop(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const drag = resize.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    resize.current = null;
    setDragView(null);
    if (cancelled) { onWidth(drag.width); onZoom(drag.zoom); }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <div ref={area} aria-label="Canvas viewport" className="min-h-0 flex-1 overflow-auto bg-cms-bg p-2">
    {unavailable ? children : <div className="relative shrink-0" style={{ width: geometry.visualWidth, height: geometry.visualHeight, marginLeft: dragView?.marginLeft ?? geometry.marginLeft }}>
      <div data-canvas-scale={geometry.scale} data-canvas-width={width} className="origin-top-left overflow-hidden bg-white ring-1 ring-cms-line-strong" style={{ width, height: geometry.logicalHeight, transform: `scale(${geometry.scale})`, pointerEvents: dragging ? "none" : undefined }}>{children}</div>
      <Tooltip content="Drag to resize the viewport. Arrow keys change 10px; Shift changes 50px. Escape cancels a drag.">
        <div role="separator" aria-label="Resize canvas width" aria-orientation="vertical" aria-valuemin={viewportBounds.min} aria-valuemax={viewportBounds.max} aria-valuenow={width} aria-disabled={disabled} tabIndex={disabled ? -1 : 0} className="absolute top-1/2 flex h-16 w-2 -translate-y-1/2 touch-none cursor-ew-resize items-center justify-center rounded-cms text-cms-subtle outline-none hover:bg-cms-raised hover:text-cms-text focus-visible:ring-1 focus-visible:ring-cms-accent aria-disabled:cursor-default aria-disabled:opacity-30" style={{ left: geometry.visualWidth + 4 }} onPointerDown={event => {
          if (disabled || event.button !== 0) return;
          event.preventDefault(); event.currentTarget.focus();
          resize.current = { pointerId: event.pointerId, clientX: event.clientX, width, scale: geometry.scale, marginLeft: geometry.marginLeft, zoom };
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragView({ marginLeft: geometry.marginLeft });
          onZoom(geometry.scale);
        }} onPointerMove={event => {
          const drag = resize.current;
          if (disabled || !drag || drag.pointerId !== event.pointerId) return;
          onWidth(resizedViewportWidth(drag.width, event.clientX - drag.clientX, drag.scale));
        }} onPointerUp={event => stop(event)} onPointerCancel={event => stop(event, true)} onLostPointerCapture={event => stop(event, true)} onKeyDown={event => {
          if (disabled) return;
          if (event.key === "Escape" && resize.current) {
            event.preventDefault(); event.stopPropagation();
            const drag = resize.current;
            resize.current = null; setDragView(null); onWidth(drag.width); onZoom(drag.zoom);
            if (event.currentTarget.hasPointerCapture(drag.pointerId)) event.currentTarget.releasePointerCapture(drag.pointerId);
            return;
          }
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault(); event.stopPropagation();
          onZoom(geometry.scale);
          onWidth(resizedViewportWidth(width, (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 50 : 10) * geometry.scale, geometry.scale));
        }}><span aria-hidden="true" className="h-6 w-0.5 rounded-full bg-current"/></div>
      </Tooltip>
    </div>}
  </div>;
}

import { useRef, useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { IconButton, Input, Tooltip } from "../atoms";
import { readCanvasZoom, readViewportWidth, viewportBounds, viewportPresets, zoomChoices, zoomLabel, type CanvasZoom } from "./viewport-model";

export function CanvasSizeControls({ width, zoom, scale, disabled, onWidth, onZoom }: {
  width: number; zoom: CanvasZoom; scale: number; disabled: boolean;
  onWidth: (width: number) => void; onZoom: (zoom: CanvasZoom) => void;
}) {
  const [input, setInput] = useState({ sourceWidth: width, value: String(width), invalid: false });
  const cancelBlur = useRef(false);
  const draft = input.sourceWidth === width ? input.value : String(width);
  const invalid = input.sourceWidth === width && input.invalid;
  function commit() {
    if (cancelBlur.current) { cancelBlur.current = false; return; }
    const parsed = readViewportWidth(draft);
    if (parsed === null) { setInput({ sourceWidth: width, value: draft, invalid: true }); return; }
    setInput({ sourceWidth: parsed, value: String(parsed), invalid: false });
    onWidth(parsed);
  }
  return <div className="flex shrink-0 items-center gap-1" aria-label="Canvas size and zoom">
    <div className="flex items-center gap-0.5" aria-label="Canvas width">{([{ id: "desktop", Icon: Monitor }, { id: "tablet", Icon: Tablet }, { id: "landscape", Icon: Tablet }, { id: "mobile", Icon: Smartphone }] as const).map(({ id, Icon }) => <Tooltip key={id} content={`${id[0].toUpperCase()}${id.slice(1)} · ${viewportPresets[id]}px`}><IconButton className={`size-6 border-transparent bg-transparent shadow-none ${width === viewportPresets[id] ? "text-cms-accent" : ""}`} aria-label={`${id} preview`} aria-pressed={width === viewportPresets[id]} disabled={disabled} onClick={() => onWidth(viewportPresets[id])}><Icon size={14}/></IconButton></Tooltip>)}</div>
    <div className="flex items-center gap-0.5">
      <Input aria-label="Canvas viewport width" inputMode="numeric" value={draft} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={invalid ? "canvas-width-error" : undefined} title={invalid ? `Enter a whole width from ${viewportBounds.min} to ${viewportBounds.max} pixels.` : `Page width before zoom · ${viewportBounds.min}–${viewportBounds.max}px`} mono className="h-6 w-12 px-1 text-right text-[10px] shadow-none aria-invalid:border-cms-danger" onChange={event => setInput({ sourceWidth: width, value: event.target.value, invalid: false })} onBlur={commit} onKeyDown={event => {
        if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === "Escape") { event.preventDefault(); cancelBlur.current = true; setInput({ sourceWidth: width, value: String(width), invalid: false }); event.currentTarget.blur(); }
      }}/>
      <span aria-hidden="true" className="text-[10px] text-cms-subtle">px</span>
      {invalid && <span id="canvas-width-error" role="alert" className="sr-only">Enter a whole width from {viewportBounds.min} to {viewportBounds.max} pixels.</span>}
    </div>
    <select aria-label="Canvas zoom" title="Zoom changes visual scale; the viewport width and Tailwind breakpoints stay the same." value={String(zoom)} disabled={disabled} onChange={event => { const next = readCanvasZoom(event.target.value); if (next !== null) onZoom(next); }} className="h-6 max-w-24 rounded-cms border border-cms-line bg-cms-surface px-1 text-[10px] tabular-nums text-cms-text">
      <option value="fit">Fit ({zoomLabel(scale)})</option>
      {zoomChoices.map(value => <option value={String(value)} key={value}>{zoomLabel(value)}</option>)}
      {typeof zoom === "number" && !zoomChoices.some(value => value === zoom) && <option value={String(zoom)}>{zoomLabel(zoom)}</option>}
    </select>
  </div>;
}

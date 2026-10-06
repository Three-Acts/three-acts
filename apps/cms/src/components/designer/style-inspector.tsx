import { useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  EyeOff,
  Grid2X2,
  RotateCcw,
  Rows3,
  Square
} from "lucide-react";
import { Button, Input, ScrollArea, Tooltip } from "../atoms";
import { Popover } from "@base-ui-components/react/popover";
import type { CanvasSelection } from "./canvas-types";

type StyleInspectorProps = {
  selection: CanvasSelection | null;
  onChange: (property: string, value: string) => void;
  onReset: () => void;
  hasChanges: boolean;
  disabled: boolean;
};

type ValueKind = "length" | "lineHeight" | "color";

const displayOptions = ["block", "flex", "grid", "inline", "inline-block", "none", "contents", "list-item", "table"];
const alignmentOptions = ["normal", "stretch", "start", "center", "end", "flex-start", "flex-end", "space-between", "space-around", "space-evenly"];
const directionOptions = ["row", "column", "row-reverse", "column-reverse"];
const commonDisplays = ["block", "flex", "grid", "none"];
const controlLabels: Record<string, string> = { "Font size": "Size", "Font weight": "Weight", "Line height": "Height", "Text color": "Color", "Background color": "Color", "Flex direction": "Direction", "Align items": "Align", "Min height": "Min H", "Max width": "Max W" };

function cssPropertyName(property: string) {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function isValidCssValue(property: string, value: string, kind: ValueKind) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 100 || /[;{}]/.test(normalized) || /\b(?:var|url|expression)\s*\(/i.test(normalized)) return false;
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    return CSS.supports(cssPropertyName(property), normalized);
  }

  if (kind === "length") return /^(0|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:px|rem|em|%|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)|auto|min-content|max-content|fit-content|none|(?:calc|clamp|min|max)\(.+\))$/i.test(normalized);
  if (kind === "lineHeight") return /^(?:normal|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:px|rem|em|%|vw|vh)?|(?:calc|clamp)\(.+\))$/i.test(normalized);
  return /^(?:#[\da-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla|oklch|color)\(.+\))$/i.test(normalized);
}

function ValueControl({ label, property, value, kind = "length", disabled, onCommit, trailing, compact = false, paired = false }: {
  label: string;
  property: string;
  value: string;
  kind?: ValueKind;
  disabled: boolean;
  onCommit: (property: string, value: string) => void;
  trailing?: ReactNode;
  compact?: boolean;
  paired?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const cancelBlurCommit = useRef(false);
  const inputId = `style-${property}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  function commit() {
    if (cancelBlurCommit.current) {
      cancelBlurCommit.current = false;
      return;
    }
    if (isValidCssValue(property, draft, kind)) {
      setInvalid(false);
      if (draft.trim() !== value) onCommit(property, draft.trim());
    } else {
      setInvalid(true);
    }
  }

  const input = (
    <div className="flex min-w-0 items-center gap-1">
      <Input
        id={inputId}
        aria-invalid={invalid || undefined}
        aria-label={label}
        title={invalid ? "Enter a safe, valid CSS value (up to 100 characters)" : label}
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          setDraft(event.target.value);
          if (invalid) setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            cancelBlurCommit.current = true;
            setDraft(value);
            setInvalid(false);
            event.currentTarget.blur();
          }
        }}
        className={`${compact ? "h-5 border-transparent bg-transparent px-0.5 text-center text-[10px] focus:bg-cms-bg" : "h-6 px-1.5 text-ui"} min-h-0 min-w-0 flex-1 py-0.5 shadow-none ${invalid ? "border-cms-danger text-cms-danger" : ""}`}
      />
      {trailing}
    </div>
  );

  if (compact) {
    return <div className="min-w-0" title={label}><label htmlFor={inputId} className="sr-only">{label}</label>{input}</div>;
  }

  return (
    <div className={`grid min-w-0 items-center gap-1.5 ${paired ? "grid-cols-[2.5rem_minmax(0,1fr)]" : "grid-cols-[3.25rem_minmax(0,1fr)]"}`}>
      <label htmlFor={inputId} title={label} className="truncate text-ui text-cms-muted">{controlLabels[label] ?? label}</label>
      {input}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open aria-label={title} className="group border-b border-cms-line last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-2 text-ui font-semibold text-cms-text outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cms-accent [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown aria-hidden="true" size={13} className="-rotate-90 text-cms-subtle transition-transform group-open:rotate-0" />
      </summary>
      <div className="px-2.5 pb-2.5">{children}</div>
    </details>
  );
}

function SelectControl({ label, property, value, options, disabled, onChange }: {
  label: string;
  property: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (property: string, value: string) => void;
}) {
  const inputId = `style-${property}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-1.5">
      <label htmlFor={inputId} title={label} className="truncate text-ui text-cms-muted">{controlLabels[label] ?? label}</label>
      <select
        id={inputId}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(property, event.target.value)}
        className="h-6 min-w-0 w-full rounded-cms border border-cms-line bg-cms-surface px-1.5 py-0.5 text-ui capitalize text-cms-text focus:border-cms-accent focus:outline-none disabled:opacity-50"
      >
        {[...new Set([value, ...options])].filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function SpacingDiagram({ selection, styles, disabled, onChange }: {
  selection: CanvasSelection;
  styles: Record<string, string>;
  disabled: boolean;
  onChange: (property: string, value: string) => void;
}) {
  const value = (property: string) => styles[property] ?? "";
  const makeControl = (side: "Top" | "Right" | "Bottom" | "Left", kind: "margin" | "padding") => {
    const property = `${kind}${side}`;
    const label = `${kind === "margin" ? "Margin" : "Padding"} ${side.toLowerCase()}`;
    return <ValueControl key={`${selection.selector}:${property}:${value(property)}`} label={label} property={property} value={value(property)} disabled={disabled} onCommit={onChange} compact />;
  };

  return (
    <div className="relative h-[124px] w-full overflow-hidden rounded-cms border border-cms-line" aria-label="Margin and padding diagram">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 240 124" preserveAspectRatio="none">
        <rect width="240" height="124" fill="#242424" />
        <polygon points="0,0 240,0 198,30 42,30" fill="#30302f" />
        <polygon points="240,0 240,124 198,94 198,30" fill="#292928" />
        <polygon points="240,124 0,124 42,94 198,94" fill="#30302f" />
        <polygon points="0,124 0,0 42,30 42,94" fill="#292928" />
        <polygon points="42,30 198,30 180,45 60,45" fill="#3a3a39" />
        <polygon points="198,30 198,94 180,79 180,45" fill="#333332" />
        <polygon points="198,94 42,94 60,79 180,79" fill="#3a3a39" />
        <polygon points="42,94 42,30 60,45 60,79" fill="#333332" />
        <rect x="60" y="45" width="120" height="34" rx="3" fill="#1a1a19" stroke="#454544" />
        <rect x="87" y="52" width="66" height="20" rx="2" fill="#2e2e2d" stroke="#373736" />
      </svg>
      <span className="pointer-events-none absolute left-1 top-0.5 text-[8px] font-semibold uppercase tracking-wide text-cms-subtle">Margin</span>
      <span className="pointer-events-none absolute left-[25%] top-[30%] text-[8px] font-semibold uppercase tracking-wide text-cms-subtle">Padding</span>
      <div className="absolute left-1/2 top-1 w-10 -translate-x-1/2">{makeControl("Top", "margin")}</div>
      <div className="absolute left-1 top-1/2 w-8 -translate-y-1/2">{makeControl("Left", "margin")}</div>
      <div className="absolute right-1 top-1/2 w-8 -translate-y-1/2">{makeControl("Right", "margin")}</div>
      <div className="absolute bottom-1 left-1/2 w-10 -translate-x-1/2">{makeControl("Bottom", "margin")}</div>
      <div className="absolute left-1/2 top-[26%] w-9 -translate-x-1/2">{makeControl("Top", "padding")}</div>
      <div className="absolute left-[24%] top-1/2 w-9 -translate-x-1/2 -translate-y-1/2">{makeControl("Left", "padding")}</div>
      <div className="absolute left-[76%] top-1/2 w-9 -translate-x-1/2 -translate-y-1/2">{makeControl("Right", "padding")}</div>
      <div className="absolute bottom-[24%] left-1/2 w-9 -translate-x-1/2">{makeControl("Bottom", "padding")}</div>
      <span className="pointer-events-none absolute left-1/2 top-1/2 max-w-[25%] -translate-x-1/2 -translate-y-1/2 truncate font-mono text-[9px] text-cms-subtle" title={`${selection.tag}: ${selection.label}`}>{selection.tag}</span>
    </div>
  );
}

/** CSS controls for the current preview element. Values apply to the preview only. */
export function StyleInspector({ selection, onChange, onReset, hasChanges, disabled }: StyleInspectorProps) {
  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  const styles = selection?.styles ?? {};
  const controlDisabled = disabled || !selection;
  const value = (property: string) => {
    const cssValue = styles[property] ?? "";
    if (property !== "color" && property !== "backgroundColor") return cssValue;
    if (/^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(cssValue)) return "transparent";
    const rgb = cssValue.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
    return rgb ? `#${rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}` : cssValue;
  };
  const update = (property: string, nextValue: string) => onChange(property, nextValue);
  const selectedDisplay = value("display") || "block";

  return (
    <aside aria-label="Style inspector" className="flex min-h-0 w-full flex-1 flex-col bg-cms-bg">
      <div className="shrink-0 border-b border-cms-line px-2.5 py-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="text-ui text-cms-muted">Style selector</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <Tooltip content="Styles are temporary and apply to the preview. They are not saved.">
              <span aria-label="Preview only" tabIndex={0} className="cursor-help text-[10px] text-cms-subtle underline decoration-dotted underline-offset-2">Preview only</span>
            </Tooltip>
            <Button
              type="button"
              variant="ghost"
              aria-label="Reset preview styles"
              title="Reset preview styles"
              className="size-6 p-1"
              onClick={onReset}
              disabled={disabled || !hasChanges}
            >
              <RotateCcw aria-hidden="true" size={12} />
            </Button>
          </div>
        </div>

        {selection ? (
          <div className="mt-1 flex h-6 min-w-0 items-center gap-1 overflow-hidden rounded-cms border border-cms-line bg-cms-surface px-1">
            <span className="shrink-0 rounded-cms-sm bg-cms-accent/20 px-1.5 py-0.5 font-mono text-[10px] text-cms-accent" title="Styles apply to this selected element">{selection.tag}</span>
            {selection.classNames?.length ? <div aria-label="Read-only CSS classes" className="flex min-w-0 gap-1 overflow-hidden">{selection.classNames.slice(0, 4).map((className) => <span key={className} className="max-w-20 truncate rounded-cms-sm bg-cms-raised px-1 py-0.5 font-mono text-[9px] text-cms-subtle" title={className}>.{className}</span>)}</div> : <span className="text-[10px] text-cms-subtle">No class</span>}
          </div>
        ) : null}
      </div>

      {!selection ? (
        <div className="px-2.5 py-2">
          <p className="m-0 text-ui text-cms-subtle">Select an element in the preview or Navigator to adjust its styles.</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div>
            <Group title="Layout">
              <div className="grid gap-1.5">
                {commonDisplays.includes(selectedDisplay) ? <div role="group" aria-label="Display shortcuts" className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-1.5">
                  <span className="text-ui text-cms-muted">Display</span>
                  <div role="group" aria-label="Display" className="flex min-w-0 overflow-hidden rounded-cms border border-cms-line bg-cms-surface">
                    {[
                      { display: "block", label: "Block", Icon: Square },
                      { display: "flex", label: "Flex", Icon: Rows3 },
                      { display: "grid", label: "Grid", Icon: Grid2X2 },
                      { display: "none", label: "None", Icon: EyeOff }
                    ].map(({ display, label, Icon }) => (
                      <button
                        key={display}
                        type="button"
                        aria-label={`Display ${label.toLowerCase()}`}
                        aria-pressed={selectedDisplay === display}
                        disabled={controlDisabled}
                        onClick={() => update("display", display)}
                        className={`flex h-6 min-w-0 flex-1 items-center justify-center gap-0.5 border-r border-cms-line px-0.5 text-[9px] text-cms-muted last:border-r-0 disabled:opacity-50 ${(selectedDisplay === display) ? "bg-cms-raised text-cms-text" : "hover:bg-cms-raised hover:text-cms-text"}`}
                      >
                        <Icon aria-hidden="true" size={10} />{label}
                      </button>
                    ))}
                    <Popover.Root open={displayMenuOpen} onOpenChange={setDisplayMenuOpen}>
                      <Popover.Trigger aria-label="More display options" title="More display options" disabled={controlDisabled} className="grid h-6 w-4 shrink-0 place-items-center text-cms-muted hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent"><ChevronDown aria-hidden="true" size={10}/></Popover.Trigger>
                      <Popover.Portal><Popover.Positioner side="bottom" align="end" sideOffset={4} className="z-50"><Popover.Popup role="dialog" aria-label="Display options" className="w-40 rounded-cms border border-cms-line-strong bg-cms-surface p-1 text-cms-text shadow-cms-popup outline-none">
                        {displayOptions.map((display) => <button key={display} type="button" aria-label={`Use display ${display}`} aria-pressed={selectedDisplay === display} className="flex h-7 w-full items-center rounded-cms-sm px-2 text-left text-ui capitalize text-cms-muted hover:bg-cms-raised aria-pressed:text-cms-text focus-visible:outline-1 focus-visible:outline-cms-accent" onClick={() => { setDisplayMenuOpen(false); update("display", display); }}>{display}</button>)}
                      </Popover.Popup></Popover.Positioner></Popover.Portal>
                    </Popover.Root>
                  </div>
                </div> : <SelectControl label="Display" property="display" value={selectedDisplay} options={displayOptions} disabled={controlDisabled} onChange={update} />}
                {/flex/.test(selectedDisplay) && <SelectControl label="Flex direction" property="flexDirection" value={value("flexDirection") || "row"} options={directionOptions} disabled={controlDisabled} onChange={update} />}
                {/flex|grid/.test(selectedDisplay) && <>
                  <SelectControl label="Align items" property="alignItems" value={value("alignItems") || "stretch"} options={alignmentOptions} disabled={controlDisabled} onChange={update} />
                  <SelectControl label="Justify" property="justifyContent" value={value("justifyContent") || "normal"} options={alignmentOptions} disabled={controlDisabled} onChange={update} />
                  <ValueControl key={`${selection.selector}:gap:${value("gap")}`} label="Gap" property="gap" value={value("gap")} disabled={controlDisabled} onCommit={update} />
                </>}
              </div>
            </Group>

            <Group title="Spacing">
              <SpacingDiagram selection={selection} styles={styles} disabled={controlDisabled} onChange={update} />
            </Group>

            <Group title="Size">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <ValueControl paired key={`${selection.selector}:width:${value("width")}`} label="Width" property="width" value={value("width")} disabled={controlDisabled} onCommit={update} />
                <ValueControl paired key={`${selection.selector}:height:${value("height")}`} label="Height" property="height" value={value("height")} disabled={controlDisabled} onCommit={update} />
                <ValueControl paired key={`${selection.selector}:minHeight:${value("minHeight")}`} label="Min height" property="minHeight" value={value("minHeight")} disabled={controlDisabled} onCommit={update} />
                <ValueControl paired key={`${selection.selector}:maxWidth:${value("maxWidth")}`} label="Max width" property="maxWidth" value={value("maxWidth")} disabled={controlDisabled} onCommit={update} />
              </div>
            </Group>

            <Group title="Typography">
              <div className="grid gap-1.5">
                <SelectControl label="Font weight" property="fontWeight" value={value("fontWeight") || "400"} options={["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]} disabled={controlDisabled} onChange={update} />
                <ValueControl key={`${selection.selector}:fontSize:${value("fontSize")}`} label="Font size" property="fontSize" value={value("fontSize")} disabled={controlDisabled} onCommit={update} />
                <ValueControl key={`${selection.selector}:lineHeight:${value("lineHeight")}`} label="Line height" property="lineHeight" kind="lineHeight" value={value("lineHeight")} disabled={controlDisabled} onCommit={update} />
                <ValueControl key={`${selection.selector}:color:${value("color")}`} label="Text color" property="color" kind="color" value={value("color")} disabled={controlDisabled} onCommit={update} trailing={<span aria-hidden="true" className="size-4 shrink-0 rounded-cms-sm border border-cms-line" style={{ backgroundColor: value("color") || "transparent" }} />} />
              </div>
            </Group>

            <Group title="Backgrounds">
              <ValueControl key={`${selection.selector}:backgroundColor:${value("backgroundColor")}`} label="Background color" property="backgroundColor" kind="color" value={value("backgroundColor")} disabled={controlDisabled} onCommit={update} trailing={<span aria-hidden="true" className="size-4 shrink-0 rounded-cms-sm border border-cms-line" style={{ backgroundColor: value("backgroundColor") || "transparent" }} />} />
            </Group>

            <Group title="Borders">
              <ValueControl key={`${selection.selector}:borderRadius:${value("borderRadius")}`} label="Radius" property="borderRadius" value={value("borderRadius")} disabled={controlDisabled} onCommit={update} />
            </Group>
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}

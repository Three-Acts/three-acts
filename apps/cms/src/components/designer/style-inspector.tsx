import {colorHex} from "./style-values";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  Link,
  Unlink,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  breakpoints,
  propertyUtility,
  setUtility,
  utilityProperty,
  utilityScope,
  utilityPrefixes,
  validateUtility,
  type Breakpoint,
  type DesignDocument,
  type StyleChange,
  type UtilityProperty,
} from "@three-acts/design";
import type { CanvasSelection } from "./canvas-types";
import { Tooltip } from "../atoms";
const emptyStyle = (): StyleChange => ({ utilities: [], customClasses: [] });
const lengths = new Set([
  "gap",
  "columnGap",
  "rowGap",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "fontSize",
  "letterSpacing",
  "borderRadius",
  "borderWidth",
]);
const fieldClass =
  "h-7 w-full min-w-0 rounded-cms border border-cms-line bg-cms-surface px-1.5 text-right text-ui tabular-nums text-cms-text outline-none focus:border-cms-accent disabled:opacity-50";
function authoredValue(utility: string | undefined, fallback: string) {
  const match = utility?.match(/\[(?:[\w-]+:)?(.+)\]!?$/);
  return match ? match[1].replaceAll("_", " ") : fallback;
}
function ValueField({
  label,
  value,
  changed,
  disabled,
  onCommit,
  onReset,
  compact = false,
  numericUnit = "",
}: {
  label: string;
  value: string;
  changed: boolean;
  disabled: boolean;
  onCommit: (value: string) => void;
  onReset: () => void;
  compact?: boolean;
  numericUnit?: string;
}) {
  const inputId = useId();
  const narrow = [
    "Width",
    "Height",
    "Min W",
    "Min H",
    "Max W",
    "Max H",
    "Size",
    "Top",
    "Right",
    "Bottom",
    "Left",
  ].includes(label);
  const [draft, setDraft] = useState<string | null>(null),
    cancel = useRef(false),
    start = useRef<{ x: number; value: number } | null>(null);
  const reset = (event: React.MouseEvent) => {
    if (event.altKey && changed && !disabled) {
      event.preventDefault();
      onReset();
    }
  };
  return (
    <div
      className={
        compact
          ? "min-w-0"
          : narrow
            ? "grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-1.5"
            : "grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-1.5"
      }
    >
      {!compact && (
        <label
          htmlFor={inputId}
          className={`cursor-ew-resize select-none text-ui ${changed ? "text-cms-accent" : "text-cms-muted"}`}
          title={
            changed ? "Drag to adjust · Alt-click to reset" : "Drag to adjust"
          }
          onClick={reset}
          onPointerDown={(event) => {
            if (event.altKey || disabled || !/^[-\d.]+px$/.test(value)) return;
            start.current = { x: event.clientX, value: parseFloat(value) };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (start.current)
              setDraft(
                `${Math.round(start.current.value + event.clientX - start.current.x)}px`,
              );
          }}
          onPointerUp={() => {
            if (start.current && draft !== null) {
              onCommit(draft);
              setDraft(null);
            }
            start.current = null;
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-label={label}
        title={compact ? `${label} · Alt-click to reset` : undefined}
        disabled={disabled}
        className={`${fieldClass} ${compact ? "h-6 border-transparent bg-transparent px-0.5 text-center focus:bg-cms-surface" : ""} ${changed ? "text-cms-accent" : ""}`}
        value={draft ?? value}
        placeholder="Auto"
        onClick={compact ? reset : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => {
          if (cancel.current) {
            cancel.current = false;
            setDraft(null);
            return;
          }
          if (draft !== null) {
            onCommit(draft);
            setDraft(null);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel.current = true;
            event.currentTarget.blur();
          } else if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (
            ["ArrowUp", "ArrowDown"].includes(event.key) &&
            /^[-\d.]+(?:px|rem|em|%)?$/.test(draft ?? value)
          ) {
            event.preventDefault();
            const current = draft ?? value;
            setDraft(
              `${parseFloat(current) + (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1)}${current.replace(/^[-\d.]+/, "") || numericUnit}`,
            );
          }
        }}
      />
    </div>
  );
}
function Section({
  name,
  children,
  open = false,
}: {
  name: string;
  children: ReactNode;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(`three-acts:style:section:${name}`);
      return saved === null ? open : saved === "true";
    } catch {
      return open;
    }
  });
  return (
    <details
      open={expanded}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        setExpanded(next);
        try {
          localStorage.setItem(
            `three-acts:style:section:${name}`,
            String(next),
          );
        } catch {
          /* Keep the section state for this tab. */
        }
      }}
      className="border-b border-cms-line"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-2.5 text-ui font-medium text-cms-text after:text-cms-subtle after:content-['⌄']">
        {name}
      </summary>
      <div className="grid gap-2 px-2.5 pb-3">{children}</div>
    </details>
  );
}
export function StyleInspector({
  selection,
  design,
  breakpoint,
  onBreakpointChange,
  onChange,
  disabled,
}: {
  selection: CanvasSelection | null;
  design: DesignDocument;
  breakpoint: Breakpoint;
  onBreakpointChange: (value: Breakpoint) => void;
  onChange: (style: StyleChange) => void;
  disabled: boolean;
}) {
  const [linked, setLinked] = useState(false),
    [error, setError] = useState(""),
    [customName, setCustomName] = useState(""),
    [customValue, setCustomValue] = useState("");
  const target = selection?.designTarget;
  const style =
    (target?.kind === "element"
      ? design.elements[target.id]
      : target?.kind === "component"
        ? design.components[target.component]?.parts[target.part]
        : undefined) ?? emptyStyle();
  const prefix = breakpoint === "base" ? "" : `${breakpoint}:`,
    locked = disabled || !target;
  const authored = (property: UtilityProperty) =>
    style.utilities.find(
      (v) => utilityScope(v) === prefix && utilityProperty(v) === property,
    );
  function commit(property: UtilityProperty, value: string) {
    try {
      let raw = value.trim();
      if (
        (property === "gridTemplateColumns" ||
          property === "gridTemplateRows") &&
        /^\d+$/.test(raw)
      )
        raw = `repeat(${raw}, minmax(0, 1fr))`;
      if (raw && lengths.has(property) && /^-?\d+(?:\.\d+)?$/.test(raw))
        raw += "px";
      if (
        raw &&
        typeof CSS !== "undefined" &&
        !CSS.supports(
          property.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
          raw,
        )
      )
        throw new Error(
          `Use a valid ${property.replace(/[A-Z]/g, (c) => " " + c.toLowerCase())} value.`,
        );
      const utility = propertyUtility(property, raw);
      let next = setUtility(style, property, breakpoint, utility);
      if (
        linked &&
        /^(?:padding|margin)(?:Top|Right|Bottom|Left)$/.test(property)
      ) {
        const family = property.startsWith("padding") ? "padding" : "margin";
        for (const side of ["Top", "Right", "Bottom", "Left"]) {
          const other = (family + side) as UtilityProperty;
          next = setUtility(
            next,
            other,
            breakpoint,
            propertyUtility(other, raw),
          );
        }
      }
      onChange(next);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid value.");
    }
  }
  const value = (property: UtilityProperty) => {
    const raw = authoredValue(
      authored(property),
      selection?.styles?.[property] ?? "",
    );
    if (property === "gridTemplateColumns" || property === "gridTemplateRows") {
      const utility = authored(property),
        count = utility?.match(/(?:grid-(?:cols|rows)-|repeat\()(\d+)/);
      if (count) return count[1];
      if (raw === "none" || !raw) return "Auto";
      return String(raw.trim().split(/\s+/).length);
    }
    if(property==="textDecoration")return raw.split(" ")[0];
    return property === "fontFamily"
      ? raw.split(",")[0].replaceAll('"', "").trim()
      : raw;
  };
  const field = (property: UtilityProperty, label: string, compact = false) => (
    <ValueField
      key={property}
      label={label}
      value={value(property)}
      changed={Boolean(authored(property))}
      disabled={locked}
      compact={compact}
      numericUnit={lengths.has(property)?"px":""}
      onCommit={(raw) => commit(property, raw)}
      onReset={() => onChange(setUtility(style, property, breakpoint, ""))}
    />
  );
  const segments = (
    property: UtilityProperty,
    label: string,
    choices: Array<[string, ReactNode]>,
  ) => (
    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-1.5">
      <span
        className={`text-ui ${authored(property) ? "text-cms-accent" : "text-cms-muted"}`}
        onClick={(event) => {
          if (event.altKey && !locked)
            onChange(setUtility(style, property, breakpoint, ""));
        }}
        title="Alt-click to reset"
      >
        {label}
      </span>
      <div
        className="flex min-w-0 overflow-hidden rounded-cms border border-cms-line bg-cms-surface"
        role="group"
        aria-label={label}
      >
        {choices.map(([raw, content]) => (
          <Tooltip key={raw} content={raw}>
            <button
              type="button"
              aria-label={`${label}: ${raw}`}
              aria-pressed={value(property) === raw}
              disabled={locked}
              onClick={() => commit(property, raw)}
              className={`flex h-7 min-w-0 flex-1 items-center justify-center px-1 text-[10px] hover:bg-cms-hover disabled:opacity-50 ${value(property) === raw ? "bg-cms-bg text-cms-accent" : "text-cms-muted"}`}
            >
              {content}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
  const color = (property: UtilityProperty, label: string) => (
    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-1.5">
      <span
        className={`text-ui ${authored(property) ? "text-cms-accent" : "text-cms-muted"}`}
        onClick={(event) => {
          if (event.altKey && !locked)
            onChange(setUtility(style, property, breakpoint, ""));
        }}
        title="Alt-click to reset"
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="color"
          aria-label={`${label} picker`}
          disabled={locked}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-cms border border-cms-line bg-cms-surface p-0.5"
          value={colorHex(value(property), selection?.styles[property] ?? "")}
          onChange={(event) => commit(property, event.target.value)}
        />
        {field(property, label, true)}
      </div>
    </div>
  );
  return (
    <aside
      aria-label="Style inspector"
      className="flex min-h-0 flex-1 flex-col bg-cms-bg"
    >
      <div className="shrink-0 border-b border-cms-line px-2.5 py-2">
        <div className="flex items-center justify-between">
          <strong className="text-ui font-medium">
            {selection?.label ?? "Style"}
          </strong>
          <Tooltip content="Alt-click a changed property to restore its source value">
            <RotateCcw size={12} className="text-cms-subtle" />
          </Tooltip>
        </div>
        <div
          role="group"
          aria-label="Style breakpoint"
          className="mt-2 flex gap-0.5"
        >
          {Object.entries(breakpoints).map(([bp, label]) => (
            <Tooltip key={bp} content={label}>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Style breakpoint: ${bp}`}
                aria-pressed={breakpoint === bp}
                className={`flex-1 rounded-cms px-1 py-1 text-[10px] ${breakpoint === bp ? "bg-cms-surface text-cms-accent" : "text-cms-muted hover:bg-cms-hover"}`}
                onClick={() => onBreakpointChange(bp as Breakpoint)}
              >
                {bp === "base"
                  ? "All sizes"
                  : bp === "landscape"
                    ? "768+"
                    : bp === "tablet"
                      ? "1024+"
                      : "1280+"}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      {!selection ? (
        <p className="px-2.5 text-ui text-cms-muted">
          Select an element to design it.
        </p>
      ) : !target ? (
        <p className="px-2.5 text-ui text-cms-muted">
          Select an element inside the page.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section name="Layout" open>
            {segments("display", "Display", [
              ["block", "Block"],
              ["flex", "Flex"],
              ["grid", "Grid"],
              ["none", "Hide"],
            ])}
            {["flex", "grid"].includes(value("display")) && (
              <>
                {value("display") === "flex" &&
                  segments("flexDirection", "Direction", [
                    ["row", "→"],
                    ["column", "↓"],
                    ["row-reverse", "←"],
                    ["column-reverse", "↑"],
                  ])}
                {value("display") === "grid" && (
                  <div className="grid gap-2">
                    {field("gridTemplateColumns", "Columns")}
                    {field("gridTemplateRows", "Rows")}
                  </div>
                )}
                {value("display") === "flex" &&
                  segments("flexWrap", "Wrap", [
                    ["nowrap", "No wrap"],
                    ["wrap", "Wrap"],
                  ])}
                {segments("justifyContent", "Distribute", [
                  ["flex-start", "Start"],
                  ["center", "Center"],
                  ["flex-end", "End"],
                  ["space-between", "Between"],
                ])}
                {segments("alignItems", "Align", [
                  ["flex-start", "Start"],
                  ["center", "Center"],
                  ["flex-end", "End"],
                  ["stretch", "Stretch"],
                ])}
                {field("gap", "Gap")}
              </>
            )}
          </Section>
          <Section name="Spacing" open>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cms-subtle">
                Space around and inside
              </span>
              <Tooltip
                content={linked ? "Unlink sides" : "Link all four sides"}
              >
                <button
                  type="button"
                  aria-label="Link spacing sides"
                  aria-pressed={linked}
                  className={`rounded-cms p-1 ${linked ? "text-cms-accent" : "text-cms-muted"}`}
                  onClick={() => setLinked(!linked)}
                >
                  {linked ? <Link size={12} /> : <Unlink size={12} />}
                </button>
              </Tooltip>
            </div>
            <div className="relative grid grid-cols-[2rem_1fr_2rem] grid-rows-[1.5rem_5.5rem_1.5rem] items-center rounded-cms border border-cms-line-strong bg-cms-surface/60">
              <span className="pointer-events-none absolute left-1 top-1 text-[8px] uppercase tracking-wide text-cms-subtle">
                Margin
              </span>
              <div className="col-start-2 row-start-1 mx-auto w-16">
                {field("marginTop", "Margin top", true)}
              </div>
              <div className="col-start-1 row-start-2">
                {field("marginLeft", "Margin left", true)}
              </div>
              <div className="col-start-3 row-start-2">
                {field("marginRight", "Margin right", true)}
              </div>
              <div className="col-start-2 row-start-3 mx-auto w-16">
                {field("marginBottom", "Margin bottom", true)}
              </div>
              <div className="relative col-start-2 row-start-2 grid h-full grid-cols-[2.5rem_1fr_2.5rem] grid-rows-[1.5rem_1fr_1.5rem] items-center rounded-cms border border-cms-line-strong bg-cms-bg">
                <span className="pointer-events-none absolute left-1 top-1 text-[8px] uppercase tracking-wide text-cms-subtle">
                  Padding
                </span>
                <div className="col-start-2 row-start-1">
                  {field("paddingTop", "Padding top", true)}
                </div>
                <div className="col-start-1 row-start-2">
                  {field("paddingLeft", "Padding left", true)}
                </div>
                <div className="col-start-3 row-start-2">
                  {field("paddingRight", "Padding right", true)}
                </div>
                <div className="col-start-2 row-start-3">
                  {field("paddingBottom", "Padding bottom", true)}
                </div>
                <div
                  className="col-start-2 row-start-2 h-3 rounded-sm border border-cms-line bg-cms-surface"
                  aria-hidden="true"
                />
              </div>
            </div>
          </Section>
          <Section name="Size" open>
            <div className="grid grid-cols-2 gap-2">
              {field("width", "Width")}
              {field("height", "Height")}
              {field("minWidth", "Min W")}
              {field("minHeight", "Min H")}
              {field("maxWidth", "Max W")}
              {field("maxHeight", "Max H")}
            </div>
            {segments("overflow", "Overflow", [
              ["visible", "Show"],
              ["hidden", "Hide"],
              ["scroll", "Scroll"],
              ["auto", "Auto"],
            ])}
            {field("aspectRatio", "Ratio")}
            {field("objectFit", "Image fit")}
          </Section>
          <Section name="Position">
            {segments("position", "Position", [
              ["static", "Static"],
              ["relative", "Relative"],
              ["absolute", "Absolute"],
              ["fixed", "Fixed"],
              ["sticky", "Sticky"],
            ])}
            {value("position") !== "static" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {field("top", "Top")}
                  {field("right", "Right")}
                  {field("bottom", "Bottom")}
                  {field("left", "Left")}
                </div>
                {field("zIndex", "Layer")}
              </>
            )}
          </Section>
          <Section name="Typography" open>
            {field("fontFamily", "Font")}
            {field("fontWeight", "Weight")}
            <div className="grid grid-cols-2 gap-2">
              {field("fontSize", "Size")}
              {field("lineHeight", "Height")}
            </div>
            {color("color", "Text color")}
            {segments("textAlign", "Align", [
              ["left", <AlignLeft size={13} />],
              ["center", <AlignCenter size={13} />],
              ["right", <AlignRight size={13} />],
              ["justify", <AlignJustify size={13} />],
            ])}
            <details>
              <summary className="cursor-pointer text-[10px] text-cms-muted">
                More type options
              </summary>
              <div className="mt-2 grid gap-2">
                {field("letterSpacing", "Tracking")}
                {segments("textDecoration", "Decorate", [
                  ["none", "None"],
                  ["underline", "U̲"],
                  ["line-through", "S̶"],
                ])}
                {segments("textTransform", "Case", [
                  ["none", "Aa"],
                  ["uppercase", "AA"],
                  ["lowercase", "aa"],
                  ["capitalize", "Title"],
                ])}
              </div>
            </details>
          </Section>
          <Section name="Backgrounds">
            {color("backgroundColor", "Color")}
          </Section>
          <Section name="Borders">
            {field("borderRadius", "Radius")}
            {field("borderWidth", "Width")}
            {segments("borderStyle", "Style", [
              ["none", "None"],
              ["solid", "―"],
              ["dashed", "--"],
              ["dotted", "···"],
            ])}
            {color("borderColor", "Color")}
          </Section>
          <Section name="Effects">
            <div className="grid grid-cols-[4.25rem_1fr] items-center gap-1.5">
              <span className="text-ui text-cms-muted">Opacity</span>
              <input
                type="range"
                aria-label="Opacity slider"
                min="0"
                max="1"
                step="0.01"
                value={Number(value("opacity")) || 0}
                disabled={locked}
                onChange={(event) => commit("opacity", event.target.value)}
                className="w-full accent-cms-accent"
              />
            </div>
            {field("opacity", "Opacity")}
            {field("boxShadow", "Shadow")}
            {field("transform", "Transform")}
            {field("transition", "Transition")}
            {field("cursor", "Cursor")}
            {segments("pointerEvents", "Events", [
              ["auto", "Auto"],
              ["none", "None"],
            ])}
          </Section>
          <Section name="Custom properties">
            <p className="m-0 text-[10px] leading-4 text-cms-subtle">
              Add a CSS property for advanced styling.
            </p>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1">
              <input
                className={fieldClass}
                aria-label="Custom property"
                placeholder="Property"
                value={customName}
                disabled={locked}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <input
                className={fieldClass}
                aria-label="Custom property value"
                placeholder="Value"
                value={customValue}
                disabled={locked}
                onChange={(e) => setCustomValue(e.target.value)}
              />
              <button
                type="button"
                aria-label="Add custom property"
                disabled={locked || !customName || !customValue}
                className="rounded-cms p-1 text-cms-muted"
                onClick={() => {
                  try {
                    if (
                      !/^(?:--)?[a-z][a-z0-9-]*$/.test(customName) ||
                      (!customName.startsWith("--") &&
                        !CSS.supports(customName, customValue))
                    )
                      throw new Error("Use a valid CSS property and value.");
                    const property=customName.replace(/-([a-z])/g,(_,letter:string)=>letter.toUpperCase()) as UtilityProperty;
                    const known=Object.hasOwn(utilityPrefixes,property);
                    const utility=known?`${prefix}${propertyUtility(property,customValue)}`:validateUtility(`${prefix}[${customName}:${customValue.trim().replaceAll(" ","_")}]`);
                    const key = `${prefix}[${customName}:`;
                    onChange({
                      ...style,
                      utilities: [
                        ...style.utilities.filter((v) => !v.startsWith(key)),
                        utility,
                      ],
                    });
                    setCustomName("");
                    setCustomValue("");
                    setError("");
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Invalid CSS property.",
                    );
                  }
                }}
              >
                <Plus size={13} />
              </button>
            </div>
            {style.utilities
              .filter((v) => v.startsWith(`${prefix}[`))
              .map((v) => (
                <div
                  key={v}
                  className="flex items-center justify-between gap-2 rounded-cms border border-cms-line px-2 py-1 text-[10px]"
                >
                  <span className="min-w-0 break-words text-cms-accent">
                    {v.slice(prefix.length + 1, -1).replaceAll("_", " ")}
                  </span>
                  <Tooltip content="Restore source">
                    <button
                      aria-label={`Remove ${v}`}
                      disabled={locked}
                      onClick={() =>
                        onChange({
                          ...style,
                          utilities: style.utilities.filter((c) => c !== v),
                        })
                      }
                    >
                      <RotateCcw size={10} />
                    </button>
                  </Tooltip>
                </div>
              ))}
          </Section>
          {error && (
            <p role="alert" className="px-2.5 text-ui text-cms-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

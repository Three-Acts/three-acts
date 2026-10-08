import { useState } from "react";
import { applyStyle, breakpoints, parseDeclarations, setUtility, utilityControls, type Breakpoint, type DesignDocument, type StyleChange, type UtilityProperty } from "@three-acts/design";
import { Button, Input, Textarea } from "../atoms";
import type { CanvasSelection } from "./canvas-types";

const emptyStyle = (): StyleChange => ({ utilities: [], customClasses: [] });
function selectedStyle(design: DesignDocument, selection: CanvasSelection | null): StyleChange {
  const target = selection?.designTarget;
  return (target?.kind === "element" ? design.elements[target.id] : target?.kind === "component" ? design.components[target.component]?.parts[target.part] : undefined) ?? emptyStyle();
}
const spacingAxis: Record<string, string[]> = {
  paddingTop: ["p-", "py-", "pt-"], paddingRight: ["p-", "px-", "pr-"], paddingBottom: ["p-", "py-", "pb-"], paddingLeft: ["p-", "px-", "pl-"],
  marginTop: ["m-", "my-", "mt-"], marginRight: ["m-", "mx-", "mr-"], marginBottom: ["m-", "my-", "mb-"], marginLeft: ["m-", "mx-", "ml-"],
};
function sourceValue(selection: CanvasSelection, property: UtilityProperty, breakpoint: Breakpoint): string {
  const prefixes = Object.keys(breakpoints).slice(0, Object.keys(breakpoints).indexOf(breakpoint) + 1).reverse().map(bp => bp === "base" ? "" : `${bp}:`);
  for (const prefix of prefixes) {
    const matches = (selection.classNames ?? []).filter(value => {
      if (!value.startsWith(prefix)) return false;
      const utility = value.slice(prefix.length);
      if (utility.includes(":")) return false;
      return (utilityControls[property].classes as string[]).includes(utility) || spacingAxis[property]?.some(axis => utility.startsWith(axis));
    });
    if (matches.length) return matches.at(-1)!;
  }
  return "No authored utility";
}

export function StyleInspector({ selection, design, breakpoint, onBreakpointChange, onChange, onCustomCss, disabled }: {
  selection: CanvasSelection | null; design: DesignDocument; breakpoint: Breakpoint;
  onBreakpointChange: (value: Breakpoint) => void;
  onChange: (style: StyleChange) => void;
  onCustomCss: (selector: string, declarations: Record<string, string>, style: StyleChange) => void;
  disabled: boolean;
}) {
  const [tab, setTab] = useState<"utilities" | "css">("utilities");
  const [selector, setSelector] = useState("");
  const [declarations, setDeclarations] = useState("");
  const [error, setError] = useState("");
  const style = selectedStyle(design, selection);
  const editable = Boolean(selection?.designTarget);
  const controlsDisabled = disabled || !editable;
  const prefix = breakpoint === "base" ? "" : `${breakpoint}:`;
  function loadRule(value: string) {
    setSelector(value);
    setDeclarations(Object.entries(design.customCss[value] ?? {}).map(([property, value]) => `${property}: ${value};`).join("\n"));
    setError("");
  }
  function saveRule() {
    try {
      const values = parseDeclarations(declarations);
      if (typeof CSS !== "undefined") for (const [property, value] of Object.entries(values)) if (!CSS.supports(property, value)) throw new Error(`Invalid ${property} value.`);
      const className = selector.trim().replace(/^\./, "").split(":")[0];
      onCustomCss(selector.trim(), values, { ...style, customClasses: [...new Set([...style.customClasses, className])] });
      setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "Invalid CSS."); }
  }
  return <aside aria-label="Style inspector" className="flex min-h-0 flex-1 flex-col bg-cms-bg">
    <div className="shrink-0 border-b border-cms-line px-2 py-2">
      <div className="flex gap-1" role="tablist" aria-label="Style editing">
        <button type="button" role="tab" aria-selected={tab === "utilities"} onClick={() => setTab("utilities")} className={`flex-1 rounded-cms px-2 py-1 text-ui ${tab === "utilities" ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>Tailwind</button>
        <button type="button" role="tab" aria-selected={tab === "css"} onClick={() => setTab("css")} className={`flex-1 rounded-cms px-2 py-1 text-ui ${tab === "css" ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>Custom CSS</button>
      </div>
      <p className="mb-0 mt-2 text-ui leading-4 text-cms-subtle">{selection?.designTarget?.kind === "component" ? "Saved changes apply to every instance of this component." : "Changes are saved in your design draft."}</p>
    </div>
    {!selection ? <p className="px-2 text-ui text-cms-muted">Select an element on the canvas.</p> : !editable ? <p className="px-2 text-ui leading-5 text-cms-muted">This element has no registered design source. Select a registered element or enter a component to edit a named part.</p> : <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
      {tab === "utilities" ? <div role="tabpanel" aria-label="Tailwind utilities" className="grid gap-2">
        <label className="grid gap-1 text-ui text-cms-muted">Breakpoint<select aria-label="Style breakpoint" value={breakpoint} disabled={disabled} onChange={event => onBreakpointChange(event.target.value as Breakpoint)} className="h-7 rounded-cms border border-cms-line bg-cms-surface px-1 text-cms-text">{Object.entries(breakpoints).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <details className="rounded-cms border border-cms-line p-2"><summary className="cursor-pointer text-ui text-cms-muted">Applied classes</summary><code className="mt-2 block break-words text-[10px] leading-4 text-cms-text">{applyStyle((selection.sourceClasses ?? []).join(" "), style) || "No classes"}</code></details>
        {(Object.entries(utilityControls) as Array<[UtilityProperty, { label: string; classes: string[] }]>).map(([property, control]) => {
          const authored = style.utilities.find(value => control.classes.some(c => value === prefix + c));
          const inherited = sourceValue(selection, property, breakpoint);
          return <div key={property} className="grid gap-0.5">
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-1">
              <label htmlFor={`utility-${property}`} className={`text-ui ${authored ? "text-cms-accent" : "text-cms-muted"}`} title={authored ? "Alt-click to restore source / inheritance" : undefined} onClick={event => { if (event.altKey && authored && !controlsDisabled) { event.preventDefault(); onChange(setUtility(style, property, breakpoint, "")); } }}>{control.label}</label>
              <select id={`utility-${property}`} aria-label={control.label} disabled={controlsDisabled} value={authored?.slice(prefix.length) ?? ""} onChange={event => onChange(setUtility(style, property, breakpoint, event.target.value))} className="h-7 min-w-0 rounded-cms border border-cms-line bg-cms-surface px-1 font-mono text-[10px] text-cms-text">
                <option value="">Use source / inherit</option>
                {control.classes.map(value => <option value={value} key={value}>{prefix}{value}</option>)}
              </select>
            </div>
            <span className="text-[10px] leading-4 text-cms-subtle" title={inherited}>{authored ? `Override: ${authored}` : `Source / inherited: ${inherited}`}</span>
          </div>;
        })}
      </div> : <div role="tabpanel" aria-label="Custom CSS" className="grid gap-3">
        <p className="m-0 text-ui leading-5 text-cms-muted">Define a reusable class. Its rules affect every element using that class. Tailwind utilities remain available in the other tab.</p>
        {Object.keys(design.customCss).length > 0 && <label className="grid gap-1 text-ui text-cms-muted">Existing rules<select aria-label="Existing CSS rules" value={Object.hasOwn(design.customCss, selector) ? selector : ""} onChange={event => loadRule(event.target.value)} className="h-7 rounded-cms border border-cms-line bg-cms-surface px-1 text-cms-text"><option value="">New rule</option>{Object.keys(design.customCss).map(value => <option key={value}>{value}</option>)}</select></label>}
        <label className="grid gap-1 text-ui text-cms-muted">Selector<Input aria-label="Custom selector" value={selector} onValueChange={value => { setSelector(value); setError(""); }} placeholder=".brand-callout" disabled={controlsDisabled}/></label>
        <p className="m-0 text-[10px] leading-4 text-cms-subtle">Class selectors support :hover, :focus, :focus-visible and :active.</p>
        <label className="grid gap-1 text-ui text-cms-muted">Declarations<Textarea aria-label="CSS declarations" rows={7} value={declarations} onChange={event => { setDeclarations(event.target.value); setError(""); }} placeholder={"padding-bottom: 24px;\ncolor: var(--color-ink);"} disabled={controlsDisabled} className="font-mono text-ui"/></label>
        {error && <p role="alert" className="m-0 text-ui text-cms-danger">{error}</p>}
        <Button disabled={controlsDisabled || !selector.trim()} onClick={saveRule}>Save and apply class</Button>
        {style.customClasses.length > 0 && <div className="grid gap-1"><span className="text-ui text-cms-muted">Attached classes</span>{style.customClasses.map(value => <div key={value} className="flex items-center justify-between gap-1"><code className="text-ui">.{value}</code><Button variant="ghost" disabled={controlsDisabled} aria-label={`Remove class ${value}`} onClick={() => onChange({ ...style, customClasses: style.customClasses.filter(c => c !== value) })}>Remove</Button></div>)}</div>}
      </div>}
    </div>}
  </aside>;
}

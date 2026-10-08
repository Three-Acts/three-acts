import { componentDefinitions } from "@three-acts/design";
import type { ContentField } from "@three-acts/static-content";
import { SquarePen, RotateCcw } from "lucide-react";
import { BareIconButton, Textarea, Tooltip } from "../atoms";
import { AttributeInput } from "./inspector";
import type { CanvasSelection } from "./canvas-types";

const sizeLabels: Record<string, string> = { sm: "Small", md: "Medium", lg: "Large" };
function FieldLabel({ id, label, changed, disabled, onReset }: { id: string; label: string; changed: boolean; disabled: boolean; onReset: () => void }) {
  return <div className="flex min-h-5 items-center justify-between gap-2">
    <label htmlFor={id} className={`min-w-0 flex-1 text-ui capitalize ${changed ? "text-cms-accent" : "text-cms-muted"}`} title={changed ? "Alt-click to restore the source value" : undefined} onClick={event => {
      if (event.altKey && changed && !disabled) { event.preventDefault(); onReset(); }
    }}>{label}</label>
    {changed && <Tooltip content="Restore source value. You can also Alt-click the field label.">
      <BareIconButton aria-label={`Reset ${label} to source`} disabled={disabled} onClick={onReset} className="size-5 shrink-0 text-cms-accent"><RotateCcw size={11}/></BareIconButton>
    </Tooltip>}
  </div>;
}

export function ComponentInspector({ selection, disabled, onProperty, onResetProperty, onField, resolveField, resolveSourceField, onEnter, templateInstance }: {
  selection: CanvasSelection; disabled: boolean;
  onProperty: (key: string, value: string) => void;
  onResetProperty: (key: string) => void;
  onField: (field: ContentField, value: string, documentId: string) => void;
  resolveField: (binding: { id: string; path: string }) => ContentField | undefined;
  resolveSourceField: (binding: { id: string; path: string }) => ContentField | undefined;
  onEnter: () => void; templateInstance: boolean;
}) {
  const component = selection.component;
  const definition = component && Object.hasOwn(componentDefinitions, component.name) ? componentDefinitions[component.name] : null;
  return <aside aria-label="Component properties" className="flex min-h-0 flex-1 flex-col overflow-auto bg-cms-bg p-3">
    {!definition || !component ? <p className="m-0 text-ui text-cms-muted">This component has no registered property definition.</p> : <div className="grid gap-3">
      <div className="grid gap-1">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <h3 className="m-0 text-ui font-medium">{definition.label}</h3>
          <Tooltip content="Edit main component. Changes inside it apply to all instances.">
            <BareIconButton aria-label="Edit main component" disabled={disabled} onClick={onEnter} className="size-6 shrink-0"><SquarePen size={13}/></BareIconButton>
          </Tooltip>
        </div>
        <p className="m-0 text-ui leading-4 text-cms-subtle">Properties affect this instance.{templateInstance && " On this template, they apply across generated pages."}</p>
      </div>
      {Object.entries(definition.variants).map(([property, options]) => {
        const id = `component-property-${property}`;
        const value = component.props[property] ?? definition.defaultVariants[property];
        const sourceValue = component.sourceProps?.[property] ?? definition.defaultVariants[property];
        return <div key={property} className="grid gap-1">
          <FieldLabel id={id} label={property} changed={value !== sourceValue} disabled={disabled || !component.instanceId} onReset={() => onResetProperty(property)}/>
          <select id={id} aria-label={`Component ${property}`} value={value} disabled={disabled || !component.instanceId} onChange={event => onProperty(property, event.target.value)} className="h-7 rounded-cms border border-cms-line bg-cms-surface px-1 text-ui capitalize text-cms-text">
            {Object.keys(options).map(value => <option key={value} value={value}>{property === "size" ? (sizeLabels[value] ?? value) : value}</option>)}
          </select>
        </div>;
      })}
      {!component.instanceId && Object.keys(definition.variants).length > 0 && <p className="m-0 text-ui text-cms-subtle">Instance properties need a registered source identity.</p>}
      {component.fields.map(binding => {
        const field = resolveField(binding);
        const sourceField = resolveSourceField(binding);
        if (!field || typeof field.value !== "string") return null;
        const id = `component-${binding.id}-${binding.path}`;
        const changed = sourceField !== undefined && field.value !== sourceField.value;
        return <div key={`${binding.id}.${binding.path}`} className="grid gap-1">
          <FieldLabel id={id} label={binding.label} changed={changed} disabled={disabled} onReset={() => { if (sourceField && typeof sourceField.value === "string") onField(field, sourceField.value, binding.id); }}/>
          {["href", "src"].includes(binding.label) ? (
            <AttributeInput key={`${binding.id}:${binding.path}:${field.value}`} id={id} value={field.value} name={binding.label} disabled={disabled} onCommit={value => onField(field, value, binding.id)}/>
          ) : (
            <Textarea id={id} aria-label={`Component ${binding.label}`} rows={2} value={field.value} disabled={disabled} onChange={event => onField(field, event.target.value, binding.id)} className="resize-y text-cms-text"/>
          )}
        </div>;
      })}
      {Object.keys(definition.variants).length === 0 && component.fields.length === 0 && <p className="m-0 text-ui leading-5 text-cms-muted">This component has no exposed instance properties. Use the edit icon to change shared styling.</p>}
      {selection.category === "cms" && <p className="m-0 text-ui leading-5 text-cms-muted">This CMS content is read-only in the designer. Edit its source in the CMS workspace.</p>}
      <details><summary className="cursor-pointer text-ui text-cms-muted">Definition source</summary><code className="mt-1 block break-words text-[10px] text-cms-subtle">{definition.source}</code></details>
    </div>}
  </aside>;
}

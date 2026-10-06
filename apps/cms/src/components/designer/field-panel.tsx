import { Blocks, Database, MousePointer2, Type, X } from "lucide-react";
import { IconButton, PanelHeader, Textarea } from "../atoms";

export type FieldPanelSelection = {
  kind: "component" | "element" | "cms";
  label: string;
  value: string;
  valueType?: "string" | "number" | "boolean";
  id?: string;
  path?: string;
  collectionId?: string;
  field?: string;
  readonlyMessage?: string;
};

type FieldPanelProps = {
  selection: FieldPanelSelection;
  onChange: (value: string | boolean) => void;
  onClose: () => void;
  disabled: boolean;
  editable: boolean;
};

const categoryPresentation = {
  component: { label: "Component", Icon: Blocks, color: "text-emerald-400", helper: "Changes stay in your site draft until you push them." },
  element: { label: "Element", Icon: MousePointer2, color: "text-sky-400", helper: "Changes stay in your site draft until you push them." },
  cms: { label: "CMS field", Icon: Database, color: "text-violet-400", helper: "This value is connected to CMS content." }
} as const;

/** Compact, docked editor for a field selected in the website canvas. */
export function FieldPanel({ selection, onChange, onClose, disabled, editable }: FieldPanelProps) {
  const kind = selection && selection.kind in categoryPresentation ? selection.kind : "element";
  const presentation = categoryPresentation[kind];
  const label = selection?.label?.trim() || "Selected field";
  const value = typeof selection?.value === "string" ? selection.value : "";
  const canEdit = editable && !disabled;
  const inputId = "selected-field";

  return (
    <aside aria-label="Selected field editor" className="flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-cms-line-strong bg-cms-bg">
      <PanelHeader className="h-8 shrink-0 justify-between gap-2 px-2">
        <span className="flex min-w-0 items-center gap-2 text-ui font-semibold text-cms-text">
          <Type aria-hidden="true" size={14} />
          <span className="truncate">Field editor</span>
        </span>
        <IconButton aria-label="Close field editor" className="size-6" disabled={disabled} onClick={onClose}>
          <X size={13} />
        </IconButton>
      </PanelHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex min-w-0 items-center gap-1.5">
          <presentation.Icon aria-hidden="true" className={`shrink-0 ${presentation.color}`} size={14} />
          <span className={`text-ui font-medium ${presentation.color}`}>{presentation.label}</span>
        </div>

        <label htmlFor={inputId} className="mb-1 block text-ui font-medium text-cms-text">{label}</label>
        {canEdit ? (
          selection.valueType === "boolean" ? (
            <input id={inputId} aria-label={label} type="checkbox" checked={value === "true"} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-cms-accent" />
          ) : (
            <Textarea
              id={inputId}
              aria-label={label}
              rows={4}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="min-h-24 resize-y"
            />
          )
        ) : (
          <Textarea
            id={inputId}
            aria-label={label}
            aria-readonly="true"
            readOnly
            rows={4}
            value={value}
            className="min-h-24 resize-y bg-cms-surface text-cms-muted"
          />
        )}

        <p className="mb-0 mt-2 text-ui leading-4 text-cms-subtle">
          {!editable ? selection.readonlyMessage ?? (selection.kind === "cms" ? "This information is managed in the CMS. Open the CMS workspace to edit it." : "This selection is read-only.") : presentation.helper}
        </p>
      </div>
    </aside>
  );
}

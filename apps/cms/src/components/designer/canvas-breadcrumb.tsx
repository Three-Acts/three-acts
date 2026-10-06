import { useState } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Popover } from "@base-ui-components/react/popover";
import type { CanvasSelection } from "./canvas-types";

export function CanvasBreadcrumb({ selection, disabled, onSelect }: {
  selection: CanvasSelection;
  disabled: boolean;
  onSelect: (selector: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const crumbs = selection.breadcrumbs;
  const hidden = crumbs.length > 4 ? crumbs.slice(1, -2) : [];
  const visible = hidden.length ? [crumbs[0], ...crumbs.slice(-2)] : crumbs;

  return <nav aria-label="Element breadcrumb" className="flex h-7 shrink-0 items-center gap-0.5 overflow-x-auto border-t border-cms-line px-2 text-ui text-cms-muted">
    {visible.map((crumb, index) => <span key={crumb.selector} className="flex min-w-0 shrink-0 items-center gap-0.5">
      {index > 0 && <ChevronRight aria-hidden="true" size={11} className="text-cms-subtle"/>}
      {index === 1 && hidden.length > 0 && <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger aria-label="Show parent elements" disabled={disabled} className="grid h-6 w-6 place-items-center rounded-cms-sm hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:opacity-50"><MoreHorizontal aria-hidden="true" size={13}/></Popover.Trigger>
        <Popover.Portal><Popover.Positioner side="top" align="start" sideOffset={4} className="z-50"><Popover.Popup role="dialog" aria-label="Parent elements" className="max-h-72 w-52 overflow-y-auto rounded-cms border border-cms-line-strong bg-cms-surface p-1 text-cms-text shadow-cms-popup outline-none">
          <p className="m-0 px-2 py-1 text-ui font-medium text-cms-muted">Parent elements</p>
          {hidden.map((parent) => <button key={parent.selector} type="button" disabled={disabled} className="flex h-7 w-full items-center truncate rounded-cms-sm px-2 text-left text-ui hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent" onClick={() => { setOpen(false); onSelect(parent.selector); }}>{parent.label}</button>)}
        </Popover.Popup></Popover.Positioner></Popover.Portal>
        <ChevronRight aria-hidden="true" size={11} className="text-cms-subtle"/>
      </Popover.Root>}
      <button type="button" title={crumb.label} aria-current={crumb.selector === selection.selector ? "true" : undefined} className={`h-6 max-w-40 truncate rounded-cms-sm px-1.5 hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:opacity-50 ${crumb.selector === selection.selector ? "text-cms-text" : ""}`} disabled={disabled} onClick={() => onSelect(crumb.selector)}>{crumb.label}</button>
    </span>)}
  </nav>;
}
